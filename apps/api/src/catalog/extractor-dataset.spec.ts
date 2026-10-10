import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readExtractorDataset } from './extractor-dataset';

describe('readExtractorDataset', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'bdo-catalog-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  async function writeFiles(overrides: Record<string, unknown> = {}): Promise<void> {
    const files: Record<string, unknown> = {
      'items.json': [
        {
          id: 101,
          name: 'Test Ore',
          description: 'Fixture data for the extractor adapter.',
          grade: 'green',
          category: 'Material',
          marketCategory: 'Materials',
          marketSubCategory: 'Ore',
          weight: 0.1,
        },
        {
          id: 202,
          name: 'Test Ingot',
          grade: 'blue',
          category: 'Material',
          marketCategory: 3,
          marketSubCategory: 8,
          weight: 1,
        },
      ],
      'recipes.json': [
        {
          output: 202,
          type: 'Processing',
          station: null,
          inputs: [{ item: 101, count: 4 }],
        },
      ],
      'marketcategories.json': [
        {
          id: 3,
          name: 'Materials',
          subCategories: [
            { id: 7, name: 'Ore' },
            { id: 8, name: 'Processed' },
          ],
        },
      ],
      ...overrides,
    };
    await Promise.all(
      Object.entries(files).map(([filename, value]) =>
        writeFile(join(directory, filename), JSON.stringify(value)),
      ),
    );
  }

  it('normalizes item categories and keeps missing recipe quantities unknown', async () => {
    await writeFiles();
    const result = await readExtractorDataset(directory);

    expect(result.items[0]?.categoryIds).toEqual(['market:main:3', 'market:sub:3:7']);
    expect(result.items[1]?.categoryIds).toEqual(['market:main:3', 'market:sub:3:8']);
    expect(result.recipes[0]?.inputs).toEqual([{ itemId: 101, quantity: 4 }]);
    expect(result.recipes[0]?.outputQuantity).toBeNull();
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects recipe references to items missing from the extracted item list', async () => {
    await writeFiles({
      'recipes.json': [
        {
          output: 999,
          type: 'Processing',
          station: null,
          inputs: [],
        },
      ],
    });

    await expect(readExtractorDataset(directory)).rejects.toThrow('ausente em items.json');
  });

  it('rejects duplicate item ids before starting a database import', async () => {
    await writeFiles({
      'items.json': [
        { id: 101, name: 'First' },
        { id: 101, name: 'Duplicate' },
      ],
    });

    await expect(readExtractorDataset(directory)).rejects.toThrow('IDs de item duplicados');
  });

  async function supplement(overrides: Record<string, unknown> = {}) {
    const original = await readExtractorDataset(directory);
    const path = join(directory, 'reviewed-recipes.json');
    await writeFile(
      path,
      JSON.stringify({
        region: 'sa',
        locale: 'pt',
        extractorChecksum: original.checksum,
        reviewedAt: '2026-10-09',
        sourceUrls: ['https://www.sa.playblackdesert.com/PT-BR/News/Detail?groupContentNo=6639'],
        items: [
          { id: 101, name: 'Test Ore' },
          { id: 202, name: 'Test Ingot' },
        ],
        recipes: [
          {
            output: { item: 202, count: 1 },
            type: 'SIMPLE_ALCHEMY',
            inputs: [{ item: 101, count: 3 }],
          },
        ],
        ...overrides,
      }),
    );
    return { original, options: { supplementFile: path, region: 'sa', locale: 'pt' } };
  }

  it('restores a reviewed missing recipe with known yield and persists its source without replacing client records', async () => {
    await writeFiles();
    const { original, options } = await supplement();
    const result = await readExtractorDataset(directory, options);
    expect(result.recipes).toHaveLength(2);
    expect(result.recipes.find((r) => r.type === 'SIMPLE_ALCHEMY')).toMatchObject({
      outputItemId: 202,
      outputQuantity: 1,
      inputs: [{ itemId: 101, quantity: 3 }],
    });
    expect(result.recipes[0]).toEqual(original.recipes[0]);
    expect(result.checksum).not.toBe(original.checksum);
    expect(result.items[1].sourceData?.['verifiedRecipeSupplements']).toMatchObject([
      {
        reviewedAt: '2026-10-09',
        sourceUrls: ['https://www.sa.playblackdesert.com/PT-BR/News/Detail?groupContentNo=6639'],
      },
    ]);
  });

  it('rejects a supplement reviewed for another client or region instead of silently publishing stale recipes', async () => {
    await writeFiles();
    const wrongClient = await supplement({ extractorChecksum: '0'.repeat(64) });
    await expect(readExtractorDataset(directory, wrongClient.options)).rejects.toThrow('checksum');
    const wrongRegion = await supplement({ region: 'na' });
    await expect(readExtractorDataset(directory, wrongRegion.options)).rejects.toThrow('região');
  });

  it('validates item identity and keeps unreported supplemental yields unknown', async () => {
    await writeFiles();
    const unknown = await supplement({
      recipes: [{ output: 202, type: 'ALCHEMY', inputs: [{ item: 101, count: 2 }] }],
    });
    const result = await readExtractorDataset(directory, unknown.options);
    expect(result.recipes.find((r) => r.type === 'ALCHEMY')?.outputQuantity).toBeNull();
    const wrongItem = await supplement({
      items: [
        { id: 101, name: 'Unrelated ore' },
        { id: 202, name: 'Test Ingot' },
      ],
    });
    await expect(readExtractorDataset(directory, wrongItem.options)).rejects.toThrow('101');
  });

  it('does not duplicate client recipes or replace an unknown client yield with a reviewed yield', async () => {
    await writeFiles();
    const { original, options } = await supplement({
      recipes: [
        { output: { item: 202, count: 1 }, type: 'Processing', inputs: [{ item: 101, count: 4 }] },
      ],
    });
    const result = await readExtractorDataset(directory, options);
    expect(result.recipes).toEqual(original.recipes);
    expect(result.recipes[0]?.outputQuantity).toBeNull();
  });
});
