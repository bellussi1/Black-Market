# BDO OCR Dataset Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure slot-grid detection, numeric quantity parsing, and Roman enhancement reading against the synthetic ground truth using the existing local OCR stack.

**Architecture:** A Node ESM CLI validates the generated manifest, decodes each image with existing Sharp, loads the frontend TypeScript readers using the existing validation-script transpilation pattern, and uses one local Tesseract worker. Pure metric functions are independently testable; reports contain aggregate metrics and corpus composition but no raw OCR text or source paths.

**Tech Stack:** Node.js 24, ESM, Sharp and Tesseract.js already installed in workspace packages, TypeScript transpile API, `node:test`.

**Spec:** [2026-10-10-bdo-ocr-dataset-pipeline.md](../specs/2026-10-10-bdo-ocr-dataset-pipeline.md)

## Global Constraints

- Read synthetic `ground-truth.json` only; real manifests contribute volume/permission counts but no OCR labels unless later manually annotated.
- Default evaluation accepts only `split: "evaluation"`; calibration requires explicit opt-in.
- Reuse `detectGridAreas`, `parseVisibleQuantity`, and `parseEnhancement` from `apps/web/src/app/features/scans/` and the existing `tesseract.js` dependency.
- Apply grid match threshold IoU ≥ 0.5; report counts, precision, recall, and F1, with unread labels as errors.
- Reports remain local in `tmp/ocr-dataset/`; tests inject/mock OCR and make no service/network calls.

## Review Focus

- Invalid manifest paths/hash/dimensions must fail before OCR; test path traversal, hash mismatch, and metadata mismatch.
- Grid false positives and missed slots must affect denominators correctly; test empty slots, duplicate candidates, and IoU edge values.
- Unread numeric/Roman labels count as errors rather than disappearing; test unread, malformed, and out-of-range values.
- Abbreviated quantities preserve `approximate` while comparing the parsed value; test `139.1k`, `319.9k`, and `1.3M`.
- Evaluation and calibration seeds remain separated; test default rejection of calibration and explicit calibration override.

---

### Task 1: Add validated metric aggregation

**Files:**

- Create: `scripts/benchmark-ocr.mjs`
- Create: `scripts/benchmark-ocr.test.mjs`

**Interfaces:**

- `matchGridSlots(expectedSlots, detectedSlots, threshold = 0.5)` returns `{ truePositive, falsePositive, falseNegative, matches }`, using one-to-one maximum-IoU matches.
- `summarizeOcrRows(rows)` returns per-split/resolution/scale/grid/label-kind counts and exact rates for grid detection, quantities, and Roman tiers; unknown/unread is an error.
- `validateSyntheticManifest(manifestPath, { split = 'evaluation' })` checks schema version, requested split, relative image path containment, SHA-256, decoded format and dimensions before scanning.
- `buildBenchmarkReport({ manifest, rows, realManifest? })` returns an aggregate JSON-safe report with parser versions and optional 80/20 composition counts based on unique image hashes; no raw OCR strings or filesystem paths.

- [ ] **Step 1: Write failing tests** named `matchesSlotsOnlyAtOrAboveHalfIou`, `assignsEachDetectedSlotAtMostOnce`, `countsEmptySlotsAndGridFalsePositives`, `countsUnreadQuantityAndRomanAsErrors`, `countsSpuriousLabelsOnEmptySlots`, `parsesAbbreviatedValuesWithApproximation`, `separatesCalibrationFromEvaluation`, and `reportsAvailableRealSyntheticCompositionByUniqueHash`.
- [ ] **Step 2: Run tests and verify they fail**

Run: `node --test scripts/benchmark-ocr.test.mjs`  
Expected: FAIL because benchmark exports do not exist.

- [ ] **Step 3: Implement pure metric functions and manifest validation** in `scripts/benchmark-ocr.mjs`; validate every resolved image remains beneath the manifest directory.
- [ ] **Step 4: Run focused tests and verify they pass**

Run: `node --test scripts/benchmark-ocr.test.mjs`  
Expected: all metric and manifest tests pass without Tesseract.

### Task 2: Connect existing grid detector, parsers, and Tesseract

**Interfaces:**

- `loadOcrReaders()` transpiles and imports `storage-grid.ts`, `visible-quantity.ts`, and `equipment-reading.ts` using the pattern in `scripts/validate-screen-ocr.mjs`; it returns `{ detectGridAreas, parseVisibleQuantity, parseEnhancement }`.
- `recognizeSample({ imagePath, sample, readers, worker })` returns metric rows for every expected slot and detected slot, assigning OCR text only by overlap with the manifest's `labelBounds` region; recognized quantity/Roman text in an unlabeled empty slot is a false positive.
- `runBenchmark({ manifestPath, outputPath, split = 'evaluation', realManifestPath?, workerFactory })` returns the report and writes it atomically to the requested ignored output path.

- [ ] **Step 1: Add failing integration tests** named `decodesRgbForCurrentGridDetector`, `mapsOcrBoxesBackToOriginalCoordinates`, `assignsQuantityTextToTheCorrectSlot`, `assignsRomanTextToTheCorrectSlot`, `countsMissingLabelAsUnread`, and `rejectsCalibrationManifestByDefault`, using a tiny image and mocked worker results.
- [ ] **Step 2: Run integration tests and verify they fail**

Run: `node --test scripts/benchmark-ocr.test.mjs`  
Expected: scanner integration assertions fail before reader loading exists.

- [ ] **Step 3: Implement transpiled frontend reader loading and local Tesseract recognition**; make one sparse-text OCR pass per image and map returned boxes to manifest label regions, then use existing parsers for exact numeric/Roman comparison.
- [ ] **Step 4: Run the complete benchmark unit/integration suite**

Run: `node --test scripts/benchmark-ocr.test.mjs`  
Expected: every mocked integration case passes, no network calls occur, and all scanner modules come from current source files.

### Task 3: Add CLI, corpus composition, docs, and repository verification

**Files:**

- Modify: `scripts/benchmark-ocr.mjs`
- Modify: `package.json`
- Modify: `docs/ocr-validation.md`
- Modify: `docs/ACTIVE_CONTEXT.md`

- [ ] **Step 1: Add CLI tests** named `parsesBenchmarkManifestAndOutputOptions`, `acceptsCalibrationOnlyWhenExplicit`, `rejectsOutputOutsideIgnoredDatasetRoot`, and `showsHelpWithoutLoadingOcr`; ensure absent OCR labels count as unread.
- [ ] **Step 2: Implement CLI argument parsing and optional real manifest counts**; real images remain excluded from OCR metrics until manually verified labels exist. Update root `test` to append `node --test scripts/generate-synthetic-ocr-dataset.test.mjs scripts/scrape-bdo-screenshots.test.mjs scripts/benchmark-ocr.test.mjs`; add `lint:ocr` as `eslint "scripts/generate-synthetic-ocr-dataset.mjs" "scripts/scrape-bdo-screenshots.mjs" "scripts/benchmark-ocr.mjs" --max-warnings=0`; make root `lint` invoke `pnpm lint:ocr` after existing workspace lint.
- [ ] **Step 3: Document commands, schema, metrics, split behavior, and the 80/20 target versus actual authorized sample counts** in `docs/ocr-validation.md`.
- [ ] **Step 4: Run a small generated evaluation corpus end to end** using the existing published icon catalog; do not request Reddit images or use credentials. Store the aggregate JSON only under `tmp/ocr-dataset/`.

Run: `node scripts/generate-synthetic-ocr-dataset.mjs --count 18 --seed 4102027 --split evaluation --catalog <published-catalog> --output tmp/ocr-dataset/synthetic-evaluation`  
Run: `node scripts/benchmark-ocr.mjs --manifest tmp/ocr-dataset/synthetic-evaluation/ground-truth.json --output tmp/ocr-dataset/benchmark.json`  
Expected: valid report with grid, numeric, Roman and composition metric objects; all image truth remains local.

- [ ] **Step 5: Run requested repository checks, including the newly wired Node tests and lint**

Run: `pnpm test`  
Run: `pnpm check`  
Expected: both exit 0.

- [ ] **Step 6: Update `docs/ACTIVE_CONTEXT.md`** with the three deliverables, test/check evidence, local OAuth setup prerequisite, uncollected real-data status, and the exact next step for an authorized operator.
- [ ] **Step 7: Commit the benchmark and integrated docs**

```bash
git add scripts/benchmark-ocr.mjs scripts/benchmark-ocr.test.mjs docs/ocr-validation.md docs/ACTIVE_CONTEXT.md
git commit -m "feat(ocr): benchmark synthetic BDO screenshots"
```
