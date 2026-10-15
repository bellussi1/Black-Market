import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const internalPathSchema = z
  .string()
  .trim()
  .min(2)
  .max(180)
  .regex(/^\/(?!\/)[a-zA-Z0-9/_-]+$/, 'Use um caminho interno válido.');

const roadmapEntrySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use um identificador em letras minúsculas e hífens.'),
  kind: z.enum(['flow', 'pillar']),
  sortOrder: z.number().int().min(0),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(280),
  description: z.string().trim().max(1600).default(''),
  statusLabel: z.string().trim().max(60).nullable().default(null),
  icon: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^lucide[A-Z][A-Za-z0-9]*$/, 'Escolha um ícone Lucide válido.'),
  featured: z.boolean().default(false),
  links: z
    .array(z.object({ label: z.string().trim().min(1).max(80), path: internalPathSchema }))
    .max(8)
    .default([]),
});

const roadmapUpdateSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }).nullable().default(null),
    entries: z.array(roadmapEntrySchema),
  })
  .superRefine(({ entries }, context) => {
    const slugs = new Set<string>();
    const ids = new Set<string>();
    const positions = new Set<number>();
    entries.forEach((entry, index) => {
      if (slugs.has(entry.slug))
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'slug'],
          message: 'Cada identificador deve ser único.',
        });
      slugs.add(entry.slug);
      if (entry.id) {
        if (ids.has(entry.id))
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'id'],
            message: 'Cada registro deve ter um identificador único.',
          });
        ids.add(entry.id);
      }
      if (positions.has(entry.sortOrder))
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'sortOrder'],
          message: 'A ordem deve ser única em todo o Roadmap.',
        });
      positions.add(entry.sortOrder);
      const paths = new Set<string>();
      entry.links.forEach((link, linkIndex) => {
        if (paths.has(link.path))
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'links', linkIndex, 'path'],
            message: 'Cada caminho deve ser único dentro da entrada.',
          });
        paths.add(link.path);
      });
      if (/<\/?[a-z][^>]*>/i.test(`${entry.title}\n${entry.summary}\n${entry.description}`))
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'description'],
          message: 'Use texto simples, sem marcação HTML.',
        });
    });
  });

export type RoadmapEntryInput = z.infer<typeof roadmapEntrySchema>;
export type RoadmapUpdateInput = z.infer<typeof roadmapUpdateSchema>;

export function parseRoadmapUpdate(input: unknown): RoadmapUpdateInput {
  const parsed = roadmapUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestException({
      message: 'Revise os campos do Roadmap antes de salvar.',
      issues: parsed.error.issues.map(({ path, message }) => ({ path, message })),
    });
  }
  return parsed.data;
}
