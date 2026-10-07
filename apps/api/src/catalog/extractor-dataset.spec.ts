import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readExtractorDataset } from './extractor-dataset';

describe('readExtractorDataset', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'bdo-catalog-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  async function writeFiles(
    overrides: Record<string, unknown> = {},
  ): Promise<void> {
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

    expect(result.items[0]?.categoryIds).toEqual([
      'market:main:3',
      'market:sub:3:7',
    ]);
    expect(result.items[1]?.categoryIds).toEqual([
      'market:main:3',
      'market:sub:3:8',
    ]);
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

    await expect(readExtractorDataset(directory)).rejects.toThrow(
      'ausente em items.json',
    );
  });

  it('rejects duplicate item ids before starting a database import', async () => {
    await writeFiles({
      'items.json': [
        { id: 101, name: 'First' },
        { id: 101, name: 'Duplicate' },
      ],
    });

    await expect(readExtractorDataset(directory)).rejects.toThrow(
      'IDs de item duplicados',
    );
  });
});
