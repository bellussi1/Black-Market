import { describe, expect, it } from 'vitest';

import { type DetectedScreenPane, selectGridCaptureKind } from './screen-recognition';

describe('capture kind selected for the detected item grid', () => {
  const inventoryPane: DetectedScreenPane = {
    kind: 'inventory',
    bounds: { left: 878, top: 62, width: 350, height: 600 },
    confidence: 0.96,
  };

  it('uses warehouse mode when the detected grid is left of the only recognized inventory pane', () => {
    expect(
      selectGridCaptureKind('inventory', [inventoryPane], {
        left: 446,
        top: 97,
        width: 378,
        height: 419,
      }),
    ).toBe('storage');
  });

  it('keeps inventory mode when the detected grid is inside the inventory pane', () => {
    expect(
      selectGridCaptureKind('inventory', [inventoryPane], {
        left: 900,
        top: 170,
        width: 300,
        height: 380,
      }),
    ).toBe('inventory');
  });
});
