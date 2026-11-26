/**
 * 미성년 안전 — cross-activation/shinsal 서술의 성인 도메인(결혼·공직·투자·
 * 삼각관계·승진 등) 절을 연령 적합 표현으로 치환한다(감사 C3).
 *
 * cross 텍스트는 saju-astro-mapping 의 고정 사전에서 오므로 알려진 advice 절을
 * phrase-level 로 교체하고, 변형 누수 대비 성인 어휘 토큰 fallback 도 둔다.
 * 게이트 나이는 만 19세 미만(결혼·투자·공직 콘텐츠 기준).
 */
const MINOR_GATE_AGE = 19

const PHRASE_KO: Array<[string, string]> = [
  ['윗선의 인정·승진·공식 무대에 우호', '선생님·어른의 인정, 발표 무대에 좋아요'],
  ['자격·면허·공직·법적 정당화에 우호', '자격·시험·규칙 익히기에 좋아요'],
  ['결혼·계약·구매에 우호', '약속·계획·용돈 관리에 좋아요'],
  ['신사업·투자 검토에 우호', '새 도전·계획 세우기에 좋아요'],
  ['공동 지출·보증·삼각관계는 한 박자 늦추기', '친구와의 돈거래·약속은 한 박자 늦추기'],
  [
    '출장·이주·도전엔 동력, 다만 서두른 운전·일정은 한 박자 늦추기',
    '이동·여행·도전엔 동력, 다만 서두른 일정은 한 박자 늦추기',
  ],
]
const PHRASE_EN: Array<[string, string]> = [
  [
    'Favors recognition from above, promotion, and the formal stage',
    'Good for recognition from teachers and grown-ups, and the stage',
  ],
  [
    'Favors licenses, public office, and legal legitimacy',
    'Good for earning qualifications and learning the rules',
  ],
  ['Favors marriage, contracts, and purchases', 'Good for promises, plans, and pocket-money care'],
  ['Favors new ventures and weighing investments', 'Good for new challenges and making plans'],
  [
    'Sleep on joint spending, guarantees, and love triangles',
    'Take it slow with money lent to friends and with promises',
  ],
  [
    'Drive for trips, relocation, and bold moves; just slow rushed driving and schedules by a beat',
    'Drive for trips and bold moves; just slow rushed schedules by a beat',
  ],
]
// 토큰 fallback — phrase 가 살짝 달라도 남은 성인 어휘를 차단.
// 순서 주의 — 긴/구체 phrase 를 앞에 둬 부분치환 뒤 남은 토큰이 어색해지지 않게.
const TOKEN_KO: Array<[RegExp, string]> = [
  [/좋은 인연·배우자운/g, '좋은 친구운'],
  [/배우자운/g, '친구운'],
  [/배우자/g, '가까운 친구'],
  [/결혼/g, '약속'],
  [/공직/g, '진로'],
  [/면허/g, '자격'],
  [/투자/g, '계획'],
  [/투기/g, '조급함'],
  [/코인·도박 같은 한탕/g, '요행'],
  [/도박/g, '내기'],
  [/코인/g, '용돈 모으기'],
  [/한탕/g, '요행'],
  [/베팅/g, '내기'],
  [/삼각관계/g, '친구 사이 다툼'],
  [/승진/g, '인정받는 일'],
  [/썸/g, '친한 사이'],
]
const TOKEN_EN: Array<[RegExp, string]> = [
  [/\bmarriage\b/gi, 'a promise'],
  [/\bspouse\b/gi, 'a close friend'],
  [/\bpublic office\b/gi, 'a path'],
  [/\blicen[cs]es?\b/gi, 'qualifications'],
  [/\binvestments?\b/gi, 'plans'],
  [/\bspeculation\b/gi, 'haste'],
  [/\bgambling\b/gi, 'a bet with friends'],
  [/\bbetting\b/gi, 'a bet with friends'],
  [/\bcrypto\b/gi, 'saving up'],
  [/\bcoins?\b/gi, 'saving up'],
  [/\blotter(?:y|ies)\b/gi, 'a raffle'],
  [/\blove triangles?\b/gi, 'friend squabbles'],
  [/\bpromotion\b/gi, 'recognition'],
]

export function isMinorAge(age: number | undefined): boolean {
  return typeof age === 'number' && age < MINOR_GATE_AGE
}

/** 성인 도메인 절을 연령 적합 표현으로 치환. 비-string/빈값은 그대로. */
export function minorSafeText<T extends string | undefined>(text: T, lang: 'ko' | 'en'): T {
  if (!text) return text
  let out: string = text
  for (const [a, b] of lang === 'ko' ? PHRASE_KO : PHRASE_EN) out = out.split(a).join(b)
  for (const [re, b] of lang === 'ko' ? TOKEN_KO : TOKEN_EN) out = out.replace(re, b)
  return out as T
}

/**
 * 미성년 안전 — 파생 카피 객체의 모든 문자열을 재귀로 정화(감사 C3-hole). 키가
 * `...En` 이면 EN 어휘로, `...Ko` 면 KO 어휘로, 그 외 키는 상위에서 물려받은 언어
 * (최상위는 en 인자)로 minorSafeText 적용. minorSafeText 는 성인 도메인 토큰(결혼·투자·도박·배우자…)만
 * 치환하므로 라벨·아이콘·키에 걸어도 무해하다. 입력은 바꾸지 않고 새 객체를 돌려준다.
 */
export function deepMinorSafe<T>(v: T, en: boolean): T {
  if (typeof v === 'string') return minorSafeText(v, en ? 'en' : 'ko') as unknown as T
  if (Array.isArray(v)) return v.map((x) => deepMinorSafe(x, en)) as unknown as T
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v)) {
      const childEn = /En$/.test(k) ? true : /Ko$/.test(k) ? false : en
      out[k] = deepMinorSafe(val, childEn)
    }
    return out as unknown as T
  }
  return v
}

/** isMinor 면 deepMinorSafe(KO 기본, `...En` 키는 EN), 아니면 원본 그대로. */
export function minorSafeAll<T>(o: T, isMinor: boolean): T {
  return isMinor ? deepMinorSafe(o, false) : o
}

/** {ko,en} 두 필드를 한 번에 정화하는 헬퍼 — 객체 in-place 수정. */
export function sanitizeCrossEntry(
  e: Record<string, unknown>,
  koField: string,
  enField: string
): void {
  if (typeof e[koField] === 'string') e[koField] = minorSafeText(e[koField] as string, 'ko')
  if (typeof e[enField] === 'string') e[enField] = minorSafeText(e[enField] as string, 'en')
}
