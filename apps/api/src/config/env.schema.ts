import { z } from 'zod';

const isLoopbackHttpUrl = (value?: string) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
};

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
    APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
    LOCAL_METRICS_ENABLED: z
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
    FIREBASE_PROJECT_ID: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .regex(/^[a-z0-9-]{6,30}$/)
        .optional(),
    ),
    FIREBASE_AUTH_DOMAIN: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .regex(/^[a-z0-9.-]{5,253}$/i)
        .optional(),
    ),
    FIREBASE_API_KEY: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(20).max(256).optional(),
    ),
    FIREBASE_APP_ID: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(8).max(160).optional(),
    ),
    FIREBASE_ADMIN_CREDENTIALS_BASE64: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .min(40)
        .max(20000)
        .regex(/^[A-Za-z0-9+/]+={0,2}$/)
        .optional(),
    ),
    STEAM_OPENID_CALLBACK_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().url().optional(),
    ),
    STAGING_TEST_FIREBASE_UID: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().min(1).max(128).optional(),
    ),
    ROADMAP_ADMIN_FIREBASE_UIDS: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().max(2048).optional(),
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
    MARKET_BOARD_COLLECTOR_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
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
    if (value.LOCAL_METRICS_ENABLED && value.APP_ENV !== 'local')
      context.addIssue({
        code: 'custom',
        path: ['LOCAL_METRICS_ENABLED'],
        message: 'LOCAL_METRICS_ENABLED is available only for APP_ENV=local.',
      });
    const localStagingHttpOrigin =
      value.APP_ENV === 'staging' &&
      isLoopbackHttpUrl(value.PUBLIC_SITE_URL) &&
      isLoopbackHttpUrl(value.WEB_ORIGIN) &&
      new URL(value.PUBLIC_SITE_URL!).origin === value.WEB_ORIGIN;
    for (const name of ['PUBLIC_SITE_URL', 'CATALOG_ASSETS_PUBLIC_URL'] as const) {
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
    const firebaseFields = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_AUTH_DOMAIN',
      'FIREBASE_API_KEY',
      'FIREBASE_APP_ID',
      'FIREBASE_ADMIN_CREDENTIALS_BASE64',
    ] as const;
    const configuredFirebaseFields = firebaseFields.filter((name) => value[name] !== undefined);
    const firebaseEnabled = configuredFirebaseFields.length === firebaseFields.length;
    if (configuredFirebaseFields.length > 0 && !firebaseEnabled)
      context.addIssue({
        code: 'custom',
        path: ['FIREBASE_PROJECT_ID'],
        message: 'Configure todos os campos públicos e a credencial Firebase Admin juntos.',
      });
    if (firebaseEnabled) {
      try {
        const serviceAccount = JSON.parse(
          Buffer.from(value.FIREBASE_ADMIN_CREDENTIALS_BASE64!, 'base64').toString('utf8'),
        ) as { type?: string; project_id?: string; client_email?: string; private_key?: string };
        if (
          serviceAccount.type !== 'service_account' ||
          serviceAccount.project_id !== value.FIREBASE_PROJECT_ID ||
          !serviceAccount.client_email ||
          !serviceAccount.private_key
        )
          context.addIssue({
            code: 'custom',
            path: ['FIREBASE_ADMIN_CREDENTIALS_BASE64'],
            message: 'A credencial Firebase Admin deve pertencer ao projeto configurado.',
          });
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['FIREBASE_ADMIN_CREDENTIALS_BASE64'],
          message: 'Configure uma credencial Firebase Admin válida em Base64.',
        });
      }
    }
    if (value.STEAM_OPENID_CALLBACK_URL) {
      try {
        const callback = new URL(value.STEAM_OPENID_CALLBACK_URL);
        if (
          callback.username ||
          callback.password ||
          callback.search ||
          callback.hash ||
          callback.pathname !== '/api/v1/identity/steam/callback'
        )
          context.addIssue({
            code: 'custom',
            path: ['STEAM_OPENID_CALLBACK_URL'],
            message: 'Use somente a rota fixa de callback Steam, sem credenciais ou parâmetros.',
          });
        if (
          value.APP_ENV !== 'local' &&
          ((!callback.protocol.startsWith('https:') &&
            !(localStagingHttpOrigin && isLoopbackHttpUrl(callback.origin))) ||
            callback.origin !== value.WEB_ORIGIN)
        )
          context.addIssue({
            code: 'custom',
            path: ['STEAM_OPENID_CALLBACK_URL'],
            message:
              'Staging e produção exigem callback HTTPS, exceto localhost no staging local, na origem configurada.',
          });
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['STEAM_OPENID_CALLBACK_URL'],
          message: 'Configure uma URL de callback Steam válida.',
        });
      }
      if (!firebaseEnabled)
        context.addIssue({
          code: 'custom',
          path: ['STEAM_OPENID_CALLBACK_URL'],
          message: 'Configure Firebase antes de habilitar o callback Steam.',
        });
    } else if (firebaseEnabled && value.APP_ENV !== 'local') {
      context.addIssue({
        code: 'custom',
        path: ['STEAM_OPENID_CALLBACK_URL'],
        message: 'Staging e produção com Firebase exigem um callback Steam.',
      });
    }
    if (value.STAGING_TEST_FIREBASE_UID && value.APP_ENV !== 'staging')
      context.addIssue({
        code: 'custom',
        path: ['STAGING_TEST_FIREBASE_UID'],
        message: 'O UID de teste só pode ser configurado em staging.',
      });
    if (
      value.ROADMAP_ADMIN_FIREBASE_UIDS &&
      new Set(value.ROADMAP_ADMIN_FIREBASE_UIDS.split(',').map((uid) => uid.trim())).size !==
        value.ROADMAP_ADMIN_FIREBASE_UIDS.split(',').length
    )
      context.addIssue({
        code: 'custom',
        path: ['ROADMAP_ADMIN_FIREBASE_UIDS'],
        message: 'A lista de UIDs administrativos não pode conter duplicatas.',
      });
    if (value.ANALYTICS_ENABLED && !value.POSTHOG_PUBLIC_KEY)
      context.addIssue({
        code: 'custom',
        path: ['POSTHOG_PUBLIC_KEY'],
        message: 'Configure a chave pública antes de ativar estatísticas.',
      });
    if (value.NODE_ENV === 'production' && !localStagingHttpOrigin) {
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
