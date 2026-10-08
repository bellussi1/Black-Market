import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Layout reservation only: no ad network, tracking, request or external script. */
@Component({
  selector: 'app-ad-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<aside
    class="ad-slot"
    [class.rail]="format() === 'rail'"
    aria-label="Espaço de publicidade"
    i18n-aria-label
  >
    <span i18n>Publicidade</span>
  </aside>`,
  styles: `
    :host {
      display: block;
    }
    .ad-slot {
      display: grid;
      place-items: center;
      min-height: 90px;
      border: 1px dashed var(--bm-border);
      background: var(--bm-surface);
      color: var(--bm-muted);
      font-size: 12px;
    }
    .rail {
      min-height: 600px;
    }
  `,
})
export class AdSlot {
  readonly format = input<'rail' | 'banner'>('banner');
}
