# PDF Reporting

## Overview

The production-style life report pipeline generates a fixed 10-page PDF with image assets.

Core files:

- Orchestrator: `scripts/generate_life_report_pdf.py`
- Renderer: `backend_ai/reporting/saju_astro_life_report.py`

## Inputs And Outputs

### Inputs

- Saju payload (`--saju-file` or `--saju-json`)
- Astrology payload (`--astro-file` or `--astro-json`)
- User metadata (`--name`, `--locale`)

Defaults are used when explicit payloads are not provided.

### Outputs

For `--out out/life_report.pdf`:

- PDF: `out/life_report.pdf`
- Payload: `out/report_payload.json`
- Image assets: `out/life_report_assets/*.png`

Script validation rules:

- PDF page count must be `10`
- image count must be `>=3`

## Command Examples

### Basic

```bash
python scripts/generate_life_report_pdf.py --out out/life_report.pdf
```

### Custom JSON files

```bash
python scripts/generate_life_report_pdf.py \
  --saju-file data/sample_saju.json \
  --astro-file data/sample_astro.json \
  --name "Demo User" \
  --locale en \
  --out out/life_report_demo.pdf
```

## Page Structure (fixed)

1. Cover
2. Executive summary + theme chart
3. Identity/temperament + Matrix snapshot + matrix layer chart
4. Love/relationships
5. Career/work + cross cards image
6. Money/resources
7. Stress/health (explicit non-medical notice)
8. Growth tasks
9. 12-month timeline + timeline chart
10. Action checklist

## Data Dependencies

- GraphRAG evidence: `saju_astro_graph_nodes_v1`
- Cross summaries: `saju_astro_cross_v1` via `build_cross_summary`
- Matrix snapshot: fetched from `/api/destiny-matrix`

Because of matrix fetch, run Next.js server while generating the report.

## Safe Customization Guidelines

You can safely adjust:

- wording/tone in payload sections
- locale-specific text blocks
- chart labels and visual style

Avoid breaking:

- 10-page fixed layout contract
- matrix snapshot section existence
- non-medical disclaimer on stress/health page
- script output contracts (`report_payload.json`, assets folder, PDF path)

## Troubleshooting

- Missing matrix data: start Next.js (`npm run dev`) before generation.
- Missing PDF libs: install `reportlab`, `matplotlib`, `pypdf` in backend venv.
- Unexpected page count: inspect content overflow and rendering errors in script output.
