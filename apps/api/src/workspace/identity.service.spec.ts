import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser } }) }));
import { IdentityService } from './identity.service';
describe('Identity boundary', () => {
  beforeEach(() => getUser.mockReset());
  const service = () =>
    new IdentityService(
      new ConfigService({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_PUBLIC_KEY: 'sb_publishable_public_key_only',
      }),
    );
  it('requires a bearer credential', async () => {
    await expect(service().owner(undefined)).rejects.toThrow('Entre na sua conta');
    expect(getUser).not.toHaveBeenCalled();
  });
  it('uses the verified provider identity, never a client supplied owner', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: '00000000-0000-4000-8000-000000000001' } },
      error: null,
    });
    await expect(service().owner('Bearer credential')).resolves.toBe(
      '00000000-0000-4000-8000-000000000001',
    );
    expect(getUser).toHaveBeenCalledWith('credential');
  });
  it('rejects expired credentials and malformed identities', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'attacker' } }, error: null });
    await expect(service().owner('Bearer credential')).rejects.toThrow('sessão expirou');
  });
  it('keeps disabled configuration closed', async () => {
    const value = new IdentityService(new ConfigService());
    expect(value.publicConfig()).toEqual({ enabled: false, url: null, publicKey: null });
    await expect(value.owner('Bearer credential')).rejects.toThrow('ainda não está disponível');
  });
});
