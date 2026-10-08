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
export function connectionRoute(
  nodes: WorldNode[],
  start: string,
  end: string,
): { nodes: WorldNode[]; contribution: number } | null {
  const allowed = new Map(
    nodes
      .filter((node) => node.enabled && node.contribution !== null && node.contribution >= 0)
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
  const costs = new Map<string, number>([[start, allowed.get(start)!.contribution!]]);
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
      const next = best + allowed.get(id)!.contribution!;
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
  return { nodes: ids.reverse().map((id) => allowed.get(id)!), contribution: costs.get(end)! };
}
