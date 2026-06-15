# PDF Reporting

> **Removed.** This feature was removed in the 2026-06 restructure
> (`src/lib/destiny-matrix` -> `src/lib/destiny` / `calendar-engine`).
> This document is retained only as a historical pointer.

Last audited: 2026-06-15 (Asia/Hong_Kong)

## What this used to be

Premium AI reports were once rendered to PDF inside Next.js using `pdf-lib` +
`@pdf-lib/fontkit`. A generator (`src/lib/destiny-matrix/ai-report/pdfGenerator.ts`)
turned the AI report payload produced by `aiReportService` into an A4 document,
served from a route that set `Content-Type: application/pdf`. All of it has been
removed — there is no `pdfGenerator`, no `generatePdf`, no `aiReportService`, and
no `application/pdf` report route anywhere under `src/`.

## Where to look now

For how the current system is structured, see:

- `README.md`
- `OVERVIEW.md`
- `docs/DESTINY_ENGINE_ARCHITECTURE.md`
