import { Directive } from '@angular/core';
import { classes } from '@bdo/ui/utils';

@Directive({
  // Preserve upstream Spartan selectors.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'optgroup[hlmNativeSelectOptGroup]',
  host: { 'data-slot': 'native-select-optgroup' },
})
export class HlmNativeSelectOptGroup {
  constructor() {
    classes(() => 'bg-[Canvas] text-[CanvasText]');
  }
}
