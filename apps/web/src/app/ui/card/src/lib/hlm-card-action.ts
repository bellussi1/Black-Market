import { Directive } from '@angular/core';
import { classes } from '@bdo/ui/utils';

@Directive({
  // Preserve the public selector of the copied Spartan component.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[hlmCardAction]',
  host: { 'data-slot': 'card-action' },
})
export class HlmCardAction {
  constructor() {
    classes(() => 'col-start-2 row-span-2 row-start-1 self-start justify-self-end');
  }
}
