import { authUsers } from '@bdo/database/schema';
import { ConfigService } from '@nestjs/config';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assertGoogleLinkAvailable, IdentityService } from './identity.service';

const ownerId = '00000000-0000-4000-8000-000000000101';
const anotherOwnerId = '00000000-0000-4000-8000-000000000102';

type FakeIdentity = { userId: string; provider: 'google' | 'steam'; subject: string };
type FakeUser = { id: string; firebaseUid: string };

function fakeDatabase(seed: { users?: FakeUser[]; identities?: FakeIdentity[] } = {}) {
  const users = [...(seed.users ?? [])];
  const identities = [...(seed.identities ?? [])];
  let nextId = ownerId;
  const tx = {
    execute: vi.fn((_query: SQL) => Promise.resolve()),
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
            if (!users.some((user) => user.firebaseUid === value.firebaseUid))
              users.push({ id: nextId, firebaseUid: String(value.firebaseUid) });
            nextId = anotherOwnerId;
            return Promise.resolve();
          }
          const identity = value as unknown as FakeIdentity;
          if (
            !identities.some(
              (row) =>
                (row.provider === identity.provider && row.subject === identity.subject) ||
                (row.provider === identity.provider && row.userId === identity.userId),
            )
          )
            identities.push(identity);
          return Promise.resolve();
        },
      }),
    }),
  };
  return {
    db: {
      ...tx,
      transaction: async <T>(operation: (transaction: typeof tx) => Promise<T>) => operation(tx),
    },
    records: { users, identities },
  };
}

function firebaseAuth(uid = 'firebase-google-uid') {
  return {
    enabled: true,
    verifyIdToken: vi.fn().mockResolvedValue({
      uid,
      firebase: { sign_in_provider: 'google.com' },
    }),
    getUser: vi.fn().mockResolvedValue({
      uid,
      displayName: 'Tester',
      email: 'tester@example.test',
      photoURL: 'https://example.test/avatar.png',
      providerData: [{ providerId: 'google.com', uid: 'google-subject-1' }],
    }),
    createCustomToken: vi.fn(),
  };
}

describe('Identity boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires a bearer credential', async () => {
    const auth = firebaseAuth();
    const database = fakeDatabase();
    const identity = new IdentityService(new ConfigService(), database as never, auth as never);
    await expect(identity.owner(undefined)).rejects.toThrow('Entre na sua conta');
    expect(auth.verifyIdToken).not.toHaveBeenCalled();
  });

  it('provisions a canonical owner for a verified Google user', async () => {
    const auth = firebaseAuth();
    const database = fakeDatabase();
    const identity = new IdentityService(new ConfigService(), database as never, auth as never);
    await expect(identity.owner('Bearer credential')).resolves.toBe(ownerId);
    expect(database.records.users).toEqual([{ id: ownerId, firebaseUid: 'firebase-google-uid' }]);
    expect(database.records.identities).toEqual([
      { userId: ownerId, provider: 'google', subject: 'google-subject-1' },
    ]);
    expect(
      database.db.execute.mock.calls.map(([query]) => new PgDialect().sqlToQuery(query).params),
    ).toEqual([['firebase-google-uid'], [], ['google-subject-1'], [ownerId]]);
  });

  it('reuses the Google mapping on subsequent requests', async () => {
    const auth = firebaseAuth();
    const database = fakeDatabase({
      users: [{ id: ownerId, firebaseUid: 'firebase-google-uid' }],
      identities: [{ userId: ownerId, provider: 'google', subject: 'google-subject-1' }],
    });
    const identity = new IdentityService(new ConfigService(), database as never, auth as never);
    await expect(identity.owner('Bearer credential')).resolves.toBe(ownerId);
    await expect(identity.owner('Bearer credential')).resolves.toBe(ownerId);
    expect(database.records.users).toHaveLength(1);
    expect(database.records.identities).toHaveLength(1);
  });

  it('accepts a known Steam custom-token UID', async () => {
    const auth = firebaseAuth('steam:76561198000000000');
    auth.verifyIdToken.mockResolvedValue({
      uid: 'steam:76561198000000000',
      firebase: { sign_in_provider: 'custom' },
    });
    const database = fakeDatabase({
      users: [{ id: ownerId, firebaseUid: 'steam:76561198000000000' }],
      identities: [{ userId: ownerId, provider: 'steam', subject: '76561198000000000' }],
    });
    const identity = new IdentityService(new ConfigService(), database as never, auth as never);
    await expect(identity.owner('Bearer steam-token')).resolves.toBe(ownerId);
  });

  it('returns the verified Firebase UID for provider linking', async () => {
    const auth = firebaseAuth();
    const identity = new IdentityService(
      new ConfigService(),
      fakeDatabase() as never,
      auth as never,
    );
    await expect(identity.firebaseUid('Bearer credential')).resolves.toBe('firebase-google-uid');
  });

  it('links a verified Google identity to the current Steam account', async () => {
    const auth = firebaseAuth('steam:76561198000000000');
    auth.verifyIdToken.mockResolvedValue({
      uid: 'steam:76561198000000000',
      firebase: { sign_in_provider: 'custom' },
    });
    auth.getUser.mockResolvedValue({
      uid: 'steam:76561198000000000',
      providerData: [{ providerId: 'google.com', uid: 'google-subject-1' }],
    });
    const database = fakeDatabase({
      users: [{ id: ownerId, firebaseUid: 'steam:76561198000000000' }],
      identities: [{ userId: ownerId, provider: 'steam', subject: '76561198000000000' }],
    });
    const identities = database.records.identities;
    let transactionCount = 0;
    database.db.transaction = async <T>(operation: (tx: never) => Promise<T>) => {
      transactionCount++;
      let reads = 0;
      const tx = {
        execute: vi.fn((_query: SQL) => Promise.resolve()),
        select: () => ({
          from: (table: unknown) => ({
            where: () => ({
              limit: () => {
                reads++;
                return Promise.resolve(
                  transactionCount === 1
                    ? table === authUsers
                      ? database.records.users
                      : identities
                    : reads <= 2
                      ? []
                      : identities.filter(
                          (row) => row.provider === 'google' && row.userId === ownerId,
                        ),
                );
              },
            }),
          }),
        }),
        insert: () => ({
          values: (value: Record<string, unknown>) => ({
            onConflictDoNothing: () => {
              identities.push(value as unknown as FakeIdentity);
              return Promise.resolve();
            },
          }),
        }),
      };
      return operation(tx as never);
    };
    const identity = new IdentityService(new ConfigService(), database as never, auth as never);
    const linked = await identity.linkGoogle('Bearer steam-token').then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    expect(auth.verifyIdToken).toHaveBeenCalledWith('steam-token');
    expect(auth.getUser).toHaveBeenCalledWith('steam:76561198000000000');
    expect(linked).toEqual({ value: { linked: true } });
    expect(identities).toContainEqual({
      userId: ownerId,
      provider: 'google',
      subject: 'google-subject-1',
    });
  });

  it('rejects Google linking when Firebase does not prove a Google provider', async () => {
    const auth = firebaseAuth('steam:76561198000000000');
    auth.verifyIdToken.mockResolvedValue({
      uid: 'steam:76561198000000000',
      firebase: { sign_in_provider: 'custom' },
    });
    auth.getUser.mockResolvedValue({
      uid: 'steam:76561198000000000',
      email: 'same-email@example.test',
      providerData: [],
    });
    const identity = new IdentityService(
      new ConfigService(),
      fakeDatabase({
        users: [{ id: ownerId, firebaseUid: 'steam:76561198000000000' }],
        identities: [{ userId: ownerId, provider: 'steam', subject: '76561198000000000' }],
      }) as never,
      auth as never,
    );
    await expect(identity.linkGoogle('Bearer steam-token')).rejects.toThrow('Google');
  });

  it('rejects an unmapped custom-token UID', async () => {
    const auth = firebaseAuth('steam:76561198000000000');
    auth.verifyIdToken.mockResolvedValue({
      uid: 'steam:76561198000000000',
      firebase: { sign_in_provider: 'custom' },
    });
    const identity = new IdentityService(
      new ConfigService(),
      fakeDatabase() as never,
      auth as never,
    );
    await expect(identity.owner('Bearer steam-token')).rejects.toThrow('sessão expirou');
  });

  it('rejects expired or revoked Firebase tokens', async () => {
    const auth = firebaseAuth();
    auth.verifyIdToken.mockRejectedValue(new Error('Firebase ID token has been revoked'));
    const identity = new IdentityService(
      new ConfigService(),
      fakeDatabase() as never,
      auth as never,
    );
    await expect(identity.owner('Bearer revoked-token')).rejects.toThrow('sessão expirou');
    expect(auth.verifyIdToken).toHaveBeenCalledWith('revoked-token');
  });

  it('rejects a token for another Firebase project', async () => {
    const auth = firebaseAuth();
    auth.verifyIdToken.mockRejectedValue(new Error('Firebase ID token has incorrect audience'));
    const identity = new IdentityService(
      new ConfigService(),
      fakeDatabase() as never,
      auth as never,
    );
    await expect(identity.owner('Bearer wrong-project-token')).rejects.toThrow('sessão expirou');
  });

  it('allows roadmap edits only for a server-allowlisted UID', async () => {
    const auth = firebaseAuth();
    const database = fakeDatabase();
    const identity = new IdentityService(
      new ConfigService({ ROADMAP_ADMIN_FIREBASE_UIDS: 'firebase-google-uid' }),
      database as never,
      auth as never,
    );
    await expect(identity.roadmapAdmin('Bearer credential')).resolves.toBe(ownerId);
    const denied = new IdentityService(
      new ConfigService({ ROADMAP_ADMIN_FIREBASE_UIDS: 'some-other-uid' }),
      database as never,
      auth as never,
    );
    await expect(denied.roadmapAdmin('Bearer credential')).rejects.toThrow('permissão');
  });

  it('returns profile and linked providers without exposing the canonical owner UUID', async () => {
    const auth = firebaseAuth();
    const database = fakeDatabase({
      users: [{ id: ownerId, firebaseUid: 'firebase-google-uid' }],
      identities: [
        { userId: ownerId, provider: 'google', subject: 'google-subject-1' },
        { userId: ownerId, provider: 'steam', subject: '76561198000000000' },
      ],
    });
    const identity = new IdentityService(new ConfigService(), database as never, auth as never);
    const profile = await identity.me('Bearer credential');
    expect(profile).toEqual({
      authenticated: true,
      displayName: 'Tester',
      email: 'tester@example.test',
      photoURL: 'https://example.test/avatar.png',
      providers: ['google', 'steam'],
      canManageRoadmap: false,
    });
    expect(profile).not.toHaveProperty('userId');
  });

  it('returns Firebase Web settings without exposing Admin credentials', () => {
    const identity = new IdentityService(
      new ConfigService({
        FIREBASE_PROJECT_ID: 'black-market-test',
        FIREBASE_AUTH_DOMAIN: 'black-market-test.firebaseapp.com',
        FIREBASE_API_KEY: 'AIzaSyA12345678901234567890123',
        FIREBASE_APP_ID: '1:123456789:web:abcdef0123456789',
        FIREBASE_ADMIN_CREDENTIALS_BASE64: 'server-only-secret',
        STEAM_OPENID_CALLBACK_URL: 'https://staging.example.test/api/v1/identity/steam/callback',
      }),
      fakeDatabase() as never,
      firebaseAuth() as never,
    );
    expect(identity.publicConfig()).toEqual({
      enabled: true,
      googleEnabled: true,
      steamEnabled: true,
      apiKey: 'AIzaSyA12345678901234567890123',
      authDomain: 'black-market-test.firebaseapp.com',
      projectId: 'black-market-test',
      appId: '1:123456789:web:abcdef0123456789',
    });
    expect(identity.publicConfig()).not.toHaveProperty('adminCredentials');
    expect(JSON.stringify(identity.publicConfig())).not.toContain('server-only-secret');
  });

  it('rejects linking a Google subject already assigned to another owner', () => {
    expect(() =>
      assertGoogleLinkAvailable('owner-a', 'owner-b', undefined, 'google-subject-1'),
    ).toThrow('outra conta');
  });

  it('rejects replacing the Google identity already linked to this owner', () => {
    expect(() =>
      assertGoogleLinkAvailable('owner-a', 'owner-a', 'google-subject-1', 'google-subject-2'),
    ).toThrow('Outra conta Google');
  });
});
