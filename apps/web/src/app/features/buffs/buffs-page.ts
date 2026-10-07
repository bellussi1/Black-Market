import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  WorkspaceStore,
  buffSchema,
  number,
  validationMessage,
  type Buff,
} from '../../core/workspace-store';
@Component({ selector: 'app-buffs-page', imports: [FormsModule], templateUrl: './buffs-page.html' })
export class BuffsPage implements OnDestroy {
  readonly store = inject(WorkspaceStore);
  draft: Buff = this.newBuff();
  search = '';
  presetName = '';
  selectedPreset = '';
  readonly error = signal('');
  readonly now = signal(Date.now());
  readonly number = number;
  private readonly timer = setInterval(() => this.now.set(Date.now()), 1000);
  readonly active = computed(() => this.store.data().buffs.filter((r) => this.isActive(r)));
  readonly totals = computed(() => {
    const groups = new Map<string, { effect: string; unit: string; value: number }>();
    for (const b of this.active()) {
      const k = b.effect.trim().toLocaleLowerCase() + '|' + b.unit.trim().toLocaleLowerCase();
      const row = groups.get(k) ?? { effect: b.effect, unit: b.unit, value: 0 };
      row.value += b.value;
      groups.set(k, row);
    }
    return [...groups.values()];
  });
  get buffs() {
    return this.store
      .data()
      .buffs.filter(
        (r) =>
          r.name.toLocaleLowerCase().includes(this.search.toLocaleLowerCase()) ||
          r.effect.toLocaleLowerCase().includes(this.search.toLocaleLowerCase()),
      );
  }
  newBuff(): Buff {
    return {
      id: crypto.randomUUID(),
      name: '',
      effect: '',
      group: 'Livre',
      value: 0,
      unit: '%',
      duration: 60,
      enabled: false,
      startedAt: null,
    };
  }
  save(): void {
    const p = buffSchema.safeParse(this.draft);
    if (!p.success) {
      this.error.set(validationMessage(p.error));
      return;
    }
    if (
      this.store.update((s) => ({
        ...s,
        buffs: [
          ...s.buffs.filter((r) => r.id !== p.data.id),
          { ...p.data, enabled: false, startedAt: null },
        ],
      }))
    ) {
      this.draft = this.newBuff();
      this.error.set('');
    }
  }
  isActive(b: Buff): boolean {
    return (
      b.enabled &&
      !(b.startedAt && b.duration > 0 && b.startedAt + b.duration * 60000 <= this.now())
    );
  }
  toggle(b: Buff): void {
    const enabled = this.isActive(b);
    this.store.update((s) => ({
      ...s,
      buffs: s.buffs.map((r) =>
        r.id === b.id
          ? { ...r, enabled: !enabled, startedAt: null }
          : !enabled &&
              b.group.trim().toLocaleLowerCase() !== 'livre' &&
              r.group.trim().toLocaleLowerCase() === b.group.trim().toLocaleLowerCase()
            ? { ...r, enabled: false, startedAt: null }
            : r,
      ),
    }));
  }
  remove(id: string): void {
    this.store.update((s) => ({ ...s, buffs: s.buffs.filter((r) => r.id !== id) }));
  }
  edit(b: Buff): void {
    this.draft = structuredClone(b);
  }
  start(): void {
    const now = Date.now();
    this.store.update((s) => ({
      ...s,
      buffs: s.buffs.map((r) => (r.enabled ? { ...r, startedAt: now } : r)),
    }));
  }
  remaining(b: Buff): string {
    if (!b.startedAt || !b.duration) return b.duration === 0 ? 'Sem duração' : b.duration + ' min';
    const seconds = Math.max(0, Math.ceil((b.startedAt + b.duration * 60000 - this.now()) / 1000));
    return seconds === 0 ? 'Encerrado' : Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
  }
  savePreset(): void {
    if (this.presetName.trim() && this.active().length)
      this.store.update((s) => ({
        ...s,
        buffPresets: [
          ...s.buffPresets,
          {
            id: crypto.randomUUID(),
            name: this.presetName.trim(),
            buffIds: this.active().map((r) => r.id),
          },
        ],
      }));
    this.presetName = '';
  }
  loadPreset(): void {
    const p = this.store.data().buffPresets.find((r) => r.id === this.selectedPreset);
    if (p)
      this.store.update((s) => {
        const groups = new Set<string>();
        return {
          ...s,
          buffs: s.buffs.map((r) => {
            const group = r.group.trim().toLocaleLowerCase();
            const enabled = p.buffIds.includes(r.id) && (group === 'livre' || !groups.has(group));
            if (enabled && group !== 'livre') groups.add(group);
            return { ...r, enabled, startedAt: null };
          }),
        };
      });
  }
  removePreset(): void {
    this.store.update((s) => ({
      ...s,
      buffPresets: s.buffPresets.filter((r) => r.id !== this.selectedPreset),
    }));
    this.selectedPreset = '';
  }
  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
