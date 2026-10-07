import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CalculatorKey } from '@bdo/calculators';
import { WorkspaceStore } from '../core/workspace-store';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-preset-bar',
  imports: [FormsModule],
  templateUrl: './preset-bar.html',
})
export class PresetBar {
  readonly store = inject(WorkspaceStore);
  readonly tool = input.required<CalculatorKey>();
  readonly value = input.required<unknown>();
  readonly loaded = output<unknown>();
  readonly name = signal('');
  readonly selected = signal('');
  readonly presets = computed(() =>
    this.store
      .data()
      .presets.filter((p) => p.tool === this.tool() && p.region === this.store.data().region),
  );
  save(): void {
    if (this.name().trim()) {
      if (this.store.savePreset(this.tool(), this.name().trim(), this.value())) this.name.set('');
    }
  }
  load(): void {
    const preset = this.presets().find((p) => p.id === this.selected());
    if (preset) this.loaded.emit(structuredClone(preset.input));
  }
  remove(): void {
    if (this.selected()) {
      this.store.removePreset(this.selected());
      this.selected.set('');
    }
  }
}
