import { authUsers } from '@bdo/database/schema';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdentityService } from './identity.service';

const ownerId = '00000000-0000-4000-8000-000000000101';
const anotherOwnerId = '00000000-0000-4000-8000-000000000102';

type FakeIdentity = { userId: string; provider: 'google' | 'steam'; subject: string };
type FakeUser = { id: string; firebaseUid: string };

function fakeDatabase(seed: { users?: FakeUser[]; identities?: FakeIdentity[] } = {}) {
  const users = [...(seed.users ?? [])];
  const identities = [...(seed.identities ?? [])];
  let nextId = ownerId;
  const tx = {
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
});
