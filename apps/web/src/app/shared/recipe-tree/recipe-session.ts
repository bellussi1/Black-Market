import { Injectable } from '@angular/core';
import type { ProductionChoice, ProductionEstimate } from '@bdo/calculators';

import type { RecipeNode } from './recipe-tree-model';
export interface RecipeSession {
  root: RecipeNode;
  target: number;
  view: 'graph' | 'tree' | 'list';
  excludedLocations: string[];
  methodTimes?: Record<string, number>;
  gatherEstimates?: Record<number, ProductionEstimate>;
  sourceOverrides?: Record<number, ProductionChoice>;
  masteryOverride?: number;
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

  setMethodTime(key: string, method: string, seconds: number | null): boolean {
    const session = this.entries.get(key);
    if (!session || !method.trim() || method.length > 64) return false;
    const methodTimes = { ...(session.methodTimes ?? {}) };
    if (seconds === null) {
      delete methodTimes[method];
    } else if (Number.isFinite(seconds) && seconds > 0 && seconds <= 1_000_000) {
      methodTimes[method] = seconds;
    } else {
      return false;
    }
    this.save(key, { ...session, methodTimes });
    return true;
  }

  setGatherEstimate(
    key: string,
    itemId: number,
    expectedYield: number | null,
    craftSeconds: number | null,
  ): boolean {
    const session = this.entries.get(key);
    if (!session || !Number.isSafeInteger(itemId) || itemId < 1) return false;
    const gatherEstimates = { ...(session.gatherEstimates ?? {}) };
    if (expectedYield === null && craftSeconds === null) {
      delete gatherEstimates[itemId];
    } else if (
      expectedYield !== null &&
      craftSeconds !== null &&
      Number.isFinite(expectedYield) &&
      expectedYield > 0 &&
      expectedYield <= 1_000_000_000 &&
      Number.isFinite(craftSeconds) &&
      craftSeconds > 0 &&
      craftSeconds <= 1_000_000_000
    ) {
      gatherEstimates[itemId] = {
        expectedYield,
        craftSeconds,
        source: 'calibrated',
      };
    } else {
      return false;
    }
    this.save(key, { ...session, gatherEstimates });
    return true;
  }
}
