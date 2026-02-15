# Runbook

## Scope

Operational runbook for Chroma-backed GraphRAG/cross pipelines, diagnostics, and report generation.

## Chroma Safety Rules

1. Do not reindex while app servers are actively writing/reading `backend_ai/data/chromadb`.
2. Before reindexing, stop:

- Next.js dev/prod server (`npm run dev` / `next start`)
- Python backend (`python main.py`)

3. Reindex both graph + cross collections together unless you are doing targeted recovery.

Why: collection schema/metadata assumptions are coupled between `saju_astro_graph_nodes_v1` and `saju_astro_cross_v1`.

## Standard Reindex

Default scripts reset collections first.

### PowerShell

```powershell
python scripts/reindex_saju_astro_graph_nodes.py
python scripts/reindex_saju_astro_cross.py
```

Append/upsert mode (no reset):

```powershell
python scripts/reindex_saju_astro_graph_nodes.py --no-reset
python scripts/reindex_saju_astro_cross.py --no-reset
```

### Bash

```bash
python scripts/reindex_saju_astro_graph_nodes.py
python scripts/reindex_saju_astro_cross.py
```

Append/upsert mode:

```bash
python scripts/reindex_saju_astro_graph_nodes.py --no-reset
python scripts/reindex_saju_astro_cross.py --no-reset
```

## Recovery: Chroma Errors (e.g. "Error finding id")

When collection internals are inconsistent, delete affected collections then reindex.

### PowerShell

```powershell
python -c "import chromadb; c=chromadb.PersistentClient(path='backend_ai/data/chromadb'); [c.delete_collection(n) for n in ['saju_astro_graph_nodes_v1','saju_astro_cross_v1'] if n in [x.name for x in c.list_collections()]]"
python scripts/reindex_saju_astro_graph_nodes.py
python scripts/reindex_saju_astro_cross.py
```

### Bash

```bash
python -c "import chromadb; c=chromadb.PersistentClient(path='backend_ai/data/chromadb'); [c.delete_collection(n) for n in ['saju_astro_graph_nodes_v1','saju_astro_cross_v1'] if n in [x.name for x in c.list_collections()]]"
python scripts/reindex_saju_astro_graph_nodes.py
python scripts/reindex_saju_astro_cross.py
```

## Canonical Diagnostic (`self_check.py`)

Command:

```bash
python scripts/self_check.py
```

Optional runtime evidence verification:

```bash
python scripts/self_check.py --runtime-evidence
```

### Interpreting Result

- `PASS`: release-safe baseline for RAG/cross health.
- `WARN`: system runs but quality thresholds are degraded (e.g., `evidence_rate < 100%`).
- `FAIL`: hard issue (missing collection/data path/query failures).

### Typical Next Actions

- Missing/empty mandatory collections: reindex graph + cross.
- Leak check issues: ensure `USE_CHROMADB=1`, `EXCLUDE_NON_SAJU_ASTRO=1`, `RAG_TRACE=1`.
- Quality warnings: refresh cross metadata via cross reindex and verify refs.

## PDF Generation Troubleshooting

Main command:

```bash
python scripts/generate_life_report_pdf.py --out out/life_report.pdf
```

### Common Issues

1. Matrix snapshot empty:

- Cause: Next.js server not running for `/api/destiny-matrix` call.
- Fix: start `npm run dev` before PDF generation.

2. Import/runtime errors for plotting/PDF libs:

- Cause: missing `reportlab`, `matplotlib`, or `pypdf`.
- Fix: install in backend venv.

3. Wrong page count or missing images:

- Script fails if PDF is not 10 pages or image count is too low.
- Check output directory for:
  - `report_payload.json`
  - `life_report_assets/*.png`
  - final PDF file

4. Font warnings:

- Current renderer uses ReportLab Helvetica defaults.
- Non-fatal warnings can appear depending on host font setup.

## Post-Reindex Validation Sequence

```bash
python scripts/self_check.py
npm run typecheck
npm run build
npm run test:e2e:smoke:public
```

Target state: `self_check` overall `PASS` + build/smoke green.
