import { characterSchema, familyProfileSchema } from '@bdo/calculators';
import type { Workspace } from '@bdo/calculators/workspace';
import { emptyWorkspace } from '@bdo/calculators/workspace';
import { authUsers, userWorkspaces } from '@bdo/database/schema';
import type { CatalogItem, CatalogRecipe } from '@bdo/shared';
import { stagingTestCharacter, stagingTestFamily } from '@bdo/shared';
import { ConfigService } from '@nestjs/config';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CatalogService } from '../catalog/catalog.service';
import { TestWorkspaceSeeder } from './test-workspace-seeder';

const firebaseUid = 'firebase-staging-test-uid';
const ownerId = '00000000-0000-4000-8000-000000000101';

function fakeDatabase(options: { userExists?: boolean; data?: Workspace | null } = {}) {
  type WorkspaceRow = {
    userId: string;
    version: number;
    data: Workspace;
    updatedAt: Date;
  };
  let workspace = options.data
    ? { userId: ownerId, version: 4, data: options.data, updatedAt: new Date(0) }
    : null;
  const transaction = {
    execute: vi.fn((_query: SQL) => Promise.resolve(undefined)),
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: () => {
            if (table === authUsers)
              return Promise.resolve(
                options.userExists === false ? [] : [{ id: ownerId, firebaseUid }],
              );
            return Promise.resolve(workspace ? [workspace] : []);
          },
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: WorkspaceRow) => ({
        onConflictDoUpdate: ({ set }: { set: Partial<WorkspaceRow> }) => {
          if (table === userWorkspaces) workspace = { ...values, ...set };
          return Promise.resolve();
        },
      }),
    }),
  };
  return {
    db: {
      transaction: async <T>(operation: (tx: typeof transaction) => Promise<T>) =>
        operation(transaction),
    },
    get workspace() {
      return workspace;
    },
    transaction,
  };
}

const catalogFixtures: { group: 'cooking' | 'alchemy' | 'processing'; recipe: CatalogRecipe }[] = [
  {
    group: 'cooking',
    recipe: {
      key: 'c'.repeat(64),
      type: 'COOK',
      station: 'Utensílio',
      inputs: [{ itemId: 1001, name: 'Ingrediente de Teste', quantity: '3.0000' }],
      outputs: [{ itemId: 2001, name: 'Prato de Teste', quantity: '2.0000' }],
    },
  },
  {
    group: 'alchemy',
    recipe: {
      key: 'a'.repeat(64),
      type: 'ALCHEMY',
      station: 'Ferramenta de Alquimia',
      inputs: [{ itemId: 1002, name: 'Reagente de Teste', quantity: '2.0000' }],
      outputs: [{ itemId: 2002, name: 'Elixir de Teste', quantity: '1.0000' }],
    },
  },
  {
    group: 'processing',
    recipe: {
      key: 'p'.repeat(64),
      type: 'GRIND',
      station: null,
      inputs: [{ itemId: 1003, name: 'Minério de Teste', quantity: '5.0000' }],
      outputs: [{ itemId: 2003, name: 'Lingote de Teste', quantity: '2.0000' }],
    },
  },
];

const categoryFixtures = [
  { id: 'weapon-main', parentId: null, name: 'Arma Principal', sortOrder: 1 },
  { id: 'weapon-sub', parentId: null, name: 'Arma Secundária', sortOrder: 2 },
  { id: 'weapon-awake', parentId: null, name: 'Arma Desperta', sortOrder: 3 },
  { id: 'helmet', parentId: null, name: 'Elmo', sortOrder: 4 },
  { id: 'armor', parentId: null, name: 'Armadura', sortOrder: 5 },
  { id: 'gloves', parentId: null, name: 'Luvas', sortOrder: 6 },
  { id: 'shoes', parentId: null, name: 'Sapatos', sortOrder: 7 },
  { id: 'necklace', parentId: null, name: 'Colar', sortOrder: 8 },
  { id: 'belt', parentId: null, name: 'Cinto', sortOrder: 9 },
  { id: 'rings', parentId: null, name: 'Anel', sortOrder: 10 },
  { id: 'earrings', parentId: null, name: 'Brinco', sortOrder: 11 },
  { id: 'clothes', parentId: null, name: 'Traje de Produção', sortOrder: 12 },
  { id: 'tools', parentId: null, name: 'Lenhador', sortOrder: 13 },
];

function item(id: number, name: string, category: string): CatalogItem {
  return {
    id,
    name,
    description: null,
    grade: null,
    weight: null,
    category,
    icon: null,
    iconUrl: `/api/v1/items/${id}/icon`,
    categories: [],
  };
}

const equipment = [
  { categoryId: 'weapon-main', item: item(9001, 'Espada de Teste', 'MainWeapon') },
  { categoryId: 'weapon-sub', item: item(9002, 'Escudo de Teste', 'SubWeapon') },
  { categoryId: 'weapon-awake', item: item(9003, 'Alabarda Desperta de Teste', 'MainWeapon') },
  { categoryId: 'helmet', item: item(9004, 'Elmo de Teste', 'Armor') },
  { categoryId: 'armor', item: item(9005, 'Armadura de Teste', 'Armor') },
  { categoryId: 'gloves', item: item(9006, 'Luvas de Teste', 'Armor') },
  { categoryId: 'shoes', item: item(9007, 'Sapatos de Teste', 'Armor') },
  { categoryId: 'necklace', item: item(9008, 'Colar de Teste', 'Accessory') },
  { categoryId: 'belt', item: item(9009, 'Cinto de Teste', 'Accessory') },
  { categoryId: 'rings', item: item(9010, 'Anel de Teste', 'Accessory') },
  { categoryId: 'rings', item: item(9011, 'Segundo Anel de Teste', 'Accessory') },
  { categoryId: 'earrings', item: item(9012, 'Acessório de Orelha de Teste', 'Accessory') },
  { categoryId: 'earrings', item: item(9013, 'Segundo Acessório de Orelha de Teste', 'Accessory') },
  { categoryId: 'clothes', item: item(9014, 'Uniforme de Trabalho de Teste', 'Armor') },
  { categoryId: 'tools', item: item(9015, 'Machado de Lenhador de Teste', 'Etc') },
];

const expandedCatalogFixtures = catalogFixtures.flatMap(({ group, recipe }) =>
  Array.from({ length: 5 }, (_, index) => {
    const output = recipe.outputs[0];
    if (!output) throw new Error(`A fixture de ${group} precisa de um produto.`);
    const suffix = index === 0 ? '' : ` ${index + 1}`;
    return {
      group,
      recipe: {
        ...recipe,
        key: index === 0 ? recipe.key : `${index + 1}${recipe.key.slice(1)}`,
        outputs: [
          { ...output, itemId: output.itemId + index * 10_000, name: output.name + suffix },
        ],
      },
    };
  }),
);

function fakeCatalog() {
  return {
    listRecipes: vi.fn((query: { recipeGroup: 'cooking' | 'alchemy' | 'processing' }) => {
      const group = query.recipeGroup;
      const recipes = expandedCatalogFixtures
        .filter((fixture) => fixture.group === group)
        .map(({ recipe }) => ({
          key: recipe.key,
          type: recipe.type,
          station: recipe.station,
          itemId: recipe.outputs[0].itemId,
          name: recipe.outputs[0].name,
          quantity: recipe.outputs[0].quantity,
          iconUrl: null,
        }));
      return Promise.resolve({
        recipes,
        total: recipes.length,
        page: 1,
        pageSize: 100,
        dataset: null,
      });
    }),
    recipe: vi.fn((key: string) =>
      Promise.resolve({
        recipe: expandedCatalogFixtures.find(({ recipe }) => recipe.key === key)!.recipe,
        dataset: null,
      }),
    ),
    listCategories: vi.fn(() => Promise.resolve({ categories: categoryFixtures, dataset: null })),
    listItems: vi.fn((query: { categoryId: string; q?: string }) => {
      const items = equipment
        .filter(
          ({ categoryId, item }) =>
            categoryId === query.categoryId && (!query.q || item.name.includes(query.q)),
        )
        .map(({ item }) => item);
      return Promise.resolve({ items, total: items.length, page: 1, pageSize: 100, dataset: null });
    }),
  };
}

function seeder(
  database: ReturnType<typeof fakeDatabase>,
  options: { appEnv?: string; configuredUid?: string } = {},
  catalog = fakeCatalog(),
) {
  const config = new ConfigService({
    APP_ENV: options.appEnv ?? 'staging',
    STAGING_TEST_FIREBASE_UID: options.configuredUid ?? firebaseUid,
  });
  return new TestWorkspaceSeeder(config, database as never, catalog as unknown as CatalogService);
}

describe('TestWorkspaceSeeder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds catalog-backed test data for the principal workspace surfaces', async () => {
    const database = fakeDatabase({ data: emptyWorkspace() });

    await expect(seeder(database).seed(firebaseUid)).resolves.toMatchObject({
      seeded: true,
      version: 5,
    });

    const workspace = database.workspace?.data;
    expect(workspace?.activeCharacterId).toBe(stagingTestCharacter.id);
    expect(workspace?.characters.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        stagingTestCharacter.id,
        'staging-demo-shai',
        'staging-demo-gatherer',
      ]),
    );
    const family = workspace?.families?.[stagingTestCharacter.region];
    expect(family?.name).toBe(stagingTestFamily.name);
    expect(family?.lifeSkills?.cooking?.tier).toBe('Guru');
    expect(family?.lifeSkills?.alchemy?.tier).toBe('Guru');
    expect(family?.pets.map(({ id }) => id)).toContain('staging-test-pet');
    expect(family?.mounts.map(({ id }) => id)).toContain('staging-test-mount');
    expect(workspace?.recipes.map(({ name }) => name)).toContain('Prato de Teste');
    expect(workspace?.recipes).toHaveLength(15);
    for (const prefix of ['Prato de Teste', 'Elixir de Teste', 'Lingote de Teste'])
      expect(workspace?.recipes.filter(({ name }) => name.startsWith(prefix))).toHaveLength(5);
    expect(workspace?.quotes.map(({ name }) => name)).toContain('Prato de Teste');
    expect(workspace?.inventory.map(({ kind, location }) => [kind, location])).toEqual(
      expect.arrayContaining([
        ['storage', 'Velia'],
        ['inventory', 'Inventário · AuroraVale'],
      ]),
    );
    expect(workspace?.personalPlans.map(({ status }) => status)).toContain('reserved');
    expect(workspace?.sessions.map(({ id }) => id)).toContain('staging-session-cooking');
    expect(workspace?.characters[0]?.gear).toHaveLength(15);
    expect(workspace?.gear).toHaveLength(2);
    expect(workspace?.presets).toHaveLength(3);
    expect(database.transaction.execute).toHaveBeenCalledTimes(3);
    const contextQuery = new PgDialect().sqlToQuery(database.transaction.execute.mock.calls[0][0]);
    expect(contextQuery.sql).toContain('set_config');
    expect(contextQuery.params).toEqual([firebaseUid]);
    const ownerContextQuery = new PgDialect().sqlToQuery(
      database.transaction.execute.mock.calls[1][0],
    );
    expect(ownerContextQuery.params).toEqual([ownerId]);
  });

  it('does not duplicate the profile or increment the version on a repeated seed', async () => {
    const database = fakeDatabase({ data: emptyWorkspace() });
    const runner = seeder(database);

    await runner.seed(firebaseUid);
    const result = await runner.seed(firebaseUid);

    expect(result).toMatchObject({ seeded: false, version: 5 });
    expect(database.workspace?.data.characters.map(({ id }) => id)).toContain(
      stagingTestCharacter.id,
    );
    expect(database.workspace?.data.recipes.map(({ name }) => name)).toContain('Prato de Teste');
  });

  it('adds the test character into the last workspace character slot', async () => {
    const baseCharacter = characterSchema.parse(stagingTestCharacter);
    const existingCharacters = Array.from({ length: 29 }, (_, index) => ({
      ...baseCharacter,
      id: `existing-${index}`,
      name: `Existing ${index}`,
    }));
    const database = fakeDatabase({
      data: {
        ...emptyWorkspace(),
        activeCharacterId: existingCharacters[0].id,
        characters: existingCharacters,
      },
    });

    await expect(seeder(database).seed(firebaseUid)).resolves.toMatchObject({
      seeded: true,
      version: 5,
    });

    expect(database.workspace?.data.activeCharacterId).toBe(existingCharacters[0].id);
    expect(database.workspace?.data.characters.map(({ id }) => id)).toContain(
      stagingTestCharacter.id,
    );
  });

  it('refuses to seed when the workspace has no free character slot', async () => {
    const baseCharacter = characterSchema.parse(stagingTestCharacter);
    const characters = Array.from({ length: 30 }, (_, index) => ({
      ...baseCharacter,
      id: `existing-${index}`,
      name: `Existing ${index}`,
    }));
    const database = fakeDatabase({ data: { ...emptyWorkspace(), characters } });

    await expect(seeder(database).seed(firebaseUid)).rejects.toThrow('limite de personagens');
    expect(database.workspace?.version).toBe(4);
  });

  it('preserves existing characters, selected character, family and workspace values', async () => {
    const existingCharacter = {
      ...characterSchema.parse(stagingTestCharacter),
      id: 'existing-main',
      name: 'My Character',
    };
    const existingFamily = familyProfileSchema.parse({ ...stagingTestFamily, name: 'My Family' });
    const original = {
      ...emptyWorkspace(),
      activeCharacterId: existingCharacter.id,
      familySilver: '987654321',
      characters: [existingCharacter],
      families: { [stagingTestCharacter.region]: existingFamily },
    };
    const database = fakeDatabase({ data: original });

    await seeder(database).seed(firebaseUid);

    expect(database.workspace?.data.activeCharacterId).toBe(existingCharacter.id);
    expect(database.workspace?.data.familySilver).toBe('987654321');
    expect(database.workspace?.data.characters.map(({ id }) => id)).toEqual(
      expect.arrayContaining([existingCharacter.id, stagingTestCharacter.id]),
    );
    expect(
      database.workspace?.data.characters.find(({ id }) => id === existingCharacter.id)?.name,
    ).toBe(existingCharacter.name);
    expect(database.workspace?.data.families?.[stagingTestCharacter.region]?.name).toBe(
      'My Family',
    );
    expect(database.workspace?.version).toBe(5);
  });

  it('rejects a Firebase UID without a canonical account', async () => {
    const database = fakeDatabase({ userExists: false, data: emptyWorkspace() });

    await expect(seeder(database).seed(firebaseUid)).rejects.toThrow('conta de staging');
    expect(database.workspace?.version).toBe(4);
  });

  it('requires the explicitly configured test UID', async () => {
    const database = fakeDatabase({ data: emptyWorkspace() });

    await expect(
      seeder(database, { configuredUid: 'different-firebase-uid' }).seed(firebaseUid),
    ).rejects.toThrow('UID de teste configurada');
    expect(database.workspace?.version).toBe(4);
  });

  it('refuses to run outside staging', async () => {
    const database = fakeDatabase({ data: emptyWorkspace() });

    await expect(seeder(database, { appEnv: 'local' }).seed(firebaseUid)).rejects.toThrow(
      'somente no ambiente staging',
    );
    expect(database.workspace?.version).toBe(4);
  });
});
