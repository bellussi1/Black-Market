import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChartNoAxesCombined, lucideCompass } from '@ng-icons/lucide';

type LifeSkillsHubTab = 'production' | 'sessions' | null;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-life-skills-hub-nav',
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideCompass, lucideChartNoAxesCombined })],
  templateUrl: './life-skills-hub-nav.html',
  styleUrl: './life-skills-hub-nav.scss',
})
export class LifeSkillsHubNav {
  readonly activeTab = input.required<LifeSkillsHubTab>();
}
