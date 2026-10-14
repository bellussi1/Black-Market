import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/';
const OPENID_NAMESPACE = 'http://specs.openid.net/auth/2.0';
const REQUIRED_SIGNED_FIELDS = [
  'op_endpoint',
  'claimed_id',
  'identity',
  'return_to',
  'response_nonce',
  'assoc_handle',
] as const;

@Injectable()
export class SteamOpenIdService {
  constructor(private readonly config: ConfigService) {}

  loginUrl(state: string, returnTo: string, realm: string): URL {
    const callback = this.config.get<string>('STEAM_OPENID_CALLBACK_URL');
    const webOrigin = this.config.get<string>('WEB_ORIGIN');
    if (!callback || !webOrigin) throw new UnauthorizedException('Login Steam indisponível.');

    const expectedCallback = new URL(callback);
    const expectedReturnTo = new URL(callback);
    expectedReturnTo.searchParams.set('state', state);
    if (
      state.length < 32 ||
      expectedCallback.origin + expectedCallback.pathname !==
        new URL(returnTo).origin + new URL(returnTo).pathname ||
      expectedReturnTo.toString() !== returnTo ||
      realm !== `${webOrigin}/`
    )
      throw new UnauthorizedException('Parâmetros de login Steam inválidos.');

    const url = new URL(STEAM_OPENID_ENDPOINT);
    url.searchParams.set('openid.ns', OPENID_NAMESPACE);
    url.searchParams.set('openid.mode', 'checkid_setup');
    url.searchParams.set('openid.return_to', returnTo);
    url.searchParams.set('openid.realm', realm);
    url.searchParams.set('openid.identity', `${OPENID_NAMESPACE}/identifier_select`);
    url.searchParams.set('openid.claimed_id', `${OPENID_NAMESPACE}/identifier_select`);
    return url;
  }

  async verifyCallback(
    params: URLSearchParams,
    expectedReturnTo: string,
  ): Promise<{ steamId: string }> {
    const fields = new Map<string, string>();
    let totalLength = 0;
    for (const [key, value] of params) {
      if (!key.startsWith('openid.')) continue;
      const name = key.slice('openid.'.length);
      totalLength += key.length + value.length;
      if (
        !name ||
        fields.has(name) ||
        value.length > 4096 ||
        fields.size >= 32 ||
        totalLength > 8192
      )
        throw new UnauthorizedException('Retorno da Steam inválido.');
      fields.set(name, value);
    }

    const signed = fields.get('signed')?.split(',') ?? [];
    const claimedId = fields.get('claimed_id');
    const match = claimedId?.match(/^http:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
    if (
      fields.get('ns') !== OPENID_NAMESPACE ||
      fields.get('mode') !== 'id_res' ||
      fields.get('op_endpoint') !== STEAM_OPENID_ENDPOINT ||
      fields.get('return_to') !== expectedReturnTo ||
      !fields.get('response_nonce') ||
      !fields.get('assoc_handle') ||
      !fields.get('sig') ||
      !match ||
      fields.get('identity') !== claimedId ||
      new Set(signed).size !== signed.length ||
      REQUIRED_SIGNED_FIELDS.some((field) => !signed.includes(field))
    )
      throw new UnauthorizedException('Retorno da Steam inválido.');

    const steamId = match[1];
    const numericId = BigInt(steamId);
    if (
      numericId < 76561197960265728n ||
      numericId > 76561202255233023n ||
      numericId.toString() !== steamId
    )
      throw new UnauthorizedException('Retorno da Steam inválido.');

    const body = new URLSearchParams();
    for (const [name, value] of fields) body.set(`openid.${name}`, value);
    body.set('openid.mode', 'check_authentication');

    let response: Response;
    try {
      response = await fetch(STEAM_OPENID_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new UnauthorizedException('Não foi possível verificar a resposta da Steam.');
    }
    if (!response.ok)
      throw new UnauthorizedException('Não foi possível verificar a resposta da Steam.');
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > 8192) throw new UnauthorizedException('Retorno da Steam inválido.');
    const verification = await response.text();
    if (verification.length > 8192 || !/^is_valid:true\s*$/m.test(verification.trim()))
      throw new UnauthorizedException('Retorno da Steam inválido.');

    return { steamId };
  }
}
