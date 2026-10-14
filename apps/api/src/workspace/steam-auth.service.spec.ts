import { createHash } from 'node:crypto';

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SteamAuthService } from './steam-auth.service';

const now = new Date('2026-10-14T12:00:00.000Z');
const verifier = 'a'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');

function createStore() {
  const attempts = new Map<string, Record<string, unknown>>();
  const exchanges = new Map<string, Record<string, unknown>>();
  const fake = {
    attempts,
    exchanges,
    createAttempt: vi.fn((row: Record<string, unknown>) => {
      attempts.set(String(row.stateHash), row);
      return Promise.resolve();
    }),
    findAttempt: vi.fn((hash: string) => Promise.resolve(attempts.get(hash) ?? null)),
    consumeAttempt: vi.fn((hash: string) => {
      const row = attempts.get(hash);
      if (!row || row['consumedAt'] || (row['expiresAt'] as Date) <= now)
        return Promise.resolve(false);
      row['consumedAt'] = now;
      return Promise.resolve(true);
    }),
    loginSteam: vi.fn(() => Promise.resolve('steam:76561198000000000')),
    linkSteam: vi.fn(() => Promise.resolve()),
    createExchange: vi.fn((row: Record<string, unknown>) => {
      exchanges.set(String(row.codeHash), row);
      return Promise.resolve();
    }),
    findExchange: vi.fn((hash: string) => Promise.resolve(exchanges.get(hash) ?? null)),
    consumeExchange: vi.fn((hash: string) => {
      const row = exchanges.get(hash);
      if (!row || row['consumedAt'] || (row['expiresAt'] as Date) <= now)
        return Promise.resolve(false);
      row['consumedAt'] = now;
      return Promise.resolve(true);
    }),
  };
  return fake;
}

function makeService(store = createStore()) {
  const openid = {
    loginUrl: vi.fn().mockReturnValue(new URL('https://steamcommunity.com/openid/')),
    verifyCallback: vi.fn().mockResolvedValue({ steamId: '76561198000000000' }),
  };
  const firebase = { createCustomToken: vi.fn().mockResolvedValue('firebase-custom-token') };
  const service = new SteamAuthService(
    new ConfigService({
      WEB_ORIGIN: 'http://localhost:4200',
      STEAM_OPENID_CALLBACK_URL: 'http://localhost:3000/api/v1/identity/steam/callback',
    }),
    store as never,
    openid as never,
    firebase as never,
  );
  return { service, store, openid, firebase };
}

describe('SteamAuthService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('consumes state only once', async () => {
    const { service, store } = makeService();
    vi.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const attempt = await service.beginLogin(challenge);
    const params = new URLSearchParams({ state: attempt.stateCookie });
    const results = await Promise.allSettled([
      service.completeCallback(params, attempt.stateCookie),
      service.completeCallback(params, attempt.stateCookie),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(store.consumeAttempt).toHaveBeenCalledTimes(2);
  });

  it('rejects a callback without the matching browser cookie', async () => {
    const { service, openid } = makeService();
    const attempt = await service.beginLogin(challenge);
    await expect(
      service.completeCallback(new URLSearchParams({ state: attempt.stateCookie }), 'other-cookie'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(openid.verifyCallback).not.toHaveBeenCalled();
  });

  it('rejects expired state', async () => {
    const { service, store, openid } = makeService();
    const attempt = await service.beginLogin(challenge);
    const stateHash = [...store.attempts.keys()][0];
    store.attempts.get(stateHash)!['expiresAt'] = new Date('2026-10-14T11:59:59.000Z');
    await expect(
      service.completeCallback(
        new URLSearchParams({ state: attempt.stateCookie }),
        attempt.stateCookie,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(openid.verifyCallback).not.toHaveBeenCalled();
  });

  it('rejects a mismatched PKCE verifier without consuming the exchange', async () => {
    const { service, store } = makeService();
    const code = 'b'.repeat(43);
    const codeHash = createHash('sha256').update(code).digest('hex');
    store.exchanges.set(codeHash, {
      codeChallenge: challenge,
      firebaseUid: 'steam:76561198000000000',
      expiresAt: new Date('2026-10-14T12:05:00.000Z'),
      consumedAt: null,
    });
    await expect(service.exchange(code, 'b'.repeat(43))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(store.consumeExchange).not.toHaveBeenCalled();
  });

  it('consumes an exchange only once', async () => {
    const { service, store, firebase } = makeService();
    vi.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const attempt = await service.beginLogin(challenge);
    const callback = await service.completeCallback(
      new URLSearchParams({ state: attempt.stateCookie }),
      attempt.stateCookie,
    );
    const code = new URL(callback.redirectUrl).hash.slice('#steam-code='.length);
    const results = await Promise.allSettled([
      service.exchange(code, verifier),
      service.exchange(code, verifier),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(firebase.createCustomToken).toHaveBeenCalledTimes(1);
    expect(store.consumeExchange).toHaveBeenCalledTimes(1);
  });

  it('logs into an existing linked Steam identity', async () => {
    const { service, store, openid } = makeService();
    const attempt = await service.beginLogin(challenge);
    const result = await service.completeCallback(
      new URLSearchParams({ state: attempt.stateCookie }),
      attempt.stateCookie,
    );
    expect(openid.verifyCallback).toHaveBeenCalledOnce();
    expect(store.loginSteam).toHaveBeenCalledWith('76561198000000000');
    expect(result.redirectUrl).toMatch(/^http:\/\/localhost:4200\/account#steam-code=/);
  });

  it('links Steam to the authenticated Firebase UID', async () => {
    const { service, store } = makeService();
    const attempt = await service.beginLink('verified-firebase-uid');
    await service.completeCallback(
      new URLSearchParams({ state: attempt.stateCookie }),
      attempt.stateCookie,
    );
    expect(store.linkSteam).toHaveBeenCalledWith('verified-firebase-uid', '76561198000000000');
    expect(store.createExchange).not.toHaveBeenCalled();
  });

  it('rejects an identity already owned by another account', async () => {
    const { service, store } = makeService();
    store.linkSteam.mockRejectedValue(new ConflictException('Já vinculada.'));
    const attempt = await service.beginLink('verified-firebase-uid');
    await expect(
      service.completeCallback(
        new URLSearchParams({ state: attempt.stateCookie }),
        attempt.stateCookie,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(store.createExchange).not.toHaveBeenCalled();
  });
});
