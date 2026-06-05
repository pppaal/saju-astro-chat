/**
 * Split a block of interpretation prose into readable paragraphs.
 *
 * Shared by the main tarot reading (OverallMessageChat) and the destiny
 * counselor's inline tarot modal so both render the same paragraph format
 * instead of one wall-of-text block. Pure: same input → same output.
 *
 * - Honors existing paragraph breaks when present — blank-line (\n\n) first,
 *   then single-newline (\n). LLM tarot output frequently separates paragraphs
 *   with a single \n (not a blank line); honoring only \n\n collapsed those into
 *   one block and re-paired sentences arbitrarily, destroying the author's
 *   paragraph structure (and causing streaming reflow as boundaries shifted).
 * - Otherwise groups sentences in pairs (only when there are 4+ sentences),
 *   so short answers stay as a single paragraph.
 */
export function splitReadableText(rawText: string): string[] {
  const text = rawText.replace(/\r\n/g, '\n').trim()
  if (!text) {
    return []
  }

  // 1) 빈 줄(\n\n) 단락 우선.
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (blocks.length > 1) {
    return blocks
  }

  // 2) 빈 줄은 없지만 단일 \n 으로 단락을 나눈 경우 — 그 줄 구조를 그대로 존중.
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length > 1) {
    return lines
  }

  const sentences =
    text
      .match(/[^.!?。！？\n]+[.!?。！？]?/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) || []

  if (sentences.length < 4) {
    return [text]
  }

  const grouped: string[] = []
  for (let idx = 0; idx < sentences.length; idx += 2) {
    grouped.push(
      sentences
        .slice(idx, idx + 2)
        .join(' ')
        .trim()
    )
  }

  return grouped.length > 1 ? grouped : [text]
}
