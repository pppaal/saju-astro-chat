/**
 * Slim the saju self-block produced by formatSajuSelf, for the realtime
 * destiny counselor only. Compat counselor keeps the raw formatSajuSelf
 * output untouched.
 *
 * Rules (verified against Opus review):
 *  - CUT: 지장간 (hidden-stem scaffolding), 통근 (rootedness scaffolding),
 *    신살 + 12신살 (folk verdict-overlays — these leaked "보호받는 기운" etc.),
 *    일진 + its cross sub-section (daily granularity, wrong for a yearly read).
 *  - GLOSS: 12운성 — append the neutral life-stage meaning so the LLM can use it.
 *  - COMPLETE (fact, not interpretation): 천간합 like 辛丙合 → 辛丙合화수
 *    (state the resulting 化 element, matching how 지지합 already shows 합화목).
 *  - KEEP raw: 일간/오행, 4기둥(+십성), 대운, 세운/월운, 격국, 합/충/삼합,
 *    현재 시기 교차 (minus 일진). 충·십성·육합 stay raw — the model reads them.
 */

const SIBI_UNSEONG: Record<string, string> = {
  장생: '시작·성장 기운', 목욕: '미숙·시행착오', 관대: '자리잡는 독립기', 건록: '왕성·자립',
  제왕: '기운 절정', 쇠: '절정 지나 안정기', 병: '약해짐·예민', 사: '기운 다함·정적',
  묘: '갈무리·내향', 절: '바닥·전환점', 태: '새 기운 잉태', 양: '자라나는 준비기',
}

// 천간합 → 化 element. Keyed by sorted stem pair.
const STEM_HAP: Record<string, string> = {}
for (const [a, b, el] of [['甲', '己', '토'], ['乙', '庚', '금'], ['丙', '辛', '수'], ['丁', '壬', '목'], ['戊', '癸', '화']]) {
  STEM_HAP[[a, b].sort().join('')] = el
}
const STEMS = '甲乙丙丁戊己庚辛壬癸'
const STEM_HAP_RE = new RegExp(`([${STEMS}])([${STEMS}])合(?!화)`, 'g')

function completeStemHap(line: string): string {
  return line.replace(STEM_HAP_RE, (m, a: string, b: string) => {
    const el = STEM_HAP[[a, b].sort().join('')]
    return el ? `${a}${b}合화${el}` : m
  })
}

const isHeader = (s: string) => /^\[.*\]$/.test(s)
const renameCross = (h: string) => h.replace('cross', '교차')

export function slimSajuSelf(block: string): string {
  const lines = block.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!isHeader(line)) {
      out.push(line)
      i++
      continue
    }
    const header = line
    let j = i + 1
    const body: string[] = []
    while (j < lines.length && !isHeader(lines[j])) {
      body.push(lines[j])
      j++
    }
    const name = header.replace(/^\[|\]$/g, '')

    // CUT calc-scaffolding + folk verdict-overlays
    if (name.includes('지장간') || name.includes('통근') || name.includes('신살')) {
      i = j
      continue
    }

    // GLOSS 12운성
    if (name.includes('12운성')) {
      out.push(header)
      for (const b of body) {
        const m = /^(.+ — )(\S+)\s*$/.exec(b)
        const g = m && SIBI_UNSEONG[m[2]]
        out.push(g ? `${m![1]}${m![2]} (${g})` : b)
      }
      out.push('')
      i = j
      continue
    }

    // 현재 시기 cross — drop the 일진 sub-section, complete 천간합
    if (name.startsWith('현재 시기 cross') || name.startsWith('현재 시기 교차')) {
      out.push(renameCross(header))
      let skip = false
      for (const b of body) {
        const isGroupHead = /^\S/.test(b) && b.trim() !== '' // non-indented = new period group
        if (isGroupHead) skip = /^일진/.test(b.trim())
        if (skip) continue
        out.push(completeStemHap(b))
      }
      out.push('')
      i = j
      continue
    }

    // 현재 시기 — drop the 일진 line
    if (name === '현재 시기') {
      out.push(header)
      for (const b of body) {
        if (/^일진/.test(b.trim())) continue
        out.push(b)
      }
      out.push('')
      i = j
      continue
    }

    // 4기둥 내부 cross — complete 천간합, rename header
    if (name.includes('내부 cross') || name.includes('내부 교차')) {
      out.push(renameCross(header))
      for (const b of body) out.push(completeStemHap(b))
      out.push('')
      i = j
      continue
    }

    // default: keep
    out.push(header)
    out.push(...body)
    i = j
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n'
}
