import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  calculateWorkerEmpire,
  defaultTax,
  type EmpireTask,
  empireTaskSchema,
  type EmpireWorker,
  empireWorkerSchema,
  type TaxOptions,
  type WorkerEmpire,
  workerEmpireSchema,
  type WorldNode,
} from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';

import { AnalyticsService } from '../../core/analytics.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { evaluate, validationMessage } from '../../shared/calculation-feedback';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { silver } from '../../shared/formatters';
import { TaxOptionsComponent } from '../../shared/tax-options';

@Component({
  selector: 'app-worker-empire',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, CatalogItemPicker, TaxOptionsComponent],
  templateUrl: './worker-empire.html',
  styleUrl: './worker-empire.scss',
})
export class WorkerEmpireComponent {
  readonly nodes = input.required<WorldNode[]>();
  readonly store = inject(WorkspaceStore);
  private readonly analytics = inject(AnalyticsService);
  readonly silver = silver;
  readonly message = signal('');
  readonly draft = signal<WorkerEmpire>(this.empty());
  readonly cityFilter = signal('');
  readonly order = signal('net');
  readonly nodeSearch = signal('');
  readonly saved = computed(() =>
    this.store.data().workerEmpires.filter((row) => row.region === this.store.data().region),
  );
  readonly selectable = computed(() =>
    this.nodes()
      .filter(
        (node) =>
          node.enabled &&
          node.name
            .toLocaleLowerCase('pt-BR')
            .includes(this.nodeSearch().toLocaleLowerCase('pt-BR')),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
  readonly cities = computed(() => [
    ...new Set(this.draft().workers.map((worker) => worker.cityNodeId)),
  ]);
  readonly result = computed(() =>
    evaluate(() => calculateWorkerEmpire(this.draft(), this.nodes())),
  );
  readonly ranked = computed(() => {
    const rows =
      this.result().value?.rows.filter(
        (row) => !this.cityFilter() || row.worker.cityNodeId === this.cityFilter(),
      ) ?? [];
    const score = (row: (typeof rows)[number]) =>
      row.net === null || !row.route
        ? null
        : this.order() === 'cp'
          ? row.standaloneContribution
            ? BigInt(row.net) / BigInt(row.standaloneContribution)
            : null
          : BigInt(row.net);
    return [...rows].sort((a, b) => {
      const x = score(a),
        y = score(b);
      if (x === null) return y === null ? 0 : 1;
      if (y === null) return -1;
      return x === y ? 0 : x > y ? -1 : 1;
    });
  });
  worker: EmpireWorker = this.emptyWorker();
  task: EmpireTask = this.emptyTask();
  quantity = 1;
  outputPrice = '';
  cityContribution = 0;
  lodgingSlots = 1;
  cityNodeId = '';

  constructor() {
    effect(() => {
      const region = this.store.data().region;
      untracked(() => {
        if (this.draft().region !== region) {
          this.reset();
          this.message.set(
            'Região alterada. Escolha um império salvo neste mercado ou cadastre outro.',
          );
        }
      });
    });
  }
  private empty(): WorkerEmpire {
    return workerEmpireSchema.parse({
      id: crypto.randomUUID(),
      region: this.store.data().region,
      ...defaultTax,
    });
  }
  private emptyWorker(): EmpireWorker {
    return { id: crypto.randomUUID(), name: '', cityNodeId: '', species: 'other', level: 1 };
  }
  private emptyTask(): EmpireTask {
    return {
      id: crypto.randomUUID(),
      name: '',
      workerId: '',
      nodeId: '',
      enabled: true,
      cycleMinutes: 60,
      costPerCycle: '0',
      extraContribution: 0,
      outputs: [],
    };
  }
  patch(patch: Partial<WorkerEmpire>) {
    this.draft.update((draft) => ({ ...draft, ...patch }));
  }
  tax(tax: TaxOptions) {
    this.patch(tax);
  }
  nodeName(id: string) {
    return this.nodes().find((node) => node.id === id)?.name ?? 'Base indisponível';
  }
  speciesName(species: string) {
    return (
      { goblin: 'Goblin', human: 'Humano', giant: 'Gigante', other: 'Outro' } as Record<
        string,
        string
      >
    )[species];
  }
  addWorker() {
    const parsed = empireWorkerSchema.safeParse(this.worker);
    if (!parsed.success) {
      this.message.set(validationMessage(parsed.error));
      return;
    }
    this.patch({
      workers: [
        ...this.draft().workers.filter((worker) => worker.id !== parsed.data.id),
        parsed.data,
      ],
    });
    this.worker = this.emptyWorker();
    this.message.set(
      'Trabalhador adicionado ao rascunho. Salve o império para guardar as alterações.',
    );
  }
  editWorker(worker: EmpireWorker) {
    this.worker = structuredClone(worker);
  }
  removeWorker(id: string) {
    if (this.draft().tasks.some((task) => task.workerId === id)) {
      this.message.set('Remova as tarefas deste trabalhador antes de excluí-lo.');
      return;
    }
    this.patch({ workers: this.draft().workers.filter((worker) => worker.id !== id) });
  }
  addOutput(item: CatalogItem | null) {
    if (!item) return;
    const price = this.outputPrice.trim() || null;
    const output = { itemId: item.id, name: item.name, quantity: this.quantity, price };
    const parsed = empireTaskSchema.shape.outputs.element.safeParse(output);
    if (!parsed.success) {
      this.message.set(validationMessage(parsed.error));
      return;
    }
    if (this.task.outputs.some((row) => row.itemId === item.id)) {
      this.message.set('Este produto já está na tarefa. Remova-o antes de alterar a quantidade.');
      return;
    }
    this.task.outputs = [...this.task.outputs, parsed.data];
  }
  removeOutput(id: number) {
    this.task.outputs = this.task.outputs.filter((row) => row.itemId !== id);
  }
  addTask() {
    const parsed = empireTaskSchema.safeParse(this.task);
    if (!parsed.success) {
      this.message.set(validationMessage(parsed.error));
      return;
    }
    const next = workerEmpireSchema.safeParse({
      ...this.draft(),
      tasks: [...this.draft().tasks.filter((task) => task.id !== parsed.data.id), parsed.data],
    });
    if (!next.success) {
      this.message.set(validationMessage(next.error));
      return;
    }
    this.draft.set(next.data);
    this.task = this.emptyTask();
    this.message.set('Tarefa adicionada ao rascunho. Salve o império para guardar as alterações.');
  }
  editTask(taskId: string) {
    this.task = structuredClone(this.draft().tasks.find((task) => task.id === taskId)!);
  }
  removeTask(id: string) {
    this.patch({ tasks: this.draft().tasks.filter((task) => task.id !== id) });
  }
  toggle(id: string) {
    const next = workerEmpireSchema.safeParse({
      ...this.draft(),
      tasks: this.draft().tasks.map((task) =>
        task.id === id ? { ...task, enabled: !task.enabled } : task,
      ),
    });
    if (!next.success) {
      this.message.set(validationMessage(next.error));
      return;
    }
    this.draft.set(next.data);
  }
  editCity(nodeId: string) {
    this.cityNodeId = nodeId;
    const city = this.draft().cities.find((city) => city.nodeId === nodeId);
    this.cityContribution = city?.contribution ?? 0;
    this.lodgingSlots = city?.lodgingSlots ?? 1;
  }
  addCity() {
    const parsed = workerEmpireSchema.shape.cities.unwrap().element.safeParse({
      nodeId: this.cityNodeId,
      contribution: this.cityContribution,
      lodgingSlots: this.lodgingSlots,
    });
    if (!parsed.success) {
      this.message.set(validationMessage(parsed.error));
      return;
    }
    this.patch({
      cities: [
        ...this.draft().cities.filter((city) => city.nodeId !== parsed.data.nodeId),
        parsed.data,
      ],
    });
    this.message.set('Custos da cidade atualizados no rascunho.');
  }
  invested(id: string) {
    const ids = new Set(this.draft().investedNodeIds);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    this.patch({ investedNodeIds: [...ids] });
  }
  save() {
    const parsed = workerEmpireSchema.safeParse(this.draft());
    if (!parsed.success) {
      this.message.set(validationMessage(parsed.error));
      return;
    }
    if (
      this.store.update((state) => ({
        ...state,
        workerEmpires: [
          ...state.workerEmpires.filter((row) => row.id !== parsed.data.id),
          parsed.data,
        ],
      }))
    ) {
      this.analytics.capture('journey_completed', {
        feature: 'world',
        action: 'save',
        status: 'success',
      });
      this.message.set('Império salvo neste navegador e incluído no seu backup.');
    }
  }
  load(plan: WorkerEmpire) {
    this.draft.set(structuredClone(plan));
    this.clearEditors();
    this.message.set('Império carregado. Alterações só serão guardadas ao salvar.');
  }
  reset() {
    this.draft.set(this.empty());
    this.clearEditors();
    this.message.set('Novo rascunho. Seus impérios salvos permanecem disponíveis.');
  }
  private clearEditors() {
    this.worker = this.emptyWorker();
    this.task = this.emptyTask();
    this.cityNodeId = '';
    this.cityFilter.set('');
    this.nodeSearch.set('');
    this.quantity = 1;
    this.outputPrice = '';
  }
  deleteSaved(id: string) {
    if (
      this.store.update((state) => ({
        ...state,
        workerEmpires: state.workerEmpires.filter((row) => row.id !== id),
      }))
    ) {
      if (this.draft().id === id) this.reset();
      this.message.set('Império removido dos dados locais.');
    }
  }
}
