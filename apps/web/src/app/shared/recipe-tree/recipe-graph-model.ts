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
  columns?: 1 | 2;
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
  const parents = new Map(edges.map((edge) => [edge.to, edge.from]));
  {
    const positions = state?.positions ?? new Map<string, GraphBox & { identity: string }>();
    const columns = state?.columns ?? 2;
    // Keep hidden descendants reserved. Changing an item at a path invalidates that subtree only.
    for (const entry of entries) {
      const previous = positions.get(entry.path);
      if (previous && previous.identity !== entry.identity)
        for (const path of positions.keys())
          if (path === entry.path || path.startsWith(entry.path + '/')) positions.delete(path);
    }
    const originX = Math.min(24, ...[...positions.values()].map((box) => box.x));
    const columnXs = Array.from({ length: columns }, (_, index) => originX + index * 284);
    const siblings = new Map<string, string[]>();
    for (const edge of edges) {
      const paths = siblings.get(edge.from) ?? [];
      paths.push(edge.to);
      siblings.set(edge.from, paths);
    }
    const overlaps = (a: GraphBox, b: GraphBox) =>
      a.x < b.x + b.width + 28 &&
      a.x + a.width + 28 > b.x &&
      a.y < b.y + b.height + 48 &&
      a.y + a.height + 48 > b.y;
    // Parents before children, including acquisition method and location nodes.
    for (const entry of [...entries].sort(
      (a, b) => a.path.split('/').length - b.path.split('/').length,
    )) {
      const { path, box, identity } = entry;
      const size = state?.sizes.get(path);
      if (size) {
        box.width = size.width;
        box.height = size.height;
      }
      const previous = positions.get(path);
      const parentPath = parents.get(path);
      const parent = parentPath ? byPath.get(parentPath) : undefined;
      if (previous) {
        box.x = previous.x;
        box.y = previous.y;
        // Only descendants of a growing card move; never recenter unrelated branches.
        if (parent) box.y = Math.max(box.y, parent.y + parent.height + 64);
      } else if (parent && parentPath) {
        // Keep the graph within nearby world-space columns. A collision adds depth,
        // never another distant column, regardless of the size of the new branch.
        const nearby = [...columnXs].sort(
          (a, b) => Math.abs(a - parent.x) - Math.abs(b - parent.x),
        );
        const index = siblings.get(parentPath)?.indexOf(path) ?? 0;
        box.x = nearby[index % columns];
        box.y = parent.y + parent.height + 64;
        let blocker: GraphBox | undefined;
        while (
          (blocker = [...positions.entries()].find(
            ([otherPath, other]) =>
              otherPath !== path && !otherPath.startsWith(path + '/') && overlaps(box, other),
          )?.[1])
        )
          box.y = blocker.y + blocker.height + 64;
      } else {
        box.x = columns === 2 && (siblings.get(path)?.length ?? 0) > 1 ? originX + 142 : originX;
        box.y = 24;
      }
      // This also applies to the first pass after switching the root recipe,
      // when sizes may already be cached but positions are being created anew.
      if (parent) box.y = Math.max(box.y, parent.y + parent.height + 64);
      // A taller card can cross into a neighboring branch's lower row. Resolve only
      // the boxes below it; keep the edited card and unaffected neighbors anchored.
      let blocker: GraphBox | undefined;
      while (
        (blocker = [...positions.entries()].find(
          ([otherPath, other]) =>
            otherPath !== path &&
            !otherPath.startsWith(path + '/') &&
            !path.startsWith(otherPath + '/') &&
            other.y <= box.y &&
            overlaps(box, other),
        )?.[1])
      )
        box.y = blocker.y + blocker.height + 64;
      positions.set(path, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        identity,
      });
    }
  }
  // Both ends are derived from actual card boxes, not fixed CSS heights.
  const boxes = entries.map((entry) => entry.box);
  const routingOrigin = Math.min(24, ...boxes.map((box) => box.x));
  for (const edge of edges) {
    const parent = byPath.get(edge.from)!;
    const child = byPath.get(edge.to)!;
    const x1 = parent.x + parent.width / 2,
      y1 = parent.y + parent.height;
    const x2 = child.x + child.width / 2,
      y2 = child.y;
    const bend = Math.max(24, (y2 - y1) / 2);
    if (y2 - y1 > 128) {
      // Siblings may stack in the same column. Run long connections in the gap
      // between columns (or the left margin on mobile), never behind another card.
      const laneX = (state?.columns ?? 2) === 1 ? routingOrigin - 18 : routingOrigin + 266;
      edge.d = `M ${x1} ${y1} C ${x1} ${y1 + 24}, ${laneX} ${y1 + 24}, ${laneX} ${y1 + 24} L ${laneX} ${y2 - 24} C ${laneX} ${y2 - 24}, ${x2} ${y2 - 24}, ${x2} ${y2}`;
    } else edge.d = `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`;
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
  };
}
export function isGraphAncestor(path: string, selected: string) {
  return path === selected || selected.startsWith(path + '/');
}
