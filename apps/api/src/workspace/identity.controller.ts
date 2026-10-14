import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  Headers,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { IdentityService } from './identity.service';
import { SteamAuthService } from './steam-auth.service';

const STATE_COOKIE = 'steam_auth_state';
const COOKIE_PATH = '/api/v1/identity/steam';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cookieValue(header: string | undefined, name: string): string | undefined {
  if (!header || header.length > 4096) return undefined;
  const matches = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`));
  if (matches.length !== 1) return undefined;
  const value = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}

function parseQuery(request: Request): URLSearchParams {
  const raw = request.originalUrl;
  if (typeof raw !== 'string' || raw.length > 8192)
    throw new Error('Steam callback query is invalid.');
  const url = new URL(raw, 'http://api.internal');
  if (url.pathname !== '/api/v1/identity/steam/callback')
    throw new Error('Steam callback path is invalid.');
  const seen = new Set<string>();
  for (const [key] of url.searchParams) {
    if (seen.has(key)) throw new Error('Duplicate Steam callback parameter.');
    seen.add(key);
  }
  return url.searchParams;
}

@Controller('identity')
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly steam: SteamAuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('steam/start')
  async steamStart(
    @Query('code_challenge') codeChallenge: string | undefined,
    @Res() response: Response,
  ) {
    this.noStore(response);
    const attempt = await this.steam.beginLogin(codeChallenge ?? '');
    this.setStateCookie(response, attempt.stateCookie);
    return response.redirect(302, attempt.url.toString());
  }

  @Get('steam/callback')
  async steamCallback(@Req() request: Request, @Res() response: Response) {
    this.noStore(response);
    try {
      const result = await this.steam.completeCallback(
        parseQuery(request),
        cookieValue(request.headers.cookie, STATE_COOKIE),
      );
      const destination = this.safeAccountRedirect(result.redirectUrl, 'steam-error');
      return response.redirect(302, destination);
    } catch (error) {
      const fragment = error instanceof ConflictException ? 'steam-conflict' : 'steam-error';
      return response.redirect(302, `${this.webOrigin()}/account#${fragment}`);
    } finally {
      this.clearStateCookie(response);
    }
  }

  @Post('steam/exchange')
  async steamExchange(@Body() body: unknown, @Res() response: Response) {
    this.noStore(response);
    if (!isRecord(body) || typeof body['code'] !== 'string' || typeof body['verifier'] !== 'string')
      throw new BadRequestException('Código de login Steam inválido.');
    return { customToken: await this.steam.exchange(body['code'], body['verifier']) };
  }

  @Post('steam/link/start')
  async steamLinkStart(
    @Headers('authorization') authorization: string | undefined,
    @Res() response: Response,
  ) {
    this.noStore(response);
    const firebaseUid = await this.identity.firebaseUid(authorization);
    const attempt = await this.steam.beginLink(firebaseUid);
    this.setStateCookie(response, attempt.stateCookie);
    return response.status(200).json({ url: attempt.url.toString() });
  }

  @Post('google/link')
  @Header('Cache-Control', 'private,no-store')
  async googleLink(@Headers('authorization') authorization: string | undefined) {
    return this.identity.linkGoogle(authorization);
  }

  private setStateCookie(response: Response, state: string): void {
    response.cookie(STATE_COOKIE, state, this.cookieOptions());
  }

  private clearStateCookie(response: Response): void {
    response.clearCookie(STATE_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      path: COOKIE_PATH,
      secure: this.webOrigin().startsWith('https://'),
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: COOKIE_PATH,
      maxAge: 300000,
      secure: this.webOrigin().startsWith('https://'),
    };
  }

  private webOrigin(): string {
    const configured = this.config.get<string>('WEB_ORIGIN');
    if (!configured) throw new Error('Origem do site não configurada.');
    return new URL(configured).origin;
  }

  private safeAccountRedirect(candidate: string, failureFragment: string): string {
    try {
      const destination = new URL(candidate);
      const origin = this.webOrigin();
      if (
        destination.origin === origin &&
        destination.pathname === '/account' &&
        !destination.search &&
        (destination.hash === '#steam-linked' ||
          /^#steam-code=[A-Za-z0-9_-]{43}$/.test(destination.hash))
      )
        return destination.toString();
    } catch {
      // Use the fixed local failure destination below.
    }
    return `${this.webOrigin()}/account#${failureFragment}`;
  }

  private noStore(response: Response): void {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
  }
}
