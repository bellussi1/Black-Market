import type { TutorialPublicGuide, TutorialScreenKey } from '@bdo/shared';
import { isTutorialAnchorForScreen } from '@bdo/shared';

export interface ResolvedTutorialStep {
  sortOrder: number;
  anchorKey: string | null;
  element: HTMLElement | null;
  title: string;
  body: string;
}

export interface TutorialStepResolution {
  steps: ResolvedTutorialStep[];
  omittedCount: number;
}

/** Resolves registered anchor keys without ever treating remote content as a selector. */
export function resolveTutorialSteps(
  document: Document,
  screenKey: TutorialScreenKey,
  steps: TutorialPublicGuide['steps'],
): TutorialStepResolution {
  const resolved: ResolvedTutorialStep[] = [];
  let omittedCount = 0;

  for (const step of steps) {
    if (step.anchorKey === null) {
      resolved.push({ ...step, element: null });
      continue;
    }

    if (!isTutorialAnchorForScreen(screenKey, step.anchorKey)) {
      omittedCount++;
      continue;
    }

    const visibleTargets = [...document.querySelectorAll<HTMLElement>('[data-tour]')].filter(
      (candidate) =>
        candidate.getAttribute('data-tour') === step.anchorKey && isVisible(document, candidate),
    );
    if (visibleTargets.length !== 1) {
      omittedCount++;
      continue;
    }

    resolved.push({ ...step, element: visibleTargets[0] ?? null });
  }

  return { steps: resolved, omittedCount };
}

function isVisible(document: Document, element: HTMLElement): boolean {
  const view = document.defaultView;
  if (!view || typeof view.getComputedStyle !== 'function' || !element.isConnected) return false;

  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    const style = view.getComputedStyle(ancestor);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      style.contentVisibility === 'hidden' ||
      (style.opacity !== '' && Number(style.opacity) === 0)
    ) {
      return false;
    }
  }

  const bounds = element.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0;
}
