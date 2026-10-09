import { Injectable } from '@angular/core';

import type { RecipeNode } from './recipe-tree-model';
export interface RecipeSession {
  root: RecipeNode;
  target: number;
  view: 'graph' | 'tree' | 'list';
  excludedLocations: string[];
}
@Injectable({ providedIn: 'root' })
export class RecipeSessions {
  private readonly entries = new Map<string, RecipeSession>();
  get(key: string) {
    return this.entries.get(key);
  }
  save(key: string, session: RecipeSession) {
    const clean = (node: RecipeNode): RecipeNode => ({
      ...node,
      loading: false,
      children: node.children.map(clean),
    });
    this.entries.delete(key);
    this.entries.set(key, { ...session, root: clean(session.root) });
    if (this.entries.size > 20) this.entries.delete(this.entries.keys().next().value!);
  }
}
