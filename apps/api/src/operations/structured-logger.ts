import { ConsoleLogger, type LogLevel } from '@nestjs/common';
export function logEntry(message: unknown, level: LogLevel, context: string, environment: string) {
  const fields: Record<string, unknown> = {};
  if (message && typeof message === 'object') {
    for (const key of [
      'event',
      'requestId',
      'sourceRequestId',
      'method',
      'route',
      'status',
      'durationMs',
      'cause',
      'kind',
      'area',
      'code',
    ]) {
      if (key in message) {
        const value = (message as Record<string, unknown>)[key];
        if (typeof value === 'number' || typeof value === 'boolean') fields[key] = value;
        else if (typeof value === 'string') fields[key] = value.slice(0, 160);
      }
    }
  } else if (typeof message === 'string' && level !== 'error')
    fields['message'] = message
      .replace(/(?:postgres(?:ql)?:\/\/)[^\s]+/gi, '[conexão removida]')
      .replace(/(?:bearer|token|password|secret)[=: ]+[^\s]+/gi, '[valor removido]')
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[e-mail removido]')
      .replace(/https?:\/\/[^\s]+/gi, '[endereço removido]')
      .replace(/(?:cookie|authorization)[=: ]+[^\r\n]+/gi, '[credencial removida]')
      .slice(0, 500);
  return {
    timestamp: new Date().toISOString(),
    level: level === 'log' ? 'INFO' : level.toUpperCase(),
    environment: ['development', 'production', 'test'].includes(environment)
      ? environment
      : 'unknown',
    context: /^[A-Za-z0-9_.:-]{1,80}$/.test(context) ? context : 'BlackMarket',
    ...fields,
  };
}
export class StructuredLogger extends ConsoleLogger {
  constructor(private readonly environment: string) {
    super('BlackMarket', { json: true, colors: false, logLevels: ['log', 'warn', 'error'] });
  }
  protected override printAsJson(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: 'stdout' | 'stderr';
      errorStack?: unknown;
      params?: Record<string, unknown>;
      error?: Error;
    },
  ) {
    process[options.writeStreamType ?? 'stdout'].write(
      JSON.stringify(logEntry(message, options.logLevel, options.context, this.environment)) + '\n',
    );
  }
}
