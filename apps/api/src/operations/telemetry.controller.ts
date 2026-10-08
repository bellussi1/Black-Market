import { publicContact } from '@bdo/shared';
import { BadRequestException, Body, Controller, Get, Header, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
const reportSchema = z
  .object({
    kind: z.enum(['runtime', 'unhandled_rejection', 'http']),
    area: z.enum([
      'catalog',
      'recipes',
      'reference',
      'market',
      'crafting',
      'profile',
      'storage',
      'plans',
      'account',
      'scans',
      'other',
    ]),
    status: z.number().int().min(0).max(599).optional(),
    requestId: z.string().uuid().optional(),
  })
  .strict();
@Controller('telemetry')
export class TelemetryController {
  private readonly logger = new Logger('Frontend');
  @Post('errors')
  report(@Body() body: unknown) {
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException();
    this.logger.warn({ event: 'frontend_error', ...parsed.data });
    return { received: true };
  }
}
@Controller('analytics')
export class AnalyticsConfigController {
  constructor(private readonly config: ConfigService) {}
  @Get('config')
  @Header('Cache-Control', 'public, max-age=60')
  get() {
    const enabled =
      this.config.get<string>('NODE_ENV') === 'production' &&
      this.config.get<boolean>('ANALYTICS_ENABLED', false) &&
      Boolean(this.config.get<string>('POSTHOG_PUBLIC_KEY'));
    return {
      enabled,
      key: enabled ? this.config.get<string>('POSTHOG_PUBLIC_KEY') : null,
      host: enabled ? this.config.get<string>('POSTHOG_HOST') : null,
    };
  }
}
@Controller('platform')
export class PlatformConfigController {
  constructor(private readonly config: ConfigService) {}
  @Get('config')
  @Header('Cache-Control', 'public, max-age=60')
  get() {
    return {
      contactEmail: this.config.get<string>('CONTACT_EMAIL') ?? publicContact.contactEmail,
      controllerName:
        this.config.get<string>('DATA_CONTROLLER_NAME') ?? publicContact.controllerName,
    };
  }
}
