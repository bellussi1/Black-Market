import { authUsers } from '@bdo/database/schema';
import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { assertSteamLinkAvailable, DatabaseSteamAuthStore } from './steam-auth.store';

const steamId = '76561198000000000';
const ownerId = '00000000-0000-4000-8000-000000000101';
const otherOwnerId = '00000000-0000-4000-8000-000000000102';

function storeWith(
  seed: {
    users?: Array<{ id: string; firebaseUid: string }>;
    identities?: Array<{ userId: string; provider: 'google' | 'steam'; subject: string }>;
  } = {},
) {
  const users = [...(seed.users ?? [])];
  const identities = [...(seed.identities ?? [])];
  const transaction = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: () => Promise.resolve(table === authUsers ? users : identities),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        onConflictDoNothing: () => {
          if (table === authUsers) {
            if (!users.some((user) => user.firebaseUid === value['firebaseUid']))
              users.push({ id: ownerId, firebaseUid: String(value['firebaseUid']) });
          } else {
            const identity = value as unknown as (typeof identities)[number];
            if (
              !identities.some(
                (row) =>
                  (row.provider === identity.provider && row.subject === identity.subject) ||
                  (row.provider === identity.provider && row.userId === identity.userId),
              )
            )
              identities.push(identity);
          }
          return Promise.resolve();
        },
      }),
    }),
  };
  const database = {
    db: {
      transaction: async <T>(operation: (tx: never) => Promise<T>) =>
        operation(transaction as never),
    },
  };
  return {
    store: new DatabaseSteamAuthStore(database as never),
    records: { users, identities },
  };
}

describe('Steam identity linking rules', () => {
  it('allows an unclaimed Steam identity to be attached', () => {
    expect(assertSteamLinkAvailable('owner-a', undefined, undefined, '76561198000000000')).toBe(
      'attach',
    );
  });

  it('treats linking the same Steam identity to the same owner as idempotent', () => {
    expect(
      assertSteamLinkAvailable('owner-a', 'owner-a', '76561198000000000', '76561198000000000'),
    ).toBe('already-linked');
  });

  it('rejects a Steam identity already owned by another canonical account', () => {
    expect(() =>
      assertSteamLinkAvailable('owner-a', 'owner-b', undefined, '76561198000000000'),
    ).toThrow(ConflictException);
  });

  it('rejects replacing a different Steam identity already linked to this account', () => {
    expect(() =>
      assertSteamLinkAvailable('owner-a', undefined, '76561198000000001', '76561198000000000'),
    ).toThrow(ConflictException);
  });

  it('logs into the canonical account already linked to Steam', async () => {
    const { store } = storeWith({
      users: [{ id: ownerId, firebaseUid: 'firebase-google-uid' }],
      identities: [{ userId: ownerId, provider: 'steam', subject: steamId }],
    });
    await expect(store.loginSteam(steamId)).resolves.toBe('firebase-google-uid');
  });

  it('creates one deterministic Steam identity on first login and reuses it', async () => {
    const { store, records } = storeWith();
    const firstUid = await store.loginSteam(steamId);
    const secondUid = await store.loginSteam(steamId);
    expect(firstUid).toBe(`steam:${steamId}`);
    expect(secondUid).toBe(firstUid);
    expect(records.users).toHaveLength(1);
    expect(records.identities).toEqual([{ userId: ownerId, provider: 'steam', subject: steamId }]);
  });

  it('rejects linking a Steam identity that belongs to a different owner', async () => {
    const { store } = storeWith({
      users: [
        { id: ownerId, firebaseUid: 'firebase-google-uid' },
        { id: otherOwnerId, firebaseUid: 'steam:76561198000000001' },
      ],
      identities: [{ userId: otherOwnerId, provider: 'steam', subject: steamId }],
    });
    await expect(store.linkSteam('firebase-google-uid', steamId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
