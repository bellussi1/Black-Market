import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { emptyWorkspace, workspaceSchema } from '../core/workspace-models';
import { WorkspaceStore } from '../core/workspace-store';
import { RegionPreferences } from './region-preferences';

describe('personal workspace recovery', () => {
  const createStore = () => {
    TestBed.configureTestingModule({ providers: [WorkspaceStore, RegionPreferences] });
    return TestBed.inject(WorkspaceStore);
  };
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });
  it('does not inspect browser storage or announce corruption during SSR', () => {
    const getItem = vi.fn(() => {
      throw new Error('Browser storage is unavailable on the server');
    });
    vi.stubGlobal('localStorage', { getItem, setItem: vi.fn() });
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const store = createStore();
    expect(store.message()).toBe('');
    expect(store.blocked()).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
    expect(store.data()).toEqual(emptyWorkspace());
  });
  it('restores personal data after hydration without overwriting it during region restoration', () => {
    const saved = { ...emptyWorkspace(), region: 'eu', familySilver: '12345' };
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) =>
        key === 'black-market.workspace.v1' ? JSON.stringify(saved) : 'eu',
      setItem,
    });
    TestBed.configureTestingModule({ providers: [WorkspaceStore, RegionPreferences] });
    const transfer = TestBed.inject(TransferState);
    transfer.set(makeStateKey<string>('black-market-region'), 'sa');
    transfer.set(makeStateKey<boolean>('black-market-workspace-hydration'), true);
    const store = TestBed.inject(WorkspaceStore);
    expect(store.data().familySilver).toBe('0');
    TestBed.tick();
    expect(store.data().familySilver).toBe('12345');
    expect(store.data().region).toBe('eu');
    expect(setItem.mock.calls.filter(([key]) => key === 'black-market.workspace.v1')).toEqual([]);
  });
  it('exports the original corrupt backup even before the first hydration render finishes', () => {
    const contents: BlobPart[][] = [];
    vi.stubGlobal(
      'Blob',
      class extends Blob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options);
          contents.push(parts);
        }
      },
    );
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL(): string {
          return 'blob:backup';
        }
        static override revokeObjectURL(): void {
          /* No actual browser object. */
        }
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('localStorage', { getItem: () => '{corrupt', setItem: vi.fn() });
    TestBed.configureTestingModule({ providers: [WorkspaceStore, RegionPreferences] });
    const transfer = TestBed.inject(TransferState);
    transfer.set(makeStateKey<string>('black-market-region'), 'sa');
    transfer.set(makeStateKey<boolean>('black-market-workspace-hydration'), true);
    const store = TestBed.inject(WorkspaceStore);
    store.exportBackup();
    expect(contents).toEqual([['{corrupt']]);
    expect(store.blocked()).toBe(true);
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
    // A region preference may also be written when recovery changes the current region.
    const workspaceWrites = setItem.mock.calls.filter(
      ([key]) => key === 'black-market.workspace.v1',
    );
    expect(workspaceWrites).toHaveLength(1);
    expect(JSON.parse(workspaceWrites[0][1])).toEqual(emptyWorkspace());
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
