import {
  isTutorialAnchorForScreen,
  type TutorialPublicStep,
  type TutorialScreenKey,
} from '@bdo/shared';

export interface ResolvedTutorialStep {
  sortOrder: number;
  anchorKey: string | null;
  title: string;
  body: string;
  element: HTMLElement | null;
}

export interface TutorialStepResolutionResult {
  steps: ResolvedTutorialStep[];
  omittedCount: number;
}

export function isElementVisibleForTour(document: Document, element: HTMLElement): boolean {
  if (!element.isConnected) {
    return false;
  }

  let current: HTMLElement | null = element;
  const view = document.defaultView;

  while (current && current !== document.body && current !== document.documentElement) {
    if (
      current.hidden ||
      current.hasAttribute('hidden') ||
      current.getAttribute('aria-hidden') === 'true'
    ) {
      return false;
    }
    if (view) {
      const style = view.getComputedStyle(current);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        (style.opacity !== '' && Number(style.opacity) === 0)
      ) {
        return false;
      }
    }
    current = current.parentElement;
  }

  return Array.from(element.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0);
}

export function findUniqueVisibleTourTarget(
  document: Document,
  screenKey: TutorialScreenKey,
  anchorKey: string,
): HTMLElement | null {
  if (!isTutorialAnchorForScreen(screenKey, anchorKey)) {
    return null;
  }

  const allTourNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-tour]'));
  const matchingVisible = allTourNodes.filter(
    (node) =>
      node.getAttribute('data-tour') === anchorKey && isElementVisibleForTour(document, node),
  );

  if (matchingVisible.length !== 1) {
    return null;
  }

  return matchingVisible[0] ?? null;
}

export function hasVisibleTutorialTarget(
  document: Document,
  screenKey: TutorialScreenKey,
  steps: readonly TutorialPublicStep[],
): boolean {
  return steps.some(
    (step) =>
      step.anchorKey === null ||
      findUniqueVisibleTourTarget(document, screenKey, step.anchorKey) !== null,
  );
}

export function resolveTutorialSteps(
  document: Document,
  screenKey: TutorialScreenKey,
  steps: readonly TutorialPublicStep[],
): TutorialStepResolutionResult {
  const ordered = [...steps].sort((left, right) => left.sortOrder - right.sortOrder);
  const resolved: ResolvedTutorialStep[] = [];
  let omittedCount = 0;

  for (const step of ordered) {
    if (step.anchorKey === null) {
      resolved.push({
        sortOrder: resolved.length,
        anchorKey: null,
        title: step.title,
        body: step.body,
        element: null,
      });
      continue;
    }

    const element = findUniqueVisibleTourTarget(document, screenKey, step.anchorKey);
    if (!element) {
      omittedCount += 1;
      continue;
    }

    resolved.push({
      sortOrder: resolved.length,
      anchorKey: step.anchorKey,
      title: step.title,
      body: step.body,
      element,
    });
  }

  return {
    steps: resolved,
    omittedCount,
  };
}
