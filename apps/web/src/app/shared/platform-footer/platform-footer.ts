import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PrivacyService } from '../../core/privacy.service';

@Component({
  selector: 'app-platform-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './platform-footer.html',
  styleUrl: './platform-footer.scss',
})
export class PlatformFooter {
  readonly privacy = inject(PrivacyService);
  readonly year = new Date().getUTCFullYear();
}
