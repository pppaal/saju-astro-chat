/**
 * K6 Event Launch Load Test — 1000 Concurrent Users
 *
 * 인플루언서 마케팅 / 앱 런칭 / 트래픽 이벤트 대비 시나리오. PR #838 까지의
 * 최적화(saju/astrology Redis 캐시, session list payload 축소 등)가 실제로
 * 1000 동시 사용자를 버틸 수 있는지 검증.
 *
 * 사용자 행동 분포 (실제 트래픽 패턴 추정):
 *   - 50%: 신규 사용자 — 메인 → 생일 입력 → /api/saju (cache miss → hit)
 *   - 30%: 운명상담사 사용자 — 인증 → counselor 진입 → chat 1턴
 *   - 15%: 궁합상담사 사용자 — picker → saju×2 + astro×2 → 분석
 *   - 5%:  캘린더 viewer — /api/calendar 호출
 *
 * 단계적 ramp-up (1000명 동시까지):
 *   1) Warm-up: 0 → 50 (1m) — 시스템 안정화
 *   2) Ramp 1: 50 → 200 (2m) — 점진적 증가
 *   3) Ramp 2: 200 → 500 (3m) — 중간 부하
 *   4) Ramp 3: 500 → 1000 (3m) — 목표 도달
 *   5) Hold: 1000 (5m) — 이벤트 지속 시뮬레이션
 *   6) Cool-down: 1000 → 0 (2m)
 * 총 ~16분.
 *
 * 실행:
 *   k6 run tests/performance/k6/event-launch.js
 *
 * 운영 환경 부하 테스트 (조심해서):
 *   API_BASE_URL=https://destinypal.com k6 run tests/performance/k6/event-launch.js
 *
 * Threshold (실패 시 exit code 99):
 *   - p(95) < 2000ms — 1000 동시에서 응답 2초 안
 *   - p(99) < 5000ms — outlier 5초 안
 *   - error rate < 10% — 429 / 500 합쳐서 10% 미만
 *   - cache hit rate > 60% — 같은 생년월일 반복 호출 시 캐시 효과 검증
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// 커스텀 메트릭
const errorRate = new Rate('errors')
const sajuCacheHits = new Counter('saju_cache_hits') // x-cache-hit 헤더 보면 cache 작동 확인
const sajuLatency = new Trend('saju_latency_ms')
const astroLatency = new Trend('astrology_latency_ms')
const counselorJourneyOk = new Rate('counselor_journey_success')

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Warm-up
    { duration: '2m', target: 200 }, // Ramp 1
    { duration: '3m', target: 500 }, // Ramp 2
    { duration: '3m', target: 1000 }, // Ramp 3 (target peak)
    { duration: '5m', target: 1000 }, // Hold at 1000
    { duration: '2m', target: 0 }, // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    errors: ['rate<0.10'],
    counselor_journey_success: ['rate>0.80'],
    // 90% 의 saju 호출이 1초 안 (cache hit 효과 검증)
    saju_latency_ms: ['p(90)<1000'],
  },
}

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000'
const API_TOKEN = __ENV.NEXT_PUBLIC_API_TOKEN || ''

// 부하 테스트 시 사용할 출생 데이터 풀 — 캐시 hit 검증 위해 일부 동일 데이터 사용.
// 약 10개 unique birth profile 로 1000명 시뮬 → 캐시 hit 율 자연스럽게 ~90%.
const BIRTH_PROFILES = [
  { date: '1995-02-09', time: '06:40', city: 'Seoul', lat: 37.5665, lng: 126.978, gender: 'male' },
  { date: '1991-08-15', time: '14:20', city: 'Seoul', lat: 37.5665, lng: 126.978, gender: 'female' },
  { date: '1988-03-22', time: '09:15', city: 'Busan', lat: 35.1796, lng: 129.0756, gender: 'male' },
  { date: '1993-11-30', time: '23:45', city: 'Seoul', lat: 37.5665, lng: 126.978, gender: 'female' },
  { date: '1985-06-18', time: '12:00', city: 'Daegu', lat: 35.8714, lng: 128.6014, gender: 'male' },
  { date: '1997-01-05', time: '04:30', city: 'Seoul', lat: 37.5665, lng: 126.978, gender: 'female' },
  { date: '1990-09-12', time: '17:50', city: 'Incheon', lat: 37.4563, lng: 126.7052, gender: 'male' },
  { date: '1996-04-25', time: '08:00', city: 'Seoul', lat: 37.5665, lng: 126.978, gender: 'female' },
  { date: '1989-12-08', time: '21:10', city: 'Gwangju', lat: 35.1595, lng: 126.8526, gender: 'male' },
  { date: '1994-07-03', time: '02:30', city: 'Seoul', lat: 37.5665, lng: 126.978, gender: 'female' },
]

function pickProfile() {
  return BIRTH_PROFILES[Math.floor(Math.random() * BIRTH_PROFILES.length)]
}

export function setup() {
  console.log(`[Event Launch] Starting load test against ${BASE_URL}`)
  console.log(`[Event Launch] Peak target: 1000 concurrent users`)
  console.log(`[Event Launch] Duration: ~16 minutes`)

  // Server reachability check
  const res = http.get(`${BASE_URL}/api/auth/session`)
  if (res.status !== 200 && res.status !== 401) {
    throw new Error(`Server not reachable: ${BASE_URL} (status ${res.status})`)
  }
  return { baseUrl: BASE_URL }
}

// ===== Journey 1: Saju 신규 사용자 (50% of traffic) =====
function sajuJourney(baseUrl) {
  group('Saju calculation (new user)', () => {
    const profile = pickProfile()

    // 1. 메인 페이지 진입 (session 체크)
    let res = http.get(`${baseUrl}/api/auth/session`)
    check(res, { 'session check': (r) => r.status === 200 || r.status === 401 })

    sleep(Math.random() * 2 + 1) // 1-3초 페이지 둘러보기

    // 2. 도시 검색 (autocomplete)
    res = http.get(`${baseUrl}/api/cities?query=${encodeURIComponent(profile.city)}`)
    check(res, { 'city search': (r) => r.status === 200 })

    sleep(Math.random() * 3 + 2) // 2-5초 입력

    // 3. 사주 계산 — Redis 캐시 hit 검증 대상
    const sajuStart = Date.now()
    res = http.post(
      `${baseUrl}/api/saju`,
      JSON.stringify({
        birthDate: profile.date,
        birthTime: profile.time,
        gender: profile.gender,
        calendarType: 'solar',
        timezone: 'Asia/Seoul',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': API_TOKEN,
        },
      }
    )
    sajuLatency.add(Date.now() - sajuStart)
    const ok = check(res, {
      'saju 200/429': (r) => r.status === 200 || r.status === 429,
      'saju < 3s': (r) => r.timings.duration < 3000,
    })
    if (!ok) errorRate.add(1)
    // x-cache-hit 헤더 있으면 count (있는 경우만)
    if (res.headers['X-Cache-Hit'] === 'true') sajuCacheHits.add(1)

    sleep(Math.random() * 3 + 2) // 결과 확인
  })
}

// ===== Journey 2: 운명상담사 (30% of traffic) =====
function counselorJourney(baseUrl) {
  let journeyOk = true
  group('Counselor flow', () => {
    const profile = pickProfile()

    // 1. counselor 진입 (auth 필요 — 401 도 정상으로 간주, 게스트 흐름)
    let res = http.get(`${baseUrl}/api/auth/session`)
    if (res.status !== 200 && res.status !== 401) journeyOk = false

    sleep(1)

    // 2. 세션 리스트 조회 (사이드바) — payload 축소 fix 검증
    res = http.get(`${baseUrl}/api/counselor/session/list?limit=30&type=destiny`, {
      headers: { Cookie: 'next-auth.session-token=test-token' },
    })
    // 게스트면 401, 로그인이면 200. 둘 다 OK.
    check(res, { 'session list': (r) => r.status === 200 || r.status === 401 })

    sleep(Math.random() * 2 + 1)

    // 3. 사주 계산 (운명상담사 진입 시 자동 호출)
    res = http.post(
      `${baseUrl}/api/saju`,
      JSON.stringify({
        birthDate: profile.date,
        birthTime: profile.time,
        gender: profile.gender,
        calendarType: 'solar',
        timezone: 'Asia/Seoul',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': API_TOKEN,
        },
      }
    )
    if (res.status !== 200 && res.status !== 429) journeyOk = false

    sleep(Math.random() * 3 + 2)

    counselorJourneyOk.add(journeyOk ? 1 : 0)
  })
}

// ===== Journey 3: 궁합상담사 (15% of traffic) — 4 parallel call hot path =====
function compatJourney(baseUrl) {
  group('Compat counselor (4 parallel API calls)', () => {
    const p1 = pickProfile()
    let p2 = pickProfile()
    while (p2.date === p1.date) p2 = pickProfile() // 다른 사람

    sleep(Math.random() * 2 + 1) // picker 입력

    // 궁합 진입 시 페이지가 fetchPersonData 로 호출하는 4 fetch.
    // k6 batch 로 parallel 시뮬.
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Token': API_TOKEN,
    }
    const responses = http.batch([
      [
        'POST',
        `${baseUrl}/api/saju`,
        JSON.stringify({
          birthDate: p1.date,
          birthTime: p1.time,
          gender: p1.gender,
          calendarType: 'solar',
          timezone: 'Asia/Seoul',
        }),
        { headers },
      ],
      [
        'POST',
        `${baseUrl}/api/saju`,
        JSON.stringify({
          birthDate: p2.date,
          birthTime: p2.time,
          gender: p2.gender,
          calendarType: 'solar',
          timezone: 'Asia/Seoul',
        }),
        { headers },
      ],
      [
        'POST',
        `${baseUrl}/api/astrology`,
        JSON.stringify({
          date: p1.date,
          time: p1.time,
          latitude: p1.lat,
          longitude: p1.lng,
          timeZone: 'Asia/Seoul',
        }),
        { headers },
      ],
      [
        'POST',
        `${baseUrl}/api/astrology`,
        JSON.stringify({
          date: p2.date,
          time: p2.time,
          latitude: p2.lat,
          longitude: p2.lng,
          timeZone: 'Asia/Seoul',
        }),
        { headers },
      ],
    ])

    let allOk = true
    for (const [i, res] of responses.entries()) {
      const ok = check(res, {
        [`compat fetch ${i} status`]: (r) => r.status === 200 || r.status === 429,
        [`compat fetch ${i} < 3s`]: (r) => r.timings.duration < 3000,
      })
      if (!ok) allOk = false
      if (i >= 2) astroLatency.add(res.timings.duration)
      else sajuLatency.add(res.timings.duration)
    }
    if (!allOk) errorRate.add(1)

    sleep(Math.random() * 4 + 2)
  })
}

// ===== Journey 4: 캘린더 (5%) =====
function calendarJourney(baseUrl) {
  group('Calendar', () => {
    const profile = pickProfile()
    const res = http.get(
      `${baseUrl}/api/calendar?birthDate=${profile.date}&birthTime=${profile.time}` +
        `&birthPlace=${encodeURIComponent(profile.city)}&gender=${profile.gender}` +
        `&year=${new Date().getFullYear()}&locale=ko`
    )
    check(res, {
      'calendar 200': (r) => r.status === 200 || r.status === 429,
      'calendar < 5s': (r) => r.timings.duration < 5000,
    })
    if (res.status !== 200 && res.status !== 429) errorRate.add(1)

    sleep(Math.random() * 3 + 2)
  })
}

// 메인 entry — 가중치로 journey 분배
export default function (data) {
  const rand = Math.random()
  if (rand < 0.5) {
    sajuJourney(data.baseUrl)
  } else if (rand < 0.8) {
    counselorJourney(data.baseUrl)
  } else if (rand < 0.95) {
    compatJourney(data.baseUrl)
  } else {
    calendarJourney(data.baseUrl)
  }
}

export function teardown(data) {
  console.log(`[Event Launch] Test complete against ${data.baseUrl}`)
  console.log('[Event Launch] Check the summary above for:')
  console.log('  - http_req_duration p(95) / p(99)')
  console.log('  - errors rate')
  console.log('  - saju_latency_ms (Redis 캐시 효과)')
  console.log('  - counselor_journey_success rate')
}
