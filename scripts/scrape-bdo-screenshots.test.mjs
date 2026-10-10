import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';

import {
  collectScreenshots,
  createRedditApiClient,
  downloadAuthorizedImage,
  discoverAuthorizedSources,
  parseCollectorArgs,
  parsePermissionManifest,
  pruneRevokedScreenshots,
  runCollectorCli,
} from './scrape-bdo-screenshots.mjs';

const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = requireApi('sharp');
const publicImageUrl = 'https://images.example.org/storage.jpg';
const now = new Date('2026-10-10T12:00:00.000Z');
const temporaryDirectories = [];

function permission(overrides = {}) {
  return {
    sourceId: 'community-post-1',
    provider: 'reddit',
    postId: 'post-1',
    imageUrls: [publicImageUrl],
    allowedHosts: ['images.example.org'],
    status: 'authorized',
    use: 'validation',
    rightsHolder: 'Screenshot creator',
    authorizationRef: 'consent-2026-10-10-001',
    authorizedAt: '2026-10-10T11:00:00.000Z',
    ...overrides,
  };
}

function permissionManifest(sources = [permission()]) {
  return { schemaVersion: 1, sources };
}

async function screenshotBuffer(width = 1920, height = 1080) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 25, b: 20 } },
  })
    .jpeg({ quality: 75 })
    .toBuffer();
}

async function realOutputDirectory() {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bdo-real-corpus-'));
  temporaryDirectories.push(parent);
  const outputDir = path.join(parent, 'tmp', 'ocr-dataset', 'real');
  await mkdir(outputDir, { recursive: true });
  return outputDir;
}

function publicLookup(hostname) {
  assert.equal(hostname, 'images.example.org');
  return Promise.resolve([{ address: '93.184.216.34', family: 4 }]);
}

async function imageResponse(
  bytes,
  { contentType = 'image/jpeg', status = 200, headers = {} } = {},
) {
  return new Response(bytes, {
    status,
    headers: { 'content-type': contentType, ...headers },
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test('rejectsSourcesWithoutRightsRecords', () => {
  assert.throws(
    () => parsePermissionManifest(permissionManifest([permission({ authorizationRef: '' })])),
    /authorization|permission|rights/i,
  );
  assert.throws(
    () => parsePermissionManifest({ schemaVersion: 1, sources: [] }),
    /source|permission/i,
  );
});

test('skipsExpiredOrRequestedUseDisallowedSources', async () => {
  const manifest = parsePermissionManifest(
    permissionManifest([
      permission({
        sourceId: 'expired',
        provider: 'guide',
        postId: undefined,
        expiresAt: '2026-10-09T00:00:00.000Z',
      }),
      permission({
        sourceId: 'validation-only',
        provider: 'guide',
        postId: undefined,
        use: 'validation',
      }),
    ]),
  );

  const result = await discoverAuthorizedSources({
    sourceManifest: manifest,
    requestedUse: 'training',
    now,
  });

  assert.deepEqual(result.sources, []);
  assert.equal(result.skippedCount, 2);
  assert.deepEqual(result.pruneCandidates, []);
});

test('sendsRegisteredOAuthAndUserAgent', async () => {
  let request;
  const client = createRedditApiClient({
    accessToken: 'secret-token-value',
    userAgent: 'web:BlackMarketOCR:1.0 (contact: maintainer@example.org)',
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return new Response(JSON.stringify({ data: { children: [] } }), { status: 200 });
    },
  });

  await client.searchImages({ query: 'warehouse', limit: 12 });

  assert.equal(request.options.headers.Authorization, 'Bearer secret-token-value');
  assert.equal(
    request.options.headers['User-Agent'],
    'web:BlackMarketOCR:1.0 (contact: maintainer@example.org)',
  );
  assert.equal(request.url.includes('secret-token-value'), false);
});

test('queriesOnlyTheApprovedSubredditEndpoint', async () => {
  let requestedUrl = '';
  const client = createRedditApiClient({
    accessToken: 'secret-token-value',
    userAgent: 'web:BlackMarketOCR:1.0 (contact: maintainer@example.org)',
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ data: { children: [] } }), { status: 200 });
    },
  });

  await client.searchImages({ query: 'storage' });

  const endpoint = new URL(requestedUrl);
  assert.equal(
    `${endpoint.origin}${endpoint.pathname}`,
    'https://oauth.reddit.com/r/blackdesertonline/search.json',
  );
  assert.equal(endpoint.searchParams.get('restrict_sr'), '1');
});

test('respectsResultLimitAndPagination', async () => {
  let requestedUrl = '';
  const client = createRedditApiClient({
    accessToken: 'secret-token-value',
    userAgent: 'web:BlackMarketOCR:1.0 (contact: maintainer@example.org)',
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ data: { children: [] } }), { status: 200 });
    },
  });

  await client.searchImages({ query: 'storage', after: 't3_abc', limit: 25 });

  const endpoint = new URL(requestedUrl);
  assert.equal(endpoint.searchParams.get('limit'), '25');
  assert.equal(endpoint.searchParams.get('after'), 't3_abc');
  await assert.rejects(client.searchImages({ query: 'storage', limit: 101 }), /limit/i);
});

test('matchesDiscoveredPostsToPermissionByIdAndImageUrl', async () => {
  const sourceManifest = parsePermissionManifest(
    permissionManifest([
      permission({ imageUrls: [publicImageUrl, 'https://images.example.org/other.jpg'] }),
    ]),
  );
  const client = {
    searchImages: async () => ({
      posts: [
        {
          postId: 'post-1',
          imageUrls: [publicImageUrl, 'https://images.example.org/not-approved.jpg'],
        },
        { postId: 'post-2', imageUrls: [publicImageUrl] },
      ],
      removedPostIds: [],
    }),
  };

  const result = await discoverAuthorizedSources({
    sourceManifest,
    client,
    query: 'warehouse',
    limit: 5,
    now,
  });

  assert.deepEqual(
    result.sources.map(({ sourceId, imageUrls }) => ({ sourceId, imageUrls })),
    [{ sourceId: 'community-post-1', imageUrls: [publicImageUrl] }],
  );
  assert.equal(result.skippedCount, 2);
});

test('marksRemovedPostsForScopedPruning', async () => {
  const sourceManifest = parsePermissionManifest(permissionManifest());
  const client = { searchImages: async () => ({ posts: [], removedPostIds: ['post-1'] }) };

  const result = await discoverAuthorizedSources({
    sourceManifest,
    client,
    query: 'warehouse',
    now,
  });

  assert.deepEqual(result.pruneCandidates, ['community-post-1']);
  assert.deepEqual(result.sources, []);
});

test('rejectsNonHttpsPrivateAndUnapprovedHosts', async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests++;
    return new Response('unexpected');
  };
  const base = {
    allowedHosts: ['images.example.org'],
    maxBytes: 1000,
    fetchImpl,
    lookupImpl: publicLookup,
  };

  await assert.rejects(
    downloadAuthorizedImage({ ...base, url: 'http://images.example.org/a.jpg' }),
    /HTTPS/i,
  );
  await assert.rejects(
    downloadAuthorizedImage({ ...base, url: 'https://127.0.0.1/a.jpg' }),
    /private|local|host/i,
  );
  await assert.rejects(
    downloadAuthorizedImage({ ...base, url: 'https://unapproved.example.net/a.jpg' }),
    /allowlist|host/i,
  );
  await assert.rejects(
    downloadAuthorizedImage({ ...base, url: 'https://localhost/a.jpg' }),
    /private|local|host/i,
  );
  await assert.rejects(
    downloadAuthorizedImage({
      ...base,
      url: publicImageUrl,
      lookupImpl: async () => [{ address: '192.168.1.20', family: 4 }],
    }),
    /private|local/i,
  );
  assert.equal(requests, 0);
});

test('rechecksEveryRedirectHost', async () => {
  let requests = 0;
  await assert.rejects(
    downloadAuthorizedImage({
      url: publicImageUrl,
      allowedHosts: ['images.example.org', 'other.example.net'],
      maxBytes: 1_000_000,
      lookupImpl: async () => [{ address: '93.184.216.34', family: 4 }],
      fetchImpl: async () => {
        requests++;
        return new Response(null, {
          status: 302,
          headers: { location: 'https://unapproved.example.net/picture.jpg' },
        });
      },
    }),
    /allowlist|host/i,
  );
  assert.equal(requests, 1);
});

test('rejectsImagesBelow1920By1080', async () => {
  const bytes = await screenshotBuffer(1919, 1080);

  await assert.rejects(
    downloadAuthorizedImage({
      url: publicImageUrl,
      allowedHosts: ['images.example.org'],
      maxBytes: 1_000_000,
      lookupImpl: publicLookup,
      fetchImpl: async () => imageResponse(bytes),
    }),
    /1920×1080|1920x1080|minimum/i,
  );
});

test('enforcesByteCapBeforeDecode', async () => {
  let bodyRead = false;
  await assert.rejects(
    downloadAuthorizedImage({
      url: publicImageUrl,
      allowedHosts: ['images.example.org'],
      maxBytes: 100,
      lookupImpl: publicLookup,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '101', 'content-type': 'image/jpeg' }),
        get body() {
          bodyRead = true;
          return null;
        },
      }),
    }),
    /byte|size|large/i,
  );
  assert.equal(bodyRead, false);
});

test('rejectsMimeMagicMismatch', async () => {
  const bytes = await sharp({
    create: { width: 1920, height: 1080, channels: 3, background: '#345678' },
  })
    .png()
    .toBuffer();

  await assert.rejects(
    downloadAuthorizedImage({
      url: publicImageUrl,
      allowedHosts: ['images.example.org'],
      maxBytes: 1_000_000,
      lookupImpl: publicLookup,
      fetchImpl: async () => imageResponse(bytes, { contentType: 'image/jpeg' }),
    }),
    /mime|content type|format/i,
  );
});

test('deduplicatesBySha256WithoutLosingProvenance', async () => {
  const bytes = await screenshotBuffer();
  const outputDir = await realOutputDirectory();
  const sources = parsePermissionManifest(
    permissionManifest([
      permission({ sourceId: 'consent-a', provider: 'guide', postId: undefined }),
      permission({
        sourceId: 'consent-b',
        provider: 'guide',
        postId: undefined,
        authorizationRef: 'consent-2026-10-10-002',
      }),
    ]),
  );
  let fetchCount = 0;

  const result = await collectScreenshots({
    sources,
    outputDir,
    fetchImpl: async () => {
      fetchCount++;
      return imageResponse(bytes);
    },
    lookupImpl: publicLookup,
    sharp,
  });

  const captures = result.manifest.captures;
  const files = await readdir(path.join(outputDir, 'images'));
  const expectedHash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(fetchCount, 2);
  assert.equal(captures.length, 2);
  assert.deepEqual(new Set(captures.map(({ sha256 }) => sha256)), new Set([expectedHash]));
  assert.deepEqual(
    new Set(captures.map(({ sourceId }) => sourceId)),
    new Set(['consent-a', 'consent-b']),
  );
  assert.equal(files.length, 1);
});

test('keepsValidationOnlyPermissionOutOfTraining', async () => {
  const outputDir = await realOutputDirectory();
  const source = parsePermissionManifest(
    permissionManifest([
      permission({
        sourceId: 'validation-only',
        provider: 'guide',
        postId: undefined,
        use: 'validation',
      }),
    ]),
  );
  const result = await collectScreenshots({
    sources: source,
    outputDir,
    fetchImpl: async () => imageResponse(await screenshotBuffer()),
    lookupImpl: publicLookup,
    sharp,
  });

  assert.equal(result.manifest.captures[0].use, 'validation');
  assert.equal(result.manifest.captures[0].trainingEligible, false);
});

test('doesNotMarkUnlabeledTrainingAuthorizedScreenshotAsTrainingReady', async () => {
  const outputDir = await realOutputDirectory();
  const source = parsePermissionManifest(
    permissionManifest([
      permission({
        sourceId: 'training-rights',
        provider: 'guide',
        postId: undefined,
        use: 'training',
      }),
    ]),
  );
  const result = await collectScreenshots({
    sources: source,
    outputDir,
    fetchImpl: async () => imageResponse(await screenshotBuffer()),
    lookupImpl: publicLookup,
    sharp,
  });

  assert.equal(result.manifest.captures[0].labelStatus, 'unlabeled');
  assert.equal(result.manifest.captures[0].trainingEligible, false);
  assert.equal(result.manifest.captures[0].use, 'training');
});

test('keepsSharedImageUntilAllAuthorizationsAreRevoked', async () => {
  const bytes = await screenshotBuffer();
  const outputDir = await realOutputDirectory();
  const sources = parsePermissionManifest(
    permissionManifest([
      permission({ sourceId: 'consent-a', provider: 'guide', postId: undefined }),
      permission({
        sourceId: 'consent-b',
        provider: 'guide',
        postId: undefined,
        authorizationRef: 'consent-2026-10-10-002',
      }),
    ]),
  );
  const collected = await collectScreenshots({
    sources,
    outputDir,
    fetchImpl: async () => imageResponse(bytes),
    lookupImpl: publicLookup,
    sharp,
  });
  const imagePath = path.join(outputDir, collected.manifest.captures[0].path);

  await pruneRevokedScreenshots({
    manifestPath: collected.manifestPath,
    revokedSourceIds: ['consent-a'],
  });
  await readFile(imagePath);
  const final = await pruneRevokedScreenshots({
    manifestPath: collected.manifestPath,
    revokedSourceIds: ['consent-b'],
  });

  assert.equal(final.manifest.captures.length, 0);
  await assert.rejects(readFile(imagePath), { code: 'ENOENT' });
});

test('revocationCleanupStaysInsideMarkedCollectorRoot', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bdo-unmarked-real-'));
  temporaryDirectories.push(directory);
  const manifestPath = path.join(directory, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, captures: [] }));

  await assert.rejects(
    pruneRevokedScreenshots({ manifestPath, revokedSourceIds: ['consent-a'] }),
    /tmp\/ocr-dataset\/real|collector marker|marked/i,
  );
});

test('parsesCollectorOptionsAndShowsHelpWithoutLoadingOcr', async () => {
  const options = parseCollectorArgs([
    '--sources',
    'permissions.json',
    '--query',
    'storage',
    '--limit',
    '17',
    '--max-bytes',
    '2000000',
    '--output',
    'tmp/ocr-dataset/real',
  ]);
  let output = '';
  let fetchCalls = 0;
  const result = await runCollectorCli(['--help'], {
    fetchImpl: async () => {
      fetchCalls++;
      throw new Error('Help must not fetch.');
    },
    writeOutput: (value) => (output += value),
  });

  assert.equal(options.limit, 17);
  assert.equal(options.maxBytes, 2_000_000);
  assert.equal(result.help, true);
  assert.match(output, /REDDIT_ACCESS_TOKEN|--sources/);
  assert.equal(fetchCalls, 0);
});

test('failsClosedWithoutRedditOAuthTokenBeforeNetwork', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bdo-permissions-'));
  temporaryDirectories.push(directory);
  const sourcePath = path.join(directory, 'permissions.json');
  await writeFile(sourcePath, JSON.stringify(permissionManifest()));
  let fetchCalls = 0;

  await assert.rejects(
    runCollectorCli(['--sources', sourcePath, '--query', 'storage'], {
      env: {},
      fetchImpl: async () => {
        fetchCalls++;
        throw new Error('Network must not be called without OAuth.');
      },
    }),
    /REDDIT_ACCESS_TOKEN/i,
  );
  assert.equal(fetchCalls, 0);
});

test('requiresSourceManifestAndValidOutputRoot', async () => {
  assert.throws(() => parseCollectorArgs(['--query', 'storage']), /--sources/i);
  assert.throws(
    () => parseCollectorArgs(['--sources', 'permissions.json', '--output', 'output']),
    /tmp\/ocr-dataset\/real/i,
  );
});

test('usesExplicitGuidePermissionsWithoutRedditCredentials', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bdo-guide-permissions-'));
  temporaryDirectories.push(directory);
  const sourcePath = path.join(directory, 'permissions.json');
  const outputDir = path.join(directory, 'tmp', 'ocr-dataset', 'real');
  const source = permission({ sourceId: 'guide-storage', provider: 'guide', postId: undefined });
  await writeFile(sourcePath, JSON.stringify(permissionManifest([source])));
  const image = await screenshotBuffer();

  const result = await runCollectorCli(['--sources', sourcePath, '--output', outputDir], {
    env: {},
    fetchImpl: async () => imageResponse(image),
    lookupImpl: publicLookup,
    writeOutput() {},
  });

  assert.equal(result.captureCount, 1);
  assert.equal(result.manifest.captures[0].sourceId, 'guide-storage');
});

test('rejectsMissingPermissionManifestBeforeNetwork', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bdo-missing-permissions-'));
  temporaryDirectories.push(directory);
  let fetchCalls = 0;

  await assert.rejects(
    runCollectorCli(['--sources', path.join(directory, 'missing.json')], {
      env: {},
      fetchImpl: async () => {
        fetchCalls++;
        throw new Error('Network must not be called for a missing permission manifest.');
      },
    }),
    /source permission manifest/i,
  );
  assert.equal(fetchCalls, 0);
});
