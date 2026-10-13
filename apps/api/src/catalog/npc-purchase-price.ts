import type { NpcPurchasePrice } from '@bdo/shared';

/** Catalog buyPrice is an NPC purchase cost only when the source also lists vendors. */
export function npcPurchasePriceFromCatalog(
  itemId: number,
  sourceData: Record<string, unknown>,
  verifiedAt: string,
): NpcPurchasePrice | null {
  const rawPrice = sourceData['buyPrice'];
  const unitPrice =
    typeof rawPrice === 'number' && Number.isSafeInteger(rawPrice) && rawPrice > 0
      ? String(rawPrice)
      : typeof rawPrice === 'string' && /^\d{1,24}$/.test(rawPrice) && BigInt(rawPrice) > 0n
        ? rawPrice
        : null;
  const vendors = sourceData['vendors'];
  const vendorUrns =
    vendors && typeof vendors === 'object' && 'urns' in vendors
      ? (vendors as { urns?: unknown }).urns
      : null;

  if (!unitPrice || unitPrice === '0' || !Array.isArray(vendorUrns) || vendorUrns.length === 0)
    return null;

  return { itemId, unitPrice, vendor: 'Vendedor NPC listado no catálogo', verifiedAt };
}
