# PDF Reporting

Last audited: 2026-05-06 (Asia/Hong_Kong)

## Overview

Premium reports are rendered to PDF directly inside Next.js using `pdf-lib` + `@pdf-lib/fontkit`. There is no separate Python rendering service.

## Code

- Generator: `src/lib/destiny-matrix/ai-report/pdfGenerator.ts`
  - `generateFivePagePDF(report, options?)`
  - `generatePremiumPDF(report, options?)`
- Route handler: `src/app/api/destiny-matrix/ai-report/route.ts` (sets `Content-Type: application/pdf`)
- Persistence: `src/app/api/destiny-matrix/ai-report/routeExecutionPersistence.ts` (lazy-imports the PDF generator on demand)

## Inputs

The generator accepts the AI report payload object (`AIPremiumReport | ThemedAIPremiumReport | TimingAIPremiumReport`) produced upstream by `aiReportService`.

## Fonts

Korean glyph support uses Noto CJK pulled from jsDelivr at runtime — see `FONT_URLS` in `pdfGenerator.ts`. Network access is required at first generation.

## Page Format

A4 portrait (595 x 842 pt). Page count is variable per report type — `generateFivePagePDF` enforces a 5-page contract; `generatePremiumPDF` is variable.

## Troubleshooting

- Font fetch failures: jsDelivr unreachable in the runtime environment. Mirror the fonts to local `public/fonts/` if needed.
- Korean glyphs render as empty boxes: confirm `fontkit` is registered (`pdfDoc.registerFontkit(fontkit)` at the top of `generatePremiumPDF`).
