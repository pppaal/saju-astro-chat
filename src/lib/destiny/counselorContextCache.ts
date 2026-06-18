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
import { resolveUserTz } from './counselorRequest'
import { getNowInTimezone } from '@/lib/datetime'
import { normalizeGender } from '@/lib/utils/gender'
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
    b.birthTime ?? '00:00',
    b.gender ?? 'male',
    b.timezone ?? 'Asia/Seoul',
    b.latitude ?? '',
    b.longitude ?? '',
  ].join('|')
}

/**
 * 캐시 hit 이면 즉시 반환, miss 면 빌드 후 캐시하고 반환.
 * realtime 답변 경로와 워밍 경로가 공유 — 워밍이 먼저 돌면 답변은 캐시 hit.
 */
export async function ensureCounselorContext(
  body: CounselorBirthInput,
  userId: string,
  lang: 'ko' | 'en'
): Promise<{ stableContext: string; dailyContext: string }> {
  const hourUnknown = !!body.birthTimeUnknown || !body.birthTime
  const cityUnknown =
    !!body.birthCityUnknown ||
    (body.latitude === undefined && body.longitude === undefined && !body.timezone)
  const userTz = resolveUserTz(body)
  const localNow = getNowInTimezone(userTz)
  const localDateKey = `${localNow.year}-${localNow.month}-${localNow.day}`
  // lang 을 키에 포함 — 빌드된 컨텍스트는 언어별로 다르다(한/영 라벨). 예전엔
  // 키에 lang 이 없어, ko 로 워밍/빌드한 캐시가 en 요청(쿠키/토글 전환)에 그대로
  // 서빙돼 "영문 시스템 프롬프트 + 한글 데이터" 혼용이 났다. v12→v13 으로 무효화.
  const stableCtxKey = `counselor:ctx:stable:v13:${lang}:${userId}:${birthFingerprint(body)}:${hourUnknown ? 'tU' : 'tK'}:${cityUnknown ? 'cU' : 'cK'}:${userTz}`
  const dailyCtxKey = `counselor:ctx:daily:v13:${lang}:${userId}:${birthFingerprint(body)}:${hourUnknown ? 'tU' : 'tK'}:${cityUnknown ? 'cU' : 'cK'}:${userTz}:${localDateKey}`

  // 두 키는 독립 — Redis 왕복을 병렬로 (직렬 대비 ~5ms, 매 상담 메시지 hot path).
  const [cachedStable, cachedDaily] = await Promise.all([
    cacheGet<string>(stableCtxKey),
    cacheGet<string>(dailyCtxKey),
  ])
  if (cachedStable && cachedDaily) {
    return { stableContext: cachedStable, dailyContext: cachedDaily }
  }

  const queryDate = new Date(localNow.year, localNow.month - 1, localNow.day, 12, 0, 0)
  const tz = body.timezone ?? 'Asia/Seoul'
  const birthDate = body.birthDate ?? ''
  const birthTime = body.birthTime ?? '00:00'
  const gender: 'male' | 'female' = normalizeGender(body.gender) === 'female' ? 'female' : 'male'
  const latitude = body.latitude ?? 37.5665
  const longitude = body.longitude ?? 126.978
  const birthTimeUnknown = hourUnknown
  const birthCityUnknown = cityUnknown

  const parts: string[] = []
  const locTag = birthCityUnknown
    ? '미상'
    : `${body.latitude?.toFixed(4) ?? '?'},${body.longitude?.toFixed(4) ?? '?'}`
  const timeTag = birthTimeUnknown ? '미상' : (body.birthTime ?? '미상')
  const genderTag = body.gender === 'female' ? 'F' : 'M'
  parts.push(
    `[Meta] birthDate: ${body.birthDate} | birthTime: ${timeTag} | gender: ${genderTag} | location: ${locTag} | timezone: ${body.timezone ?? 'Asia/Seoul'} | birthTimeUnknown: ${birthTimeUnknown ? 'true' : 'false'} | birthCityUnknown: ${birthCityUnknown ? 'true' : 'false'}`
  )
  if (birthTimeUnknown) parts.push('# 시간 미상 — 시주/일진/ASC/MC/하우스 인용 금지.')
  if (birthCityUnknown) parts.push('# 출생지 미상 — 위치 의존 결론 금지.')

  let stableCtxBody = ''
  let dailyCtxBody = ''
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
      userTz
    )
    stableCtxBody = split.stable
    dailyCtxBody = split.daily
  } catch (err) {
    logger.warn('[counselorContextCache] destiny context build failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  const stableContext = `<birth_data>\n${parts.join('\n')}${stableCtxBody ? `\n\n${stableCtxBody}` : ''}\n</birth_data>`
  const dailyContext = dailyCtxBody

  await Promise.all([
    cacheSet(stableCtxKey, stableContext, CACHE_TTL.NATAL_CHART), // 30d
    cacheSet(dailyCtxKey, dailyContext, CACHE_TTL.CALENDAR_DATA), // 1d
  ])
  return { stableContext, dailyContext }
}
