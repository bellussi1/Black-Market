import { Directive } from '@angular/core';
import { classes } from '@bdo/ui/utils';

@Directive({
  // Preserve the public selector of the copied Spartan component.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[hlmCardContent]',
  host: { 'data-slot': 'card-content' },
})
export class HlmCardContent {
  constructor() {
    classes(() => 'px-(--card-spacing)');
  }
}
