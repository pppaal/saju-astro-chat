/**
 * Cross-activation extractor — 사주-점성 동시 활성 페어를 의미 신호로 합성.
 *
 * 표준 SignalExtractor 인터페이스 (ExtractorContext → signals) 와 다르게,
 * 이 추출기는 *다른 추출기들의 결과*를 입력으로 받아 페어 매칭을 한다.
 * 그래서 buildCalendar 의 메인 추출 패스 *이후*에 한 번 호출되는 post-pass
 * 형태로 동작 (index.ts 에 1줄 추가로 wiring).
 *
 * 입력:  range 동안 활성인 모든 ActiveSignal 배열.
 * 출력:  saju × astro 동시 활성이면서 매핑 사전(data/saju-astro-mapping — A·B 등급 모두)
 *        에 매치되고, 합성 layer 가 그 행성의 CROSS_LAYER_BAND 안인 페어 의미 신호
 *        (kind: 'cross-activation'). 등급 필터는 없다 — 밴드가 유일한 게이트.
 *
 * ── 활성 시점 매칭 ──
 * 두 부모 신호의 활성 창이 겹치는 구간(교집합)에서만 페어 신호를 emit.
 * 겹친 구간이 짧으면 페어 신호도 짧고, 길면 그만큼 길게 유지. 정점(peak)은 두 부모
 * peak 의 중간점(교집합 밖이면 창 중심).
 *
 * ── 페어 polarity ── (combinePolarity, 엔진 감사 X6·F5, OD-10)
 * 교차는 두 부모가 매핑의 방향에 *동의할 때만* 부호를 갖는다 — 매핑 파일의 등급 기준
 * ("둘 다 같은 polarity 방향으로 작동")과 같다.
 *  - 두 부모 모두 매핑 부호, 또는 한쪽이 매핑 부호이고 다른 쪽이 0 → mapping.polarity
 *    (부호·크기 그대로).
 *  - 그 밖은 전부 0 — 어느 부모든 매핑과 반대 부호면(+− 충돌, 매핑 + 에 −− 부모,
 *    매핑 − 에 ++ 부모), 또는 두 부모 모두 0 이면 매핑 문장을 뒷받침할 근거가 없다.
 *    이때 문구는 '상쇄' 중립 카피로 바꾼다(감사 #9 — 중립 마커에 강한 길/흉 원문 금지).
 *  - 매핑 자체가 0(양가 매핑, 예 역마×화성)이면 결과도 0 이고 매핑 원문을 그대로 쓴다.
 * 예전 규칙(같은 방향이면 매핑 부호 그대로, 한쪽 0 이면 매핑이 결정)은 −− 부모에서
 * + 교차, ++ 부모에서 − 교차, 0·0 부모에서 ± 교차를 냈다 — 비영 교차의 40% 만 두
 * 부모가 동의했다.
 *
 * ── 페어 layer ── (엔진 감사 X7, OD-10)
 * 교차 창은 두 부모 창의 교집합이라 layer 도 *좁은* 부모 층을 따른다
 * (instant < hourly < daily < monthly < yearly < decadal). 시진(hourly) 부모의 교차는
 * hourly 로 남아 그날 톤(TONE_LAYERS)·10년 겹침에 들어가지 않고, 10년(decadal) 교차는
 * 두 부모가 모두 10년 층(대운 × 장주기 천체)일 때만 생긴다. CROSS_LAYER_BAND 는 이
 * 좁은 층에서 검사한다 — 예전엔 넓은 부모 층으로 검사해 '시진 정관 × 토성' 같은 2시간
 * 창이 세운 교차로 밴드를 통과했다.
 *
 * ── 페어 weight ──
 * saju.weight × astro.weight × 0.6 (cross 신호 noise 방지 목적의 보수 계수).
 *
 * ── 부모 자격 ── (엔진 감사 X4·X5, OD-9)
 *  - 사주: 정통 기둥 십신(saju-pillar: 대운·세운·월운·일진)·시진(saju-hour)의 evidence.sibsin,
 *    신살(saju-shinsal·saju-shinsal-activation)의 evidence.shinsalName 만. 오행 흐름·지장간
 *    통근 같은 *파생 라인*도 sibsin 을 달고 있지만 용신과 무관한 고정 극성이라(같은 일진
 *    십신이 +3 과 −1 로 갈림) 교차 부모가 아니다 — evidenceLadder 의 정통 십신 규칙과 같다.
 *  - 점성: 하늘에서 실제로 움직이는 활성 행성만. 식(eclipse)·프로펙션·ZR·행성시(지정),
 *    솔라 아크·2차 진행·진행 달(상징 방향 — 라이프사이클의 진행 달 회귀 포함), 솔라·루나
 *    리턴(회귀 차트가 여는 1년·1달 주기 구간 — 오너 결정 15)은 제외.
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
 * (transit, dignity, house-transit, lifecycle 행성 회귀, fixed-star 등).
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
 *
 * 솔라 아크(solar-arc)·2차 진행(progression)·진행 달(progressed-moon)은 *상징 방향*이다
 * (OD-9) — planets[0] 은 "하루 = 1년" 식으로 옮긴 가상의 점이지 지금 하늘에서 움직이는
 * 행성이 아니다. 예전엔 '세운 정관 × Solar Arc Jupiter' 가 10년 교차로 인생 화면에 떴다.
 *
 * 솔라 리턴(solar-return)·루나 리턴(lunar-return)도 교차 키가 아니다(오너 결정 15). 신호는
 * 회귀 순간부터 다음 회귀까지 1년·1달 *주기 구간*이고 planets[0]='Sun'/'Moon' 은 그 구간을
 * 연 광체의 이름표다 — 프로펙션·상징 주기와 같은 범주라, 구간 안의 모든 일진·시진과 겹쳐
 * '비견 × 태양'·'정인 × 달' 같은 교차를 냈다(2026-11 표본+시드 20명: 교차의 16.6%).
 * 회귀 신호 자체는 단독 점성 신호로 남는다. 실제 행성 회귀(목성·토성 등 라이프사이클)는
 * 하늘의 그 행성이 본명 자리로 돌아오는 사건이라 그대로 교차 키다 — 창은 평균 나이표가
 * 아니라 그 사건의 실측 통과 창이다(calculateOuterPlanetMilestones, G6 · 재감사 CC-1).
 */
const NON_ACTIVE_ASTRO_KINDS: ReadonlySet<string> = new Set([
  'eclipse',
  'profection',
  'zodiacal-releasing',
  'planetary-hour',
  'solar-arc',
  'progression',
  'progressed-moon',
  'solar-return',
  'lunar-return',
])
/**
 * 라이프사이클 마디 중 진행 달 회귀(progressed_lunar_*)도 같은 상징 방향이다 — kind 는
 * 'lifecycle' 이지만 planets[0]='Moon' 은 진행 차트의 달이라, 그 decadal 창이 시진·일진과
 * 만나 '정인 × 달' 같은 교차를 냈다. 실제 회귀(목성·토성 등)는 그대로 키로 두며, 그 창은
 * 인생 마디와 같은 실측 통과 창이다(astro-lifecycle, G6).
 */
function isProgressedLifecycle(s: ActiveSignal): boolean {
  if (s.kind !== 'lifecycle') return false
  const event = s.evidence?.detail?.event
  return typeof event === 'string' && event.startsWith('progressed_')
}
function extractAstroKey(s: ActiveSignal): string | undefined {
  if (s.source !== 'astro') return undefined
  // affectedPoint(본명점)·상징적 지배성·상징 방향·회귀 주기 구간이라 활성 주체 아님 — 교차 제외.
  if (NON_ACTIVE_ASTRO_KINDS.has(s.kind) || isProgressedLifecycle(s)) return undefined
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
 * 페어 polarity 합성 — 부모가 매핑 방향에 동의할 때만 부호(파일 머리 '페어 polarity').
 *  - 두 부모 모두 매핑 부호, 또는 한쪽 매핑 부호 + 다른 쪽 0 → mapping.polarity.
 *  - 어느 부모든 매핑과 반대 부호, 또는 두 부모 모두 0 → 0.
 *  - 매핑 0 → 0.
 * 비영 결과는 언제나 매핑 부호이고, 그 부호와 반대인 부모는 없다(진리표 테스트·
 * CALCULATION_SPEC §4 의 생성 표가 이 함수에서 나온다).
 */
export function combinePolarity(
  sajuPolarity: number,
  astroPolarity: number,
  mappingPolarity: Polarity
): Polarity {
  const m = Math.sign(mappingPolarity)
  if (m === 0) return 0
  const s = Math.sign(sajuPolarity)
  const a = Math.sign(astroPolarity)
  if (s === -m || a === -m) return 0 // 한 부모라도 매핑과 반대로 당긴다
  if (s === 0 && a === 0) return 0 // 어느 부모도 매핑 방향을 싣지 않는다
  return mappingPolarity
}

type Sign = -1 | 0 | 1

/** combinePolarity 진리표 한 줄 — 매핑·사주 부모·점성 부모의 부호와 교차 부호. */
export interface CrossPolarityRow {
  mapping: Sign
  saju: Sign
  astro: Sign
  result: Sign
}

/**
 * combinePolarity 진리표(매핑 3 × 사주 3 × 점성 3 = 27줄). 진리표 테스트와
 * CALCULATION_SPEC §4 의 생성 표(docs:sync)가 같은 이 표를 읽는다 — 문서가 코드와
 * 어긋날 수 없다(엔진 감사 F5).
 */
export function crossPolarityTruthTable(): CrossPolarityRow[] {
  const signs: readonly Sign[] = [1, 0, -1]
  const rows: CrossPolarityRow[] = []
  for (const mapping of signs) {
    for (const saju of signs) {
      for (const astro of signs) {
        const result = Math.sign(combinePolarity(saju, astro, mapping)) as Sign
        rows.push({ mapping, saju, astro, result })
      }
    }
  }
  return rows
}

/** 층 폭 — 좁은 순. 교차 layer 는 두 부모 중 좁은 쪽(창이 교집합이므로). */
const LAYER_SPAN: Readonly<Record<SignalLayer, number>> = {
  instant: 0,
  hourly: 1,
  daily: 2,
  monthly: 3,
  yearly: 4,
  decadal: 5,
}

/** 두 부모 층 중 좁은 쪽 — 교차의 layer(파일 머리 '페어 layer'). */
export function narrowestLayer(a: SignalLayer, b: SignalLayer): SignalLayer {
  return LAYER_SPAN[a] <= LAYER_SPAN[b] ? a : b
}

/**
 * 한 페어를 ActiveSignal 로 합성.
 * 부모 두 신호 id 를 evidence.detail.parentIds 에 보존 — UI/디버그에서 인과 추적.
 */
function buildCrossSignal(
  sajuSig: ActiveSignal,
  astroSig: ActiveSignal,
  mapping: CrossMapping,
  window: ActiveWindow,
  layer: SignalLayer
): ActiveSignal {
  const polarity = combinePolarity(sajuSig.polarity, astroSig.polarity, mapping.polarity)
  const baseWeight = (sajuSig.weight ?? 0) * (astroSig.weight ?? 0) * 0.6
  // cross 신호는 부수적 — 단일 신호 weight 최대값(1.0) 이하로 cap.
  const weight = Math.max(0, Math.min(1, baseWeight))
  const name = `${mapping.saju} × ${PLANET_KO[mapping.astro] ?? mapping.astro}`
  // 부모가 매핑 방향에 동의하지 않아 0 이 됐는데 강한 길/흉 원문을 그대로 두면
  // "중립 마커(·) + 강한 경고문" 모순이 난다(감사 #9). 문구도 중립으로 교체 —
  // "X × Y — …" 머리 형식은 유지해 stripCrossPair 가 그대로 동작한다.
  // 매핑 자체가 중립(mapping.polarity===0, 예 역마×화성·편인×수성)이면 상쇄가 아니라
  // 양가(兩價)라 매핑 원문을 그대로 쓴다(감사 R3). 그 밖의 0 — 부호 충돌, 매핑과 반대인
  // 같은 방향 부모, 0·0 부모 — 은 모두 '상쇄' 카피(OD-10).
  const conflicted = polarity === 0 && mapping.polarity !== 0
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
        // 교차 layer = 좁은 부모 층(창이 교집합). 층별 교차 밴드는 그 층에서 검사 —
        // 외행성은 대운에서만, 빠른 행성은 시·일·월에서만(스케일 불일치 교차 차단, X7).
        const layer = narrowestLayer(sajuSig.layer, astroSig.layer)
        if (!crossLayerAllowed(mapping.astro, layer)) continue
        const window = makeWindow(start, end, (sb.p + ab.p) / 2)
        const crossSig = buildCrossSignal(sajuSig, astroSig, mapping, window, layer)
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
