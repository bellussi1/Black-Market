import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorkspaceStore } from '../core/workspace-store';
import { workspaceSchema, emptyWorkspace } from '../core/workspace-models';
import { RegionPreferences } from './region-preferences';
describe('personal workspace recovery', () => {
  const createStore = () => {
    TestBed.configureTestingModule({ providers: [WorkspaceStore, RegionPreferences] });
    return TestBed.inject(WorkspaceStore);
  };
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  it('rejects unsupported versions and duplicate identities', () => {
    expect(workspaceSchema.safeParse({ ...emptyWorkspace(), schemaVersion: 2 }).success).toBe(
      false,
    );
    const row = {
      id: 'a',
      region: 'sa',
      name: 'Material',
      location: 'Velia',
      quantity: 1,
      target: 2,
      price: '100',
    };
    expect(workspaceSchema.safeParse({ ...emptyWorkspace(), inventory: [row, row] }).success).toBe(
      false,
    );
  });
  it('preserves a corrupted local backup and blocks accidental overwrites', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => '{corrupt', setItem });
    const store = createStore();
    expect(store.blocked()).toBe(true);
    expect(store.update((s) => ({ ...s, region: 'eu' }))).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
    expect(store.replace(emptyWorkspace())).toBe(true);
    expect(store.blocked()).toBe(false);
    expect(setItem).toHaveBeenCalledTimes(1);
  });
  it('retains in-memory changes when browser storage fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    });
    const store = createStore();
    expect(store.update((s) => ({ ...s, region: 'eu' }))).toBe(true);
    expect(store.data().region).toBe('eu');
    expect(store.message()).toContain('exporte um backup');
  });
});
