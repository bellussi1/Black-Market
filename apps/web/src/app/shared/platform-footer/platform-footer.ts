import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@bdo/ui/button';

import { PrivacyService } from '../../core/privacy.service';

@Component({
  selector: 'app-platform-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, RouterLink],
  templateUrl: './platform-footer.html',
  styleUrl: './platform-footer.scss',
})
export class PlatformFooter {
  readonly privacy = inject(PrivacyService);
  readonly year = new Date().getUTCFullYear();
}
