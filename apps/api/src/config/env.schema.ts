import { z } from 'zod';
export function isPublicIdentityKey(value: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;
  try {
    const parts = value.split('.');
    return (
      parts.length === 3 &&
      (JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { role?: string })
        .role === 'anon'
    );
  } catch {
    return false;
  }
}

export const envSchema = z
  .object({
    CONTACT_EMAIL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().email().max(254).optional(),
    ),
    DATA_CONTROLLER_NAME: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().min(2).max(160).optional(),
    ),
    ANALYTICS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    POSTHOG_PUBLIC_KEY: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .regex(/^phc_[A-Za-z0-9_-]{10,200}$/)
        .optional(),
    ),
    POSTHOG_HOST: z
      .enum(['https://us.i.posthog.com', 'https://eu.i.posthog.com'])
      .default('https://us.i.posthog.com'),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    PUBLIC_SITE_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .url()
        .regex(/^https?:\/\//)
        .optional(),
    ),
    SUPABASE_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .url()
        .regex(/^https:\/\//)
        .optional(),
    ),
    SUPABASE_PUBLIC_KEY: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .min(20)
        .max(4096)
        .refine(isPublicIdentityKey, 'Use somente a chave pública de identidade.')
        .optional(),
    ),
    DATABASE_URL: z
      .string()
      .url()
      .regex(/^postgres(?:ql)?:\/\//),
    WEB_ORIGIN: z
      .string()
      .url()
      .regex(/^https?:\/\//)
      .default('http://localhost:4200')
      .transform((value) => new URL(value).origin),
    CATALOG_ASSETS_DIR: z.string().min(1).optional(),
    CATALOG_ASSETS_PUBLIC_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .url()
        .regex(/^https?:\/\//)
        .optional(),
    ),
    MARKET_PROVIDER_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    MARKET_COLLECTOR_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    MARKET_TRACKED_ITEMS: z
      .string()
      .regex(/^(?:[1-9]\d*(?:,[1-9]\d*){0,19})?$/)
      .default(''),
  })
  .superRefine((value, context) => {
    for (const name of ['PUBLIC_SITE_URL', 'SUPABASE_URL', 'CATALOG_ASSETS_PUBLIC_URL'] as const) {
      const raw = value[name];
      if (!raw) continue;
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        continue;
      }
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        (name === 'PUBLIC_SITE_URL' && url.pathname !== '/')
      )
        context.addIssue({
          code: 'custom',
          path: [name],
          message:
            'Use um endereço sem credenciais, parâmetros ou fragmentos; o endereço público deve conter somente a origem.',
        });
    }
    if (Boolean(value.SUPABASE_URL) !== Boolean(value.SUPABASE_PUBLIC_KEY))
      context.addIssue({
        code: 'custom',
        path: ['SUPABASE_URL'],
        message: 'Configure endereço e chave pública juntos.',
      });
    if (value.ANALYTICS_ENABLED && !value.POSTHOG_PUBLIC_KEY)
      context.addIssue({
        code: 'custom',
        path: ['POSTHOG_PUBLIC_KEY'],
        message: 'Configure a chave pública antes de ativar estatísticas.',
      });
    if (value.NODE_ENV === 'production') {
      if (
        value.CATALOG_ASSETS_PUBLIC_URL &&
        !value.CATALOG_ASSETS_PUBLIC_URL.startsWith('https://')
      )
        context.addIssue({
          code: 'custom',
          path: ['CATALOG_ASSETS_PUBLIC_URL'],
          message: 'Produção exige imagens externas em HTTPS.',
        });
      if (!value.PUBLIC_SITE_URL?.startsWith('https://'))
        context.addIssue({
          code: 'custom',
          path: ['PUBLIC_SITE_URL'],
          message: 'Produção exige endereço HTTPS público.',
        });
      if (!value.WEB_ORIGIN.startsWith('https://'))
        context.addIssue({
          code: 'custom',
          path: ['WEB_ORIGIN'],
          message: 'Produção exige origem HTTPS.',
        });
      if (value.PUBLIC_SITE_URL) {
        try {
          if (new URL(value.PUBLIC_SITE_URL).origin !== value.WEB_ORIGIN)
            context.addIssue({
              code: 'custom',
              path: ['WEB_ORIGIN'],
              message: 'A origem deve corresponder ao endereço público.',
            });
        } catch {
          context.addIssue({
            code: 'custom',
            path: ['PUBLIC_SITE_URL'],
            message: 'Configure um endereço público válido.',
          });
        }
      }
    }
  });

export function validateEnvironment(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'environment'))),
    ];
    throw new Error('Confira as configurações: ' + fields.join(', ') + '.');
  }
  return result.data;
}

export type Environment = z.infer<typeof envSchema>;
