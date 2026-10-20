import { dataLocaleForUi, DEFAULT_UI_LOCALE } from '@bdo/shared/markets';

/** Angular replaces $localize.locale when generating a translated build. */
export function uiLocale(): string {
  return typeof $localize === 'undefined'
    ? DEFAULT_UI_LOCALE
    : ($localize.locale ?? DEFAULT_UI_LOCALE);
}

export function preferredDataLocale(): string {
  return dataLocaleForUi(uiLocale());
}
