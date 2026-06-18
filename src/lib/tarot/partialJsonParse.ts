// 부분 JSON 파서 — Claude 가 토큰 단위로 흘리는 `{ overall: "...", cards: [...] }`
// 형태의 부분 JSON 을 progressive 렌더링에 쓰기 위해 누적된 버퍼에서
// "overall" 값과 cards[].interpretation 값들을 등장 순서대로 뽑아낸다.
//
// 종료 따옴표가 아직 도착 안 했어도 누적된 부분 문자열까지는 그대로 반환한다.
// 메인 타로 페이지(useTarotInterpretation)와 InlineTarotModal 두 곳에서 같이 쓴다.

/**
 * JSON string literal 한 개를 안전하게 추출.
 * - `\"` `\\` `\n` `\t` `\r` `\/` 표준 escape 처리
 * - `\uXXXX` unicode escape 디코딩 (이전엔 `u00e9` 같은 raw 문자로 새어나가던 버그)
 * - 종료 따옴표가 안 왔어도 (스트리밍 중간) 부분 문자열까지 반환, `closed: false` 표시
 *
 * @param startQuoteIdx — value 시작 따옴표(`"`) 의 인덱스
 */
function extractStringFrom(
  buffer: string,
  startQuoteIdx: number
): { value: string; endIdx: number; closed: boolean } {
  let i = startQuoteIdx + 1
  let out = ''
  while (i < buffer.length) {
    const ch = buffer[i]
    if (ch === '\\') {
      const next = buffer[i + 1]
      if (next === undefined) return { value: out, endIdx: i, closed: false }
      if (next === 'n') {
        out += '\n'
        i += 2
        continue
      }
      if (next === 't') {
        out += '\t'
        i += 2
        continue
      }
      if (next === 'r') {
        out += '\r'
        i += 2
        continue
      }
      if (next === '"') {
        out += '"'
        i += 2
        continue
      }
      if (next === '\\') {
        out += '\\'
        i += 2
        continue
      }
      if (next === '/') {
        out += '/'
        i += 2
        continue
      }
      if (next === 'u') {
        // \uXXXX — need 4 hex digits. 스트리밍 중 4자 미만이면 미완 처리.
        const hex = buffer.slice(i + 2, i + 6)
        if (hex.length < 4) return { value: out, endIdx: i, closed: false }
        const code = parseInt(hex, 16)
        if (Number.isFinite(code)) out += String.fromCharCode(code)
        i += 6
        continue
      }
      // unknown escape — preserve literally
      out += next
      i += 2
      continue
    }
    if (ch === '"') {
      return { value: out, endIdx: i + 1, closed: true }
    }
    out += ch
    i += 1
  }
  return { value: out, endIdx: i, closed: false }
}

/**
 * `"key"` 가 *객체 키 위치* 에서 등장하는 지점을 찾아, 그 값의 여는 따옴표
 * 인덱스를 돌려준다. 키 위치 = 여는 따옴표 앞(공백 제외)이 `{` 또는 `,` (또는
 * 버퍼 맨 앞). 단순 indexOf 는 이전에 흘러온 *문자열 값* 안에 우연히 같은
 * 토큰(예: 값 텍스트에 따옴표로 감싼 "overall")이 있으면 거기에 latch 되어
 * 전체 스트림 동안 엉뚱한 문자열을 뽑던 버그가 있었다. 키 위치로 anchor 해서
 * 방지. 값 문자열 안의 토큰은 앞 문자가 보통 일반 문자라 통과 못 한다.
 */
function findValueOpenQuote(buffer: string, key: string): number | null {
  const token = `"${key}"`
  let from = 0
  while (true) {
    const idx = buffer.indexOf(token, from)
    if (idx < 0) return null
    let p = idx - 1
    while (p >= 0 && /\s/.test(buffer[p])) p -= 1
    const prev = p >= 0 ? buffer[p] : ''
    if (prev === '{' || prev === ',' || prev === '') {
      const colonIdx = buffer.indexOf(':', idx + token.length)
      if (colonIdx < 0) return null
      const openQuote = buffer.indexOf('"', colonIdx + 1)
      if (openQuote < 0) return null
      return openQuote
    }
    from = idx + token.length
  }
}

/**
 * 누적 버퍼에서 "overall" 의 부분 문자열을 뽑는다.
 * 종료 따옴표가 아직 안 왔어도 현재까지의 텍스트는 그대로 보여줄 수 있게.
 */
export function extractPartialOverall(buffer: string): string | null {
  const openQuote = findValueOpenQuote(buffer, 'overall')
  if (openQuote === null) return null
  return extractStringFrom(buffer, openQuote).value
}

/**
 * 누적 버퍼에서 "hook" (공유 카드용 한 줄 후크)을 뽑는다. overall 과 동일하게
 * 키 위치 anchor 로 false-match 를 막고, 종료 따옴표 전이면 부분 문자열 반환.
 * 보통 schema 의 마지막 키라 완성 직전에 도착한다.
 */
export function extractPartialHook(buffer: string): string | null {
  const openQuote = findValueOpenQuote(buffer, 'hook')
  if (openQuote === null) return null
  return extractStringFrom(buffer, openQuote).value
}

/**
 * 부분 JSON 안의 cards[].interpretation 값들을 progressive 하게 뽑아낸다.
 * 카드별 streaming UX 용 — 청크마다 호출되어, 지금까지 도착한 카드 해석들을 배열로 반환.
 *
 * 다음 카드 키 탐색은 *값 종료 위치 이후* 부터 시작해서, 이전 값 안에 우연히
 * 들어간 `"interpretation"` 토큰을 false-match 하지 않게 한다.
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

    const { value, endIdx, closed } = extractStringFrom(buffer, openQuote)
    results.push(value)
    if (!closed) break
    scanFrom = endIdx
  }
  return results
}
