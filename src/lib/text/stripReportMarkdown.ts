// Shared by both counselors (destiny MessageRow + compatibility page) so
// their answer formatting never drifts apart. The counselor is a
// conversation, not a report. The LLM occasionally slips and uses markdown
// — `## headings`, tables, numbered "1️⃣" labels — which the rich
// `MarkdownMessage` renderer then surfaces as colored, bordered sections
// that flip the reading from "chat" to "report" mid-message. Strip those
// structural cues so the message reads as a single flow regardless of the
// LLM's formatting choices. Keeps the *content*; removes only the
// syntactic envelope. Bold/italic are intentionally preserved.

// Unicode emoji used as pseudo-headings. The LLM bypassed the markdown
// ban by using "🎯 구조적 정체성", "💫 현재 상태" etc. so we have to catch
// the *shape* (line that opens with one+ emoji codepoints + a Korean/
// English heading-like phrase) regardless of which emoji it picks.
const EMOJI_PATTERN = '[\\u2600-\\u27BF\\u{1F300}-\\u{1F9FF}\\u{1FA70}-\\u{1FAFF}]'

export function stripReportMarkdown(input: string): string {
  let text = input

  // Headings — keep heading text, drop the `#` prefix.
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')

  // Markdown table separator row (`|---|---|`). Match an *entire line*
  // and replace with empty. Important: use `[ \t]` not `\s` so the
  // pattern never devours adjacent newlines (which would otherwise glue
  // the rows on either side together).
  text = text.replace(
    /^[ \t]*\|?[ \t]*:?-{2,}:?(?:[ \t]*\|[ \t]*:?-{2,}:?)+[ \t]*\|?[ \t]*$\n?/gm,
    ''
  )

  // Pipe-delimited row → "cell · cell" prose. Again `[ \t]` only.
  text = text.replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (_m, row: string) => {
    const cells = row
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)
    return cells.join(' · ')
  })

  // Emoji-as-heading at line start ("🎯 구조적 정체성", "💫 현재 상태",
  // "🔮 필요한 것"). Drop the entire line — these are pure structure
  // markers, the actual claim is on subsequent lines.
  text = text.replace(new RegExp(`^[ \\t]*${EMOJI_PATTERN}[ \\t]+[^\\n]{1,60}$\\n?`, 'gmu'), '')

  // Korean bracket label "【제목】" — keep the inner text but drop the
  // visual frame. Standalone-line brackets are removed entirely.
  text = text.replace(/^[ \t]*【([^】\n]+)】[ \t]*$\n?/gm, '')
  text = text.replace(/【([^】\n]+)】/g, '$1')

  // Square bracket pseudo-labels "[양면성]" "[duality]". Standalone
  // bracket lines are pure structural markers — drop entirely.
  // Inline `[X]` is harmless to leave alone (could be content), but
  // standalone short `[label]` lines are exactly the analyst-symbol
  // pattern the user flagged.
  text = text.replace(/^[ \t]*\[([^\[\]\n]{1,30})\][ \t]*$\n?/gm, '')

  // Markdown horizontal rule (`---` `***` `___` on their own line).
  // The LLM uses these to slice the answer into sections — rendered
  // as a visible `<hr>` divider, which is exactly the segmented look
  // we are trying to kill.
  text = text.replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$\n?/gm, '')

  // Standalone label lines: short, no sentence terminator, followed
  // by a blank line and a longer paragraph. These are pseudo-headings
  // like "현재 당신의 상태: 표면화되는 시기" or "당신의 양면성" — the
  // LLM uses them as section dividers without any markdown syntax.
  // We only drop *label-shaped* short lines: ≤30 chars, no
  // sentence-end, no content punctuation (parens, +, /, ·, =, comma).
  // Without those guards we accidentally drop content lines like
  // "사주 정인격 + 점성 MC/10궁 강조" or "1. 자아: 정격(정인격)".
  text = text.replace(
    /^([ \t]*)([^\n]{2,30})[ \t]*\n([ \t]*\n)/gm,
    (m, _indent: string, line: string, blank: string) => {
      const trimmed = line.trim()
      if (!trimmed) return m
      // Sentence-final punctuation / 종결 어미 → real sentence.
      if (/[.?!~…」』》)]$/.test(trimmed)) return m
      if (/(다|요|까|죠|네|음|함|임)$/.test(trimmed)) return m
      if (/\?\s*$/.test(trimmed)) return m
      // Content-line markers: parens, +, /, ·, =, slash → keep.
      // These almost never appear in a true label phrase.
      if (/[()+\/·=,*]/.test(trimmed)) return m
      // Drop the label line, keep the blank that follows.
      return blank
    }
  )

  // Bold / italic — keep as-is. MarkdownMessage downstream renders
  // `**text**` and `*text*` as <strong>/<em>, which is what the user
  // expects (key terms like "남편복", "양면성" should pop). Stripping
  // these here also caused a flicker during streaming: half-streamed
  // `**hello` showed raw asterisks until the closing `**` arrived,
  // after which the markers vanished into plain text.

  // Bullet / numbered list markers at line start + decorative arrow
  // bullets the LLM substitutes when standard bullets are banned.
  text = text.replace(/^[ \t]*[-*+][ \t]+/gm, '')
  text = text.replace(/^[ \t]*\d+\.[ \t]+/gm, '')
  text = text.replace(/^[ \t]*[→▶●■▷▸▪◆※][ \t]+/gm, '')
  // ASCII arrow "->" used as a pseudo-bullet at line start.
  text = text.replace(/^[ \t]*->[ \t]+/gm, '')

  // Inline backticks rarely matter for chat; drop the ticks.
  text = text.replace(/`([^`\n]+)`/g, '$1')

  // Trailing horizontal whitespace per line. Streamed tokens routinely
  // leave a stray space (or two) before a newline — and a double-trailing
  // space is markdown's *hard line break* (`<br>`), which the LLM never
  // means here. Trim it so lines align and don't sprout phantom breaks.
  // Leading whitespace is left alone (it can be meaningful, and the locked
  // tests assert specific outputs that already have none).
  text = text.replace(/[ \t]+$/gm, '')

  // Collapse the 3+ blank lines introduced by stripped blocks.
  text = text.replace(/\n{3,}/g, '\n\n')

  // Drop consecutive duplicate paragraphs and lines. The LLM occasionally
  // restates a sentence or whole paragraph verbatim back-to-back (a
  // streaming/continuation artifact). Only *adjacent* identical blocks are
  // removed — non-consecutive repetition (e.g. a reassurance that opens and
  // closes the message) is intentional and preserved. Comparison is on a
  // whitespace-normalized key so "균형이에요" and "균형이에요  " count as one.
  text = dropConsecutiveDuplicates(text)

  return text.trim()
}

// Remove blocks/lines that are byte-for-byte repeats of the one immediately
// before them (after collapsing internal whitespace for the comparison).
// Operates at paragraph granularity first, then line granularity within each
// surviving paragraph — never within a line, so intra-sentence repetition
// ("진짜 진짜 좋아요") is untouched. Blank separators never seed a match.
function dropConsecutiveDuplicates(text: string): string {
  const normalize = (s: string): string => s.trim().replace(/\s+/g, ' ')
  const dedupe = (parts: string[]): string[] => {
    const out: string[] = []
    let prevKey: string | null = null
    for (const part of parts) {
      const key = normalize(part)
      if (key && key === prevKey) continue
      out.push(part)
      if (key) prevKey = key
    }
    return out
  }
  const blocks = dedupe(text.split('\n\n'))
  return blocks.map((block) => dedupe(block.split('\n')).join('\n')).join('\n\n')
}
