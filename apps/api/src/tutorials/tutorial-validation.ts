import {
  isTutorialAnchorForScreen,
  isTutorialLocale,
  isTutorialScreenKey,
  type TutorialGuideUpdateRequest,
} from '@bdo/shared';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

const HTML_OR_MARKDOWN_PATTERN =
  /<\/?[a-z!][^>]*>|\[[^\]]+\]\([^)]+\)|(?:^|\s)#{1,6}\s|```|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?:^|\s)\*[^*]+\*(?=\s|$|[.,!?])|(?:^|\s)_[^_]+_(?=\s|$|[.,!?])|~~[^~]+~~|(?:^|\n)\s*(?:>\s|[-+*]\s|\d+[.)]\s)/i;

const tutorialStepSchema = z
  .object({
    sortOrder: z.number().int().min(0).max(1000),
    anchorKey: z.string().trim().min(1).max(120).nullable(),
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(360),
  })
  .strict();

const tutorialGuideUpdateSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }).nullable(),
    enabled: z.boolean(),
    steps: z.array(tutorialStepSchema).min(1).max(8),
  })
  .strict();

export function parseTutorialGuideUpdate(
  screenKey: string,
  locale: string,
  input: unknown,
): TutorialGuideUpdateRequest {
  if (!isTutorialScreenKey(screenKey)) {
    throw new NotFoundException('Tela de tutorial não registrada.');
  }
  if (!isTutorialLocale(locale)) {
    throw new BadRequestException({
      message: 'Revise os campos do tutorial antes de salvar.',
      issues: [{ path: ['locale'], message: 'Idioma de tutorial não suportado.' }],
    });
  }

  const parsed = tutorialGuideUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestException({
      message: 'Revise os campos do tutorial antes de salvar.',
      issues: parsed.error.issues.map(({ path, message }) => ({ path, message })),
    });
  }

  const issues: Array<{ path: Array<string | number>; message: string }> = [];

  parsed.data.steps.forEach((step, index) => {
    if (step.anchorKey !== null && !isTutorialAnchorForScreen(screenKey, step.anchorKey)) {
      issues.push({
        path: ['steps', index, 'anchorKey'],
        message: 'Escolha uma âncora registrada para esta tela ou uma etapa geral.',
      });
    }
    if (HTML_OR_MARKDOWN_PATTERN.test(step.title)) {
      issues.push({
        path: ['steps', index, 'title'],
        message: 'Use texto simples, sem HTML ou Markdown.',
      });
    }
    if (HTML_OR_MARKDOWN_PATTERN.test(step.body)) {
      issues.push({
        path: ['steps', index, 'body'],
        message: 'Use texto simples, sem HTML ou Markdown.',
      });
    }
  });

  if (issues.length > 0) {
    throw new BadRequestException({
      message: 'Revise os campos do tutorial antes de salvar.',
      issues,
    });
  }

  const normalizedSteps = parsed.data.steps
    .map((step, originalIndex) => ({ step, originalIndex }))
    .sort(
      (left, right) =>
        left.step.sortOrder - right.step.sortOrder || left.originalIndex - right.originalIndex,
    )
    .map(({ step }, normalizedIndex) => ({
      sortOrder: normalizedIndex,
      anchorKey: step.anchorKey,
      title: step.title,
      body: step.body,
    }));

  return {
    expectedUpdatedAt: parsed.data.expectedUpdatedAt,
    enabled: parsed.data.enabled,
    steps: normalizedSteps,
  };
}
