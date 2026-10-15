import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { lifeSkills } from '@bdo/calculators';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';
import { firstValueFrom } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { createDemoWorkspace, demoItemIds } from '../../core/demo-scenario';
import type { Workspace } from '../../core/workspace-models';
import { workspaceSchema } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { silver } from '../../shared/formatters';
import { lifeSkillLabels } from '../../shared/game-labels';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { LoadingSkeleton } from '../../shared/loading-skeleton/loading-skeleton';
@Component({
  selector: 'app-demo-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmInput, HlmCard, HlmButton, FormsModule, RouterLink, ItemIcon, LoadingSkeleton],
  templateUrl: './demo-page.html',
})
export class DemoPage {
  readonly skills = lifeSkills;
  readonly skillLabels = lifeSkillLabels;
  readonly store = inject(WorkspaceStore);
  readonly catalog = inject(CatalogApiService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly draft = signal<Workspace | null>(null);
  readonly icons = signal(new Map<number, string | null>());
  readonly silver = silver;
  confirmed = false;
  async prepare() {
    this.loading.set(true);
    this.message.set('');
    this.confirmed = false;
    try {
      const region = this.store.data().region;
      const result = await firstValueFrom(
        this.catalog.getItems({ ids: demoItemIds, page: 1, pageSize: 100 }),
      );
      if (this.store.data().region !== region) throw new Error();
      this.draft.set(createDemoWorkspace(result.items, region));
      this.icons.set(
        new Map(result.items.map((item) => [item.id, this.catalog.resolveIconUrl(item)])),
      );
    } catch {
      this.message.set(
        'Não foi possível preparar o exemplo. Confira se o catálogo da região está disponível e tente novamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  confirm() {
    if (!this.confirmed || !this.draft()) return;
    const parsed = workspaceSchema.safeParse(this.draft());
    if (!parsed.success) {
      this.message.set('Confira nome, quantidades, atributos e valores antes de importar.');
      return;
    }
    if (this.store.startDemo(parsed.data)) void this.router.navigate(['/']);
  }
  edited() {
    this.confirmed = false;
    this.message.set('');
  }
}
