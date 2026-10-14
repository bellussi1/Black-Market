import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SteamOpenIdService } from './steam-openid.service';

const config = () =>
  new ConfigService({
    STEAM_OPENID_CALLBACK_URL: 'http://localhost:3000/api/v1/identity/steam/callback',
    WEB_ORIGIN: 'http://localhost:4200',
  });

function validResponse(overrides: Record<string, string> = {}) {
  return new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.op_endpoint': 'https://steamcommunity.com/openid/',
    'openid.claimed_id': 'http://steamcommunity.com/openid/id/76561198000000000',
    'openid.identity': 'http://steamcommunity.com/openid/id/76561198000000000',
    'openid.return_to':
      'http://localhost:3000/api/v1/identity/steam/callback?state=' + 's'.repeat(43),
    'openid.response_nonce': '2026-10-14T12:00:00Zunique',
    'openid.assoc_handle': 'handle',
    'openid.signed': 'ns,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
    'openid.sig': 'signed-payload',
    ...overrides,
  });
}

describe('SteamOpenIdService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds a login URL with the configured callback and realm', () => {
    const service = new SteamOpenIdService(config());
    const url = service.loginUrl(
      's'.repeat(43),
      'http://localhost:3000/api/v1/identity/steam/callback?state=' + 's'.repeat(43),
      'http://localhost:4200/',
    );
    expect(url.origin + url.pathname).toBe('https://steamcommunity.com/openid/');
    expect(url.searchParams.get('openid.return_to')).toBe(
      'http://localhost:3000/api/v1/identity/steam/callback?state=' + 's'.repeat(43),
    );
    expect(url.searchParams.get('openid.realm')).toBe('http://localhost:4200/');
    expect(url.searchParams.get('openid.mode')).toBe('checkid_setup');
  });

  it('rejects a different return URL before contacting Steam', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(
      new SteamOpenIdService(config()).verifyCallback(
        validResponse({ 'openid.return_to': 'https://attacker.test/callback?state=state-token' }),
        'http://localhost:3000/api/v1/identity/steam/callback?state=' + 's'.repeat(43),
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects missing signed fields before contacting Steam', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(
      new SteamOpenIdService(config()).verifyCallback(
        validResponse({ 'openid.signed': 'claimed_id,identity,return_to' }),
        'http://localhost:3000/api/v1/identity/steam/callback?state=state-token',
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('accepts the OpenID 2.0 required signed fields without requiring the namespace to be signed', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('is_valid:true\n'));
    vi.stubGlobal('fetch', fetcher);
    await expect(
      new SteamOpenIdService(config()).verifyCallback(
        validResponse({
          'openid.signed': 'op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
        }),
        'http://localhost:3000/api/v1/identity/steam/callback?state=' + 's'.repeat(43),
      ),
    ).resolves.toEqual({ steamId: '76561198000000000' });
    expect(fetcher).toHaveBeenCalledWith(
      'https://steamcommunity.com/openid/',
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    );
    expect((fetcher.mock.calls[0]?.[1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    expect(
      ((fetcher.mock.calls[0]?.[1] as RequestInit).body as URLSearchParams).get('openid.mode'),
    ).toBe('check_authentication');
  });

  it('rejects Steam check_authentication is_valid false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('is_valid:false\n')));
    await expect(
      new SteamOpenIdService(config()).verifyCallback(
        validResponse(),
        'http://localhost:3000/api/v1/identity/steam/callback?state=state-token',
      ),
    ).rejects.toThrow();
  });

  it('rejects a noncanonical claimed ID', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(
      new SteamOpenIdService(config()).verifyCallback(
        validResponse({
          'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000',
          'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000',
        }),
        'http://localhost:3000/api/v1/identity/steam/callback?state=state-token',
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects a 64-bit Steam identifier outside the individual account range', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const invalidId = '76561202255233024';
    await expect(
      new SteamOpenIdService(config()).verifyCallback(
        validResponse({
          'openid.claimed_id': `http://steamcommunity.com/openid/id/${invalidId}`,
          'openid.identity': `http://steamcommunity.com/openid/id/${invalidId}`,
        }),
        'http://localhost:3000/api/v1/identity/steam/callback?state=' + 's'.repeat(43),
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
