#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { lookup as dnsLookup } from 'node:dns/promises';
import { mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const redditSearchEndpoint = 'https://oauth.reddit.com/r/blackdesertonline/search.json';
const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const defaultSharp = requireApi('sharp');
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultOutputDir = path.resolve(scriptDirectory, '../tmp/ocr-dataset/real');
const collectorMarker = '.bdo-ocr-real-collector.json';
const maxRedirectHops = 3;

function validDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function permissionError(detail) {
  return new Error(`Invalid source permission manifest: ${detail}`);
}

export function parsePermissionManifest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1)
    throw permissionError('expected schemaVersion 1 and a sources array.');
  if (!Array.isArray(value.sources) || value.sources.length === 0)
    throw permissionError('at least one source permission record is required.');
  const sourceIds = new Set();
  return value.sources.map((source, index) => {
    if (!source || typeof source !== 'object' || Array.isArray(source))
      throw permissionError(`source ${index + 1} must be an object.`);
    const {
      sourceId,
      provider,
      postId,
      imageUrls,
      allowedHosts,
      status,
      use,
      rightsHolder,
      authorizationRef,
      authorizedAt,
      expiresAt,
    } = source;
    if (
      typeof sourceId !== 'string' ||
      !/^[A-Za-z0-9._-]{1,128}$/.test(sourceId) ||
      sourceIds.has(sourceId)
    )
      throw permissionError(`source ${index + 1} needs a unique safe sourceId.`);
    sourceIds.add(sourceId);
    if (!['reddit', 'guide'].includes(provider))
      throw permissionError(`${sourceId} has an unsupported provider.`);
    if (
      provider === 'reddit' &&
      (typeof postId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(postId))
    )
      throw permissionError(`${sourceId} needs a Reddit postId.`);
    if (!Array.isArray(imageUrls) || imageUrls.length === 0)
      throw permissionError(`${sourceId} needs at least one explicitly permitted image URL.`);
    const urls = imageUrls.map((value) => {
      if (typeof value !== 'string')
        throw permissionError(`${sourceId} contains a malformed image URL.`);
      let parsed;
      try {
        parsed = new URL(value);
      } catch {
        throw permissionError(`${sourceId} contains a malformed image URL.`);
      }
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
        throw permissionError(
          `${sourceId} image URLs must use HTTPS without embedded credentials.`,
        );
      return parsed.href;
    });
    if (!Array.isArray(allowedHosts) || allowedHosts.length === 0)
      throw permissionError(`${sourceId} needs an explicit allowedHosts list.`);
    const hosts = allowedHosts.map((host) => {
      if (typeof host !== 'string' || !host.trim())
        throw permissionError(`${sourceId} has an invalid allowed host.`);
      let normalized;
      try {
        normalized = new URL(`https://${host.trim()}`).hostname.toLowerCase();
      } catch {
        throw permissionError(`${sourceId} has an invalid allowed host.`);
      }
      if (
        normalized !== host.trim().toLowerCase() ||
        normalized.includes('@') ||
        normalized.includes('/')
      )
        throw permissionError(`${sourceId} allowed hosts must be hostnames only.`);
      return normalized;
    });
    if (new Set(hosts).size !== hosts.length)
      throw permissionError(`${sourceId} repeats an allowed host.`);
    if (!['authorized', 'revoked'].includes(status))
      throw permissionError(`${sourceId} status must be authorized or revoked.`);
    if (!['validation', 'training'].includes(use))
      throw permissionError(`${sourceId} use must be validation or training.`);
    if (typeof rightsHolder !== 'string' || !rightsHolder.trim() || rightsHolder.length > 240)
      throw permissionError(`${sourceId} needs a rights holder.`);
    if (
      typeof authorizationRef !== 'string' ||
      !authorizationRef.trim() ||
      authorizationRef.length > 500
    )
      throw permissionError(`${sourceId} needs an authorization reference.`);
    if (!validDate(authorizedAt))
      throw permissionError(`${sourceId} needs a valid authorizedAt date.`);
    if (expiresAt !== undefined && !validDate(expiresAt))
      throw permissionError(`${sourceId} has an invalid expiresAt date.`);
    return {
      sourceId,
      provider,
      ...(postId ? { postId } : {}),
      imageUrls: [...new Set(urls)],
      allowedHosts: [...new Set(hosts)],
      status,
      use,
      rightsHolder: rightsHolder.trim(),
      authorizationRef: authorizationRef.trim(),
      authorizedAt,
      ...(expiresAt ? { expiresAt } : {}),
    };
  });
}

function imageUrl(value) {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replaceAll('&amp;', '&');
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

function redditImageCandidates(post) {
  const candidates = [];
  const previewImages = post.preview?.images;
  if (Array.isArray(previewImages)) {
    for (const image of previewImages) {
      const sourceUrl = imageUrl(image?.source?.url);
      if (sourceUrl) candidates.push(sourceUrl);
    }
  }
  const destination = imageUrl(post.url_overridden_by_dest ?? post.url);
  if (destination && /\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(destination))
    candidates.push(destination);
  return [...new Set(candidates)];
}

export function createRedditApiClient({ accessToken, userAgent, fetchImpl = fetch }) {
  if (typeof accessToken !== 'string' || !accessToken.trim())
    throw new Error('REDDIT_ACCESS_TOKEN is required for Reddit discovery.');
  if (
    typeof userAgent !== 'string' ||
    userAgent.trim().length < 12 ||
    /[\r\n]/.test(userAgent) ||
    /placeholder|your[- ]?app/i.test(userAgent)
  )
    throw new Error(
      'REDDIT_USER_AGENT must identify the registered application and contact method.',
    );
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');

  return {
    async searchImages({ query, after, limit = 25 }) {
      if (typeof query !== 'string' || !query.trim() || query.length > 200)
        throw new Error('Reddit query must contain 1 to 200 characters.');
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
        throw new Error('Reddit result limit must be between 1 and 100.');
      if (after !== undefined && (typeof after !== 'string' || !/^t3_[a-z0-9]+$/i.test(after)))
        throw new Error('Reddit pagination cursor is invalid.');
      const endpoint = new URL(redditSearchEndpoint);
      endpoint.searchParams.set('q', query.trim());
      endpoint.searchParams.set('restrict_sr', '1');
      endpoint.searchParams.set('sort', 'relevance');
      endpoint.searchParams.set('type', 'link');
      endpoint.searchParams.set('limit', String(limit));
      if (after) endpoint.searchParams.set('after', after);
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'GET',
          redirect: 'error',
          headers: {
            Authorization: `Bearer ${accessToken.trim()}`,
            'User-Agent': userAgent.trim(),
            Accept: 'application/json',
          },
        });
      } catch {
        throw new Error('Reddit OAuth request could not be completed.');
      }
      if (!response.ok)
        throw new Error(`Reddit OAuth request failed with HTTP ${response.status}.`);
      let body;
      try {
        body = await response.json();
      } catch {
        throw new Error('Reddit OAuth returned an invalid JSON response.');
      }
      const children = body?.data?.children;
      if (!Array.isArray(children))
        throw new Error('Reddit OAuth response did not contain search results.');
      const posts = [];
      const removedPostIds = [];
      for (const child of children.slice(0, limit)) {
        const post = child?.data;
        if (!post || typeof post.id !== 'string' || !/^[a-z0-9]+$/i.test(post.id)) continue;
        if (post.removed_by_category || post.is_removed || post.removed) {
          removedPostIds.push(post.id);
          continue;
        }
        posts.push({ postId: post.id, imageUrls: redditImageCandidates(post) });
      }
      return { posts, removedPostIds };
    },
  };
}

function useAllowed(permission, requestedUse) {
  return permission.use === 'training' || requestedUse === 'validation';
}

export async function discoverAuthorizedSources({
  sourceManifest,
  client,
  query,
  after,
  limit = 25,
  requestedUse = 'validation',
  now = new Date(),
}) {
  const permissions = Array.isArray(sourceManifest)
    ? sourceManifest
    : parsePermissionManifest(sourceManifest);
  if (!['validation', 'training'].includes(requestedUse))
    throw new Error('Requested use must be validation or training.');
  const timestamp = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(timestamp)) throw new Error('A valid current time is required.');
  const result = query
    ? await client?.searchImages({ query, after, limit })
    : { posts: [], removedPostIds: [] };
  if (query && !client)
    throw new Error('A registered Reddit OAuth client is required when --query is used.');
  const posts = new Map((result?.posts ?? []).map((post) => [post.postId, post]));
  const removedIds = new Set(result?.removedPostIds ?? []);
  const sources = [];
  const pruneCandidates = [];
  let skippedCount = 0;
  const permittedPostIds = new Set(
    permissions.filter((source) => source.provider === 'reddit').map((source) => source.postId),
  );
  for (const postId of posts.keys()) if (!permittedPostIds.has(postId)) skippedCount++;

  for (const permission of permissions) {
    if (permission.provider === 'guide' && !query) {
      if (
        permission.status !== 'authorized' ||
        (permission.expiresAt && Date.parse(permission.expiresAt) <= timestamp) ||
        !useAllowed(permission, requestedUse)
      ) {
        skippedCount++;
        continue;
      }
      sources.push({ ...permission, imageUrls: [...permission.imageUrls] });
      continue;
    }
    if (permission.provider !== 'reddit' || !query) continue;
    if (removedIds.has(permission.postId)) {
      if (permission.status === 'authorized') pruneCandidates.push(permission.sourceId);
      skippedCount++;
      continue;
    }
    const discovered = posts.get(permission.postId);
    if (!discovered) {
      skippedCount++;
      continue;
    }
    if (
      permission.status !== 'authorized' ||
      (permission.expiresAt && Date.parse(permission.expiresAt) <= timestamp) ||
      !useAllowed(permission, requestedUse)
    ) {
      skippedCount++;
      continue;
    }
    const discoveredUrls = new Set(discovered.imageUrls ?? []);
    const allowedUrls = permission.imageUrls.filter((url) => discoveredUrls.has(url));
    skippedCount += Math.max(0, (discovered.imageUrls?.length ?? 0) - allowedUrls.length);
    if (!allowedUrls.length) {
      skippedCount++;
      continue;
    }
    sources.push({ ...permission, imageUrls: allowedUrls });
  }

  return { sources, skippedCount, pruneCandidates: [...new Set(pruneCandidates)] };
}

function isPublicIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255))
    return false;
  const [first, second, third] = parts;
  if (first === 0 || first === 10 || first === 127 || first >= 224 || first === 255) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (
    first === 192 &&
    (second === 168 || (second === 0 && third === 0) || (second === 0 && third === 2))
  )
    return false;
  if (first === 192 && second === 88 && third === 99) return false;
  if (first === 198 && (second === 18 || second === 19 || second === 51)) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}

function isPublicIpv6(address) {
  const value = address.toLowerCase();
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice('::ffff:'.length);
    if (isIP(mapped) === 4) return isPublicIpv4(mapped);
    return false;
  }
  if (
    value === '::' ||
    value === '::1' ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe8') ||
    value.startsWith('fe9') ||
    value.startsWith('fea') ||
    value.startsWith('feb') ||
    value.startsWith('ff') ||
    value.startsWith('2001:db8:')
  )
    return false;
  const firstGroup = Number.parseInt(value.split(':')[0] || '0', 16);
  return firstGroup >= 0x2000 && firstGroup <= 0x3fff;
}

function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

async function validateDownloadUrl(value, allowedHosts, lookupImpl) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Image source URL is malformed.');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
    throw new Error('Image downloads require HTTPS without embedded credentials.');
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const allowed = new Set(allowedHosts.map((host) => host.toLowerCase()));
  if (!allowed.has(hostname))
    throw new Error('Image source host is not on the permission allowlist.');
  if (
    hostname === 'localhost' ||
    /\.(?:localhost|local|internal|lan|home|test|invalid)$/.test(hostname)
  )
    throw new Error('Private or local image hosts are not permitted.');
  const family = isIP(hostname);
  if (family) {
    if (!isPublicAddress(hostname))
      throw new Error('Private or local image IP addresses are not permitted.');
  } else {
    let addresses;
    try {
      addresses = await lookupImpl(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error('Image source host could not be resolved.');
    }
    if (
      !Array.isArray(addresses) ||
      addresses.length === 0 ||
      addresses.some(({ address }) => !isPublicAddress(address))
    )
      throw new Error('Private or local image host resolution is not permitted.');
  }
  return parsed;
}

async function readLimitedBody(response, maxBytes) {
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        total += chunk.length;
        if (total > maxBytes) {
          await reader.cancel();
          throw new Error(`Image response exceeded the ${maxBytes}-byte limit.`);
        }
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock?.();
    }
    return Buffer.concat(chunks, total);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes)
    throw new Error(`Image response exceeded the ${maxBytes}-byte limit.`);
  return bytes;
}

function normalizedImageMime(value) {
  const mime = value?.split(';', 1)[0]?.trim().toLowerCase();
  if (mime === 'image/jpg') return 'image/jpeg';
  return mime;
}

export async function downloadAuthorizedImage({
  url,
  allowedHosts,
  maxBytes = 20 * 1024 * 1024,
  fetchImpl = fetch,
  lookupImpl = dnsLookup,
  sharp = defaultSharp,
}) {
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0)
    throw new Error('An image host allowlist is required.');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 100 * 1024 * 1024)
    throw new Error('Maximum image size must be between 1 byte and 100 MiB.');
  if (typeof fetchImpl !== 'function' || typeof lookupImpl !== 'function')
    throw new Error('Fetch and DNS implementations are required.');
  let current = await validateDownloadUrl(url, allowedHosts, lookupImpl);
  let response;
  for (let hop = 0; hop <= maxRedirectHops; hop++) {
    try {
      response = await fetchImpl(current, {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: 'image/jpeg,image/png,image/webp' },
      });
    } catch {
      throw new Error('Image source request could not be completed.');
    }
    if (response.redirected)
      throw new Error('Image client followed a redirect before host validation.');
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || hop === maxRedirectHops)
        throw new Error('Image redirect limit exceeded or location missing.');
      let redirected;
      try {
        redirected = new URL(location, current);
      } catch {
        throw new Error('Image redirect URL is malformed.');
      }
      current = await validateDownloadUrl(redirected.href, allowedHosts, lookupImpl);
      continue;
    }
    break;
  }
  if (!response?.ok)
    throw new Error(`Image source returned HTTP ${response?.status ?? 'unknown'}.`);
  const contentLength = response.headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes)
    throw new Error(`Image response exceeded the ${maxBytes}-byte limit.`);
  const bytes = await readLimitedBody(response, maxBytes);
  const contentType = normalizedImageMime(response.headers.get('content-type'));
  const formats = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!formats[contentType]) throw new Error('Image response has an unsupported content type.');
  let metadata;
  try {
    metadata = await sharp(bytes, { failOn: 'error' }).metadata();
  } catch {
    throw new Error('Image response could not be decoded.');
  }
  if (metadata.format !== formats[contentType])
    throw new Error('Image MIME type does not match the decoded format.');
  if (!['jpeg', 'png', 'webp'].includes(metadata.format))
    throw new Error('Decoded image format is unsupported.');
  if (
    !Number.isSafeInteger(metadata.width) ||
    !Number.isSafeInteger(metadata.height) ||
    metadata.width * metadata.height > 40_000_000
  )
    throw new Error('Image dimensions exceed the supported size.');
  if (metadata.width < 1920 || metadata.height < 1080)
    throw new Error('Image dimensions must be at least 1920×1080.');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return { bytes, format: metadata.format, width: metadata.width, height: metadata.height, sha256 };
}

function isExpectedRealRoot(root) {
  return (
    path.basename(root).toLowerCase() === 'real' &&
    path.basename(path.dirname(root)).toLowerCase() === 'ocr-dataset' &&
    path.basename(path.dirname(path.dirname(root))).toLowerCase() === 'tmp'
  );
}

async function loadCollectorManifest(root, { create = false } = {}) {
  if (!isExpectedRealRoot(root))
    throw new Error('Collector output must be inside tmp/ocr-dataset/real/.');
  await mkdir(root, { recursive: true });
  const canonicalRoot = await realpath(root);
  if (canonicalRoot !== root) throw new Error('Collector output cannot use a symlinked directory.');
  const markerPath = path.join(root, collectorMarker);
  const manifestPath = path.join(root, 'manifest.json');
  const entries = await readdir(root);
  if (entries.length === 0 && create) {
    await writeFile(
      markerPath,
      JSON.stringify({ generator: 'bdo-ocr-real-collector', schemaVersion: 1 }, null, 2),
    );
    await mkdir(path.join(root, 'images'), { recursive: true });
    return {
      manifestPath,
      manifest: {
        schemaVersion: 1,
        targetComposition: { synthetic: 0.8, real: 0.2 },
        captures: [],
      },
    };
  }
  let marker;
  let manifest;
  try {
    marker = JSON.parse(await readFile(markerPath, 'utf8'));
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    throw new Error(
      'Collector directory must contain its marker and a valid manifest before reuse.',
    );
  }
  if (
    marker.generator !== 'bdo-ocr-real-collector' ||
    marker.schemaVersion !== 1 ||
    manifest.schemaVersion !== 1 ||
    !Array.isArray(manifest.captures)
  )
    throw new Error('Collector marker or manifest is invalid.');
  return { manifestPath, manifest };
}

async function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  await rename(temporaryPath, filePath);
}

function sourceUrlForManifest(value) {
  const parsed = new URL(value);
  return `${parsed.origin}${parsed.pathname}`;
}

async function persistImage(root, downloaded) {
  const extension = { jpeg: 'jpg', png: 'png', webp: 'webp' }[downloaded.format];
  const relativePath = `images/${downloaded.sha256}.${extension}`;
  const imagePath = path.resolve(root, relativePath);
  if (!imagePath.startsWith(`${path.resolve(root)}${path.sep}`))
    throw new Error('Image path escaped the collector directory.');
  await mkdir(path.dirname(imagePath), { recursive: true });
  try {
    const existing = await readFile(imagePath);
    const existingHash = createHash('sha256').update(existing).digest('hex');
    if (existingHash !== downloaded.sha256)
      throw new Error('Existing image file does not match its SHA-256 name.');
    return { path: relativePath, saved: false };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporaryPath = `${imagePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, downloaded.bytes, { flag: 'wx' });
  await rename(temporaryPath, imagePath);
  return { path: relativePath, saved: true };
}

export async function collectScreenshots({
  sources,
  outputDir = defaultOutputDir,
  maxBytes = 20 * 1024 * 1024,
  fetchImpl = fetch,
  lookupImpl = dnsLookup,
  sharp = defaultSharp,
  now = new Date(),
}) {
  const permissions = parsePermissionManifest({ schemaVersion: 1, sources });
  const timestamp = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(timestamp.getTime()))
    throw new Error('A valid collection time is required.');
  const root = path.resolve(outputDir);
  const { manifestPath, manifest } = await loadCollectorManifest(root, { create: true });
  let savedImages = 0;
  const newCaptures = [];
  for (const source of permissions) {
    if (source.status !== 'authorized')
      throw new Error(`Source ${source.sourceId} has no active authorization.`);
    if (source.expiresAt && Date.parse(source.expiresAt) <= timestamp.getTime())
      throw new Error(`Source ${source.sourceId} authorization has expired.`);
    for (const imageUrl of source.imageUrls) {
      const downloaded = await downloadAuthorizedImage({
        url: imageUrl,
        allowedHosts: source.allowedHosts,
        maxBytes,
        fetchImpl,
        lookupImpl,
        sharp,
      });
      const saved = await persistImage(root, downloaded);
      if (saved.saved) savedImages++;
      newCaptures.push({
        id: `${source.sourceId}-${downloaded.sha256.slice(0, 16)}`,
        sha256: downloaded.sha256,
        path: saved.path,
        format: downloaded.format,
        width: downloaded.width,
        height: downloaded.height,
        sourceId: source.sourceId,
        provider: source.provider,
        ...(source.postId ? { postId: source.postId } : {}),
        sourceUrl: sourceUrlForManifest(imageUrl),
        rightsHolder: source.rightsHolder,
        authorizationRef: source.authorizationRef,
        authorizedAt: source.authorizedAt,
        ...(source.expiresAt ? { expiresAt: source.expiresAt } : {}),
        use: source.use,
        trainingPermissionGranted: source.use === 'training',
        trainingEligible: false,
        collectedAt: timestamp.toISOString(),
        labelStatus: 'unlabeled',
        language: null,
        sessionGroup: null,
      });
    }
  }
  const captureKeys = new Set(
    manifest.captures.map((capture) => `${capture.sourceId}:${capture.sha256}`),
  );
  for (const capture of newCaptures) {
    if (!captureKeys.has(`${capture.sourceId}:${capture.sha256}`)) manifest.captures.push(capture);
  }
  manifest.targetComposition = { synthetic: 0.8, real: 0.2 };
  await writeJsonAtomically(manifestPath, manifest);
  return { manifestPath, manifest, savedImages, captureCount: newCaptures.length };
}

function validateCapturePath(root, capture) {
  if (
    typeof capture.path !== 'string' ||
    !/^images\/[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(capture.path) ||
    capture.path.split('/')[1].split('.')[0] !== capture.sha256
  )
    throw new Error('Collector manifest contains an unsafe image path.');
  const imagePath = path.resolve(root, capture.path);
  if (!imagePath.startsWith(`${path.resolve(root)}${path.sep}`))
    throw new Error('Collector manifest image path escapes its root.');
  return imagePath;
}

export async function pruneRevokedScreenshots({ manifestPath, revokedSourceIds }) {
  if (
    !Array.isArray(revokedSourceIds) ||
    revokedSourceIds.some((value) => typeof value !== 'string')
  )
    throw new Error('Revoked source IDs must be an array of strings.');
  const root = path.resolve(path.dirname(manifestPath));
  if (!isExpectedRealRoot(root))
    throw new Error('Revocation cleanup is restricted to tmp/ocr-dataset/real/.');
  const canonicalRoot = await realpath(root).catch(() => {
    throw new Error('Collector root is missing or not marked.');
  });
  const { manifest } = await loadCollectorManifest(canonicalRoot);
  const revoked = new Set(revokedSourceIds);
  const removed = manifest.captures.filter((capture) => revoked.has(capture.sourceId));
  const remaining = manifest.captures.filter((capture) => !revoked.has(capture.sourceId));
  const activeHashes = new Set(remaining.map((capture) => capture.sha256));
  let deletedImages = 0;
  for (const capture of removed) {
    if (activeHashes.has(capture.sha256)) continue;
    await rm(validateCapturePath(canonicalRoot, capture), { force: true });
    deletedImages++;
  }
  manifest.captures = remaining;
  const manifestPathInRoot = path.join(canonicalRoot, 'manifest.json');
  await writeJsonAtomically(manifestPathInRoot, manifest);
  return {
    manifestPath: manifestPathInRoot,
    manifest,
    removedCaptures: removed.length,
    deletedImages,
  };
}

function collectorUsage() {
  return [
    'Usage: node scripts/scrape-bdo-screenshots.mjs --sources <permissions.json> [options]',
    '',
    'Options:',
    '  --query <text>       Search the approved r/blackdesertonline OAuth endpoint',
    '  --limit <n>          Reddit result limit from 1 to 100 (default: 25)',
    '  --max-bytes <n>      Maximum image size from 1 to 104857600 bytes',
    '  --use <purpose>      validation or training (default: validation)',
    '  --output <path>      Collector root (default: tmp/ocr-dataset/real)',
    '  --prune-revoked      Remove locally stored captures with revoked source IDs',
    '  --help               Show this help without reading credentials or making requests',
    '',
    'Reddit discovery requires REDDIT_ACCESS_TOKEN and REDDIT_USER_AGENT from a registered OAuth application.',
    'Guide images must be direct HTTPS URLs in a permission record; guide-only collection needs no Reddit token.',
  ].join('\n');
}

export function parseCollectorArgs(argv) {
  const options = {
    sourcesPath: undefined,
    query: undefined,
    limit: 25,
    maxBytes: 20 * 1024 * 1024,
    use: 'validation',
    outputDir: defaultOutputDir,
    pruneRevoked: false,
  };
  const values = new Map([
    ['--sources', 'sourcesPath'],
    ['--query', 'query'],
    ['--limit', 'limit'],
    ['--max-bytes', 'maxBytes'],
    ['--use', 'use'],
    ['--output', 'outputDir'],
  ]);
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === '--help' || flag === '-h') return { help: collectorUsage() };
    if (flag === '--prune-revoked') {
      options.pruneRevoked = true;
      continue;
    }
    const key = values.get(flag);
    if (!key) throw new Error(`Unknown option: ${flag}`);
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (key === 'limit' || key === 'maxBytes') {
      if (!/^\d+$/.test(value)) throw new Error(`${flag} must be a positive integer.`);
      options[key] = Number(value);
    } else if (key === 'sourcesPath') {
      options.sourcesPath = path.resolve(value);
    } else if (key === 'outputDir') {
      options.outputDir = path.resolve(value);
    } else if (key === 'use') {
      options.use = value;
    } else {
      options.query = value;
    }
  }
  if (!options.sourcesPath) throw new Error('--sources is required.');
  if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 100)
    throw new Error('--limit must be an integer between 1 and 100.');
  if (
    !Number.isSafeInteger(options.maxBytes) ||
    options.maxBytes < 1 ||
    options.maxBytes > 100 * 1024 * 1024
  )
    throw new Error('--max-bytes must be between 1 and 104857600.');
  if (!['validation', 'training'].includes(options.use))
    throw new Error('--use must be validation or training.');
  if (!isExpectedRealRoot(options.outputDir))
    throw new Error('--output must point to tmp/ocr-dataset/real/.');
  if (options.query !== undefined && (!options.query.trim() || options.query.length > 200))
    throw new Error('--query must contain 1 to 200 characters.');
  return options;
}

export async function runCollectorCli(
  argv,
  {
    env = process.env,
    fetchImpl = fetch,
    lookupImpl = dnsLookup,
    sharp = defaultSharp,
    now = new Date(),
    writeOutput = (value) => process.stdout.write(value),
  } = {},
) {
  const options = parseCollectorArgs(argv);
  if (options.help) {
    writeOutput(`${options.help}\n`);
    return { help: true };
  }
  let sourceValue;
  try {
    sourceValue = JSON.parse(await readFile(options.sourcesPath, 'utf8'));
  } catch {
    throw new Error('Could not read the source permission manifest.');
  }
  const sourceManifest = parsePermissionManifest(sourceValue);

  if (options.pruneRevoked) {
    const revokedSourceIds = sourceManifest
      .filter(({ status }) => status === 'revoked')
      .map(({ sourceId }) => sourceId);
    const pruned = await pruneRevokedScreenshots({
      manifestPath: path.join(options.outputDir, 'manifest.json'),
      revokedSourceIds,
    });
    writeOutput(
      `Removed ${pruned.removedCaptures} revoked captures and ${pruned.deletedImages} unreferenced images.\n`,
    );
    return pruned;
  }

  let client;
  if (options.query !== undefined) {
    if (!env.REDDIT_ACCESS_TOKEN)
      throw new Error('REDDIT_ACCESS_TOKEN is required for Reddit discovery.');
    client = createRedditApiClient({
      accessToken: env.REDDIT_ACCESS_TOKEN,
      userAgent: env.REDDIT_USER_AGENT,
      fetchImpl,
    });
  }
  const discovered = await discoverAuthorizedSources({
    sourceManifest,
    client,
    query: options.query,
    limit: options.limit,
    requestedUse: options.use,
    now,
  });
  if (!discovered.sources.length) {
    writeOutput(`No authorized screenshots matched. Skipped ${discovered.skippedCount} records.\n`);
    return { ...discovered, savedImages: 0, captureCount: 0 };
  }
  const collected = await collectScreenshots({
    sources: discovered.sources,
    outputDir: options.outputDir,
    maxBytes: options.maxBytes,
    fetchImpl,
    lookupImpl,
    sharp,
    now,
  });
  if (discovered.pruneCandidates.length) {
    try {
      await stat(path.join(options.outputDir, 'manifest.json'));
      await pruneRevokedScreenshots({
        manifestPath: path.join(options.outputDir, 'manifest.json'),
        revokedSourceIds: discovered.pruneCandidates,
      });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  writeOutput(
    `Collected ${collected.captureCount} authorized captures and saved ${collected.savedImages} unique images. Skipped ${discovered.skippedCount} records.\n`,
  );
  return { ...discovered, ...collected };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runCollectorCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`Screenshot collection failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
