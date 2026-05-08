/**
 * @file PDF text extraction utility
 */

import { logger } from "@/lib/logger";
import type { PDFTextItem } from "./chat-types";

/**
 * Extract text content from a PDF file
 * @throws Error with message "SCANNED_PDF" if the PDF is scanned/image-based
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  logger.info("[PDF] Loaded:", { fileName: file.name, pages: pdf.numPages });

  let fullText = "";
  let totalItems = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    totalItems += content.items.length;
    const pageText = content.items
      .map((item) => (item as PDFTextItem).str)
      .filter((str: string) => str.trim().length > 0)
      .join(" ");
    fullText += pageText + "\n";
    logger.debug(`[PDF] Page ${i}: ${content.items.length} items, ${pageText.length} chars`);
  }

  logger.info("[PDF] Total items:", { totalItems, totalChars: fullText.length });

  if (fullText.trim().length === 0 && totalItems === 0) {
    throw new Error("SCANNED_PDF");
  }

  return fullText.trim();
}
