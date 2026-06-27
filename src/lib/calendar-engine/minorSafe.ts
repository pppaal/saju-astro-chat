/**
 * 미성년 안전 — cross-activation/shinsal 서술의 성인 도메인(결혼·공직·투자·
 * 삼각관계·승진 등) 절을 연령 적합 표현으로 치환한다(감사 C3).
 *
 * cross 텍스트는 saju-astro-mapping 의 고정 사전에서 오므로 알려진 advice 절을
 * phrase-level 로 교체하고, 변형 누수 대비 성인 어휘 토큰 fallback 도 둔다.
 * 게이트 나이는 만 19세 미만(결혼·투자·공직 콘텐츠 기준).
 */
export const MINOR_GATE_AGE = 19

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
    'Favours recognition from above, promotion, and the formal stage',
    'Good for recognition from teachers and grown-ups, and the stage',
  ],
  [
    'Favours licences, public office, and legal legitimacy',
    'Good for earning qualifications and learning the rules',
  ],
  ['Favours marriage, contracts, and purchases', 'Good for promises, plans, and pocket-money care'],
  ['Favours new ventures and weighing investments', 'Good for new challenges and making plans'],
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
const TOKEN_KO: Array<[RegExp, string]> = [
  [/결혼/g, '약속'],
  [/배우자/g, '가까운 친구'],
  [/공직/g, '진로'],
  [/면허/g, '자격'],
  [/투자/g, '계획'],
  [/삼각관계/g, '친구 사이 다툼'],
  [/승진/g, '인정받는 일'],
]
const TOKEN_EN: Array<[RegExp, string]> = [
  [/\bmarriage\b/gi, 'a promise'],
  [/\bspouse\b/gi, 'a close friend'],
  [/\bpublic office\b/gi, 'a path'],
  [/\blicen[cs]es?\b/gi, 'qualifications'],
  [/\binvestments?\b/gi, 'plans'],
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

/** {ko,en} 두 필드를 한 번에 정화하는 헬퍼 — 객체 in-place 수정. */
export function sanitizeCrossEntry(
  e: Record<string, unknown>,
  koField: string,
  enField: string
): void {
  if (typeof e[koField] === 'string') e[koField] = minorSafeText(e[koField] as string, 'ko')
  if (typeof e[enField] === 'string') e[enField] = minorSafeText(e[enField] as string, 'en')
}
