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
export function layoutRecipeGraph(root: RecipeNode, focus = '') {
  const nodes: GraphNode[] = [],
    edges: GraphEdge[] = [];
  let leaf = 0,
    depthMax = 0,
    truncated = false;
  const included = (path: string) =>
    !focus || path === focus || path.startsWith(focus + '/') || focus.startsWith(path + '/');
  const visit = (node: RecipeNode, depth: number): GraphNode | null => {
    if (!included(node.path)) return null;
    if (nodes.length >= 200 || depth > 12) {
      truncated = true;
      return null;
    }
    const positioned = { node, x: 0, y: depth * 208 + 24, depth };
    nodes.push(positioned);
    depthMax = Math.max(depthMax, depth);
    const children = node.expanded
      ? node.children.map((n) => visit(n, depth + 1)).filter((n): n is GraphNode => n !== null)
      : [];
    positioned.x = children.length ? (children[0].x + children.at(-1)!.x) / 2 : leaf++ * 252 + 24;
    for (const child of children) {
      const x1 = positioned.x + 110,
        y1 = positioned.y + 156,
        x2 = child.x + 110,
        y2 = child.y;
      edges.push({
        from: node.path,
        to: child.node.path,
        d: `M ${x1} ${y1} C ${x1} ${y1 + 26}, ${x2} ${y2 - 26}, ${x2} ${y2}`,
      });
    }
    return positioned;
  };
  visit(root, 0);
  return {
    nodes,
    edges,
    width: Math.max(600, leaf * 252 + 24),
    height: (depthMax + 1) * 208 + 24,
    truncated,
  };
}
export function isGraphAncestor(path: string, selected: string) {
  return path === selected || selected.startsWith(path + '/');
}
