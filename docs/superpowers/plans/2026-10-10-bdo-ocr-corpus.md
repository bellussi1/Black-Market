# BDO OCR Corpus and Screen Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organize the supplied game captures locally and extend print import to detect and review structured storage, inventory, mastery, weight, and character fields.

**Architecture:** Keep the existing icon/grid reader intact. Add a private local corpus and validator, a pure Portuguese screen/field parser, a lazy Tesseract text reader, and a dedicated profile screen review route that applies only user-selected fields to an explicitly selected character.

**Tech Stack:** Angular 22 standalone components, TypeScript 6, Tesseract.js 7, Vitest, Node.js scripts, existing Sharp dependency for local image metadata.

**Spec:** `docs/superpowers/specs/2026-10-10-bdo-ocr-corpus-design.md`

## Global Constraints

- Keep source captures and manifests under ignored `data/ocr-corpus/`; do not commit images, names, raw OCR output, or personal annotations.
- Copy user-provided captures; do not move or rename their originals. Exclude community/reference screenshots from calibration and evaluation.
- Keep image OCR local to the browser. No custom model training or remote image OCR in this scope.
- Keep the existing grid, icon, quantity, equipment, cancellation, and explicit confirmation flows working.
- Treat `LT` and `VT` as different domains; never write market load as character weight.
- Missing, occluded, ambiguous, unsupported, or unselected fields must not change stored profile values.
- Apply only fields selected by the user to a character they explicitly choose; never auto-create or merge characters.
- Raw OCR confidence is a ranking signal, not a calibrated probability.

## Review Focus

- **Combined or adjacent panes:** storage and inventory titles can coexist in one capture; assert separate pane detection and field ownership in Task 2.
- **Weight units and separators:** `346,07/751,6 LT` and `9,419.5/11,000 VT` must not map to the same profile field; assert normalized values and unit separation in Task 2.
- **Unknown mastery labels:** a misspelled or unsupported activity must remain unresolved instead of mapping to a nearby life skill; assert in Task 2.
- **Missing or covered fields:** a partial screenshot must preserve all current profile data not explicitly reviewed; assert in Task 4.
- **OCR worker failure or cancellation:** initialization failure, timeout, or cancellation must leave the image available for manual entry and must not save a draft; assert in Task 3 and Task 4.

---

### Task 1: Curate and validate the local OCR corpus

**Files:**

- Copy into ignored local paths: `data/ocr-corpus/images/{storage,inventory,mastery,characters,combined}/`
- Create ignored local file: `data/ocr-corpus/manifest.json`
- Create: `scripts/validate-ocr-corpus.mjs`
- Create: `scripts/validate-ocr-corpus.test.mjs`
- Modify: `docs/ocr-validation.md`

**Interfaces:**

- `validateOcrCorpus(manifestPath: string): Promise<{ captures: number; labels: number }>` validates schema version, contained paths, image SHA-256/dimensions, unique content hashes, session grouping, label bounds, and label states. The CLI prints aggregate counts only.
- Manifest `schemaVersion: 1`; each capture has `id`, relative `path`, `sha256`, `source`, `sessionId`, `locale`, `width`, `height`, `split`, `screens`, and `labels`. Labels have `field`, `rawText`, `expectedValue`, `bounds`, and `status: 'verified' | 'ambiguous' | 'occluded' | 'not_present'`.

- [ ] **Step 1: Write validator tests** in `scripts/validate-ocr-corpus.test.mjs` using `node:test`. Cover valid input, duplicate content hash, a path escaping the corpus directory, mismatched SHA-256, out-of-image bounds, and invalid label status.
- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test scripts/validate-ocr-corpus.test.mjs`

Expected: FAIL because `validate-ocr-corpus.mjs` does not export the validator yet.

- [ ] **Step 3: Implement `validateOcrCorpus`** in `scripts/validate-ocr-corpus.mjs`. Resolve every capture path under the manifest directory; compute hashes with Node crypto; inspect dimensions through Sharp loaded from `apps/api`; reject duplicate hashes and invalid or out-of-bounds labels without logging personal text or paths.
- [ ] **Step 4: Copy and annotate the supplied captures locally.** Copy the 13 unique user-owned images into category folders using hash-derived filenames. Put the two-pane image in `combined`; classify the other images by visible pane. Include verified structured fields only. Keep all images in the calibration split because the current set has too few independent sessions for a meaningful holdout. Do not copy the exact duplicate or any external reference images.
- [ ] **Step 5: Validate the curated corpus**

Run: `node --test scripts/validate-ocr-corpus.test.mjs`  
Run: `node scripts/validate-ocr-corpus.mjs data/ocr-corpus/manifest.json`

Expected: all validator tests pass; CLI reports 13 unique captures and the verified label count, with no filenames or label values in its output.

- [ ] **Step 6: Document corpus handling** in `docs/ocr-validation.md`, including the local manifest schema, calibration-only status, SHA deduplication, session grouping, and a note that examples are not a general accuracy benchmark.
- [ ] **Step 7: Commit the corpus tooling and documentation** (the ignored corpus itself must not appear in the commit).

```bash
git add scripts/validate-ocr-corpus.mjs scripts/validate-ocr-corpus.test.mjs docs/ocr-validation.md
git commit -m "feat(ocr): add local capture corpus validation"
```

### Task 2: Parse screen types and structured field candidates

**Files:**

- Create: `apps/web/src/app/features/scans/screen-recognition.ts`
- Create: `apps/web/src/app/features/scans/screen-recognition.spec.ts`

**Interfaces:**

- `OcrTextLine = { text: string; confidence: number; bounds: Crop }`.
- `ScreenKind = 'storage' | 'inventory' | 'mastery' | 'character-roster' | 'character-status' | 'equipment' | 'market' | 'unknown'`.
- `ScreenFieldCandidate = { field: string; rawText: string; value: string | number | null; unit?: 'LT' | 'VT'; confidence: number; bounds: Crop; status: 'candidate' | 'ambiguous' | 'missing' | 'unsupported' }`.
- `DetectedScreenPane = { kind: ScreenKind; bounds: Crop; confidence: number }`.
- `detectScreenPanes(lines: readonly OcrTextLine[], imageWidth: number, imageHeight: number): DetectedScreenPane[]` groups recognized anchors into zero or more panes.
- `parseScreenFields(pane: DetectedScreenPane, lines: readonly OcrTextLine[]): ScreenFieldCandidate[]` maps only known labels to domain field keys.
- `parseBdoWeight(text: string): { carried: number; limit: number; unit: 'LT' | 'VT' } | null` and `parseBdoCapacity(text: string): { used: number; total: number } | null` normalize supported formats without guessing.

- [ ] **Step 1: Write parser tests** for storage location/capacity, inventory used/total, mastery value by exact `lifeSkills` label, character name/class/level, PA/PD, Portuguese decimal punctuation, `LT` versus `VT`, unknown mastery label, low-confidence/missing text, and two panes in one screenshot.
- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/screen-recognition.spec.ts"`

Expected: FAIL because the parser module does not exist.

- [ ] **Step 3: Implement pure pane and field parsing** in `screen-recognition.ts`. Use Portuguese window/field anchors and the existing `Crop` shape. Normalize only exact recognized field aliases; unknown skills and unsupported market weight remain unresolved candidates. Keep storage occupancy and other values that have no profile property as preview-only fields.
- [ ] **Step 4: Run focused parser tests and confirm they pass**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/screen-recognition.spec.ts"`

Expected: PASS for every parser and pane classification case; no test may infer a field from a missing label.

- [ ] **Step 5: Commit the parser and tests**

```bash
git add apps/web/src/app/features/scans/screen-recognition.ts apps/web/src/app/features/scans/screen-recognition.spec.ts
git commit -m "feat(ocr): parse BDO screen fields"
```

### Task 3: Add a cancellable Portuguese screen text reader

**Files:**

- Create: `apps/web/src/app/features/scans/screen-text-reader.ts`
- Create: `apps/web/src/app/features/scans/screen-text-reader.spec.ts`
- Reuse: `apps/web/src/app/features/scans/print-reader.ts` only for shared `Crop` types; do not change `NumberReader` configuration or existing numeric behavior.

**Interfaces:**

- `ScreenTextReader.read(image: Parameters<Worker['recognize']>[0], onProgress?: (progress: number) => void): Promise<OcrTextLine[]>` loads a Portuguese Tesseract worker lazily, recognizes sparse text with boxes, and returns normalized lines. This accepts both browser image sources and a local `Buffer` for validation.
- `ScreenTextReader.close(): Promise<void>` cancels pending work, terminates the worker, and allows a later call to create a new worker.
- The worker factory is injectable in tests and defaults to dynamic `tesseract.js` import with `createWorker('por', 1, ...)` and `PSM.SPARSE_TEXT`.

- [ ] **Step 1: Write worker lifecycle tests** with a mocked worker factory. Cover lazy initialization, returned text/bounds/confidence, progress notification, initialization error, cancellation, timeout, termination, and successful retry after close.
- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/screen-text-reader.spec.ts"`

Expected: FAIL because the reader does not exist.

- [ ] **Step 3: Implement `ScreenTextReader`** with a 90-second operation timeout consistent with `NumberReader`, bounded progress reporting, safe worker cleanup, and no image upload or persistence.
- [ ] **Step 4: Run lifecycle tests and confirm they pass**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/screen-text-reader.spec.ts"`

Expected: PASS; a failure or cancel returns control to the UI without producing fields that can be saved.

- [ ] **Step 5: Commit the reader and tests**

```bash
git add apps/web/src/app/features/scans/screen-text-reader.ts apps/web/src/app/features/scans/screen-text-reader.spec.ts
git commit -m "feat(ocr): read Portuguese screen text locally"
```

### Task 4: Build the profile screen review and explicit apply flow

**Files:**

- Create: `apps/web/src/app/features/scans/profile-field-application.ts`
- Create: `apps/web/src/app/features/scans/profile-field-application.spec.ts`
- Create: `apps/web/src/app/features/scans/profile-screen-import.ts`
- Create: `apps/web/src/app/features/scans/profile-screen-import.html`
- Create: `apps/web/src/app/features/scans/profile-screen-import.scss`
- Create: `apps/web/src/app/features/scans/profile-screen-import.spec.ts`
- Modify: `apps/web/src/app/features/scans/scans-page.html`
- Modify: `apps/web/src/app/app.routes.ts`

**Interfaces:**

- `applyProfileFieldCandidates(profile: CharacterProfile, candidates: readonly ScreenFieldCandidate[], selectedKeys: ReadonlySet<string>): CharacterProfile` returns a new profile with only selected, valid, supported values; it preserves every other property.
- `ProfileScreenImportComponent` owns one image at a time, automatic screen detection, target character selection, field corrections, and the final explicit apply action. It injects `WorkspaceStore` and `ScreenTextReader`.
- Add private route `/scans/profile` before `/scans` and a link from the existing scan page. The existing batch scanner remains unchanged.

- [ ] **Step 1: Write profile-application tests** for selected-only updates, unselected/ambiguous/missing/unsupported values, invalid schema values, known mastery keys, and `VT` never writing `weightLimit` or `carriedWeight`.
- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/profile-field-application.spec.ts"`

Expected: FAIL because the mapping function does not exist.

- [ ] **Step 3: Implement the pure profile mapper** in `profile-field-application.ts`, using `CharacterProfile` and the existing schema limits as the final guard.
- [ ] **Step 4: Run mapper tests and confirm they pass**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/profile-field-application.spec.ts"`

Expected: PASS; the returned profile changes only explicitly selected valid fields.

- [ ] **Step 5: Write component tests** for file-to-review progress, auto-detected and manually corrected screen type, manually adjusted pane bounds when automatic detection fails, character target selection, editable candidate values, no write before apply, preserving unobserved profile fields, no auto-create/merge, and OCR error/cancel fallback.
- [ ] **Step 6: Run component tests and confirm they fail**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/profile-screen-import.spec.ts"`

Expected: FAIL because the review component does not exist.

- [ ] **Step 7: Implement the standalone review component and route.** Present recognized fields with source text, current value, status, and a per-field selection control; display unmodeled fields as read-only. Require an explicitly selected existing character and an explicit apply action. Allow screen-type override and manual pane-bound adjustment when detection is uncertain. Keep image and intermediate OCR data in memory. Add a link from `/scans` and place the route before the base scan route.
- [ ] **Step 8: Run component tests and confirm they pass**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/profile-screen-import.spec.ts"`

Expected: PASS; no profile mutation occurs before apply and every accepted update preserves unselected fields.

- [ ] **Step 9: Commit the profile import flow**

```bash
git add apps/web/src/app/features/scans/profile-field-application.ts apps/web/src/app/features/scans/profile-field-application.spec.ts apps/web/src/app/features/scans/profile-screen-import.ts apps/web/src/app/features/scans/profile-screen-import.html apps/web/src/app/features/scans/profile-screen-import.scss apps/web/src/app/features/scans/profile-screen-import.spec.ts apps/web/src/app/features/scans/scans-page.html apps/web/src/app/app.routes.ts
git commit -m "feat(ocr): review and apply character screen fields"
```

### Task 5: Validate real captures and document operating limits

**Files:**

- Create: `scripts/validate-screen-ocr.mjs`
- Create: `scripts/validate-screen-ocr.test.mjs`
- Modify: `docs/ocr-validation.md`
- Modify: `docs/print-import-tutorial.md`
- Modify: `docs/screenshot-mvp.md`
- Modify: `docs/ACTIVE_CONTEXT.md`

**Interfaces:**

- `validateScreenOcr(manifestPath: string): Promise<ScreenOcrReport>` runs the same text reader and pure parser against local manifest captures and emits aggregate per-screen/per-field counts only: exact, unread, incorrect, ambiguous, and unsupported.
- `summarizeScreenOcrRows(rows: readonly ScreenOcrValidationRow[]): ScreenOcrReport` is a pure report builder used by the validator and its tests, so tests do not require local screenshots or a Tesseract worker.
- The local validation command is `node scripts/validate-screen-ocr.mjs data/ocr-corpus/manifest.json`; it does not write annotations or image data.

- [ ] **Step 1: Write validator tests** for `summarizeScreenOcrRows` covering aggregate counts, unsupported fields, unread fields, mismatches, and privacy-safe output with no raw text/path values.
- [ ] **Step 2: Run focused validator tests and confirm they fail**

Run: `node --test scripts/validate-screen-ocr.test.mjs`

Expected: FAIL because the screen validator does not exist.

- [ ] **Step 3: Implement the local validation runner** using the corpus manifest, `ScreenTextReader`, `detectScreenPanes`, and `parseScreenFields`; compare only manually verified labels and report absolute counts, not general accuracy percentages.
- [ ] **Step 4: Run the capture corpus evaluation**

Run: `node scripts/validate-screen-ocr.mjs data/ocr-corpus/manifest.json`

Expected: JSON report grouped by screen and field; any incorrect candidate or unread field remains visible and does not change local profile data.

- [ ] **Step 5: Document supported fields, review flow, privacy, and measured limitations** in the three OCR/import documents. Update `docs/ACTIVE_CONTEXT.md` with completed files, test/build/Playwright evidence, and future data needs. Keep the claim limited to the measured calibration sample.
- [ ] **Step 6: Run focused scan tests and the required repository checks**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/*.spec.ts"`  
Run: `pnpm check`  
Run: `pnpm test`

Expected: every command exits 0.

- [ ] **Step 7: Run the browser flow with Playwright** at `/scans/profile`. Exercise one mastery capture, one inventory-with-weight capture, one character capture, and one combined/ambiguous image. Verify desktop and 390px mobile widths, keyboard-only review, loading, OCR failure/cancel, and explicit apply; confirm the existing `/scans` item flow still imports a reviewed storage batch.

Expected: no hidden page overflow, all fields have visible labels/status/focus, ambiguous fields remain unselected, and only the chosen fields appear in the chosen profile.

- [ ] **Step 8: Commit validation and documentation**

```bash
git add scripts/validate-screen-ocr.mjs scripts/validate-screen-ocr.test.mjs docs/ocr-validation.md docs/print-import-tutorial.md docs/screenshot-mvp.md docs/ACTIVE_CONTEXT.md
git commit -m "test(ocr): validate local screen field recognition"
```
