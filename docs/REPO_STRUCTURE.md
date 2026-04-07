# Repo Structure

Last updated: 2026-04-01 (Asia/Hong_Kong)

## Intent

Keep the repository readable by separating long-lived source from disposable execution output.

## Top-Level Boundaries

- `src/`: product code
- `tests/`, `e2e/`: automated verification
- `scripts/`: generation, audit, and maintenance entrypoints
- `docs/`: durable human documentation
- `reports/`: curated report outputs worth keeping
- `tests/fixtures/`, `scripts/ops/fixtures/`: checked-in non-product inputs for evaluation and ops examples
- `artifacts/`, `qa-dumps/`, `tmp/`: disposable generated output, ignored by default
- `backend_ai/data/chromadb/`: local runtime data store, ignored by default

## Root Policy

Root should contain only:

- project entry docs such as `README.md`, `BUILD_INSTRUCTIONS.md`, `OVERVIEW.md`, `ROADMAP.md`
- platform and toolchain config
- deployment manifests

Historical writeups and refactor reports should live under `docs/archive/`, not in root.
Top-level `data/` should not be used for mixed test inputs and generated output.

## Reports vs Artifacts

- Use `reports/` for intentional, curated outputs that may be useful to read later
- Use `artifacts/` for raw execution byproducts such as screenshots, audit exports, and coverage files
- Use `qa-dumps/` for raw inventories and temporary audit dumps
- Use `tmp/` for scratch work and local tool output such as Playwright reports, test results, coverage, and lint HTML

## Git Policy

- Generated runtime data should be ignored
- CI and local test byproducts should be ignored unless there is a strong reason to preserve them
- If a generated output becomes important, promote a summarized version into `docs/`
