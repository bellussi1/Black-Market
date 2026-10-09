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
    sessions.save('sa/v1/1/external', { root, target: 500, view: 'list', excludedLocations: [] });
    expect(sessions.get('sa/v1/1/external')).toMatchObject({
      target: 500,
      view: 'list',
      root: { loading: false },
    });
    expect(sessions.get('sa/v2/1/external')).toBeUndefined();
    expect(sessions.get('na/v1/1/external')).toBeUndefined();
  });
});
