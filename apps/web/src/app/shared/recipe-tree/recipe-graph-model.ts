import type { ItemSources } from './recipe-knowledge';
import type { RecipeNode } from './recipe-tree-model';
export interface GraphBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface GraphLayoutState {
  positions: Map<string, GraphBox & { identity: string }>;
  sizes: ReadonlyMap<string, { width: number; height: number }>;
}
export interface GraphNode extends GraphBox {
  node: RecipeNode;
  x: number;
  y: number;
  depth: number;
}
export interface GraphEdge {
  from: string;
  to: string;
  d: string;
}
export interface GraphSourceNode extends GraphBox {
  tier: number;
  path: string;
  itemPath: string;
  kind: 'method' | 'location' | 'more';
  remaining?: number;
  activity: 'workers' | 'grinding';
  source: ItemSources['nodes'][number] | null;
  x: number;
  y: number;
}
export function layoutRecipeGraph(
  root: RecipeNode,
  focus = '',
  origins: ReadonlyMap<number, ItemSources['nodes']> = new Map(),
  state?: GraphLayoutState,
) {
  const nodes: GraphNode[] = [],
    edges: GraphEdge[] = [],
    sources: GraphSourceNode[] = [];
  let leaf = 0,
    truncated = false;
  const included = (path: string) =>
    !focus || path === focus || path.startsWith(focus + '/') || focus.startsWith(path + '/');
  const visit = (node: RecipeNode, depth: number): GraphNode | null => {
    if (!included(node.path)) return null;
    if (nodes.length + sources.length >= 200 || depth > 12) {
      truncated = true;
      return null;
    }
    const positioned = { node, x: 0, y: depth * 264 + 24, depth, width: 248, height: 200 };
    nodes.push(positioned);
    const children = node.expanded
      ? node.children.map((n) => visit(n, depth + 1)).filter((n): n is GraphNode => n !== null)
      : [];
    if (node.expanded && !node.recipe && origins.get(node.part.itemId)?.length) {
      const methods: GraphSourceNode[] = [];
      for (const activity of ['workers', 'grinding'] as const) {
        const available = origins
          .get(node.part.itemId)!
          .filter((source) => (source.activity ?? 'workers') === activity);
        if (!available.length) continue;
        if (nodes.length + sources.length >= 200) {
          truncated = true;
          break;
        }
        const method: GraphSourceNode = {
          tier: depth + 1,
          path: node.path + '/' + activity,
          itemPath: node.path,
          kind: 'method',
          activity,
          source: null,
          width: 248,
          height: 176,
          x: 0,
          y: (depth + 1) * 264 + 24,
        };
        methods.push(method);
        sources.push(method);
        const locations: GraphSourceNode[] = [];
        for (const source of available.slice(0, 3)) {
          if (nodes.length + sources.length >= 200) {
            truncated = true;
            break;
          }
          const location: GraphSourceNode = {
            tier: depth + 2,
            path: method.path + '/' + source.id,
            itemPath: node.path,
            kind: 'location',
            activity,
            source,
            width: 248,
            height: 200,
            x: leaf++ * 284 + 24,
            y: (depth + 2) * 264 + 24,
          };
          locations.push(location);
          sources.push(location);
        }
        if (available.length > 3 && nodes.length + sources.length < 200) {
          const more: GraphSourceNode = {
            tier: depth + 2,
            path: method.path + '/more',
            itemPath: node.path,
            kind: 'more',
            activity,
            source: null,
            remaining: available.length - 3,
            width: 248,
            height: 176,
            x: leaf++ * 284 + 24,
            y: (depth + 2) * 264 + 24,
          };
          locations.push(more);
          sources.push(more);
        }
        method.x = locations.length
          ? (locations[0].x + locations.at(-1)!.x) / 2
          : leaf++ * 284 + 24;
        for (const location of locations) connect(method.path, method, location.path, location);
      }
      if (methods.length) {
        positioned.x = (methods[0].x + methods.at(-1)!.x) / 2;
        for (const method of methods) connect(node.path, positioned, method.path, method);
        return positioned;
      }
    }
    positioned.x = children.length ? (children[0].x + children.at(-1)!.x) / 2 : leaf++ * 284 + 24;
    for (const child of children) {
      connect(node.path, positioned, child.node.path, child);
    }
    return positioned;
  };
  const connect = (
    from: string,
    parent: { x: number; y: number },
    to: string,
    child: { x: number; y: number },
  ) => {
    const x1 = parent.x + 110,
      y1 = parent.y + 168,
      x2 = child.x + 110,
      y2 = child.y;
    edges.push({ from, to, d: `M ${x1} ${y1} C ${x1} ${y1 + 26}, ${x2} ${y2 - 26}, ${x2} ${y2}` });
  };
  visit(root, 0);
  const entries = [
    ...nodes.map((entry) => ({
      path: entry.node.path,
      identity: String(entry.node.part.itemId),
      box: entry,
    })),
    ...sources.map((entry) => ({
      path: entry.path,
      identity: entry.source?.id ?? entry.kind,
      box: entry,
    })),
  ];
  const byPath = new Map(entries.map((entry) => [entry.path, entry.box]));
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    const group = children.get(edge.from) ?? [];
    group.push(edge.to);
    children.set(edge.from, group);
  }
  const tiers = new Map<string, number>();
  const spans = new Map<string, number>();
  const rows: { y: number; height: number }[] = [];
  const gap = 48;
  // Measure actual cards first. Every tier uses the tallest card in that tier.
  const measure = (path: string, depth: number): number => {
    const box = byPath.get(path)!;
    const size = state?.sizes.get(path);
    if (size) Object.assign(box, size);
    tiers.set(path, depth);
    const row = (rows[depth] ??= { y: 0, height: 0 });
    row.height = Math.max(row.height, box.height);
    const descendants = children.get(path) ?? [];
    const branchWidth =
      descendants.reduce((width, child) => width + measure(child, depth + 1), 0) +
      Math.max(0, descendants.length - 1) * gap;
    const span = Math.max(box.width, branchWidth);
    spans.set(path, span);
    return span;
  };
  measure(root.path, 0);
  let nextY = 24;
  for (const row of rows) {
    row.y = nextY;
    nextY += row.height + 112;
  }
  // Disjoint subtree bands preserve sibling order and prevent unrelated roots
  // from crossing. Parents sit at the center of the span occupied by their children.
  const place = (path: string, left: number) => {
    const box = byPath.get(path)!;
    const span = spans.get(path)!;
    box.x = left + (span - box.width) / 2;
    box.y = rows[tiers.get(path)!].y;
    const descendants = children.get(path) ?? [];
    const childWidth =
      descendants.reduce((width, child) => width + spans.get(child)!, 0) +
      Math.max(0, descendants.length - 1) * gap;
    let childX = left + (span - childWidth) / 2;
    for (const child of descendants) {
      place(child, childX);
      childX += spans.get(child)! + gap;
    }
  };
  place(root.path, 24);
  state?.positions.clear();
  for (const entry of entries)
    state?.positions.set(entry.path, { ...entry.box, identity: entry.identity });
  const boxes = entries.map((entry) => entry.box);
  // Horizontal movement starts only below the tallest card of the parent tier.
  // The entire fan-out stays inside the empty gutter between adjacent tiers.
  for (const edge of edges) {
    const parent = byPath.get(edge.from)!;
    const child = byPath.get(edge.to)!;
    const row = rows[tiers.get(edge.from)!];
    const x1 = parent.x + parent.width / 2;
    const y1 = parent.y + parent.height;
    const x2 = child.x + child.width / 2;
    const y2 = child.y;
    const top = row.y + row.height + 24;
    const bottom = y2 - 24;
    const middle = (top + bottom) / 2;
    edge.d =
      'M ' +
      x1 +
      ' ' +
      y1 +
      ' L ' +
      x1 +
      ' ' +
      top +
      ' C ' +
      x1 +
      ' ' +
      middle +
      ', ' +
      x2 +
      ' ' +
      middle +
      ', ' +
      x2 +
      ' ' +
      bottom +
      ' L ' +
      x2 +
      ' ' +
      y2;
  }
  const minX = Math.min(...boxes.map((box) => box.x), 24);
  const minY = Math.min(...boxes.map((box) => box.y), 24);
  const maxX = Math.max(...boxes.map((box) => box.x + box.width), 272);
  const maxY = Math.max(...boxes.map((box) => box.y + box.height), 224);
  return {
    nodes,
    edges,
    sources,
    width: maxX + 24,
    height: maxY + 24,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    truncated,
    tiers: rows,
  };
}
export function isGraphAncestor(path: string, selected: string) {
  return path === selected || selected.startsWith(path + '/');
}
