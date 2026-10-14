import { Directive } from '@angular/core';
import { classes } from '@bdo/ui/utils';

@Directive({
  // Preserve upstream Spartan selectors.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'option[hlmNativeSelectOption]',
  host: { 'data-slot': 'native-select-option' },
})
export class HlmNativeSelectOption {
  constructor() {
    classes(() => 'bg-[Canvas] text-[CanvasText]');
  }
}
