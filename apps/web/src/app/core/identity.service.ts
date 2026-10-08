import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly http = inject(HttpClient);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private client: SupabaseClient | null = null;
  private pending?: Promise<void>;
  readonly enabled = signal(false);
  readonly ready = signal(false);
  readonly email = signal('');
  readonly userId = signal('');
  async initialize(): Promise<void> {
    if (!this.browser || this.ready()) return;
    if (this.pending) return this.pending;
    this.pending = this.load();
    try {
      await this.pending;
    } finally {
      this.pending = undefined;
    }
  }
  private async load() {
    const config = await firstValueFrom(
      this.http.get<{ enabled: boolean; url: string | null; publicKey: string | null }>(
        environment.apiBaseUrl + '/api/v1/identity/config',
      ),
    );
    if (config.enabled && config.url && config.publicKey) {
      const { createClient } = await import('@supabase/supabase-js');
      this.client = createClient(config.url, config.publicKey, {
        auth: { flowType: 'pkce', storage: sessionStorage, storageKey: 'black-market.auth.v1' },
      });
      this.client.auth.onAuthStateChange((_event, session) => {
        this.email.set(session?.user.email ?? '');
        this.userId.set(session?.user.id ?? '');
      });
      const { data } = await this.client.auth.getSession();
      this.email.set(data.session?.user.email ?? '');
      this.userId.set(data.session?.user.id ?? '');
      this.enabled.set(true);
    }
    this.ready.set(true);
  }
  async signIn(email: string) {
    await this.initialize();
    if (!this.client) throw new Error('Entrar na conta ainda não está disponível.');
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/account' },
    });
    if (error)
      throw new Error(
        'Não foi possível enviar o link. Confira o e-mail e tente novamente mais tarde.',
      );
  }
  async google() {
    await this.initialize();
    if (!this.client) throw new Error('Entrar na conta ainda não está disponível.');
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/account' },
    });
    if (error) throw new Error('Não foi possível abrir o login. Tente novamente.');
  }
  async token() {
    await this.initialize();
    if (!this.client) throw new Error('A sincronização ainda não está disponível.');
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session) throw new Error('Entre na sua conta para sincronizar.');
    return data.session.access_token;
  }
  async signOut() {
    if (this.client) await this.client.auth.signOut();
    this.email.set('');
    this.userId.set('');
  }
}
