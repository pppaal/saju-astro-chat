/**
 * Make the saju self-block (from formatSajuSelf) fully legible for the
 * realtime destiny counselor — gloss every opaque 명리 code with its
 * conventional meaning so the LLM can use ALL of it. Nothing is cut.
 * Compat counselor keeps the raw formatSajuSelf output untouched.
 *
 * - GLOSS: 신살, 12신살, 12운성, 십성(4기둥), 격국, 지장간(숨은 십성).
 * - COMPLETE (fact): 천간합 → 化 element (辛丙合 → 辛丙合화수).
 * - RAW (Claude reads fine): 일간/오행, 4기둥 간지, 대운, 세운/월운/일진,
 *   합/충/삼합, 통근.
 */

const SINSAL: Record<string, string> = {
  천을귀인: '귀인·도움복', 천덕귀인: '덕·보호', 월덕귀인: '덕·보호', 문창귀인: '학문·재능',
  화개: '예술·종교·고독', 도화: '매력·인기·이성', 역마: '이동·변동',
  양인: '강한 추진·과격', 백호: '혈광·사고', 괴강: '강단·극단', 원진: '미움·엇갈림', 홍염: '매력·끼',
}
const SIBI_SINSAL: Record<string, string> = {
  겁살: '빼앗김·돌발', 재살: '송사·구속', 천살: '윗사람·천재지변', 지살: '이동·터전',
  연살: '매력·이성', 도화: '매력·이성', 월살: '위축·메마름', 망신: '구설·노출',
  장성: '권력·리더십', 반안: '출세·승진·안정', 역마: '이동·해외·분주', 육해: '질병·방해', 화개: '예술·종교·고독',
}
const SIBI_UNSEONG: Record<string, string> = {
  장생: '시작·성장 기운', 목욕: '미숙·시행착오', 관대: '자리잡는 독립기', 건록: '왕성·자립',
  제왕: '기운 절정', 쇠: '절정 지나 안정기', 병: '약해짐·예민', 사: '기운 다함·정적',
  묘: '갈무리·내향', 절: '바닥·전환점', 태: '새 기운 잉태', 양: '자라나는 준비기',
}
const SIBSIN: Record<string, string> = {
  비견: '자립·경쟁', 겁재: '경쟁·소비', 식신: '표현·여유', 상관: '재능·표현',
  편재: '유동적 재물·활동', 정재: '안정적 재물·성실', 편관: '압박·도전·권위', 정관: '책임·명예·규율',
  편인: '직관·비주류 학습', 정인: '배움·보호·수용',
}
const GYEOKGUK: Record<string, string> = {
  정인격: '배움·수용형', 편인격: '직관·비주류형', 식신격: '표현·여유형', 상관격: '재능·표현형',
  편재격: '활동·사업형', 정재격: '성실·안정형', 편관격: '도전·추진형', 정관격: '책임·명예형',
  비견격: '자립형', 건록격: '자립형', 양인격: '강단형',
}

// 천간합 → 化 element (hangul, matches 지지합 합화목 style).
const STEM_HAP: Record<string, string> = {}
for (const [a, b, el] of [['甲', '己', '토'], ['乙', '庚', '금'], ['丙', '辛', '수'], ['丁', '壬', '목'], ['戊', '癸', '화']]) {
  STEM_HAP[[a, b].sort().join('')] = el
}
const STEMS = '甲乙丙丁戊己庚辛壬癸'
const STEM_HAP_RE = new RegExp(`([${STEMS}])([${STEMS}])合(?!화)`, 'g')
const completeStemHap = (line: string) =>
  line.replace(STEM_HAP_RE, (m, a: string, b: string) => {
    const el = STEM_HAP[[a, b].sort().join('')]
    return el ? `${a}${b}合화${el}` : m
  })

// ── 십성 calculator (for 지장간 hidden stems) ────────────────────────
const STEM_INFO: Record<string, { el: string; yang: boolean }> = {
  甲: { el: '목', yang: true }, 乙: { el: '목', yang: false },
  丙: { el: '화', yang: true }, 丁: { el: '화', yang: false },
  戊: { el: '토', yang: true }, 己: { el: '토', yang: false },
  庚: { el: '금', yang: true }, 辛: { el: '금', yang: false },
  壬: { el: '수', yang: true }, 癸: { el: '수', yang: false },
}
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTRL: Record<string, string> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
function sibsinOf(day: string, other: string): string | null {
  const d = STEM_INFO[day], o = STEM_INFO[other]
  if (!d || !o) return null
  const same = d.yang === o.yang
  if (o.el === d.el) return same ? '비견' : '겁재'
  if (GEN[d.el] === o.el) return same ? '식신' : '상관'
  if (GEN[o.el] === d.el) return same ? '편인' : '정인'
  if (CTRL[d.el] === o.el) return same ? '편재' : '정재'
  if (CTRL[o.el] === d.el) return same ? '편관' : '정관'
  return null
}

const isHeader = (s: string) => /^\[.*\]$/.test(s)
const renameCross = (h: string) => h.replace('cross', '교차')

/** append "(meaning)" for each dict key found as a whole word, once per line. */
function glossLine(line: string, dict: Record<string, string>): string {
  let out = line
  for (const [k, v] of Object.entries(dict)) {
    if (out.includes(`(${v})`)) continue // already glossed
    const re = new RegExp(`${k}(?!\\()`) // not immediately followed by '('
    if (re.test(out)) out = out.replace(re, `${k}(${v})`)
  }
  return out
}

/** Gloss only the trailing term after "— " (for blocks with one term per line,
 * incl. 1-char keys like 쇠/절 that would collide inside gloss text). */
function glossTrailing(line: string, dict: Record<string, string>): string {
  const m = line.match(/^(.*— )(\S+)\s*$/)
  return m && dict[m[2]] ? `${m[1]}${m[2]}(${dict[m[2]]})` : line
}

export function slimSajuSelf(block: string): string {
  const lines = block.split('\n')
  // find 일간 stem for 지장간 십성
  const dayStem = (() => {
    const m = lines.find((l) => l.startsWith('일간:'))?.match(/일간:\s*([甲乙丙丁戊己庚辛壬癸])/)
    return m ? m[1] : null
  })()

  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!isHeader(line)) { out.push(line); i++; continue }
    const header = line
    let j = i + 1
    const body: string[] = []
    while (j < lines.length && !isHeader(lines[j])) { body.push(lines[j]); j++ }
    const name = header.replace(/^\[|\]$/g, '')

    if (name === '4기둥') {
      out.push(header)
      for (const b of body) out.push(glossLine(b, SIBSIN))
      out.push('')
      i = j; continue
    }
    if (name.includes('지장간')) {
      out.push(header)
      for (const b of body) {
        if (dayStem) {
          out.push(b.replace(/([甲乙丙丁戊己庚辛壬癸])(?!\()/g, (m, s: string) => {
            const ss = sibsinOf(dayStem, s)
            return ss ? `${s}(${ss})` : s
          }))
        } else out.push(b)
      }
      out.push('')
      i = j; continue
    }
    if (name.includes('격국')) {
      out.push(header)
      for (const b of body) out.push(glossLine(b, GYEOKGUK))
      out.push('')
      i = j; continue
    }
    if (name.includes('12신살')) {
      out.push(header)
      for (const b of body) out.push(glossTrailing(b, SIBI_SINSAL))
      out.push('')
      i = j; continue
    }
    if (name.includes('신살')) { // [신살] (천을귀인 등) — must come after 12신살 check
      out.push(header)
      for (const b of body) {
        // 공망 is "released/recovered" when the branch joins a 합/충 — note it
        // so the model doesn't contradict itself across turns (亥 is both 공망
        // and the anchor of 亥卯未 삼합).
        const withNote = b.replace(/공망 \(작용 약화\)/, '공망 (작용 약화; 합·충 들면 회복·변동)')
        out.push(glossLine(withNote.replace(/ activates /g, ' → '), SINSAL))
      }
      out.push('')
      i = j; continue
    }
    if (name.includes('12운성')) {
      out.push(header)
      for (const b of body) out.push(glossTrailing(b, SIBI_UNSEONG))
      out.push('')
      i = j; continue
    }
    if (name.includes('cross') || name.includes('교차')) {
      out.push(renameCross(header))
      for (const b of body) out.push(completeStemHap(b))
      out.push('')
      i = j; continue
    }
    // default: keep raw
    out.push(header)
    out.push(...body)
    i = j
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n'
}
