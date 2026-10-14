import assert from 'node:assert/strict';
import { test } from 'node:test';
import { measuredQuantityLabel } from './measured-quantity-label.mjs';

test('measured labels are aligned to the right with exact outlined bounds', () => {
  const glyphs = [{ character: '1', rows: ['01', '11', '01'] }];
  const result = measuredQuantityLabel('11', glyphs, { right: 30, baseline: 20, fontSize: 6 }, 2);
  assert.deepEqual(result.bounds, { left: 19, top: 13, width: 12, height: 8 });
  assert.match(result.svg, /stroke="#050505"/);
  assert.equal(
    measuredQuantityLabel('M', glyphs, { right: 30, baseline: 20, fontSize: 6 }, 2),
    null,
  );
});
