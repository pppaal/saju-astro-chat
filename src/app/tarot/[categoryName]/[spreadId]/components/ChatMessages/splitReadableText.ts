export function splitReadableText(rawText: string): string[] {
  const text = rawText.replace(/\r\n/g, '\n').trim()
  if (!text) {
    return []
  }

  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (blocks.length > 1) {
    return blocks
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
