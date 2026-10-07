import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../core/workspace-store';
import { workspaceSchema, type Workspace } from '../../core/workspace-models';
import { silver, number } from '../../shared/formatters';
import { download } from '../../shared/download';
import { validationMessage } from '../../shared/calculation-feedback';
type Stock = Workspace['inventory'][number];
type Project = Workspace['projects'][number];
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-storage-page',
  imports: [FormsModule],
  templateUrl: './storage-page.html',
})
export class StoragePage {
  readonly store = inject(WorkspaceStore);
  readonly tab = signal('stock');
  search = '';
  location = '';
  draft: Stock = this.newStock();
  project: Project = this.newProject();
  readonly selectedProject = signal('');
  readonly error = signal('');
  readonly silver = silver;
  readonly number = number;
  readonly allStock = computed(() =>
    this.store.data().inventory.filter((r) => r.region === this.store.data().region),
  );
  readonly valuation = computed(() =>
    String(this.allStock().reduce((sum, r) => sum + BigInt(r.price) * BigInt(r.quantity), 0n)),
  );
  readonly currentProject = computed(() =>
    this.store
      .data()
      .projects.find(
        (r) => r.id === this.selectedProject() && r.region === this.store.data().region,
      ),
  );
  readonly materials = computed(() =>
    (this.currentProject()?.materials ?? []).map((m) => {
      const owned = this.allStock()
        .filter((r) => r.name.toLocaleLowerCase() === m.name.toLocaleLowerCase())
        .reduce((n, r) => n + r.quantity, 0);
      const missing = Math.max(0, m.target - owned);
      return {
        ...m,
        owned,
        missing,
        percent: Math.min(100, (owned / m.target) * 100),
        cost: String(BigInt(m.price) * BigInt(missing)),
      };
    }),
  );
  readonly projectCost = computed(() =>
    String(this.materials().reduce((sum, r) => sum + BigInt(r.cost), 0n)),
  );
  readonly completed = computed(() => this.materials().filter((r) => r.missing === 0).length);
  get rows(): Stock[] {
    return this.allStock().filter(
      (r) =>
        r.name.toLocaleLowerCase().includes(this.search.toLocaleLowerCase()) &&
        (!this.location || r.location === this.location),
    );
  }
  get locations(): string[] {
    return [...new Set(this.allStock().map((r) => r.location))].sort();
  }
  get projects(): Project[] {
    return this.store.data().projects.filter((r) => r.region === this.store.data().region);
  }
  newStock(): Stock {
    return {
      id: crypto.randomUUID(),
      region: this.store.data().region,
      name: '',
      location: 'Velia',
      quantity: 0,
      target: 0,
      price: '0',
    };
  }
  newProject(): Project {
    return {
      id: crypto.randomUUID(),
      region: this.store.data().region,
      name: '',
      materials: [{ name: '', target: 1, price: '0' }],
    };
  }
  saveStock(): void {
    const candidate = {
      ...this.store.data(),
      inventory: [
        ...this.store.data().inventory.filter((r) => r.id !== this.draft.id),
        { ...this.draft, region: this.store.data().region },
      ],
    };
    if (this.store.replace(candidate)) {
      this.draft = this.newStock();
      this.error.set('');
    }
  }
  edit(row: Stock): void {
    this.draft = structuredClone(row);
  }
  remove(id: string): void {
    this.store.update((s) => ({ ...s, inventory: s.inventory.filter((r) => r.id !== id) }));
  }
  exportList(): void {
    const safe = (v: string) =>
      '"' + (/^[=+\-@]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
    const text = [
      'Item;Local;Quantidade;Meta;Falta;Preço unitário',
      ...this.rows.map((r) =>
        [
          safe(r.name),
          safe(r.location),
          r.quantity,
          r.target,
          Math.max(0, r.target - r.quantity),
          r.price,
        ].join(';'),
      ),
    ].join('\n');
    download('black-market-materiais.csv', '\uFEFF' + text, 'text/csv;charset=utf-8');
  }
  saveProject(): void {
    if (
      new Set(this.project.materials.map((r) => r.name.trim().toLocaleLowerCase())).size !==
      this.project.materials.length
    ) {
      this.error.set('Use cada material uma vez no projeto.');
      return;
    }
    const parsed = workspaceSchema.safeParse({
      ...this.store.data(),
      projects: [
        ...this.store.data().projects.filter((r) => r.id !== this.project.id),
        { ...this.project, region: this.store.data().region },
      ],
    });
    if (!parsed.success) {
      this.error.set(validationMessage(parsed.error));
      return;
    }
    if (this.store.replace(parsed.data)) {
      this.selectedProject.set(this.project.id);
      this.project = this.newProject();
      this.error.set('');
    }
  }
  editProject(p: Project): void {
    this.project = structuredClone(p);
  }
  removeProject(id: string): void {
    this.store.update((s) => ({ ...s, projects: s.projects.filter((r) => r.id !== id) }));
  }
  addMaterial(): void {
    this.project.materials.push({ name: '', target: 1, price: '0' });
  }
  removeMaterial(index: number): void {
    this.project.materials.splice(index, 1);
  }
}
