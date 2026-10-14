import { DOCUMENT } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { IdentityService } from './identity.service';

const firebase = vi.hoisted(() => ({
  app: { name: 'black-market-auth' },
  auth: { currentUser: null as Record<string, unknown> | null },
  initializeApp: vi.fn(() => firebase.app),
  getApps: vi.fn(() => []),
  getAuth: vi.fn(() => firebase.auth),
  setPersistence: vi.fn(async () => undefined),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithCustomToken: vi.fn(),
  linkWithPopup: vi.fn(),
  signOut: vi.fn(async () => undefined),
  GoogleAuthProvider: vi.fn(),
  authListener: undefined as ((user: Record<string, unknown> | null) => void) | undefined,
  initialUser: null as Record<string, unknown> | null,
}));

vi.mock('firebase/app', () => ({
  getApps: firebase.getApps,
  initializeApp: firebase.initializeApp,
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: firebase.GoogleAuthProvider,
  browserSessionPersistence: 'session-persistence',
  getAuth: firebase.getAuth,
  linkWithPopup: firebase.linkWithPopup,
  onAuthStateChanged: firebase.onAuthStateChanged,
  setPersistence: firebase.setPersistence,
  signInWithCustomToken: firebase.signInWithCustomToken,
  signInWithPopup: firebase.signInWithPopup,
  signOut: firebase.signOut,
}));

const authConfig = {
  enabled: true,
  googleEnabled: true,
  steamEnabled: true,
  apiKey: 'public-api-key',
  authDomain: 'black-market-test.firebaseapp.com',
  projectId: 'black-market-test',
  appId: '1:test:web:test',
};

function makeUser(uid: string, providerId: string, email: string | null = null) {
  return {
    uid,
    email,
    displayName: null,
    providerData: providerId === 'google.com' ? [{ providerId, uid: 'google-subject' }] : [],
    getIdToken: vi.fn(async () => 'firebase-id-token'),
  };
}

function createBrowser() {
  const session = new Map<string, string>();
  const location = {
    origin: 'http://localhost:4200',
    href: 'http://localhost:4200/account',
    hash: '',
    assign: vi.fn(),
  };
  const browser = {
    crypto: {
      getRandomValues: vi.fn((bytes: Uint8Array) => {
        bytes.fill(7);
        return bytes;
      }),
      subtle: {
        digest: vi.fn(async () => new Uint8Array(32).fill(9).buffer),
      },
    },
    history: { replaceState: vi.fn() },
    location,
    sessionStorage: {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => session.set(key, value),
      removeItem: (key: string) => session.delete(key),
    },
  };
  return { browser, session };
}

describe('IdentityService', () => {
  let http: HttpTestingController;
  let service: IdentityService;
  let browser: ReturnType<typeof createBrowser>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    firebase.auth.currentUser = null;
    firebase.initialUser = null;
    firebase.authListener = undefined;
    firebase.getApps.mockReturnValue([]);
    firebase.onAuthStateChanged.mockImplementation((_auth, listener) => {
      firebase.authListener = listener;
      listener(firebase.initialUser);
      return vi.fn();
    });
    browser = createBrowser();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: { defaultView: browser.browser } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(IdentityService);
  });

  afterEach(() => http.verify());

  async function initialize(config: object = authConfig) {
    const pending = service.initialize();
    http.expectOne(environment.apiBaseUrl + '/api/v1/identity/config').flush(config);
    await pending;
  }

  async function flushAsyncWork() {
    for (let index = 0; index < 6; index++) await Promise.resolve();
  }

  it('keeps public browsing enabled when identity is unavailable', async () => {
    await initialize({
      enabled: false,
      googleEnabled: false,
      steamEnabled: false,
      apiKey: null,
      authDomain: null,
      projectId: null,
      appId: null,
    });

    expect(service.ready()).toBe(true);
    expect(service.enabled()).toBe(false);
    expect(service.authenticated()).toBe(false);
    expect(firebase.initializeApp).not.toHaveBeenCalled();
  });

  it('signs in with Google using Firebase popup authentication', async () => {
    await initialize();
    const user = makeUser('google-uid', 'google.com', 'player@example.com');
    firebase.signInWithPopup.mockResolvedValue({ user });

    await service.google();

    expect(firebase.setPersistence).toHaveBeenCalledWith(firebase.auth, 'session-persistence');
    expect(firebase.signInWithPopup).toHaveBeenCalledWith(firebase.auth, expect.anything());
    expect(service.userId()).toBe('google-uid');
    await flushAsyncWork();
    http.expectOne(environment.apiBaseUrl + '/api/v1/identity/me').flush({
      authenticated: true,
      displayName: 'Jogador',
      email: 'player@example.com',
      photoURL: null,
      providers: ['google'],
      canManageRoadmap: false,
    });
  });

  it('starts Steam sign-in with a per-tab PKCE verifier', async () => {
    await initialize();

    await service.steam();

    const verifier = browser.session.get('black-market.steam.pkce.v1');
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(browser.browser.location.assign).toHaveBeenCalledWith(
      expect.stringMatching(/\/identity\/steam\/start\?code_challenge=[A-Za-z0-9_-]{43}$/),
    );
  });

  it('exchanges a Steam code for a Firebase custom-token session', async () => {
    await initialize();
    browser.session.set('black-market.steam.pkce.v1', 'v'.repeat(43));
    const user = makeUser('steam:76561197960265728', 'custom');
    firebase.signInWithCustomToken.mockResolvedValue({ user });

    const pending = service.exchangeSteamCode('c'.repeat(43));
    await flushAsyncWork();
    const request = http.expectOne(environment.apiBaseUrl + '/api/v1/identity/steam/exchange');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'c'.repeat(43), verifier: 'v'.repeat(43) });
    expect(browser.session.has('black-market.steam.pkce.v1')).toBe(false);
    request.flush({ customToken: 'firebase-custom-token' });
    await pending;

    expect(firebase.signInWithCustomToken).toHaveBeenCalledWith(
      firebase.auth,
      'firebase-custom-token',
    );
    expect(service.authenticated()).toBe(true);
    await flushAsyncWork();
    http.expectOne(environment.apiBaseUrl + '/api/v1/identity/me').flush({
      authenticated: true,
      displayName: null,
      email: null,
      photoURL: null,
      providers: ['steam'],
      canManageRoadmap: false,
    });
  });

  it('restores a session without assuming that a Steam account has an email', async () => {
    const user = makeUser('steam:76561197960265728', 'custom');
    firebase.initialUser = user;
    firebase.auth.currentUser = user;

    await initialize();

    expect(service.authenticated()).toBe(true);
    expect(service.userId()).toBe('steam:76561197960265728');
    expect(service.email()).toBe('');
    await flushAsyncWork();
    http.expectOne(environment.apiBaseUrl + '/api/v1/identity/me').flush({
      authenticated: true,
      displayName: 'AuroraVale',
      email: null,
      photoURL: null,
      providers: ['steam'],
      canManageRoadmap: false,
    });
    await flushAsyncWork();
    expect(service.displayName()).toBe('AuroraVale');
    expect(service.providers()).toContain('steam');
  });

  it('links Steam through the authenticated API and preserves the state cookie', async () => {
    const user = makeUser('google-uid', 'google.com', 'player@example.com');
    firebase.initialUser = user;
    firebase.auth.currentUser = user;
    await initialize();
    await flushAsyncWork();
    http.expectOne(environment.apiBaseUrl + '/api/v1/identity/me').flush({
      authenticated: true,
      displayName: null,
      email: 'player@example.com',
      photoURL: null,
      providers: ['google'],
      canManageRoadmap: false,
    });

    const pending = service.linkSteam();
    await flushAsyncWork();
    const request = http.expectOne(environment.apiBaseUrl + '/api/v1/identity/steam/link/start');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer firebase-id-token');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ url: 'https://steamcommunity.com/openid/?openid.mode=checkid_setup' });
    await pending;

    expect(browser.browser.location.assign).toHaveBeenCalledWith(
      'https://steamcommunity.com/openid/?openid.mode=checkid_setup',
    );
  });

  it('links Google to the current Firebase user and confirms it with the API', async () => {
    const user = makeUser('steam:76561197960265728', 'custom');
    firebase.initialUser = user;
    firebase.auth.currentUser = user;
    firebase.linkWithPopup.mockResolvedValue({ user });
    await initialize();
    await flushAsyncWork();
    http.expectOne(environment.apiBaseUrl + '/api/v1/identity/me').flush({
      authenticated: true,
      displayName: null,
      email: null,
      photoURL: null,
      providers: ['steam'],
      canManageRoadmap: false,
    });

    const pending = service.linkGoogle();
    await flushAsyncWork();
    const request = http.expectOne(environment.apiBaseUrl + '/api/v1/identity/google/link');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer firebase-id-token');
    request.flush({ linked: true });
    await pending;

    expect(firebase.linkWithPopup).toHaveBeenCalledWith(user, expect.anything());
    await flushAsyncWork();
    http.expectOne(environment.apiBaseUrl + '/api/v1/identity/me').flush({
      authenticated: true,
      displayName: null,
      email: null,
      photoURL: null,
      providers: ['google', 'steam'],
      canManageRoadmap: false,
    });
  });
});
