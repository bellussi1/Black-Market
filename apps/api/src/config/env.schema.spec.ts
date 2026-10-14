import { describe, expect, it } from 'vitest';

import { envSchema, validateEnvironment } from './env.schema';
const local = { DATABASE_URL: 'postgresql://local:example@localhost/database' };
const projectId = 'black-market-test';
const firebaseServiceAccount = Buffer.from(
  JSON.stringify({
    type: 'service_account',
    project_id: projectId,
    private_key_id: 'test-key-id',
    private_key: 'test-private-key',
    client_email: 'firebase-admin@example.test',
  }),
).toString('base64');
const firebase = {
  FIREBASE_PROJECT_ID: projectId,
  FIREBASE_AUTH_DOMAIN: projectId + '.firebaseapp.com',
  FIREBASE_API_KEY: 'AIzaSyA12345678901234567890123',
  FIREBASE_APP_ID: '1:123456789:web:abcdef0123456789',
  FIREBASE_ADMIN_CREDENTIALS_BASE64: firebaseServiceAccount,
};
describe('environment boundaries', () => {
  it('keeps optional Firebase auth disabled for local use', () => {
    const config = envSchema.parse(local);
    expect(config.APP_ENV).toBe('local');
    expect(config.FIREBASE_PROJECT_ID).toBeUndefined();
    expect(config.FIREBASE_ADMIN_CREDENTIALS_BASE64).toBeUndefined();
  });
  it('accepts a complete Firebase configuration', () => {
    const config = envSchema.parse({ ...local, ...firebase });
    expect(config.FIREBASE_PROJECT_ID).toBe(projectId);
    expect(config.FIREBASE_ADMIN_CREDENTIALS_BASE64).toBe(firebaseServiceAccount);
  });
  it('rejects partial Firebase configuration', () => {
    expect(envSchema.safeParse({ ...local, FIREBASE_PROJECT_ID: projectId }).success).toBe(false);
  });
  it('requires an HTTPS Steam callback in staging and production', () => {
    const base = {
      ...local,
      ...firebase,
      NODE_ENV: 'production',
      APP_ENV: 'staging',
      PUBLIC_SITE_URL: 'https://staging.example.test',
      WEB_ORIGIN: 'https://staging.example.test',
    };
    expect(
      envSchema.safeParse({
        ...base,
        STEAM_OPENID_CALLBACK_URL: 'http://staging.example.test/api/v1/identity/steam/callback',
      }).success,
    ).toBe(false);
    expect(
      envSchema.safeParse({
        ...base,
        STEAM_OPENID_CALLBACK_URL: 'https://staging.example.test/api/v1/identity/steam/callback',
      }).success,
    ).toBe(true);
  });
  it('rejects a staging seed UID outside staging', () => {
    expect(
      envSchema.safeParse({
        ...local,
        APP_ENV: 'local',
        STAGING_TEST_FIREBASE_UID: 'test-firebase-uid',
      }).success,
    ).toBe(false);
  });
  it('keeps board observations disabled by default and accepts an explicit opt in', () => {
    expect(envSchema.parse(local).MARKET_BOARD_COLLECTOR_ENABLED).toBe(false);
    expect(
      envSchema.parse({ ...local, MARKET_BOARD_COLLECTOR_ENABLED: 'true' })
        .MARKET_BOARD_COLLECTOR_ENABLED,
    ).toBe(true);
  });
  it('normalizes a development web origin', () => {
    expect(envSchema.parse({ ...local, WEB_ORIGIN: 'http://localhost:4200/path' }).WEB_ORIGIN).toBe(
      'http://localhost:4200',
    );
  });
  it('requires matching HTTPS production origins', () => {
    expect(envSchema.safeParse({ ...local, NODE_ENV: 'production' }).success).toBe(false);
    expect(
      envSchema.safeParse({
        ...local,
        NODE_ENV: 'production',
        PUBLIC_SITE_URL: 'https://platform.example',
        WEB_ORIGIN: 'https://platform.example',
      }).success,
    ).toBe(true);
    expect(
      envSchema.safeParse({
        ...local,
        NODE_ENV: 'production',
        PUBLIC_SITE_URL: 'https://platform.example',
        WEB_ORIGIN: 'https://different.example',
      }).success,
    ).toBe(false);
  });
  it('requires an analytics key for activation', () => {
    expect(envSchema.safeParse({ ...local, ANALYTICS_ENABLED: 'true' }).success).toBe(false);
  });
  it('never includes values in configuration failure messages', () => {
    expect(() => validateEnvironment({ DATABASE_URL: 'private-secret' })).toThrow('DATABASE_URL');
    try {
      validateEnvironment({ DATABASE_URL: 'private-secret' });
    } catch (error) {
      expect(String(error)).not.toContain('private-secret');
    }
  });
  it('rejects credentials or tracking parameters in public URLs and non-Postgres connections', () => {
    for (const PUBLIC_SITE_URL of [
      'https://user:secret@platform.example',
      'https://platform.example?token=secret',
      'https://platform.example/path',
    ])
      expect(envSchema.safeParse({ ...local, PUBLIC_SITE_URL }).success).toBe(false);
    expect(envSchema.safeParse({ DATABASE_URL: 'https://database.example' }).success).toBe(false);
    expect(() =>
      validateEnvironment({
        ...local,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://platform.example',
        PUBLIC_SITE_URL: 'private-secret',
      }),
    ).toThrow('PUBLIC_SITE_URL');
  });
});
