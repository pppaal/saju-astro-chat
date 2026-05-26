// 수렴 "큰 날" — 무거운 점성/사주 이벤트 분류 단일 정의.
// 서버 디라이버(convergence.ts)와 클라 카드(DailyFlowCard)가 같은 기준을
// 쓰도록 한 곳에 모음 (이전엔 양쪽에 복붙돼 드리프트 위험이 있었음).

export interface HeavySignalInput {
  source: string
  kind: string
  name?: string | null
  korean?: string | null
}

// 무거운 점성 = 느린 행성 transit + lifecycle/eclipse/angle-contact.
// 빠른 행성(달·수성·금성·화성·태양)은 큰날 판정에서 제외(시간 줌 전용 노이즈).
export const SLOW_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'])
export const HEAVY_ASTRO_KINDS = new Set(['lifecycle', 'eclipse', 'angle-contact'])
// 무거운 사주 = 일진 충/합/삼합 + 용신 활성 (대운/세운 상시 배경은 제외).
export const HEAVY_SAJU_KINDS = new Set(['hyeongchung'])

export const MIN_IMPACT = 0.4

// "양쪽 수렴" 축 임계값 — sajuAxis/astroAxis(0~100, 중립 50)가 둘 다 이만큼
// 벗어나면 양쪽 시스템 모두 그날 실제 신호가 있다고 본다. 전 신호 기반 정밀
// 판정(bothSystems)이 불가능한 구간/뷰의 프록시 (연간 뷰, 분기 밖 데일리).
// NOTE: 분포 보정값이 아니라 고정 휴리스틱 — 정밀 보정은 후속 과제.
export const CONVERGENCE_AXIS_MIN = 15

function leadToken(name: string | null | undefined): string {
  return (name || '').split(/[ ·]/)[0]
}

export function isHeavyAstro(s: HeavySignalInput): boolean {
  if (s.source !== 'astro') return false
  if (HEAVY_ASTRO_KINDS.has(s.kind)) return true
  if (s.kind === 'transit') {
    const p = leadToken(s.name)
    return SLOW_PLANETS.has(p) || p === 'True' || p === 'North' // True/North Node
  }
  return false
}

export function isHeavySaju(s: HeavySignalInput): boolean {
  if (s.source !== 'saju') return false
  if (HEAVY_SAJU_KINDS.has(s.kind)) return true
  return /용신 활성/.test(s.korean || s.name || '')
}

export function cleanSignalName(s: HeavySignalInput): string {
  return (s.korean || s.name || '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
    .slice(0, 28)
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
