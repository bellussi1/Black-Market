import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  categoryId: z.string().trim().min(1).max(120).optional(),
  grade: z.string().trim().min(1).max(24).optional(),
  region: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,12}$/i)
    .default('sa'),
  locale: z
    .string()
    .trim()
    .regex(/^[a-z]{2,8}$/i)
    .optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(48),
});

export interface CatalogQuery {
  search: string | undefined;
  categoryId: string | undefined;
  grade: string | undefined;
  region: string;
  locale: string | undefined;
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
    search: parsed.data.q || undefined,
    categoryId: parsed.data.categoryId,
    grade: parsed.data.grade,
    region: parsed.data.region.toLocaleLowerCase('en-US'),
    locale: parsed.data.locale?.toLocaleLowerCase('en-US'),
    page: options.pagination === false ? 1 : parsed.data.page,
    pageSize: options.pagination === false ? 48 : parsed.data.pageSize,
  };
}
