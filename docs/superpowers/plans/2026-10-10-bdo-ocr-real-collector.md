# BDO OCR Real Screenshot Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect only high-resolution screenshots from OAuth-authorized Reddit/API or explicitly authorized guide sources, retaining auditable rights metadata.

**Architecture:** A Node ESM CLI requires an already-issued Reddit bearer token for official OAuth API requests and a local source-permission manifest. It downloads only direct HTTPS image URLs on an explicit host allowlist, validates the bytes/dimensions with existing Sharp, and records consent/provenance without retaining credentials.

**Tech Stack:** Node.js 24 built-in `fetch`, ESM, Sharp from `apps/api`, `node:test`.

**Spec:** [2026-10-10-bdo-ocr-dataset-pipeline.md](../specs/2026-10-10-bdo-ocr-dataset-pipeline.md)

## Global Constraints

- Reddit access uses only the registered OAuth Data API and a descriptive, truthful `User-Agent`; never scrape HTML or unauthenticated JSON endpoints.
- Require a per-source permission record before downloading; `validation` permission never implies `training` permission.
- Download only HTTPS images from configured public hosts, cap bytes, validate decoded format and require at least 1920×1080.
- Store under `tmp/ocr-dataset/real/`; never store tokens or log titles, usernames, raw OCR, or signed URLs.
- Use existing Sharp; no dependency additions and no network calls from tests.

## Review Focus

- Missing token for a Reddit query, malformed source manifest, or absent consent must fail closed; test no request and no file write occur. Guide-only manifests do not need Reddit credentials.
- OAuth request identity and endpoint: test Bearer header, descriptive User-Agent, allowed search endpoint and no credential output.
- URL and redirect safety: reject non-HTTPS, private/local hosts, unapproved CDN, and cross-host redirect; test each class.
- Download limits: reject oversized response, mismatched MIME/magic, invalid image and dimensions below 1920×1080; test each class with fake responses.
- Rights lifecycle: validation-only images are never marked training-eligible; revoked permission prunes only files inside a marked collector directory; test both.

---

### Task 1: Define permission manifest and OAuth discovery

**Files:**

- Create: `scripts/scrape-bdo-screenshots.mjs`
- Create: `scripts/scrape-bdo-screenshots.test.mjs`

**Interfaces:**

- `parsePermissionManifest(value)` returns validated source entries `{ sourceId, provider: 'reddit' | 'guide', postId?, imageUrls, allowedHosts, status: 'authorized' | 'revoked', use: 'validation' | 'training', rightsHolder, authorizationRef, authorizedAt, expiresAt? }`.
- `createRedditApiClient({ accessToken, userAgent, fetchImpl = fetch })` exposes `searchImages({ query, after, limit })`; it calls only `https://oauth.reddit.com/r/blackdesertonline/search.json` and returns post IDs/direct image URLs, never downloaded bytes.
- `discoverAuthorizedSources({ sourceManifest, client, query, limit, requestedUse })` intersects discovered post IDs and image URLs with permission records; unmatched, expired, requested-use-disallowed, or removed posts are skipped and returned as prune candidates.

- [ ] **Step 1: Write failing tests** named `rejectsSourcesWithoutRightsRecords`, `skipsExpiredOrRequestedUseDisallowedSources`, `sendsRegisteredOAuthAndUserAgent`, `queriesOnlyTheApprovedSubredditEndpoint`, `respectsResultLimitAndPagination`, `matchesDiscoveredPostsToPermissionByIdAndImageUrl`, and `marksRemovedPostsForScopedPruning`.
- [ ] **Step 2: Run tests and verify they fail**

Run: `node --test scripts/scrape-bdo-screenshots.test.mjs`  
Expected: FAIL because the collector exports do not exist.

- [ ] **Step 3: Implement permission parsing and OAuth discovery** with injected `fetchImpl`, token read only from `REDDIT_ACCESS_TOKEN`, configured `REDDIT_USER_AGENT`, and bounded request count. Reddit API access is optional for guide-only sources; if `--query` requests Reddit and the token is absent, fail before calling `fetch`. Do not print token or response text on errors.
- [ ] **Step 4: Run tests and verify they pass**

Run: `node --test scripts/scrape-bdo-screenshots.test.mjs`  
Expected: all auth and manifest tests pass with mocked HTTP only.

### Task 2: Download, validate, persist, and reconcile authorized images

**Interfaces:**

- `downloadAuthorizedImage({ url, allowedHosts, maxBytes, fetchImpl, sharp })` returns `{ bytes, format, width, height, sha256 }` only after HTTPS/host/redirect/content-length/body-size and Sharp metadata checks pass.
- `collectScreenshots({ sources, outputDir, maxBytes, fetchImpl, sharp })` saves unique images by SHA-256 and returns manifest `{ schemaVersion: 1, targetComposition: { synthetic: 0.8, real: 0.2 }, captures: [...] }`.
- `pruneRevokedScreenshots({ manifestPath, revokedSourceIds })` deletes only images within a verified `tmp/ocr-dataset/real/` directory carrying the collector marker, then rewrites its manifest; a shared hash remains until no authorized capture references it.

- [ ] **Step 1: Add failing tests** named `rejectsNonHttpsPrivateAndUnapprovedHosts`, `rechecksEveryRedirectHost`, `rejectsImagesBelow1920By1080`, `enforcesByteCapBeforeDecode`, `rejectsMimeMagicMismatch`, `deduplicatesBySha256WithoutLosingProvenance`, `keepsSharedImageUntilAllAuthorizationsAreRevoked`, `keepsValidationOnlyPermissionOutOfTraining`, and `revocationCleanupStaysInsideMarkedCollectorRoot`.
- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test scripts/scrape-bdo-screenshots.test.mjs`  
Expected: new download/cleanup assertions fail before implementation.

- [ ] **Step 3: Implement safe image fetch and manifest persistence**. Use manual redirect handling with a bounded hop count, revalidate each destination host and reject private/loopback addresses, stream bytes under `maxBytes`, verify actual decoded image metadata, and write images atomically by hash.
- [ ] **Step 4: Implement scoped revoked-source pruning**; refuse a destination outside the expected real-corpus directory or without the collector marker.
- [ ] **Step 5: Run the focused suite**

Run: `node --test scripts/scrape-bdo-screenshots.test.mjs`  
Expected: all collector tests pass with zero live network traffic.

### Task 3: Finish CLI and operational documentation

**Files:**

- Modify: `scripts/scrape-bdo-screenshots.mjs`
- Modify: `docs/ocr-validation.md`

- [ ] **Step 1: Add CLI tests** for `--help`, missing OAuth token, missing source/permission manifest, and invalid output path.
- [ ] **Step 2: Implement `--sources`, `--query`, `--limit`, `--max-bytes`, `--output`, `--prune-revoked`, and `--help`**; guide URLs must be direct entries in the permission manifest rather than crawled pages.
- [ ] **Step 3: Document registered Reddit OAuth token setup, guide-source allowlisting, permission schema, minimum resolution, cleanup, and that Reddit credentials are needed only for Reddit discovery** in `docs/ocr-validation.md`.
- [ ] **Step 4: Verify CLI help and missing-token fail closed without network**

Run: `node scripts/scrape-bdo-screenshots.mjs --help`  
Expected: concise usage with no secrets, emoji, or network request.

Run: `node scripts/scrape-bdo-screenshots.mjs --sources <temporary-reddit-permission-manifest> --query storage` with `REDDIT_ACCESS_TOKEN` unset.  
Expected: exit non-zero before any API call; a guide-only manifest remains usable without Reddit credentials.

- [ ] **Step 5: Commit the collector**

```bash
git add scripts/scrape-bdo-screenshots.mjs scripts/scrape-bdo-screenshots.test.mjs docs/ocr-validation.md
git commit -m "feat(ocr): collect authorized real screenshots"
```
