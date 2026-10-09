import type { ItemSources } from './recipe-knowledge';
import type { RecipeNode } from './recipe-tree-model';
export interface GraphNode {
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
export interface GraphSourceNode {
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
) {
  const nodes: GraphNode[] = [],
    edges: GraphEdge[] = [],
    sources: GraphSourceNode[] = [];
  let leaf = 0,
    depthMax = 0,
    truncated = false;
  const included = (path: string) =>
    !focus || path === focus || path.startsWith(focus + '/') || focus.startsWith(path + '/');
  const visit = (node: RecipeNode, depth: number): GraphNode | null => {
    if (!included(node.path)) return null;
    if (nodes.length + sources.length >= 200 || depth > 12) {
      truncated = true;
      return null;
    }
    const positioned = { node, x: 0, y: depth * 220 + 24, depth };
    nodes.push(positioned);
    depthMax = Math.max(depthMax, depth);
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
          x: 0,
          y: (depth + 1) * 220 + 24,
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
            x: leaf++ * 252 + 24,
            y: (depth + 2) * 220 + 24,
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
            x: leaf++ * 252 + 24,
            y: (depth + 2) * 220 + 24,
          };
          locations.push(more);
          sources.push(more);
        }
        method.x = locations.length
          ? (locations[0].x + locations.at(-1)!.x) / 2
          : leaf++ * 252 + 24;
        for (const location of locations) connect(method.path, method, location.path, location);
        depthMax = Math.max(depthMax, depth + (locations.length ? 2 : 1));
      }
      if (methods.length) {
        positioned.x = (methods[0].x + methods.at(-1)!.x) / 2;
        for (const method of methods) connect(node.path, positioned, method.path, method);
        return positioned;
      }
    }
    positioned.x = children.length ? (children[0].x + children.at(-1)!.x) / 2 : leaf++ * 252 + 24;
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
  return {
    nodes,
    edges,
    sources,
    width: Math.max(600, leaf * 252 + 24),
    height: (depthMax + 1) * 220 + 24,
    truncated,
  };
}
export function isGraphAncestor(path: string, selected: string) {
  return path === selected || selected.startsWith(path + '/');
}
