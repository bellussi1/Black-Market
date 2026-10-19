import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

type LifeSkillsHubTab = 'production' | 'sessions' | null;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-life-skills-hub-nav',
  imports: [RouterLink],
  templateUrl: './life-skills-hub-nav.html',
  styleUrl: './life-skills-hub-nav.scss',
})
export class LifeSkillsHubNav {
  readonly activeTab = input.required<LifeSkillsHubTab>();
}
