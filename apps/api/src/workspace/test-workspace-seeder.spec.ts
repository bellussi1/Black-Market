import { emptyWorkspace } from '@bdo/calculators/workspace';
import { authUsers, userWorkspaces } from '@bdo/database/schema';
import { stagingTestCharacter, stagingTestFamily } from '@bdo/shared';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestWorkspaceSeeder } from './test-workspace-seeder';

const firebaseUid = 'firebase-staging-test-uid';
const ownerId = '00000000-0000-4000-8000-000000000101';

function fakeDatabase(
  options: { userExists?: boolean; data?: Record<string, unknown> | null } = {},
) {
  let workspace = options.data
    ? { userId: ownerId, version: 4, data: options.data, updatedAt: new Date(0) }
    : null;
  const transaction = {
    execute: vi.fn(),
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
      values: (values: Record<string, unknown>) => ({
        onConflictDoUpdate: ({ set }: { set: Record<string, unknown> }) => {
          if (table === userWorkspaces)
            workspace = { userId: ownerId, ...values, ...set } as typeof workspace;
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

function seeder(
  database: ReturnType<typeof fakeDatabase>,
  options: { appEnv?: string; configuredUid?: string } = {},
) {
  const config = new ConfigService({
    APP_ENV: options.appEnv ?? 'staging',
    STAGING_TEST_FIREBASE_UID: options.configuredUid ?? firebaseUid,
  });
  return new TestWorkspaceSeeder(config, database as never);
}

describe('TestWorkspaceSeeder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds the synthetic character and family to an empty workspace', async () => {
    const database = fakeDatabase({ data: emptyWorkspace() });

    await expect(seeder(database).seed(firebaseUid)).resolves.toMatchObject({
      seeded: true,
      version: 5,
    });

    expect(database.workspace?.data).toMatchObject({
      activeCharacterId: stagingTestCharacter.id,
      characters: [stagingTestCharacter],
      families: { [stagingTestCharacter.region]: stagingTestFamily },
    });
    expect(database.transaction.execute).toHaveBeenCalledOnce();
  });

  it('does not duplicate the profile or increment the version on a repeated seed', async () => {
    const database = fakeDatabase({ data: emptyWorkspace() });
    const runner = seeder(database);

    await runner.seed(firebaseUid);
    const result = await runner.seed(firebaseUid);

    expect(result).toMatchObject({ seeded: false, version: 5 });
    expect(database.workspace?.data).toMatchObject({ characters: [stagingTestCharacter] });
  });

  it('adds the test character into the last workspace character slot', async () => {
    const existingCharacters = Array.from({ length: 29 }, (_, index) => ({
      ...stagingTestCharacter,
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

    expect(database.workspace?.data).toMatchObject({
      activeCharacterId: existingCharacters[0].id,
      characters: [...existingCharacters, stagingTestCharacter],
    });
  });

  it('preserves existing characters, selected character, family and workspace values', async () => {
    const existingCharacter = {
      ...stagingTestCharacter,
      id: 'existing-main',
      name: 'My Character',
    };
    const existingFamily = { ...stagingTestFamily, name: 'My Family' };
    const original = {
      ...emptyWorkspace(),
      activeCharacterId: existingCharacter.id,
      familySilver: '987654321',
      characters: [existingCharacter],
      families: { [existingCharacter.region]: existingFamily },
    };
    const database = fakeDatabase({ data: original });

    await seeder(database).seed(firebaseUid);

    expect(database.workspace?.data).toMatchObject({
      activeCharacterId: existingCharacter.id,
      familySilver: '987654321',
      characters: [existingCharacter, stagingTestCharacter],
      families: { [existingCharacter.region]: existingFamily },
    });
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
