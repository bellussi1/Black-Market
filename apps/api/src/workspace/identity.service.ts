import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

@Injectable()
export class IdentityService {
  private readonly client: SupabaseClient | null;
  constructor(private readonly config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const key = config.get<string>('SUPABASE_PUBLIC_KEY');
    this.client =
      url && key
        ? createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            global: {
              fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
            },
          })
        : null;
  }
  publicConfig() {
    return {
      enabled: Boolean(this.client),
      url: this.client ? this.config.get<string>('SUPABASE_URL') : null,
      publicKey: this.client ? this.config.get<string>('SUPABASE_PUBLIC_KEY') : null,
    };
  }
  async owner(authorization: string | undefined): Promise<string> {
    if (!this.client)
      throw new ServiceUnavailableException('A sincronização ainda não está disponível.');
    if (!authorization?.startsWith('Bearer ') || authorization.length > 8192)
      throw new UnauthorizedException('Entre na sua conta para continuar.');
    try {
      const { data, error } = await this.client.auth.getUser(authorization.slice(7));
      if (error || !data.user || !z.string().uuid().safeParse(data.user.id).success)
        throw new Error('Invalid identity');
      return data.user.id;
    } catch {
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    }
  }
}
