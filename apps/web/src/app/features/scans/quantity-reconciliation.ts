import type { QuantityReading } from './print-reader';

/** Keep independent OCR evidence; disagreement must never become an exact count. */
export function reconcileQuantity(
  local: QuantityReading | null,
  fallback: QuantityReading,
): QuantityReading {
  const single = (reading: QuantityReading): QuantityReading => {
    const conflict = local?.evidence === 'conflict';
    return {
      ...reading,
      ...(conflict ? { value: null } : {}),
      confidence: Math.min(84, reading.confidence),
      evidence: conflict ? 'conflict' : 'single',
    };
  };
  if (!local?.value) return single(fallback);
  if (!fallback.value) return local.evidence === 'agreement' ? local : single(local);
  if (local.value === fallback.value && local.approximate === fallback.approximate) {
    const best = fallback.confidence > local.confidence ? fallback : local;
    if (local.evidence === 'conflict') return { ...single(best), evidence: 'conflict' };
    if (Math.min(local.confidence, fallback.confidence) < 70) return single(best);
    return { ...best, evidence: 'agreement' };
  }
  const best = fallback.confidence > local.confidence ? fallback : local;
  return { ...single(best), value: null, evidence: 'conflict' };
}
