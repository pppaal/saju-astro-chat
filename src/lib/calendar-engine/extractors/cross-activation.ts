/**
 * Cross-activation extractor — 사주-점성 동시 활성 페어를 의미 신호로 합성.
 *
 * 표준 SignalExtractor 인터페이스 (ExtractorContext → signals) 와 다르게,
 * 이 추출기는 *다른 추출기들의 결과*를 입력으로 받아 페어 매칭을 한다.
 * 그래서 buildCalendar 의 메인 추출 패스 *이후*에 한 번 호출되는 post-pass
 * 형태로 동작 (index.ts 에 1줄 추가로 wiring).
 *
 * 입력:  range 동안 활성인 모든 ActiveSignal 배열.
 * 출력:  saju × astro 동시 활성이면서 A등급 매핑 사전에 매치되는 페어
 *        의미 신호 (kind: 'cross-activation').
 *
 * ── 활성 시점 매칭 ──
 * 두 부모 신호가 *날짜 단위* 로 겹치는 구간에서만 페어 신호를 emit.
 * 겹친 구간이 짧으면 (1~2일) 페어 신호도 짧음. 겹친 구간이 길면 (10일+)
 * 그만큼 길게 유지. 정점(peak)은 두 부모 peak 의 중간점.
 *
 * ── 페어 polarity ── (combinePolarity 구현과 일치하게 기술)
 *  - 두 부모 부호가 *같은 방향*(++ 또는 --) → mapping.polarity 를 **부호 그대로** 사용.
 *      · 둘 다 우호: 매핑이 + 면 +, - 면 -.
 *      · 둘 다 흉: 매핑 부호 그대로(예: 편관×화성 -2 → 압박 가중 -2). ※ sign 곱(−×−=+)이
 *        아니다 — 둘 다 압력이면 흉을 더 키우는 게 맞으므로 매핑 부호를 보존한다.
 *  - 부호 다르면 (+- 또는 -+) → 0 (의미 충돌 — 톤 무력화).
 *  - 한쪽이 polarity=0 이면 mapping.polarity 그대로 (부호 정보 부재 시 매핑이 결정).
 *
 * ── 페어 weight ──
 * saju.weight × astro.weight × 0.6 (cross 신호 noise 방지 목적의 보수 계수).
 *
 * ── 부모 자격 ── (엔진 감사 X4·X5)
 *  - 사주: 정통 기둥 십신(saju-pillar: 대운·세운·월운·일진)·시진(saju-hour)의 evidence.sibsin,
 *    신살(saju-shinsal·saju-shinsal-activation)의 evidence.shinsalName 만. 오행 흐름·지장간
 *    통근 같은 *파생 라인*도 sibsin 을 달고 있지만 용신과 무관한 고정 극성이라(같은 일진
 *    십신이 +3 과 −1 로 갈림) 교차 부모가 아니다 — evidenceLadder 의 정통 십신 규칙과 같다.
 *  - 점성: 하늘에서 실제로 움직이는 활성 행성만. 식(eclipse)·프로펙션·ZR·행성시는 제외.
 *
 * ── dedup ──
 * 같은 셀 안에서 (교차 name, layer) 당 가장 센 1개 — buildCalendar 의 groupIntoCells 가
 * 셀 버킷 뒤에 고른다(index.ts dedupeCrossSignals). 여기서는 *같은 셀들을 덮는* 후보,
 * 즉 (페어, layer, 교집합 창)이 정확히 같은 후보끼리만 가장 센 것을 남긴다 —
 * 어느 셀에서도 진 쪽이 살아남을 수 없으니 손실이 없다. 예전 키 (페어, 창 시작일)은
 * 시작일만 같으면 창이 다른 후보까지 지웠고, 그 결과가 빌드 범위에 따라 달라졌다(X1·X2).
 *
 * ── id ──
 * `cross.{saju}-x-{astro}.{layer}:{시작일}~{끝일}` — 살아남은 교차끼리 유일.
 */

import type { ActiveSignal, ActiveWindow, Polarity, SignalEvidence, SignalLayer } from '../types'
import {
  SAJU_ASTRO_MAPPINGS,
  crossLayerAllowed,
  type CrossMapping,
} from '../data/saju-astro-mapping'
// 교차 신호 name 한글화 — 행성 영문 키 → 한글(정본 data/planetNames 재사용).
import { PLANET_KO } from '../data/planetNames'

/**
 * Saju 신호에서 매칭 키 (십신명 또는 신살명) 를 추출.
 * 매핑 사전 키와 동일해야 매치 — saju-pillar·saju-hour 는 evidence.sibsin, 신살은
 * evidence.shinsalName 에 박는다. 그 외 모듈(오행 흐름·지장간 통근 등)의 sibsin 은
 * 파생 라인이라 키로 쓰지 않는다(파일 머리 '부모 자격').
 */
const SIBSIN_KEY_MODULES: ReadonlySet<string> = new Set(['saju-pillar', 'saju-hour'])
const SHINSAL_KEY_MODULES: ReadonlySet<string> = new Set([
  'saju-shinsal',
  'saju-shinsal-activation',
])
function extractSajuKey(s: ActiveSignal): string | undefined {
  if (s.source !== 'saju') return undefined
  const mod = s.evidence?.module ?? ''
  if (SIBSIN_KEY_MODULES.has(mod)) {
    const sibsin = s.evidence?.sibsin as string | undefined
    if (sibsin) return sibsin
  }
  if (SHINSAL_KEY_MODULES.has(mod)) {
    const shinsalName = s.evidence?.shinsalName as string | undefined
    if (shinsalName) return shinsalName
  }
  return undefined
}

/**
 * Astro 신호에서 매칭 키 (단일 행성명) 를 추출.
 * 대부분의 astro extractor 가 evidence.planets[0] 에 *트랜짓(활성) 행성* 을 박음
 * (transit, dignity, house-transit, return, fixed-star 등).
 *
 * 단, eclipse 는 planets[0] 에 *본명 피영향점*(affectedPoint, 예: 본명 금성)을
 * 넣는다 — 활성 주체(식의 광체)가 아니다. 그대로 키로 쓰면 "토성 식이 본명 금성을
 * 때릴 때" astroKey='금성' 이 돼 정재×금성·도화×금성 교차가 *엉뚱한 인과*로
 * 오발화한다(감사 지적). 식은 교차의 활성 행성 키로 부적합하므로 제외한다.
 *
 * 같은 이유로 profection·zodiacal-releasing 도 제외한다. 둘 다 planets[0] 에
 * *상징적 룰러*(연주술 lordOfYear / ZR period.ruler)를 박는데, 이는 하늘에서
 * 실제로 트랜짓하는 활성 행성이 아니라 *지정(designation)* 일 뿐이다. 교차의
 * "planets[0] = 트랜짓(활성) 행성" 불변식과 어긋나, 실제 천문 활성 없이 명칭만으로
 * 교차 신호를 발화시킨다 — eclipse 제외와 같은 선례. (그 룰러가 실제로 트랜짓하면
 * transit/dignity 추출기가 별도로 활성 신호를 내고, 그게 교차의 정당한 키가 된다.)
 *
 * 행성시(planetary-hour)도 같은 범주다 — planets[0] 은 칼데아 순서로 요일·시각에 배정된
 * 시간의 지배성일 뿐 하늘의 활성이 아니다. 예전엔 한 시간짜리 'Saturn hour' 가 대운
 * 정재와 만나 10년 층 '정재 × 토성' 을 만들었다(엔진 감사 X5).
 */
const NON_ACTIVE_ASTRO_KINDS: ReadonlySet<string> = new Set([
  'eclipse',
  'profection',
  'zodiacal-releasing',
  'planetary-hour',
])
function extractAstroKey(s: ActiveSignal): string | undefined {
  if (s.source !== 'astro') return undefined
  // affectedPoint(본명점) 또는 상징적 지배성이라 활성 주체 아님 — 교차 제외.
  if (NON_ACTIVE_ASTRO_KINDS.has(s.kind)) return undefined
  const planets = s.evidence?.planets ?? []
  return planets[0]
}

/** ISO day 키 (YYYY-MM-DD) — 교차 id 의 창 시작·끝일. */
function isoDay(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * 파싱된 윈도우 경계(ms) — start/end/peak. 페어 루프가 같은 신호를 수만 번
 * 마주치므로 신호당 1회만 Date.parse 하고 캐시한다. (직전엔 intersectWindow 가
 * 매 쌍마다 4회 parse → 19k 신호 페어링에서 수백만 회 parse 로 5.5s 소모.)
 */
interface Bounds {
  s: number
  e: number
  p: number
}

/**
 * ms 경계로 겹친 윈도우 합성. peak 는 두 peak 의 중간, [start,end] 밖이면 윈도우
 * 중심으로 폴백 — 옛 intersectWindow 와 동일한 결과. (겹치는 쌍에서만 호출.)
 */
function makeWindow(startMs: number, endMs: number, peakMs: number): ActiveWindow {
  const safePeak =
    !Number.isNaN(peakMs) && peakMs >= startMs && peakMs <= endMs ? peakMs : (startMs + endMs) / 2
  return {
    start: new Date(startMs).toISOString(),
    peak: new Date(safePeak).toISOString(),
    end: new Date(endMs).toISOString(),
  }
}

/**
 * 페어 polarity 합성.
 *  - 둘 다 부호가 같은 방향(++ 또는 --) → 매핑 polarity 의 부호·크기 그대로.
 *  - 부호가 반대(+− 또는 −+) → 0 (의미 충돌 — emit 톤 무력화).
 *  - 한 쪽 polarity = 0 → 매핑 polarity 그대로 (부호 정보 부재 시 매핑이 결정).
 */
function combinePolarity(
  sajuPolarity: number,
  astroPolarity: number,
  mappingPolarity: Polarity
): Polarity {
  if (sajuPolarity === 0 || astroPolarity === 0) return mappingPolarity
  const sameDir = Math.sign(sajuPolarity) === Math.sign(astroPolarity)
  if (!sameDir) return 0
  return mappingPolarity
}

/**
 * 한 페어를 ActiveSignal 로 합성.
 * 부모 두 신호 id 를 evidence.detail.parentIds 에 보존 — UI/디버그에서 인과 추적.
 */
function buildCrossSignal(
  sajuSig: ActiveSignal,
  astroSig: ActiveSignal,
  mapping: CrossMapping,
  window: ActiveWindow
): ActiveSignal {
  const polarity = combinePolarity(sajuSig.polarity, astroSig.polarity, mapping.polarity)
  const baseWeight = (sajuSig.weight ?? 0) * (astroSig.weight ?? 0) * 0.6
  // cross 신호는 부수적 — 단일 신호 weight 최대값(1.0) 이하로 cap.
  const weight = Math.max(0, Math.min(1, baseWeight))
  const name = `${mapping.saju} × ${PLANET_KO[mapping.astro] ?? mapping.astro}`
  // 부호 충돌(polarity 0)이면 톤만 무력화하고 강한 길/흉 원문을 그대로 두면
  // "중립 마커(·) + 강한 경고문" 모순이 난다(감사 #9). 문구도 중립으로 교체 —
  // "X × Y — …" 머리 형식은 유지해 stripCrossPair 가 그대로 동작한다.
  // 부호 충돌로 인한 0 만 "상쇄"로 본다. 매핑 자체가 중립(mapping.polarity===0,
  // 예 역마×화성·편인×수성)인데 부모가 *같은 방향*이면 상쇄가 아니라 양가(兩價)라
  // "서로 반대로 당겨 상쇄" 카피가 매핑 원문과 모순됐다(감사). mapping.polarity!==0 추가.
  const conflicted =
    polarity === 0 && mapping.polarity !== 0 && sajuSig.polarity !== 0 && astroSig.polarity !== 0
  const koMeaning = conflicted
    ? `${name} — 두 기운이 서로 반대로 당겨 상쇄되는 날. 크게 밀지도 밀리지도 않으니 판단을 서두르지 마세요.`
    : mapping.meaning.ko
  // EN 머리는 매핑 원문 머리("Direct Officer × Saturn") 재사용 — 한글 누수 방지.
  const enHead = mapping.meaning.en.split('—')[0]?.trim() || `${mapping.saju} × ${mapping.astro}`
  const enMeaning = conflicted
    ? `${enHead} — the two currents pull opposite ways and cancel out. Nothing pushes hard either way, so don't rush the call.`
    : mapping.meaning.en
  const evidence: SignalEvidence = {
    module: 'cross-activation',
    sibsin: sajuSig.evidence?.sibsin,
    shinsalName: sajuSig.evidence?.shinsalName,
    planets: [mapping.astro],
    detail: {
      sajuKey: mapping.saju,
      astroKey: mapping.astro,
      grade: mapping.grade,
      mappingPolarity: mapping.polarity,
      parentIds: [sajuSig.id, astroSig.id],
      parentSajuKind: sajuSig.kind,
      parentAstroKind: astroSig.kind,
    },
  }
  const layer: SignalLayer =
    sajuSig.layer === 'decadal' || astroSig.layer === 'decadal'
      ? 'decadal'
      : sajuSig.layer === 'yearly' || astroSig.layer === 'yearly'
        ? 'yearly'
        : sajuSig.layer === 'monthly' || astroSig.layer === 'monthly'
          ? 'monthly'
          : 'daily'
  return {
    // id 에 layer·창 시작~끝일 — (셀, name, layer) dedup 뒤 살아남은 교차끼리 유일하다.
    id: `cross.${mapping.saju}-x-${mapping.astro}.${layer}:${isoDay(window.start)}~${isoDay(window.end)}`,
    source: 'saju', // hybrid 표시 — tagger 가 source 별 라우팅에 안전. (cross-activation kind 로 식별)
    kind: 'cross-activation',
    name,
    korean: koMeaning,
    english: enMeaning,
    polarity,
    layer,
    active: window,
    weight,
    evidence,
  }
}

/**
 * 입력 신호 배열에서 사주 × 점성 동시 활성 페어 → cross-activation 후보 신호 emit.
 *
 * 같은 (페어, layer, 교집합 창) 후보 — 정확히 같은 셀들을 덮는 후보 — 끼리는
 * 가장 센 1개만 남긴다(손실 없음). 셀 단위 (name, layer) 1개 규칙은 셀 버킷 뒤
 * index.ts dedupeCrossSignals 가 같은 전순서(strength → weight → id)로 적용한다.
 */
export function extractCrossActivations(signals: readonly ActiveSignal[]): ActiveSignal[] {
  // 1) saju/astro 로 split + 매칭 키 추출.
  const sajuByKey = new Map<string, ActiveSignal[]>()
  const astroByKey = new Map<string, ActiveSignal[]>()

  for (const s of signals) {
    if (s.kind === 'cross-activation') continue // 자기 자신 입력 차단 (재호출 안전)
    if (s.source === 'saju') {
      const key = extractSajuKey(s)
      if (!key) continue
      const arr = sajuByKey.get(key) ?? []
      arr.push(s)
      sajuByKey.set(key, arr)
    } else if (s.source === 'astro') {
      const key = extractAstroKey(s)
      if (!key) continue
      const arr = astroByKey.get(key) ?? []
      arr.push(s)
      astroByKey.set(key, arr)
    }
  }

  // 2) 매핑 사전 순회 — 양쪽 모두 활성인 페어만 처리.
  // dedup: 같은 (페어, layer, 교집합 창) 후보 — 같은 셀 집합 — 중 가장 센 1개.
  const bestByWindow = new Map<string, ActiveSignal>()

  // 신호당 경계 1회 파싱 캐시 — 페어 루프의 Date.parse 폭증 제거.
  const boundsCache = new Map<ActiveSignal, Bounds>()
  const boundsOf = (sig: ActiveSignal): Bounds => {
    let b = boundsCache.get(sig)
    if (!b) {
      b = {
        s: Date.parse(sig.active.start),
        e: Date.parse(sig.active.end),
        p: Date.parse(sig.active.peak),
      }
      boundsCache.set(sig, b)
    }
    return b
  }

  for (const mapping of SAJU_ASTRO_MAPPINGS) {
    const sajuSignals = sajuByKey.get(mapping.saju)
    const astroSignals = astroByKey.get(mapping.astro)
    if (!sajuSignals?.length || !astroSignals?.length) continue

    for (const sajuSig of sajuSignals) {
      const sb = boundsOf(sajuSig)
      for (const astroSig of astroSignals) {
        const ab = boundsOf(astroSig)
        // 숫자 경계로 겹침 빠른 판정 — 대부분의 쌍은 겹치지 않아 여기서 싸게 탈락.
        const start = Math.max(sb.s, ab.s)
        const end = Math.min(sb.e, ab.e)
        if (Number.isNaN(start) || Number.isNaN(end) || start > end) continue
        const window = makeWindow(start, end, (sb.p + ab.p) / 2)
        const crossSig = buildCrossSignal(sajuSig, astroSig, mapping, window)
        // 층별 교차 밴드 — 합성 신호의 layer 가 그 행성 밴드 밖이면 버린다.
        // (외행성은 대운에서만, 빠른 행성은 일/월에서만 — 스케일 불일치 교차 차단.)
        if (!crossLayerAllowed(mapping.astro, crossSig.layer)) continue
        // 정확히 같은 창(ms)이면 같은 셀 집합(일·시 셀 모두) — 진 쪽은 어디서도 못 남는다.
        const key = `${crossSig.id}|${window.start}|${window.end}`
        const existing = bestByWindow.get(key)
        if (!existing || crossOutranks(crossSig, existing)) bestByWindow.set(key, crossSig)
      }
    }
  }

  return Array.from(bestByWindow.values())
}

/**
 * 교차 후보 전순서 — strength(|polarity|×weight) → weight → 부모 id 문자열.
 * 같은 창의 후보끼리만 비교하므로 마지막 tie-break 는 부모 쌍으로 결정론을 지킨다.
 */
function crossOutranks(a: ActiveSignal, b: ActiveSignal): boolean {
  const sa = Math.abs(a.weight * a.polarity)
  const sb = Math.abs(b.weight * b.polarity)
  if (sa !== sb) return sa > sb
  if (a.weight !== b.weight) return a.weight > b.weight
  const pa = String((a.evidence.detail as { parentIds?: string[] }).parentIds ?? '')
  const pb = String((b.evidence.detail as { parentIds?: string[] }).parentIds ?? '')
  return pa < pb
}
