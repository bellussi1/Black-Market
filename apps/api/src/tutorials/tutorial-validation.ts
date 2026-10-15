import {
  isTutorialAnchorForScreen,
  isTutorialScreenKey,
  TUTORIAL_LOCALES,
  type TutorialGuideUpdateRequest,
} from '@bdo/shared';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

// Reject formatting syntax while allowing ordinary punctuation in editorial text.
const markupPattern =
  /<[^>]*>|!?(?:\[[^\]\n]+\])(?:\([^\n]*\)|\[[^\]\n]*\])|(\*{1,2}|_{1,2}|~{1,2})[\s\S]+?\1|`|^(?:\s{0,3}(?:#{1,6}(?:\s|$)|>|[-+*]\s|\d+[.)]\s|(?:[-*_]\s*){3,}$|[=-]+\s*$|\[[^\]]+\]:|\|.*\|)| {4}\S|\t\S)/m;
const tableDelimiterPattern =
  /^ {0,3}\|?[\t ]*:?-{3,}:?[\t ]*(?:\|[\t ]*:?-{3,}:?[\t ]*)+\|?[\t ]*\r?$/m;

function plainText(maxLength: number) {
  return z
    .string()
    .refine(
      (value) => !markupPattern.test(value) && !tableDelimiterPattern.test(value),
      'Use texto simples, sem HTML ou Markdown.',
    )
    .trim()
    .min(1)
    .max(maxLength);
}

const guideUpdateSchema = z.strictObject({
  expectedUpdatedAt: z.string().datetime({ offset: true }).nullable(),
  enabled: z.boolean(),
  steps: z
    .array(
      z.strictObject({
        sortOrder: z.number().int().min(0),
        anchorKey: z.string().nullable(),
        title: plainText(100),
        body: plainText(360),
      }),
    )
    .min(1)
    .max(8),
});

export function parseTutorialGuideUpdate(
  screenKey: string,
  locale: string,
  input: unknown,
): TutorialGuideUpdateRequest {
  const schema = z
    .object({
      screenKey: z.string().refine(isTutorialScreenKey, 'Escolha uma tela de tutorial válida.'),
      locale: z.enum(TUTORIAL_LOCALES),
      input: guideUpdateSchema,
    })
    .superRefine(({ screenKey: screen, input: guide }, context) => {
      guide.steps.forEach(({ anchorKey }, index) => {
        if (anchorKey !== null && !isTutorialAnchorForScreen(screen, anchorKey)) {
          context.addIssue({
            code: 'custom',
            path: ['input', 'steps', index, 'anchorKey'],
            message: 'Escolha uma âncora permitida para esta tela.',
          });
        }
      });
    });
  const parsed = schema.safeParse({ screenKey, locale, input });
  if (!parsed.success) {
    throw new BadRequestException({
      message: 'Revise os campos do tutorial antes de salvar.',
      issues: parsed.error.issues.flatMap((issue) => {
        const path = issue.path[0] === 'input' ? issue.path.slice(1) : issue.path;
        return issue.code === 'unrecognized_keys'
          ? issue.keys.map((key) => ({ path: [...path, key], message: 'Campo não permitido.' }))
          : [{ path, message: issue.message }];
      }),
    });
  }
  return {
    ...parsed.data.input,
    steps: [...parsed.data.input.steps]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((step, sortOrder) => ({ ...step, sortOrder })),
  };
}
