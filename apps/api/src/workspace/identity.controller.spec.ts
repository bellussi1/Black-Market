import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { IdentityController } from './identity.controller';

function response() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    redirect: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

describe('IdentityController', () => {
  it('sets a browser-bound HttpOnly state cookie before redirecting to Steam', async () => {
    const identity = { firebaseUid: vi.fn() };
    const steam = {
      beginLogin: vi.fn().mockResolvedValue({
        url: new URL('https://steamcommunity.com/openid/?state=opaque'),
        stateCookie: 's'.repeat(43),
      }),
    };
    const controller = new IdentityController(
      identity as never,
      steam as never,
      {
        get: () => 'http://localhost:4200',
      } as never,
    );
    const res = response();
    await controller.steamStart('a'.repeat(43), res as never);
    expect(res.cookie).toHaveBeenCalledWith(
      'steam_auth_state',
      's'.repeat(43),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', secure: false, maxAge: 300000 }),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      'https://steamcommunity.com/openid/?state=opaque',
    );
  });

  it('starts Steam linking only for the Firebase UID resolved from the bearer session', async () => {
    const identity = { firebaseUid: vi.fn().mockResolvedValue('verified-firebase-uid') };
    const steam = {
      beginLink: vi.fn().mockResolvedValue({
        url: new URL('https://steamcommunity.com/openid/?state=opaque'),
        stateCookie: 's'.repeat(43),
      }),
    };
    const controller = new IdentityController(
      identity as never,
      steam as never,
      { get: () => 'https://platform.example' } as never,
    );
    const res = response();
    await controller.steamLinkStart('Bearer firebase-id-token', res as never);
    expect(identity.firebaseUid).toHaveBeenCalledWith('Bearer firebase-id-token');
    expect(steam.beginLink).toHaveBeenCalledWith('verified-firebase-uid');
    expect(res.cookie).toHaveBeenCalledWith(
      'steam_auth_state',
      's'.repeat(43),
      expect.objectContaining({ secure: true, httpOnly: true, sameSite: 'lax' }),
    );
    expect(res.json).toHaveBeenCalledWith({
      url: 'https://steamcommunity.com/openid/?state=opaque',
    });
  });

  it('clears the state cookie on callback and redirects to a fixed local fragment', async () => {
    const identity = {};
    const steam = {
      completeCallback: vi
        .fn()
        .mockResolvedValue({ redirectUrl: 'http://localhost:4200/account#steam-linked' }),
    };
    const controller = new IdentityController(
      identity as never,
      steam as never,
      {
        get: () => 'http://localhost:4200',
      } as never,
    );
    const res = response();
    await controller.steamCallback(
      {
        originalUrl: `/api/v1/identity/steam/callback?state=${'s'.repeat(43)}`,
        headers: { cookie: `steam_auth_state=${'s'.repeat(43)}` },
      } as never,
      res as never,
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'steam_auth_state',
      expect.objectContaining({ path: '/api/v1/identity/steam' }),
    );
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');
    expect(res.redirect).toHaveBeenCalledWith(302, 'http://localhost:4200/account#steam-linked');
    expect(steam.completeCallback).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      's'.repeat(43),
    );
  });

  it('replaces any unexpected callback redirect with a fixed local error fragment', async () => {
    const controller = new IdentityController(
      {} as never,
      {
        completeCallback: vi.fn().mockResolvedValue({ redirectUrl: 'https://attacker.test/' }),
      } as never,
      { get: () => 'http://localhost:4200' } as never,
    );
    const res = response();
    await controller.steamCallback(
      {
        originalUrl: `/api/v1/identity/steam/callback?state=${'s'.repeat(43)}`,
        headers: { cookie: `steam_auth_state=${'s'.repeat(43)}` },
      } as never,
      res as never,
    );
    expect(res.redirect).toHaveBeenCalledWith(302, 'http://localhost:4200/account#steam-error');
  });

  it('reports an already-linked Steam account with a fixed conflict code', async () => {
    const controller = new IdentityController(
      {} as never,
      { completeCallback: vi.fn().mockRejectedValue(new ConflictException()) } as never,
      { get: () => 'http://localhost:4200' } as never,
    );
    const res = response();
    await controller.steamCallback(
      {
        originalUrl: `/api/v1/identity/steam/callback?state=${'s'.repeat(43)}`,
        headers: { cookie: `steam_auth_state=${'s'.repeat(43)}` },
      } as never,
      res as never,
    );
    expect(res.redirect).toHaveBeenCalledWith(302, 'http://localhost:4200/account#steam-conflict');
  });

  it('keeps exchange tokens out of cacheable responses', async () => {
    const controller = new IdentityController(
      {} as never,
      { exchange: vi.fn().mockResolvedValue('firebase-custom-token') } as never,
      {} as never,
    );
    const res = response();
    await expect(
      controller.steamExchange({ code: 'c'.repeat(43), verifier: 'v'.repeat(43) }, res as never),
    ).resolves.toEqual({ customToken: 'firebase-custom-token' });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('delegates Google linking to the verified identity service', async () => {
    const identity = { linkGoogle: vi.fn().mockResolvedValue({ linked: true }) };
    const controller = new IdentityController(identity as never, {} as never, {} as never);
    await expect(controller.googleLink('Bearer firebase-id-token')).resolves.toEqual({
      linked: true,
    });
    expect(identity.linkGoogle).toHaveBeenCalledWith('Bearer firebase-id-token');
  });
});
