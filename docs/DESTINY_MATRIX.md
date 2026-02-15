# Destiny Matrix

## What It Is

Destiny Matrix is a deterministic, structured profile/scoring engine implemented in `src/lib/destiny-matrix`.

Characteristics:

- 10-layer matrix model
- fixed interaction scoring levels
- computed highlights and synergies
- deterministic output for same input payload

API metadata in `src/app/api/destiny-matrix/route.ts` reports total matrix scope (`totalCells: 1206`).

## Main Routes

- Canonical page: `/destiny-map/matrix`
- Redirect safety: `/destiny-matrix` -> `/destiny-map/matrix` (`src/app/destiny-matrix/page.tsx`)
- Compute API: `POST /api/destiny-matrix`

## Integration Points

### Counselor output

`src/app/api/destiny-map/chat-stream/route.ts` fetches matrix data and injects a short `Matrix snapshot` section before the usual saju/astro/cross narrative.

Included fields:

- total score
- top layers
- highlights
- synergies

### 10-page PDF

`scripts/generate_life_report_pdf.py` fetches matrix summary from `/api/destiny-matrix` and stores it as `destiny_matrix_summary` in payload.  
`backend_ai/reporting/saju_astro_life_report.py` renders:

- Matrix snapshot text block
- Matrix layer bar chart image (`matrix_layers.png`)

## Analytics Events

Defined in `src/components/analytics/GoogleAnalytics.tsx`:

- `matrix_view`
- `matrix_generate`
- `matrix_pdf_download`

Current UI page tracks `matrix_view` and `matrix_generate` from `src/app/destiny-map/matrix/page.tsx`.

## Operational Notes

- Matrix API is part of the web app runtime; reporting scripts that call matrix endpoint require Next.js server availability.
- Keep route redirect in place to prevent dead links from legacy `/destiny-matrix` URLs.
