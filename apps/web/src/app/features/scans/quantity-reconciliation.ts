import type { QuantityReading } from './print-reader';

/** Keep independent OCR evidence; disagreement must never become an exact count. */
export function reconcileQuantity(
  local: QuantityReading | null,
  fallback: QuantityReading,
): QuantityReading {
  if (!local?.value) return fallback;
  if (!fallback.value) return local;
  if (local.value === fallback.value && local.approximate === fallback.approximate)
    return fallback.confidence > local.confidence ? fallback : local;
  if (local.confidence >= 85 && fallback.confidence >= 85)
    return {
      value: null,
      text: `${local.text} / ${fallback.text}`,
      confidence: 0,
      approximate: false,
    };
  return fallback.confidence >= 85 && local.confidence < 85 ? fallback : local;
}
