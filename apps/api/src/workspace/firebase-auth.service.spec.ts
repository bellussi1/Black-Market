import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adminAuth, cert, getAuth, getApps, initializeApp } = vi.hoisted(() => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
    getUser: vi.fn(),
    createCustomToken: vi.fn(),
  },
  cert: vi.fn((account: unknown) => account),
  getAuth: vi.fn(),
  getApps: vi.fn(),
  initializeApp: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({ cert, getApps, initializeApp }));
vi.mock('firebase-admin/auth', () => ({ getAuth }));

import { FirebaseAuthService } from './firebase-auth.service';

const projectId = 'black-market-test';
const credentials = Buffer.from(
  JSON.stringify({
    type: 'service_account',
    project_id: projectId,
    private_key_id: 'test-key-id',
    private_key: 'test-private-key',
    client_email: 'firebase-admin@example.test',
  }),
).toString('base64');

function service(config: Record<string, unknown> = {}) {
  return new FirebaseAuthService(
    new ConfigService({
      FIREBASE_PROJECT_ID: projectId,
      FIREBASE_AUTH_DOMAIN: projectId + '.firebaseapp.com',
      FIREBASE_API_KEY: 'AIzaSyA12345678901234567890123',
      FIREBASE_APP_ID: '1:123456789:web:abcdef0123456789',
      FIREBASE_ADMIN_CREDENTIALS_BASE64: credentials,
      ...config,
    }),
  );
}

describe('FirebaseAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApps.mockReturnValue([]);
    initializeApp.mockReturnValue({ name: 'black-market-auth', options: { projectId } });
    getAuth.mockReturnValue(adminAuth);
  });

  it('verifies Firebase ID tokens and checks revocation', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'firebase-uid' });
    await expect(service().verifyIdToken('signed-id-token')).resolves.toEqual({
      uid: 'firebase-uid',
    });
    expect(adminAuth.verifyIdToken).toHaveBeenCalledWith('signed-id-token', true);
  });

  it('reads Firebase provider data from the Admin SDK', async () => {
    adminAuth.getUser.mockResolvedValue({ uid: 'firebase-uid' });
    await expect(service().getUser('firebase-uid')).resolves.toEqual({ uid: 'firebase-uid' });
    expect(adminAuth.getUser).toHaveBeenCalledWith('firebase-uid');
  });

  it('creates a Firebase custom token only for the requested UID', async () => {
    adminAuth.createCustomToken.mockResolvedValue('custom-token');
    await expect(service().createCustomToken('steam:76561198000000000')).resolves.toBe(
      'custom-token',
    );
    expect(adminAuth.createCustomToken).toHaveBeenCalledWith('steam:76561198000000000');
  });

  it('keeps the identity boundary closed when Firebase Admin is not configured', async () => {
    await expect(
      service({ FIREBASE_ADMIN_CREDENTIALS_BASE64: undefined }).verifyIdToken('token'),
    ).rejects.toThrow('ainda não está disponível');
  });
});
