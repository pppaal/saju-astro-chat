/**
 * 운명상담사 컨텍스트 캐시 — saju+astro 본명(stable) + 타이밍/일진(daily) 컨텍스트를
 * 빌드해 Redis 에 캐시한다. realtime 답변 경로와 진입 워밍(/api/counselor/warm) 이
 * *같은 키·같은 빌드* 를 쓰도록 단일 소스로 추출(키 드리프트 방지).
 *
 * stable = 본명(평생 불변) → 30일 TTL. daily = 일진/트랜짓(매일 변동) → 1일 TTL.
 * daily 가 매일 만료되므로, 워밍 없이는 "그날 첫 답변"마다 무거운 천체력 빌드가
 * critical path 에서 돈다 → 진입 시 미리 워밍해 첫 답변을 빠르게.
 */
import { buildDestinyContext } from './counselorContext'
import { resolveUserTz, type DestinySources } from './counselorRequest'
import { getNowInTimezone } from '@/lib/datetime'
import { normalizeGender } from '@/lib/utils/gender'
import { resolveBirthTimeAnchor, TIME_UNKNOWN_ANCHOR } from '@/lib/saju/birthTimeAnchor'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'

export interface CounselorBirthInput {
  birthDate?: string
  birthTime?: string
  birthTimeUnknown?: boolean
  gender?: string
  latitude?: number
  longitude?: number
  timezone?: string
  userTimezone?: string
  birthCityUnknown?: boolean
}

function birthFingerprint(b: CounselorBirthInput): string {
  return [
    b.birthDate ?? '',
    // 앵커 정규화 뒤의 값 — 시간 미상('00:00'/미입력/플래그)은 전부 정오로
    // 수렴하므로 같은 사람의 미상 표기가 달라도 키가 갈리지 않는다.
    b.birthTime ?? TIME_UNKNOWN_ANCHOR,
    // 차트/Meta 와 같은 정규화 값으로 — 'F'/'female'/'FEMALE' 이 서로 다른 캐시
    // 키로 갈려 같은 사람이 중복 빌드되던 fragmentation 방지.
    normalizeGender(b.gender) === 'female' ? 'female' : 'male',
    b.timezone ?? 'Asia/Seoul',
    b.latitude ?? '',
    b.longitude ?? '',
  ].join('|')
}

// 동시 중복 빌드 단일화(single-flight) — 첫 방문(콜드)엔 진입 워밍(/warm)과
// 첫 질문(/realtime)이 수백 ms 간격으로 같은 키를 miss 해, 무거운 천체력 빌드가
// *두 번 동시에* 돌며 같은 인스턴스 CPU 를 서로 뺏었다(워밍의 head start 무의미).
// 진행 중 빌드 promise 를 키별로 공유해 두 번째 요청이 첫 빌드에 합류하게 한다.
// 인스턴스-로컬 map 이라 별도 인스턴스로 갈린 요청엔 안 닿지만(그 경우 기존과
// 동일), 같은 인스턴스에선 빌드가 정확히 1회다. settle 시 제거 — 실패는 공유
// 순간까지만이고 다음 호출은 새로 빌드한다(실패 캐싱 없음).
const inFlightBuilds = new Map<string, Promise<{ stableContext: string; dailyContext: string }>>()

/**
 * 캐시 hit 이면 즉시 반환, miss 면 빌드 후 캐시하고 반환.
 * realtime 답변 경로와 워밍 경로가 공유 — 워밍이 먼저 돌면 답변은 캐시 hit.
 */
export async function ensureCounselorContext(
  body: CounselorBirthInput,
  userId: string,
  lang: 'ko' | 'en',
  // 이번 답변 데이터 소스(사주만/점성만/둘 다). 캐시 키에 포함해야 소스를
  // 바꾼 요청이 옛 소스로 빌드된 컨텍스트를 잘못 hit 하지 않는다.
  sources: DestinySources = { saju: true, astro: true }
): Promise<{ stableContext: string; dailyContext: string }> {
  // 시간 모름 → 정오 앵커(SSOT: birthTimeAnchor). 예전 '00:00' 앵커는 진태양시
  // 보정(-32분)으로 일주가 전날로 밀려, 상담사 LLM 이 통합리포트와 다른 사주를
  // 읽었다. '00:00' 입력도 미상으로 취급(프로필 저장 규약) — hourUnknown 판정과
  // 계산 앵커가 같은 헬퍼에서 나와 갈리지 않는다.
  const anchor = resolveBirthTimeAnchor(body.birthTime, body.birthTimeUnknown)
  body = { ...body, birthTime: anchor.time, birthTimeUnknown: anchor.timeUnknown }
  const hourUnknown = anchor.timeUnknown
  // 좌표가 없으면 도시 미상으로 본다 — timezone 이 있든 없든. 예전엔 timezone 이
  // 있으면(&& !body.timezone) cityUnknown=false 라, 좌표 없이 timezone 만 온
  // 요청이 서울 폴백 좌표(37.5665,126.978)로 ASC/MC/하우스를 계산하고 그걸
  // placeUnreliable=false 로 "신뢰"라 표기해 내보냈다(예: New York timezone 인데
  // 서울 앵글). 좌표 부재 자체를 미상으로 처리해 날조된 앵글이 신뢰로 새는 걸 막는다.
  const cityUnknown =
    !!body.birthCityUnknown || (body.latitude === undefined && body.longitude === undefined)
  const userTz = resolveUserTz(body)
  const localNow = getNowInTimezone(userTz)
  const localDateKey = `${localNow.year}-${localNow.month}-${localNow.day}`
  // lang 을 키에 포함 — 빌드된 컨텍스트는 언어별로 다르다(한/영 라벨). 예전엔
  // 키에 lang 이 없어, ko 로 워밍/빌드한 캐시가 en 요청(쿠키/토글 전환)에 그대로
  // 서빙돼 "영문 시스템 프롬프트 + 한글 데이터" 혼용이 났다. v12→v13 으로 무효화.
  // sources(사주만/점성만/둘 다)도 키에 포함 — 소스 토글마다 컨텍스트 바이트가
  // 달라, 안 넣으면 "사주만"으로 빌드된 캐시가 "둘 다" 요청에 잘못 hit 한다.
  const srcTag = `s${sources.saju ? 1 : 0}${sources.astro ? 1 : 0}`
  const stableCtxKey = `counselor:ctx:stable:v13:${lang}:${srcTag}:${userId}:${birthFingerprint(body)}:${hourUnknown ? 'tU' : 'tK'}:${cityUnknown ? 'cU' : 'cK'}:${userTz}`
  const dailyCtxKey = `counselor:ctx:daily:v13:${lang}:${srcTag}:${userId}:${birthFingerprint(body)}:${hourUnknown ? 'tU' : 'tK'}:${cityUnknown ? 'cU' : 'cK'}:${userTz}:${localDateKey}`

  // 두 키는 독립 — Redis 왕복을 병렬로 (직렬 대비 ~5ms, 매 상담 메시지 hot path).
  const [cachedStable, cachedDaily] = await Promise.all([
    cacheGet<string>(stableCtxKey),
    cacheGet<string>(dailyCtxKey),
  ])
  if (cachedStable && cachedDaily) {
    return { stableContext: cachedStable, dailyContext: cachedDaily }
  }

  // miss — 같은 키의 빌드가 이미 돌고 있으면 합류(single-flight).
  // dailyCtxKey 가 가장 구체적(=stable 키를 포함하는 조합 + 날짜)이라 이걸 키로 쓴다.
  const running = inFlightBuilds.get(dailyCtxKey)
  if (running) return running

  const buildP = buildAndCacheContext(body, lang, {
    stableCtxKey,
    dailyCtxKey,
    localNow,
    hourUnknown,
    cityUnknown,
    userTz,
    sources,
  })
  inFlightBuilds.set(dailyCtxKey, buildP)
  try {
    return await buildP
  } finally {
    inFlightBuilds.delete(dailyCtxKey)
  }
}

/** miss 경로의 실제 빌드+캐시 — single-flight 로 공유되는 본체. */
async function buildAndCacheContext(
  body: CounselorBirthInput,
  lang: 'ko' | 'en',
  opts: {
    stableCtxKey: string
    dailyCtxKey: string
    localNow: { year: number; month: number; day: number }
    hourUnknown: boolean
    cityUnknown: boolean
    userTz: string
    sources: DestinySources
  }
): Promise<{ stableContext: string; dailyContext: string }> {
  const { stableCtxKey, dailyCtxKey, localNow, hourUnknown, cityUnknown, userTz, sources } = opts
  // 기준 시각(=buildDestinyContext 의 now)은 서버 TZ 와 무관해야 한다. 예전엔
  // 서버-로컬 정오(new Date(y,m,d,12))라 UTC 서버와 KST 서버가 9h 어긋나,
  // 트랜짓 어스펙트 목록·절기 경계 판정이 배포 환경에 따라 달라지는 결정론
  // 누수가 있었다. 유저-tz 날짜의 UTC 정오로 고정한다(computeCurrentUnse 를
  // 부르는 counselorContext.ts:659 와 동일 패턴 — main 2c20428).
  const queryDate = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day, 12, 0, 0))
  const tz = body.timezone ?? 'Asia/Seoul'
  const birthDate = body.birthDate ?? ''
  // body 는 ensureCounselorContext 에서 앵커 정규화 완료 — 이 폴백은 방어용.
  const birthTime = body.birthTime ?? TIME_UNKNOWN_ANCHOR
  const gender: 'male' | 'female' = normalizeGender(body.gender) === 'female' ? 'female' : 'male'
  const latitude = body.latitude ?? 37.5665
  const longitude = body.longitude ?? 126.978
  const birthTimeUnknown = hourUnknown
  const birthCityUnknown = cityUnknown

  // 이 Meta 블록은 buildDestinyContext 밖(캐시 레이어)에서 붙으므로 EN-safety
  // 패스(koStructuralLabels)가 안 닿는다 → lang 분기를 직접 해야 EN 세션에
  // 한국어('미상', '# 시간 미상…')가 새지 않는다.
  const L = (ko: string, en: string) => (lang === 'en' ? en : ko)
  const unknownTag = L('미상', 'unknown')
  const parts: string[] = []
  const locTag = birthCityUnknown
    ? unknownTag
    : `${body.latitude?.toFixed(4) ?? '?'},${body.longitude?.toFixed(4) ?? '?'}`
  const timeTag = birthTimeUnknown ? unknownTag : (body.birthTime ?? unknownTag)
  // 차트는 normalizeGender(body.gender)('F'/'Female'/'FEMALE' 등 관대 처리)로
  // 계산하는데, 예전엔 Meta 태그만 raw exact-match(body.gender === 'female')라
  // 'F'/'Female' 입력 시 차트는 여성인데 프롬프트엔 gender: M 으로 새 상담사가
  // 성별을 반대로 읽었다(대운 방향은 성별 의존). 차트와 같은 정규화 값을 쓴다.
  const genderTag = gender === 'female' ? 'F' : 'M'
  parts.push(
    `[Meta] birthDate: ${body.birthDate} | birthTime: ${timeTag} | gender: ${genderTag} | location: ${locTag} | timezone: ${body.timezone ?? 'Asia/Seoul'} | birthTimeUnknown: ${birthTimeUnknown ? 'true' : 'false'} | birthCityUnknown: ${birthCityUnknown ? 'true' : 'false'}`
  )
  if (birthTimeUnknown)
    parts.push(
      L(
        '# 시간 미상 — 시주/일진/ASC/MC/하우스 인용 금지.',
        '# Birth time unknown — do not cite hour pillar / iljin / ASC / MC / houses.'
      )
    )
  if (birthCityUnknown)
    parts.push(
      L(
        '# 출생지 미상 — 위치 의존 결론 금지.',
        '# Birth city unknown — avoid location-dependent conclusions.'
      )
    )

  let stableCtxBody = ''
  let dailyCtxBody = ''
  let buildFailed = false
  try {
    const split = await buildDestinyContext(
      {
        birthDate,
        birthTime,
        gender,
        timezone: tz,
        latitude,
        longitude,
        birthTimeUnknown: hourUnknown,
        birthCityUnknown: cityUnknown,
      },
      queryDate,
      lang,
      userTz,
      sources
    )
    stableCtxBody = split.stable
    dailyCtxBody = split.daily
  } catch (err) {
    buildFailed = true
    logger.warn('[counselorContextCache] destiny context build failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  const stableContext = `<birth_data>\n${parts.join('\n')}${stableCtxBody ? `\n\n${stableCtxBody}` : ''}\n</birth_data>`
  const dailyContext = dailyCtxBody

  // 빌드 실패 시엔 차트 없는 [Meta]-only 컨텍스트가 나오는데, 예전엔 이걸 30일
  // 정본 캐시에 그대로 박아 이후 최대 30일간 차트 0 인 답변을 매 턴 과금하며
  // 내보냈다(자가복구 불가). 실패 시엔 짧은 네거티브 TTL(60s)로만 캐시해 —
  // 이번 요청은 degraded 컨텍스트로 답하되(신규 500 없음) 1분 뒤 다음 요청이
  // 정상 빌드를 재시도하게 한다.
  const NEGATIVE_TTL_SEC = 60
  const stableTtl = buildFailed ? NEGATIVE_TTL_SEC : CACHE_TTL.NATAL_CHART // 실패 60s / 정상 30d
  const dailyTtl = buildFailed ? NEGATIVE_TTL_SEC : CACHE_TTL.CALENDAR_DATA // 실패 60s / 정상 1d

  await Promise.all([
    cacheSet(stableCtxKey, stableContext, stableTtl),
    cacheSet(dailyCtxKey, dailyContext, dailyTtl),
  ])
  return { stableContext, dailyContext }
}
