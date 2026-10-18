import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { ensureCredentials } from './start-local-db-viewer.mjs';

test('creates a strong ignored-file credential and restricts its file mode', () => {
  const directory = mkdtempSync(join(tmpdir(), 'black-market-viewer-'));
  try {
    const file = join(directory, 'db-viewer.env');
    ensureCredentials(file);
    const content = readFileSync(file, 'utf8');
    assert.match(content, /^DB_VIEWER_PASSWORD=[A-Za-z0-9_-]{40,100}\n$/);
    if (process.platform !== 'win32') assert.equal(statSync(file).mode & 0o777, 0o600);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('preserves an existing credential and refuses malformed files without overwriting them', () => {
  const directory = mkdtempSync(join(tmpdir(), 'black-market-viewer-'));
  try {
    const file = join(directory, 'db-viewer.env');
    const original = 'DB_VIEWER_PASSWORD=abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH\n';
    writeFileSync(file, original);
    ensureCredentials(file);
    assert.equal(readFileSync(file, 'utf8'), original);

    const invalid = 'DB_VIEWER_PASSWORD=short\n';
    writeFileSync(file, invalid);
    assert.throws(() => ensureCredentials(file), /está inválido/);
    assert.equal(readFileSync(file, 'utf8'), invalid);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('viewer bootstrap grants inspection privileges without changing application rows', () => {
  const sql = readFileSync(
    new URL('../ops/local-db-viewer/provision-readonly-role.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /GRANT SELECT ON ALL TABLES IN SCHEMA public TO bdo_viewer/);
  assert.match(sql, /default_transaction_read_only = on/);
  assert.doesNotMatch(sql, /^\s*(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP)\b/im);
});
