import { dataLocaleForUi, DEFAULT_DATA_LOCALE, DEFAULT_REGION } from '@bdo/shared';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const querySchema = z.object({
  ids: z
    .string()
    .max(1100)
    .regex(/^[1-9]\d*(?:,[1-9]\d*){0,99}$/)
    .transform((value) => value.split(',').map(Number))
    .pipe(z.array(z.number().int().positive().max(2147483647)).max(100))
    .optional(),
  q: z.string().trim().max(80).optional(),
  categoryId: z.string().trim().min(1).max(120).optional(),
  grade: z.string().trim().min(1).max(24).optional(),
  region: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,12}$/i)
    .default(DEFAULT_REGION),
  locale: z
    .string()
    .trim()
    .regex(/^[a-z]{2,8}(?:-[a-z0-9]{2,8})?$/i)
    .optional(),
  preferredLocale: z
    .string()
    .trim()
    .regex(/^[a-z]{2,8}(?:-[a-z0-9]{2,8})?$/i)
    .default(DEFAULT_DATA_LOCALE),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(48),
});

export interface CatalogQuery {
  ids?: number[];
  search: string | undefined;
  categoryId: string | undefined;
  grade: string | undefined;
  region: string;
  locale: string | undefined;
  preferredLocale: string;
  page: number;
  pageSize: number;
}

export function parseCatalogQuery(
  input: Record<string, unknown>,
  options: { pagination?: boolean } = {},
): CatalogQuery {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new BadRequestException({
      code: 'INVALID_CATALOG_QUERY',
      message: issue?.message ?? 'Parâmetros de catálogo inválidos.',
      field: issue?.path.map(String).join('.') ?? 'query',
    });
  }
  return {
    ids: parsed.data.ids,
    search: parsed.data.q || undefined,
    categoryId: parsed.data.categoryId,
    grade: parsed.data.grade,
    region: parsed.data.region.toLocaleLowerCase('en-US'),
    locale: parsed.data.locale ? dataLocaleForUi(parsed.data.locale) : undefined,
    preferredLocale: dataLocaleForUi(parsed.data.preferredLocale),
    page: options.pagination === false ? 1 : parsed.data.page,
    pageSize: options.pagination === false ? 48 : parsed.data.pageSize,
  };
}
