/**
 * @file PDF text extraction utility
 */

import { logger } from '@/lib/logger'
import type { PDFTextItem } from './chat-types'

/**
 * Extract text content from a PDF file
 * @throws Error with message "SCANNED_PDF" if the PDF is scanned/image-based
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  // Self-host the worker (served from public/ by scripts/copy-pdf-worker.mjs at
  // build time). Loading it from an external CDN failed in production — the
  // deploy network policy / CORS blocked the cross-origin worker, so every parse
  // failed. Same-origin avoids that, and the build copy keeps the worker version
  // in lockstep with the installed pdfjs-dist API version.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  logger.info('[PDF] Loaded:', { fileName: file.name, pages: pdf.numPages })

  // Only the first ~6000 chars are kept downstream (CHAT_LIMITS.MAX_CV_CHARS),
  // so cap pages + total chars and release each page. Parsing every page of a
  // large PDF into one growing string is what triggered "low memory" on mobile.
  const MAX_PAGES = 40
  const MAX_CHARS = 12000
  const pageLimit = Math.min(pdf.numPages, MAX_PAGES)

  let fullText = ''
  let totalItems = 0
  try {
    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      totalItems += content.items.length
      const pageText = content.items
        .map((item) => (item as PDFTextItem).str)
        .filter((str: string) => str.trim().length > 0)
        .join(' ')
      fullText += pageText + '\n'
      // Release page resources as we go to keep the memory footprint flat.
      page.cleanup()
      logger.debug(`[PDF] Page ${i}: ${content.items.length} items, ${pageText.length} chars`)
      if (fullText.length >= MAX_CHARS) {
        break
      }
    }
  } finally {
    // Free the document (worker transport + caches) regardless of outcome.
    void pdf.destroy()
  }

  logger.info('[PDF] Total items:', { totalItems, totalChars: fullText.length })

  if (fullText.trim().length === 0 && totalItems === 0) {
    throw new Error('SCANNED_PDF')
  }

  return fullText.trim()
}
