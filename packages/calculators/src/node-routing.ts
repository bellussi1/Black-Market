export interface WorldNode {
  id: string;
  name: string;
  x: number;
  z: number;
  contribution: number | null;
  enabled: boolean;
  main: boolean;
  links: string[];
}

/** Lowest additional CP route; existing investments remain in the returned total. */
export function connectionRoute(
  nodes: WorldNode[],
  start: string,
  end: string,
  invested: ReadonlySet<string> = new Set(),
): { nodes: WorldNode[]; contribution: number } | null {
  const allowed = new Map(
    nodes
      .filter(
        (node) =>
          node.enabled &&
          node.contribution !== null &&
          Number.isSafeInteger(node.contribution) &&
          node.contribution >= 0,
      )
      .map((node) => [node.id, node]),
  );
  if (!allowed.has(start) || !allowed.has(end)) return null;
  const links = new Map<string, Set<string>>();
  for (const node of allowed.values()) {
    if (!links.has(node.id)) links.set(node.id, new Set());
    for (const id of node.links) {
      if (!allowed.has(id)) continue;
      links.get(node.id)!.add(id);
      if (!links.has(id)) links.set(id, new Set());
      links.get(id)!.add(node.id);
    }
  }
  const cost = (id: string) => (invested.has(id) ? 0 : allowed.get(id)!.contribution!);
  const costs = new Map<string, number>([[start, cost(start)]]);
  const previous = new Map<string, string>();
  const pending = new Set(allowed.keys());
  while (pending.size) {
    let current: string | undefined;
    let best = Infinity;
    for (const id of pending) {
      const value = costs.get(id) ?? Infinity;
      if (value < best) {
        best = value;
        current = id;
      }
    }
    if (!current) break;
    pending.delete(current);
    if (current === end) break;
    for (const id of links.get(current) ?? []) {
      if (!pending.has(id)) continue;
      const next = best + cost(id);
      if (next < (costs.get(id) ?? Infinity)) {
        costs.set(id, next);
        previous.set(id, current);
      }
    }
  }
  if (!costs.has(end)) return null;
  const ids = [end];
  let cursor = end;
  while (cursor !== start) {
    const parent = previous.get(cursor);
    if (!parent) return null;
    ids.push(parent);
    cursor = parent;
  }
  const route = ids.reverse().map((id) => allowed.get(id)!);
  return { nodes: route, contribution: route.reduce((sum, node) => sum + node.contribution!, 0) };
}
