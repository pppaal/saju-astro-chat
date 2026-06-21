// 수렴 "큰 날" — 무거운 점성/사주 이벤트 분류 단일 정의.
// 서버 디라이버(convergence.ts)와 클라 카드(DailyFlowCard)가 같은 기준을
// 쓰도록 한 곳에 모음 (이전엔 양쪽에 복붙돼 드리프트 위험이 있었음).

export interface HeavySignalInput {
  source: string
  kind: string
  name?: string | null
  korean?: string | null
  english?: string | null
  // 구조화된 근거 — astro transit 등은 evidence.planets[0]에 트랜짓 행성(영문
  // canonical)을 담는다. 이름 문자열 파싱(현지화/포맷 변형에 취약)보다 이걸 우선.
  evidence?: { planets?: string[] | null } | null
}

// 무거운 점성 = 느린 행성 transit + lifecycle/eclipse/angle-contact.
// 빠른 행성(달·수성·금성·화성·태양)은 큰날 판정에서 제외(시간 줌 전용 노이즈).
const SLOW_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'])
const HEAVY_ASTRO_KINDS = new Set(['lifecycle', 'eclipse', 'angle-contact'])
// 무거운 사주 = 일진 충/합/삼합 + 용신 활성 (대운/세운 상시 배경은 제외).
const HEAVY_SAJU_KINDS = new Set(['hyeongchung'])

export const MIN_IMPACT = 0.4

// "양쪽 수렴" 축 임계값 — sajuAxis/astroAxis(0~100, 중립 50)가 둘 다 이만큼
// 벗어나면 양쪽 시스템 모두 그날 실제 신호가 있다고 본다. 전 신호 기반 정밀
// 판정(bothSystems)이 불가능한 구간/뷰의 프록시 (연간 뷰, 분기 밖 데일리).
// NOTE: 분포 보정값이 아니라 고정 휴리스틱 — 정밀 보정은 후속 과제.
const CONVERGENCE_AXIS_MIN = 15

function leadToken(name: string | null | undefined): string {
  return (name || '').split(/[ ·]/)[0]
}

// 트랜짓 행성을 *구조화된* 근거에서 우선 추출 — astro-transit.ts는
// evidence.planets = [transitPlanet, natalPoint] 로 채운다(planets[0]=트랜짓 행성,
// 영문 canonical). 이름 문자열 토큰 파싱은 현지화/포맷 변형에 취약하므로,
// evidence 가 있으면 그걸 쓰고 없을 때만 name 토큰으로 폴백한다.
function transitingPlanet(s: HeavySignalInput): string {
  const fromEvidence = s.evidence?.planets?.[0]
  if (typeof fromEvidence === 'string' && fromEvidence) return fromEvidence
  return leadToken(s.name)
}

// 느린 행성(목성~명왕·키론) 또는 달의 교점(True/North Node) 여부.
function isSlowTransitingBody(p: string): boolean {
  return SLOW_PLANETS.has(p) || p === 'True' || p === 'North' // True/North Node
}

export function isHeavyAstro(s: HeavySignalInput): boolean {
  if (s.source !== 'astro') return false
  if (HEAVY_ASTRO_KINDS.has(s.kind)) return true
  if (s.kind === 'transit') {
    return isSlowTransitingBody(transitingPlanet(s))
  }
  return false
}

// "늘 켜진 배경" 점성 — 느린 행성(목성~명왕·키론)의 transit 은 윈도우가 수개월~수년
// 이라 *거의 모든* 큰 날에 똑같이 뜬다(예: "Jupiter 어포지션 Uranus"가 6월 전체에).
// 큰 날을 *구별*하지 못하므로 칩 표시에선 숨긴다 — 무거움/수렴 판정엔 그대로 반영,
// 표시만 정리. lifecycle/eclipse/angle-contact(토성회귀·일식·각 정확접촉)는 날짜
// 특정 *사건*이라 transit 이 아니므로 그대로 노출된다.
export function isSlowBackgroundAstro(s: HeavySignalInput): boolean {
  if (s.source !== 'astro' || s.kind !== 'transit') return false
  return isSlowTransitingBody(transitingPlanet(s)) // 달의 교점(~18개월)도 배경
}

export function isHeavySaju(s: HeavySignalInput): boolean {
  if (s.source !== 'saju') return false
  if (HEAVY_SAJU_KINDS.has(s.kind)) return true
  return /용신 활성/.test(s.korean || s.name || '')
}

export function cleanSignalName(s: HeavySignalInput, lang: 'ko' | 'en' = 'ko'): string {
  // EN 페이지에선 사주 메타포(돼지와 돼지의 자형…)가 한글로 새지 않게 english 우선.
  // english 가 없으면(astro 라벨 등 영문 name) korean/name 폴백.
  const source = lang === 'en' ? s.english || s.name || s.korean : s.korean || s.name
  const raw = (source || '').replace(/\s*\([^)]*\)/g, '').trim()
  // 라벨은 "<핵심> — <설명>" 형식이 많다(예: "돼지와 돼지의 자형 — 깊은 생각…").
  // 칩엔 핵심만 — 설명까지 넣고 28자 하드컷 하면 단어 중간이 잘려 깨져 보인다.
  const head = raw.split('—')[0].trim()
  const base = head.length >= 4 ? head : raw
  if (base.length <= 24) return base
  // 그래도 길면 단어 경계에서 자르고 말줄임.
  return (
    base
      .slice(0, 24)
      .replace(/\s+\S*$/, '')
      .trim() + '…'
  )
}

// 두 축이 둘 다 중립서 충분히 벗어남 = 양쪽 다 실제 신호 (방향 무관).
// ※ Raw 축을 우선 사용 — v2 override 활성 시 sajuAxis/astroAxis는 헤드라인
//   점수와 평균 정렬을 위해 시프트된 표시값이라, 그걸 그대로 쓰면 두 축이
//   동시에 시프트돼 거짓 "양쪽 수렴" 트리거가 난다. raw 필드(시프트 전)가
//   없으면 호환을 위해 시프트값 사용.
export function isAxisConverged(
  sb:
    | {
        sajuAxis: number
        astroAxis: number
        sajuAxisRaw?: number
        astroAxisRaw?: number
      }
    | null
    | undefined
): boolean {
  if (!sb) return false
  const saju = typeof sb.sajuAxisRaw === 'number' ? sb.sajuAxisRaw : sb.sajuAxis
  const astro = typeof sb.astroAxisRaw === 'number' ? sb.astroAxisRaw : sb.astroAxis
  return Math.abs(saju - 50) >= CONVERGENCE_AXIS_MIN && Math.abs(astro - 50) >= CONVERGENCE_AXIS_MIN
}
