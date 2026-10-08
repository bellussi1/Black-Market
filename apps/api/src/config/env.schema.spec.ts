import { describe, expect, it } from 'vitest';

import { envSchema, validateEnvironment } from './env.schema';
const local = { DATABASE_URL: 'postgresql://local:example@localhost/database' };
describe('environment boundaries', () => {
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
  it('requires paired public identity settings and an analytics key for activation', () => {
    expect(
      envSchema.safeParse({ ...local, SUPABASE_URL: 'https://example.supabase.co' }).success,
    ).toBe(false);
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
    expect(
      envSchema.safeParse({
        ...local,
        SUPABASE_URL: 'https://user:secret@identity.example',
        SUPABASE_PUBLIC_KEY: 'sb_publishable_example_public_key',
      }).success,
    ).toBe(false);
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
