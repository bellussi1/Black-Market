import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import type * as FirebaseAuthModule from 'firebase/auth';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

export type IdentityProvider = 'google' | 'steam';

interface FirebaseWebConfig {
  enabled: boolean;
  googleEnabled: boolean;
  steamEnabled: boolean;
  apiKey: string | null;
  authDomain: string | null;
  projectId: string | null;
  appId: string | null;
}

interface IdentityProfile {
  authenticated: true;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providers: IdentityProvider[];
  canManageRoadmap: boolean;
}

const AUTH_APP_NAME = 'black-market-auth';
const STEAM_VERIFIER_KEY = 'black-market.steam.pkce.v1';
const STEAM_CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const STEAM_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function knownProvider(value: string): IdentityProvider | null {
  if (value === 'google.com') return 'google';
  if (value === 'steam') return 'steam';
  return null;
}

@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private auth: FirebaseAuthModule.Auth | null = null;
  private authSdk: typeof FirebaseAuthModule | null = null;
  private pending?: Promise<void>;
  private initialized = false;

  readonly enabled = signal(false);
  readonly googleEnabled = signal(false);
  readonly steamEnabled = signal(false);
  readonly ready = signal(false);
  readonly authenticated = signal(false);
  readonly email = signal('');
  readonly displayName = signal('');
  readonly userId = signal('');
  readonly providers = signal<IdentityProvider[]>([]);
  readonly canManageRoadmap = signal(false);

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.ready.set(true);
      return;
    }
    if (this.initialized) return;
    if (this.pending) return this.pending;
    this.pending = this.load();
    try {
      await this.pending;
    } finally {
      this.pending = undefined;
    }
  }

  private async load(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<FirebaseWebConfig>(environment.apiBaseUrl + '/api/v1/identity/config'),
      );
      if (!config.enabled) {
        this.initialized = true;
        return;
      }
      if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId)
        throw new Error('A configuração de autenticação está incompleta.');

      const appSdk = await import('firebase/app');
      const authSdk = await import('firebase/auth');
      const app =
        appSdk.getApps().find((candidate) => candidate.name === AUTH_APP_NAME) ??
        appSdk.initializeApp(
          {
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            appId: config.appId,
          },
          AUTH_APP_NAME,
        );
      const auth = authSdk.getAuth(app);
      this.authSdk = authSdk;
      this.auth = auth;
      await authSdk.setPersistence(auth, authSdk.browserSessionPersistence);
      await new Promise<void>((resolve) => {
        let firstState = true;
        authSdk.onAuthStateChanged(
          auth,
          (user) => {
            this.setUser(user);
            if (firstState) {
              firstState = false;
              resolve();
            }
          },
          () => {
            if (firstState) {
              firstState = false;
              resolve();
            }
          },
        );
      });
      this.googleEnabled.set(config.googleEnabled);
      this.steamEnabled.set(config.steamEnabled);
      this.enabled.set(config.googleEnabled || config.steamEnabled);
      this.initialized = true;
    } finally {
      this.ready.set(true);
    }
  }

  async google(): Promise<void> {
    await this.initialize();
    if (!this.auth || !this.authSdk || !this.googleEnabled())
      throw new Error('O login Google ainda não está disponível.');
    const credential = await this.authSdk.signInWithPopup(
      this.auth,
      new this.authSdk.GoogleAuthProvider(),
    );
    this.setUser(credential.user);
  }

  async steam(): Promise<void> {
    await this.initialize();
    if (!this.steamEnabled()) throw new Error('O login Steam ainda não está disponível.');
    const browser = this.browserWindow();
    const random = browser.crypto.getRandomValues(new Uint8Array(32));
    const verifier = base64Url(random);
    const digest = await browser.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(verifier),
    );
    const challenge = base64Url(new Uint8Array(digest));
    browser.sessionStorage.setItem(STEAM_VERIFIER_KEY, verifier);
    const startUrl = new URL(
      environment.apiBaseUrl + '/api/v1/identity/steam/start',
      browser.location.origin,
    );
    startUrl.searchParams.set('code_challenge', challenge);
    browser.location.assign(startUrl.toString());
  }

  async exchangeSteamCode(code: string): Promise<void> {
    await this.initialize();
    if (!this.auth || !this.authSdk || !this.steamEnabled())
      throw new Error('O login Steam ainda não está disponível.');
    const browser = this.browserWindow();
    const verifier = browser.sessionStorage.getItem(STEAM_VERIFIER_KEY) ?? '';
    browser.sessionStorage.removeItem(STEAM_VERIFIER_KEY);
    if (!STEAM_CODE_PATTERN.test(code) || !STEAM_VERIFIER_PATTERN.test(verifier))
      throw new Error('A confirmação Steam expirou. Inicie o login novamente.');

    const response = await firstValueFrom(
      this.http.post<{ customToken: string }>(
        environment.apiBaseUrl + '/api/v1/identity/steam/exchange',
        { code, verifier },
      ),
    );
    if (typeof response.customToken !== 'string' || !response.customToken)
      throw new Error('A Steam não confirmou seu login. Tente novamente.');
    const credential = await this.authSdk.signInWithCustomToken(this.auth, response.customToken);
    this.setUser(credential.user);
  }

  async linkGoogle(): Promise<void> {
    await this.initialize();
    const user = this.auth?.currentUser;
    if (!user || !this.authSdk || !this.googleEnabled())
      throw new Error('Entre na sua conta antes de vincular o Google.');
    const result = await this.authSdk.linkWithPopup(user, new this.authSdk.GoogleAuthProvider());
    const token = await result.user.getIdToken();
    await firstValueFrom(
      this.http.post(
        environment.apiBaseUrl + '/api/v1/identity/google/link',
        {},
        { headers: { Authorization: 'Bearer ' + token } },
      ),
    );
    this.setUser(result.user);
  }

  async linkSteam(): Promise<void> {
    await this.initialize();
    if (!this.steamEnabled()) throw new Error('A vinculação Steam ainda não está disponível.');
    const token = await this.token();
    const result = await firstValueFrom(
      this.http.post<{ url: string }>(
        environment.apiBaseUrl + '/api/v1/identity/steam/link/start',
        {},
        {
          headers: { Authorization: 'Bearer ' + token },
          withCredentials: true,
        },
      ),
    );
    const destination = new URL(result.url);
    if (destination.origin !== 'https://steamcommunity.com' || destination.pathname !== '/openid/')
      throw new Error('A Steam retornou um endereço de login inválido.');
    this.browserWindow().location.assign(destination.toString());
  }

  async token(): Promise<string> {
    await this.initialize();
    const user = this.auth?.currentUser;
    if (!user) throw new Error('Entre na sua conta para sincronizar.');
    return user.getIdToken();
  }

  async signOut(): Promise<void> {
    await this.authSdk?.signOut(this.auth!);
    this.setUser(null);
  }

  private setUser(user: FirebaseAuthModule.User | null): void {
    this.authenticated.set(Boolean(user));
    this.email.set(user?.email ?? '');
    this.displayName.set(user?.displayName ?? '');
    this.userId.set(user?.uid ?? '');
    this.providers.set([
      ...new Set(
        user?.providerData.flatMap((provider) => {
          const known = knownProvider(provider.providerId);
          return known ? [known] : [];
        }) ?? [],
      ),
    ]);
    this.canManageRoadmap.set(false);
    if (user) void this.loadProfile(user);
  }

  private async loadProfile(user: FirebaseAuthModule.User): Promise<void> {
    try {
      const token = await user.getIdToken();
      const profile = await firstValueFrom(
        this.http.get<IdentityProfile>(environment.apiBaseUrl + '/api/v1/identity/me', {
          headers: { Authorization: 'Bearer ' + token },
        }),
      );
      if (this.userId() !== user.uid || !profile.authenticated) return;
      this.displayName.set(profile.displayName ?? user.displayName ?? '');
      this.email.set(profile.email ?? user.email ?? '');
      this.providers.set(
        profile.providers.filter((provider) => provider === 'google' || provider === 'steam'),
      );
      this.canManageRoadmap.set(profile.canManageRoadmap === true);
    } catch {
      // The Firebase session remains usable locally if account sync is unavailable.
    }
  }

  private browserWindow(): Window {
    const browser = this.document.defaultView;
    if (!browser) throw new Error('Login disponível somente no navegador.');
    return browser;
  }
}
