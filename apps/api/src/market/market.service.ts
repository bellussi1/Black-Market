import { DEFAULT_DATA_LOCALE } from '@bdo/shared';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type MarketLookup, normalizeArsha } from './arsha-provider';
import { MarketHistoryService } from './market-history.service';

const TTL = 30 * 60 * 1000;
@Injectable()
export class MarketService {
  private readonly cache = new Map<
    string,
    { response: MarketLookup; expires: number; retryAt: number }
  >();
  private readonly pending = new Map<string, Promise<MarketLookup>>();
  private windowStart = Date.now();
  private requests = 0;
  private active = 0;
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly history?: MarketHistoryService,
  ) {}

  async lookup(
    region: string,
    itemId: number,
    locale: string = DEFAULT_DATA_LOCALE,
  ): Promise<MarketLookup> {
    if (!this.config.get<boolean>('MARKET_PROVIDER_ENABLED', true))
      throw new ServiceUnavailableException('A consulta de preços está indisponível no momento.');
    const key = region + ':' + itemId + ':' + locale;
    let held = this.cache.get(key);
    if (!held && this.history) {
      try {
        const saved = await this.history.latest(region, itemId, locale);
        if (saved) {
          held = { response: saved, expires: Date.parse(saved.fetchedAt) + TTL, retryAt: 0 };
          if (this.cache.size >= 200) this.cache.delete(this.cache.keys().next().value!);
          this.cache.set(key, held);
        }
      } catch {
        /* In-memory quotes remain usable when persistence is unavailable. */
      }
    }
    const now = Date.now();
    if (held && held.expires > now) return { ...held.response, cacheStatus: 'cached' };
    if (held && held.retryAt > now) return { ...held.response, cacheStatus: 'stale' };
    const pending = this.pending.get(key);
    if (pending) return pending;
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.requests = 0;
    }
    if (this.active >= 2 || this.requests >= 20)
      throw new HttpException(
        'Limite temporário de consultas. Aguarde antes de tentar novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    this.active++;
    this.requests++;
    const request = this.fetchQuote(region, itemId, locale, held);
    this.pending.set(key, request);
    try {
      return await request;
    } finally {
      this.active--;
      this.pending.delete(key);
    }
  }

  private async fetchQuote(
    region: string,
    itemId: number,
    locale: string,
    held?: { response: MarketLookup; expires: number; retryAt: number },
  ): Promise<MarketLookup> {
    const key = region + ':' + itemId + ':' + locale;
    try {
      const response = await fetch(
        'https://api.arsha.io/v2/' + region + '/item?id=' + itemId + '&lang=' + locale,
        {
          signal: AbortSignal.timeout(8000),
          headers: { Accept: 'application/json' },
        },
      );
      if (!response.ok) throw new Error('Upstream unavailable');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty upstream body');
      const decoder = new TextDecoder();
      let text = '';
      let bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 128_000) {
            await reader.cancel();
            throw new Error('Payload too large');
          }
          text += decoder.decode(chunk.value, { stream: true });
        }
        text += decoder.decode();
      } finally {
        reader.releaseLock();
      }
      const items = normalizeArsha(JSON.parse(text), itemId);
      const result: MarketLookup = {
        source: 'arsha',
        region,
        locale,
        fetchedAt: new Date().toISOString(),
        cacheStatus: 'fetched',
        upstreamCacheMinutes: 30,
        items,
      };
      if (!this.cache.has(key) && this.cache.size >= 200)
        this.cache.delete(this.cache.keys().next().value as string);
      this.cache.set(key, {
        response: result,
        expires: Date.now() + TTL,
        retryAt: 0,
      });
      if (this.history) {
        try {
          await this.history.save(result);
        } catch {
          /* Never replace a valid upstream price with a persistence error. */
        }
      }
      return result;
    } catch {
      if (held) {
        held.retryAt = Date.now() + 60_000;
        return { ...held.response, cacheStatus: 'stale' };
      }
      throw new ServiceUnavailableException(
        'O provedor não forneceu uma cotação válida. Seu último registro pessoal permanece disponível.',
      );
    }
  }
}
