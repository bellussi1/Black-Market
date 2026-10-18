import { describe, expect, it } from 'vitest';

import { RecipeSessions } from './recipe-session';
import { nodeFor } from './recipe-tree-model';
describe('Recipe exploration sessions', () => {
  it('preserves scenarios by region and dataset while clearing interrupted loading', () => {
    const sessions = new RecipeSessions();
    const root = {
      ...nodeFor({ itemId: 1, name: 'Produto', quantity: null }, 'root'),
      loading: true,
    };
    sessions.save('sa/v1/1/external', {
      root,
      target: 500,
      craftCount: 20,
      view: 'graph',
      excludedLocations: [],
    });
    expect(sessions.get('sa/v1/1/external')).toMatchObject({
      target: 500,
      craftCount: 20,
      view: 'graph',
      root: { loading: false },
    });
    expect(sessions.get('sa/v2/1/external')).toBeUndefined();
    expect(sessions.get('na/v1/1/external')).toBeUndefined();
  });

  it('round trips explicit method time settings', () => {
    const sessions = new RecipeSessions();
    const key = 'sa/v1/1/recipe';
    sessions.save(key, {
      root: nodeFor({ itemId: 1, name: 'Produto', quantity: null }, 'root'),
      target: 1,
      view: 'tree',
      excludedLocations: [],
    });

    expect(sessions.setMethodTime(key, 'SIMPLE_ALCHEMY', 45)).toBe(true);
    expect(sessions.get(key)?.methodTimes).toEqual({ SIMPLE_ALCHEMY: 45 });
    expect(sessions.setMethodTime(key, 'SIMPLE_ALCHEMY', null)).toBe(true);
    expect(sessions.get(key)?.methodTimes).toEqual({});
  });

  it('keeps per-profession mastery values in the in-memory recipe session', () => {
    const sessions = new RecipeSessions();
    const key = 'sa/v1/1/recipe';
    sessions.save(key, {
      root: nodeFor({ itemId: 1, name: 'Produto', quantity: null }, 'root'),
      target: 1,
      view: 'tree',
      excludedLocations: [],
      masteryOverrides: { cooking: 3000, alchemy: 2500, processing: 1000 },
    });

    expect(sessions.get(key)?.masteryOverrides).toEqual({
      cooking: 3000,
      alchemy: 2500,
      processing: 1000,
    });
  });

  it('round trips an explicit gathering yield and time', () => {
    const sessions = new RecipeSessions();
    const key = 'sa/v1/1/recipe';
    sessions.save(key, {
      root: nodeFor({ itemId: 1, name: 'Produto', quantity: null }, 'root'),
      target: 1,
      view: 'tree',
      excludedLocations: [],
    });

    expect(sessions.setGatherEstimate(key, 702, 12, 30)).toBe(true);
    expect(sessions.get(key)?.gatherEstimates?.[702]).toEqual({
      expectedYield: 12,
      craftSeconds: 30,
      source: 'calibrated',
    });
    expect(sessions.setGatherEstimate(key, 702, null, null)).toBe(true);
    expect(sessions.get(key)?.gatherEstimates).toEqual({});
  });

  it('rejects zero or partial calibrations without changing saved values', () => {
    const sessions = new RecipeSessions();
    const key = 'sa/v1/1/recipe';
    sessions.save(key, {
      root: nodeFor({ itemId: 1, name: 'Produto', quantity: null }, 'root'),
      target: 1,
      view: 'tree',
      excludedLocations: [],
      methodTimes: { ALCHEMY: 20 },
    });

    expect(sessions.setMethodTime(key, 'ALCHEMY', 0)).toBe(false);
    expect(sessions.setMethodTime(key, 'ALCHEMY', Number.NaN)).toBe(false);
    expect(sessions.setGatherEstimate(key, 702, 4, null)).toBe(false);
    expect(sessions.setGatherEstimate(key, 702, 0, 20)).toBe(false);
    expect(sessions.get(key)?.methodTimes).toEqual({ ALCHEMY: 20 });
    expect(sessions.get(key)?.gatherEstimates).toBeUndefined();
  });

  it('keeps older sessions readable without calibration fields', () => {
    const sessions = new RecipeSessions();
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: null }, 'root');
    sessions.save('sa/v1/1/external', {
      root,
      target: 5,
      view: 'graph',
      excludedLocations: [],
    });

    expect(sessions.get('sa/v1/1/external')).toMatchObject({
      target: 5,
      view: 'graph',
    });
    expect(sessions.get('sa/v1/1/external')).not.toHaveProperty('methodTimes');
    expect(sessions.get('sa/v1/1/external')).not.toHaveProperty('gatherEstimates');
  });
});
