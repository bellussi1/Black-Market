import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@bdo/ui/button';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-not-found-page',
  imports: [HlmButton, RouterLink],
  templateUrl: './not-found-page.html',
})
export class NotFoundPage {
  constructor() {
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) response.status = 404;
  }
}
