import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FirebaseAuthService } from './firebase-auth.service';
import { STEAM_AUTH_STORE, type SteamAuthStore } from './steam-auth.store';
import { SteamOpenIdService } from './steam-openid.service';

const ATTEMPT_LIFETIME_MS = 5 * 60 * 1000;
const TOKEN_LIFETIME_MS = 5 * 60 * 1000;
const PKCE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function equalsSecret(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

@Injectable()
export class SteamAuthService {
  constructor(
    private readonly config: ConfigService,
    @Inject(STEAM_AUTH_STORE) private readonly store: SteamAuthStore,
    private readonly openid: SteamOpenIdService,
    private readonly firebase: FirebaseAuthService,
  ) {}

  async beginLogin(codeChallenge: string): Promise<{ url: URL; stateCookie: string }> {
    if (!PKCE_CHALLENGE_PATTERN.test(codeChallenge))
      throw new UnauthorizedException('A verificação de login Steam expirou.');
    return this.begin(null, codeChallenge);
  }

  async beginLink(firebaseUid: string): Promise<{ url: URL; stateCookie: string }> {
    if (!firebaseUid || firebaseUid.length > 128)
      throw new UnauthorizedException('Entre na sua conta para vincular a Steam.');
    return this.begin(firebaseUid, null);
  }

  async completeCallback(
    params: URLSearchParams,
    stateCookie: string | undefined,
  ): Promise<{ redirectUrl: string }> {
    const states = params.getAll('state');
    const state = states.length === 1 ? states[0] : undefined;
    if (
      !state ||
      !stateCookie ||
      !/^[A-Za-z0-9_-]{43}$/.test(state) ||
      !equalsSecret(state, stateCookie)
    )
      throw new UnauthorizedException('O retorno Steam não corresponde a este navegador.');

    const stateHash = sha256(state);
    const now = new Date(Date.now());
    const attempt = await this.store.findAttempt(stateHash);
    if (!attempt || attempt.consumedAt || attempt.expiresAt.getTime() <= now.getTime())
      throw new UnauthorizedException('A tentativa de login Steam expirou.');
    const linkAttempt = attempt.firebaseUid !== null;
    if (linkAttempt ? attempt.codeChallenge !== null : !attempt.codeChallenge)
      throw new UnauthorizedException('A tentativa de login Steam expirou.');

    const callback = this.callbackUrl();
    callback.searchParams.set('state', state);
    const { steamId } = await this.openid.verifyCallback(params, callback.toString());
    if (!(await this.store.consumeAttempt(stateHash, now)))
      throw new UnauthorizedException('A tentativa de login Steam já foi utilizada.');

    if (linkAttempt) {
      if (!attempt.firebaseUid)
        throw new UnauthorizedException('A tentativa de vinculação expirou.');
      await this.store.linkSteam(attempt.firebaseUid, steamId);
      return { redirectUrl: `${this.webOrigin()}/account#steam-linked` };
    }

    const firebaseUid = await this.store.loginSteam(steamId);
    const code = randomBytes(32).toString('base64url');
    await this.store.createExchange({
      codeHash: sha256(code),
      codeChallenge: attempt.codeChallenge!,
      firebaseUid,
      expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS),
    });
    return { redirectUrl: `${this.webOrigin()}/account#steam-code=${code}` };
  }

  async exchange(code: string, verifier: string): Promise<string> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !PKCE_VERIFIER_PATTERN.test(verifier))
      throw new UnauthorizedException('O código de login Steam expirou.');

    const now = new Date(Date.now());
    const codeHash = sha256(code);
    const exchange = await this.store.findExchange(codeHash, now);
    if (!exchange || exchange.consumedAt || exchange.expiresAt.getTime() <= now.getTime())
      throw new UnauthorizedException('O código de login Steam expirou.');

    const actualChallenge = createHash('sha256').update(verifier).digest('base64url');
    if (!equalsSecret(exchange.codeChallenge, actualChallenge))
      throw new UnauthorizedException('A verificação do login Steam não corresponde.');
    if (!(await this.store.consumeExchange(codeHash, now)))
      throw new UnauthorizedException('O código de login Steam já foi utilizado.');
    return this.firebase.createCustomToken(exchange.firebaseUid);
  }

  private async begin(
    firebaseUid: string | null,
    codeChallenge: string | null,
  ): Promise<{ url: URL; stateCookie: string }> {
    const stateCookie = randomBytes(32).toString('base64url');
    const callback = this.callbackUrl();
    callback.searchParams.set('state', stateCookie);
    const realm = `${this.webOrigin()}/`;
    const expiresAt = new Date(Date.now() + ATTEMPT_LIFETIME_MS);
    await this.store.createAttempt({
      stateHash: sha256(stateCookie),
      codeChallenge,
      firebaseUid,
      expiresAt,
    });
    return {
      url: this.openid.loginUrl(stateCookie, callback.toString(), realm),
      stateCookie,
    };
  }

  private callbackUrl(): URL {
    const value = this.config.get<string>('STEAM_OPENID_CALLBACK_URL');
    if (!value) throw new ServiceUnavailableException('Login Steam indisponível.');
    return new URL(value);
  }

  private webOrigin(): string {
    const value = this.config.get<string>('WEB_ORIGIN');
    if (!value) throw new ServiceUnavailableException('Login Steam indisponível.');
    return new URL(value).origin;
  }
}
