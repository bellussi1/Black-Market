import { Directive } from '@angular/core';
import { classes } from '@bdo/ui/utils';

@Directive({
  // Preserve the public selector of the copied Spartan component.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[hlmCardFooter],hlm-card-footer',
  host: { 'data-slot': 'card-footer' },
})
export class HlmCardFooter {
  constructor() {
    classes(() => 'bg-muted/50 rounded-b-xl border-t p-(--card-spacing) flex items-center');
  }
}
