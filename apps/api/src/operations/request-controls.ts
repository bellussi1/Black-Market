import { randomUUID } from 'node:crypto';

import type { LoggerService } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { isWorkspacePath } from './http-policy';

export type CorrelatedRequest = Request & { requestId?: string };
export class WindowLimiter {
  private readonly windows = new Map<string, { count: number; until: number }>();
  constructor(private readonly maximum = 10000) {}
  take(key: string, limit: number, now = Date.now()): boolean {
    const held = this.windows.get(key);
    if (held && held.until > now) {
      if (held.count >= limit) return false;
      held.count++;
      return true;
    }
    if (this.windows.size >= this.maximum) {
      for (const [id, value] of this.windows) if (value.until <= now) this.windows.delete(id);
      if (this.windows.size >= this.maximum) return false;
    }
    this.windows.set(key, { count: 1, until: now + 60000 });
    return true;
  }
}
export function requestControls(logger: LoggerService, environment: string, webOrigin: string) {
  const limiter = new WindowLimiter();
  return (req: CorrelatedRequest, res: Response, next: NextFunction) => {
    const started = Date.now();
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      req.path.startsWith('/api/docs') && environment !== 'production'
        ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
        : "default-src 'none'; frame-ancestors 'none'",
    );
    if (webOrigin.startsWith('https://'))
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    res.on('finish', () => {
      const route: unknown = req.route;
      const routePath =
        route && typeof route === 'object' && 'path' in route && typeof route.path === 'string'
          ? route.path
          : 'unmatched';
      const event = {
        event: 'http_request',
        environment,
        requestId: req.requestId,
        method: req.method,
        route: routePath,
        status: res.statusCode,
        durationMs: Date.now() - started,
      };
      if (res.statusCode >= 500) logger.error(event);
      else if (res.statusCode >= 400) logger.warn(event);
      else if (!['/health', '/ready'].includes(req.path)) logger.log(event);
    });
    const workspace = isWorkspacePath(req.path);
    const market = req.path.startsWith('/api/v1/market/');
    const telemetry = req.path === '/api/v1/telemetry/errors';
    const calculate = req.path.startsWith('/api/v1/calculators/');
    const crafting =
      req.method === 'GET' &&
      (/^\/api\/v1\/items\/[1-9]\d*\/recipes$/.test(req.path) ||
        /^\/api\/v1\/world\/item-sources\/[1-9]\d*$/.test(req.path));
    const publicRequest =
      req.path.startsWith('/api/v1/') && !/^\/api\/v1\/items\/[1-9]\d*\/icon$/.test(req.path);
    const group = workspace
      ? 'workspace'
      : market
        ? 'market'
        : telemetry
          ? 'telemetry'
          : calculate
            ? 'calculate'
            : crafting
              ? 'crafting'
              : 'public';
    if (
      publicRequest &&
      req.method !== 'OPTIONS' &&
      !limiter.take(
        (req.ip ?? 'unknown') + ':' + group,
        telemetry ? 10 : workspace || market || calculate ? 30 : crafting ? 600 : 240,
      )
    ) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Aguarde um pouco antes de tentar novamente.',
        requestId: req.requestId,
      });
      return;
    }
    if (
      workspace &&
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      ((req.headers.origin && req.headers.origin !== webOrigin) ||
        req.headers['sec-fetch-site'] === 'cross-site')
    ) {
      res.status(403).json({
        statusCode: 403,
        code: 'ORIGIN_DENIED',
        message: 'Não foi possível confirmar esta solicitação.',
        requestId: req.requestId,
      });
      return;
    }
    next();
  };
}
