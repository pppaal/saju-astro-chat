// 부분 JSON 파서 — Claude 가 토큰 단위로 흘리는 `{ overall: "...", cards: [...] }`
// 형태의 부분 JSON 을 progressive 렌더링에 쓰기 위해 누적된 버퍼에서
// "overall" 값과 cards[].interpretation 값들을 등장 순서대로 뽑아낸다.
//
// 종료 따옴표가 아직 도착 안 했어도 누적된 부분 문자열까지는 그대로 반환한다.
// 메인 타로 페이지(useTarotInterpretation)와 InlineTarotModal 두 곳에서 같이 쓴다.

/**
 * 누적 버퍼에서 "overall" 의 부분 문자열을 뽑는다.
 * 종료 따옴표가 아직 안 왔어도 현재까지의 텍스트는 그대로 보여줄 수 있게.
 */
export function extractPartialOverall(buffer: string): string | null {
  const idx = buffer.indexOf('"overall"')
  if (idx < 0) return null
  const colonIdx = buffer.indexOf(':', idx)
  if (colonIdx < 0) return null
  const openQuote = buffer.indexOf('"', colonIdx + 1)
  if (openQuote < 0) return null
  let i = openQuote + 1
  let out = ''
  while (i < buffer.length) {
    const ch = buffer[i]
    if (ch === '\\') {
      const next = buffer[i + 1]
      if (next === 'n') out += '\n'
      else if (next === 't') out += '\t'
      else if (next === '"') out += '"'
      else if (next === '\\') out += '\\'
      else if (next === '/') out += '/'
      else if (next === undefined) break
      else out += next
      i += 2
      continue
    }
    if (ch === '"') return out
    out += ch
    i += 1
  }
  return out
}

/**
 * 부분 JSON 안의 cards[].interpretation 값들을 progressive 하게 뽑아낸다.
 * 카드별 streaming UX 용 — 청크마다 호출되어, 지금까지 도착한 카드 해석들을 배열로 반환.
 */
export function extractPartialCardTexts(buffer: string): string[] {
  const arrIdx = buffer.indexOf('"cards"')
  if (arrIdx < 0) return []
  const arrOpen = buffer.indexOf('[', arrIdx)
  if (arrOpen < 0) return []

  const results: string[] = []
  let scanFrom = arrOpen
  while (true) {
    const keyIdx = buffer.indexOf('"interpretation"', scanFrom)
    if (keyIdx < 0) break
    const colonIdx = buffer.indexOf(':', keyIdx)
    if (colonIdx < 0) break
    const openQuote = buffer.indexOf('"', colonIdx + 1)
    if (openQuote < 0) break

    let i = openQuote + 1
    let out = ''
    let closed = false
    while (i < buffer.length) {
      const ch = buffer[i]
      if (ch === '\\') {
        const next = buffer[i + 1]
        if (next === 'n') out += '\n'
        else if (next === 't') out += '\t'
        else if (next === '"') out += '"'
        else if (next === '\\') out += '\\'
        else if (next === '/') out += '/'
        else if (next === undefined) break
        else out += next
        i += 2
        continue
      }
      if (ch === '"') {
        closed = true
        i += 1
        break
      }
      out += ch
      i += 1
    }
    results.push(out)
    if (!closed) break
    scanFrom = i
  }
  return results
}
