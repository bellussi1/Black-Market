import { Directive } from '@angular/core';
import { classes } from '@bdo/ui/utils';

/** Styles existing native selects without changing their value/change contracts. */
@Directive({
  selector: 'select[appBdoSelect]',
})
export class BdoSelect {
  constructor() {
    classes(
      () =>
        'h-[var(--bm-control-height)] min-w-0 w-full rounded-[var(--bm-radius)] border-[length:var(--bm-border-width)] border-input bg-card px-3 text-sm text-foreground transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50',
    );
  }
}
