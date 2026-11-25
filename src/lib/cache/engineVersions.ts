/**
 * 엔진 산식 버전 — 캐시 키 무효화의 단일 출처 (의존성 없는 leaf).
 *
 * 각 값은 그 계산의 출력이 바뀌는 엔진 변경마다 올린다. 캐시 키가 이 값을 접어
 * 옛 결과가 웜 캐시로 나가지 않는다. 여러 엔진 결과를 묶어 캐시하는 소비자(운명상담사
 * 컨텍스트)는 ENGINE_VERSION_TAG 를 키에 넣어, 어느 엔진이 올라가도 함께 무효화된다
 * (엔진 감사 E14 — 예전엔 counselor:ctx 키를 손으로 v13→v14 올리지 않으면 30일 동안
 * 옛 판정이 나갔다).
 *
 * 이 파일은 prisma·swisseph 같은 무거운 모듈을 import 하지 않는다 — 키를 만드는 쪽이
 * 엔진 전체를 끌어오지 않게.
 */
import { SAJU_ENGINE_VERSION } from '@/lib/saju/constants'

export { SAJU_ENGINE_VERSION }

/**
 * 캘린더 엔진(사주/점성 추출기·deriver) 버전 시그니처. extractor·deriver 산식이 출력에
 * 영향 주게 바뀌면 bump → calendar-engine/persistence 의 birthKey 가 달라져
 * NatalContextCache·CalendarBuildCache 가 무효화된다.
 * (dataRetention 스윕이 옛 버전 NatalContextCache 고아 행을 지우는 기준이기도 하다.)
 */
// v3: cross-activation 산식 변경(profection/zodiacal-releasing 상징 지배성 교차
//     제외, 도화살/역마살 죽은 매핑 제거). 이 로직은 buildCalendar 안에서 돌아
//     캐시 blob 에 구워지므로, 웜 캐시가 옛 교차 신호를 계속 내보내지 않도록 bump.
// v4: 대운 커버리지 확장 매핑(정재×토성·식신×목성·비견×토성·겁재×명왕성) 추가.
//     cross-activation 추출기가 빌드 시 셀에 구우므로, 웜 캐시도 새 교차를 얻도록 bump.
// v5: 일/월 근거 커버리지 확장 — 교차 매핑 31→57쌍(달 5·태양 5·수성 5·금성 3·
//     화성 7·천을귀인×목성). 웜 캐시가 새 교차 근거를 얻도록 bump.
// v6: ZR 정통화(감사 A-1·A-2) — ① 나이 앵커를 출생년 1/1 → 실제 생일로(12월생
//     경계 최대 ~12개월 조기 발화 교정), ② Loosing-of-the-Bond 를 "7번째 사인"
//     오정의에서 Valens 점프(한 바퀴 후 반대편 진입) 규칙으로 재구현. ZR 신호
//     창·이벤트가 셀에 구워지므로 웜 캐시가 옛 경계를 계속 내보내지 않게 bump.
// v7: 자시(子時) 이중계상 교정(감사 C2) — 자시가 자정을 넘겨(23~01시) 두 날 셀에
//     걸려, 매일 셀이 자기 자시 + 전날 자시 새벽 꼬리(다른 時柱 천간) 두 개를 갖고
//     hourly 층을 이중 계상해 일점수를 부풀렸다. 각 셀은 그날 생성 시진만 남기도록
//     dedup — 점수 골격이 이동하므로 웜 캐시가 옛 점수를 계속 내보내지 않게 bump.
// v8: 절입 판정 기준 교정(엔진 감사 E1, OD-1) — 년·월주·대운수를 진경도 보정으로
//     옮긴 instant 가 아니라 생 UT 출생 instant 와 절입 instant 비교로 정한다(보정은
//     시주에만). 만 나이는 민용 생일. 본명 기둥·대운이 NatalContextCache 와 월 셀에
//     구워지므로 절입 근처 출생의 웜 캐시가 옛 기둥을 내보내지 않게 bump.
//     같은 미출시 릴리스의 신살 canon(엔진 감사 E3 — 태극·귀문·천주·도화 교정, 본명
//     삼재 제거; natalShinsal·일진 신살 점수가 바뀜)도 이 v8 에 함께 실린다. E3 만
//     따로 출시되면 그때 +1.
//     판단층 교정(엔진 감사 E4 — 강약 중심 보정, 용신 억부 정합, 화기격국 엄격 규칙;
//     natal strength·yongsin 이 NatalContextCache 에 구워지고 사주 추출기 극성이 모두
//     용신 기준이라 셀 점수가 바뀜)도 같은 미출시 릴리스라 v8 에 함께 실린다. E4 만
//     따로 출시되면 그때 +1.
//     점성 타이밍 교정(엔진 감사 E5 — 프로펙션 whole-sign, 진짜 Solar Arc·자기각
//     제외, 토성·목성 회귀 정확 일시; profection·solar-arc 신호와 lifecycle 마디가
//     셀·인생 흐름에 구워짐)도 같은 미출시 릴리스라 v8 에 함께 실린다. E5 만 따로
//     출시되면 그때 +1. (트랜짓 차트 Redis 캐시는 TRANSIT_CHART_CACHE_VERSION 으로 별도 무효화.)
//     시간 미상 삼주 분석(엔진 감사 E7 — 미상이면 시주 없이 강약·용신·격국·신살·관계·
//     오행, placeUnreliable 이면 ASC·MC·하우스 의존 신호 제외)도 같은 미출시 릴리스라
//     v8 에 함께 실린다. 미상·출생지 미상 플래그는 birthKey 에도 접는다 — 정오 앵커
//     '12:00' 이 실제 정오 출생과 같은 키로 섞이지 않게.
//     출생 instant 단일화(엔진 감사 E8 — 사주·점성 공용 RFC 5545 resolver, 경도 미상 =
//     존 기준 경도, 옛 'LMT +30' 표·DST 추정 삭제; 본명 시주와 시진 경계가 바뀜)도
//     같은 미출시 릴리스라 v8 에 함께 실린다. E8 만 따로 출시되면 그때 +1.
//     (E14 의 첫 대운 전 current=null 은 캘린더와 무관 — 캘린더 대운 창은 이미
//     startYear 부터라 bump 없음. 1900–1939 출생은 예전엔 throw 라 캐시된 행이 없다.)
// v9: 교차 범위 불변(엔진 감사 E9 — X1·X2·X3·F1·X4·X5·X10). 트랜짓·품위·달 위상 창을
//     범위 밖까지 이어 진짜 run 과 그 run 의 최소 orb 로, 子時를 민용일 안 두 조각(같은
//     時柱)으로, 교차 부모는 정통 기둥·시진·신살 × 실제 활성 행성만(오행 흐름·지장간·
//     행성시 제외), 교차 dedup 은 (셀, name, layer). 월 셀·포커스 1일 셀('day:' 키 — birthKey
//     를 접으므로 함께 무효화)에 구워지므로 bump.
// v10: 교차 교리(엔진 감사 E11 — X6·X7·X5·F5, OD-9·OD-10). 교차는 두 부모가 매핑 방향에
//     동의할 때만 부호(반대 부모·0·0 부모는 0), layer 는 좁은 부모 층(시진 교차는 hourly 로
//     남아 톤 밖)·밴드도 그 층에서, 솔라 아크·2차 진행·진행 달은 교차 키 아님, 도화×화성
//     은퇴. 교차 신호가 셀에 구워지므로 bump.
export const CALENDAR_ENGINE_VERSION = 'v10'

/**
 * 본명 차트 Redis 캐시(CacheKeys.natalChart, `natal:v${N}:…`).
 *   v2: timeZone 을 키에 추가.
 *   v3: natalToJD 가 사주와 같은 RFC 5545 resolver 를 쓴다(엔진 감사 E8) — 서머타임
 *       공백·겹침 시각의 차트가 1시간 옮겨 가므로 옛 차트를 버린다.
 */
export const NATAL_CHART_CACHE_VERSION = 3

/**
 * 트랜짓 차트 Redis 캐시(calendar-engine/ephe-cache, `ephe:transit:v${N}:…`).
 *   v2: timeZone 을 키에 추가.
 *   v3: isoToJD 가 'Z'·±hh:mm 접미사를 절대 순간으로 존중(엔진 감사 E5, ASTRO-4).
 */
export const TRANSIT_CHART_CACHE_VERSION = 3

/** Hellenistic 정적 분석 Redis 캐시(destiny/astroFacts, `hellenistic:v${N}:…`). */
export const HELLENISTIC_CACHE_VERSION = 1

/**
 * 엔진 버전 묶음 태그 — 여러 엔진 결과를 함께 캐시하는 키에 넣는다.
 * 예: 's4.cv9.n3.t3.h1'. 어느 값이 올라가도 태그가 바뀐다.
 */
export const ENGINE_VERSION_TAG = [
  `s${SAJU_ENGINE_VERSION}`,
  `c${CALENDAR_ENGINE_VERSION}`,
  `n${NATAL_CHART_CACHE_VERSION}`,
  `t${TRANSIT_CHART_CACHE_VERSION}`,
  `h${HELLENISTIC_CACHE_VERSION}`,
].join('.')
