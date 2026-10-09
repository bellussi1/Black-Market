import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-item-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-grade]': 'grade()', '[attr.title]': 'tooltip()' },
  template: `
    @if (url(); as source) {
      @if (failedUrl() !== source) {
        <img
          [src]="source"
          alt=""
          width="44"
          height="44"
          loading="lazy"
          decoding="async"
          (error)="failedUrl.set(source)"
        />
      } @else {
        {{ initial() }}
      }
    } @else {
      {{ initial() }}
    }
  `,
  styleUrl: './item-icon.scss',
})
export class ItemIcon {
  readonly grade = input<string | null>(null);
  readonly tooltip = computed(
    () =>
      this.name() +
      (this.grade()
        ? ' · Qualidade: ' +
          ((
            {
              white: 'branca',
              green: 'verde',
              blue: 'azul',
              yellow: 'dourada',
              orange: 'laranja',
              red: 'vermelha',
            } as Record<string, string>
          )[this.grade()!] ?? this.grade())
        : ''),
  );
  readonly url = input<string | null>(null);
  readonly name = input.required<string>();
  readonly failedUrl = signal<string | null>(null);
  readonly initial = computed(() => this.name().charAt(0).toLocaleUpperCase());
}
