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
  // Worker version MUST match the installed pdfjs-dist API version, otherwise
  // pdf.js throws "API version X does not match Worker version Y" and every
  // parse fails. Pin the URL to the runtime version (jsdelivr mirrors npm
  // exactly, so the resolved version always exists) instead of a hardcoded one.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  logger.info('[PDF] Loaded:', { fileName: file.name, pages: pdf.numPages })

  let fullText = ''
  let totalItems = 0
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    totalItems += content.items.length
    const pageText = content.items
      .map((item) => (item as PDFTextItem).str)
      .filter((str: string) => str.trim().length > 0)
      .join(' ')
    fullText += pageText + '\n'
    logger.debug(`[PDF] Page ${i}: ${content.items.length} items, ${pageText.length} chars`)
  }

  logger.info('[PDF] Total items:', { totalItems, totalChars: fullText.length })

  if (fullText.trim().length === 0 && totalItems === 0) {
    throw new Error('SCANNED_PDF')
  }

  return fullText.trim()
}
