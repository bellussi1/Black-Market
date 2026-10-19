import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type LoadingSkeletonVariant =
  | 'rows'
  | 'cards'
  | 'table'
  | 'detail'
  | 'chart'
  | 'map'
  | 'metrics'
  | 'recipe'
  | 'form'
  | 'inline'
  | 'button';

const CHART_BAR_HEIGHTS = [34, 67, 46, 82, 54, 73, 41, 88, 59, 76, 49, 64];
const MAP_MARKER_POSITIONS = [
  [18, 24],
  [29, 37],
  [42, 19],
  [52, 43],
  [63, 29],
  [74, 51],
  [35, 66],
  [82, 72],
  [23, 79],
  [57, 81],
  [68, 13],
  [12, 54],
  [47, 57],
  [90, 34],
  [30, 14],
  [77, 88],
  [8, 39],
  [60, 68],
] as const;

@Component({
  selector: 'app-loading-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.inline-skeleton-host]': "variant() === 'inline'",
    '[class.button-skeleton-host]': "variant() === 'button'",
  },
  templateUrl: './loading-skeleton.html',
  styleUrl: './loading-skeleton.scss',
})
export class LoadingSkeleton {
  readonly variant = input<LoadingSkeletonVariant>('rows');
  readonly count = input(4);
  readonly label = input('Carregando conteúdo');
  readonly chartBarHeight = (index: number) => CHART_BAR_HEIGHTS[index % CHART_BAR_HEIGHTS.length];
  readonly mapMarkerPosition = (index: number) =>
    MAP_MARKER_POSITIONS[index % MAP_MARKER_POSITIONS.length];
  readonly indices = computed(() =>
    Array.from(
      { length: Math.max(1, Math.min(24, Math.trunc(this.count()))) },
      (_, index) => index,
    ),
  );
}
