import { Directive, input } from '@angular/core';
import { classes } from '@bdo/ui/utils';

import type { HlmCardConfig } from './hlm-card.token';
import { injectHlmCardConfig } from './hlm-card.token';

@Directive({
  // Preserve the public selector of the copied Spartan component.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[hlmCard],hlm-card',
  host: {
    'data-slot': 'card',
    '[attr.data-size]': 'size()',
  },
})
export class HlmCard {
  private readonly _defaultConfig = injectHlmCardConfig();
  public readonly size = input<HlmCardConfig['size']>(this._defaultConfig.size);

  constructor() {
    classes(
      () =>
        'bg-card text-card-foreground min-w-0 rounded-[var(--bm-radius)] border-[length:var(--bm-border-width)] border-border p-[var(--bm-panel-padding,1.25rem)] text-sm data-[size=sm]:p-4 group/card block',
    );
  }
}
