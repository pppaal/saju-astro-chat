/**
 * 출생시각·출생지 미상(placeUnreliable) 마스킹 규칙 — 단일 출처 (CALCULATION_SPEC §6).
 *
 * 시간을 모르면 차트는 정오 앵커, 도시를 모르면 출생 타임존 기준점 좌표로 계산된다.
 * 그 차트의 ASC·MC·하우스와, 그 각에서 계산한 점(행운점 = ASC + 달 − 태양, 버텍스 =
 * 동서권과 황도의 서쪽 교점)은 그럴듯하지만 날조다. 그래서 그 사람에 대해서는
 *  - 앵글·앵글 파생점이 낀 각(본명·트랜짓·일식·시너스트리),
 *  - 하우스 번호와 하우스가 붙은 줄(오버레이·식점 하우스),
 *  - 앵글 사인(ASC/MC)과 컴포지트 앵글
 * 을 모두 뺀다. 행성 경도(달 포함)는 시각 미상이어도 날짜가 맞으면 남긴다.
 *
 * 리포트(astroFacts.maskPlaceDependentHellenistic)·운명상담사(formatAstroSelf skipAngles)·
 * 궁합(시너스트리·컴포지트·차트 모달) 이 모두 이 판정을 쓴다. 무거운 모듈을 import 하지
 * 않는 leaf 라 클라이언트 경로에서도 안전하다.
 */

/** 출생 시각·장소로 정해지는 앵글 이름(엔진·포매터마다 다른 표기를 모두 포함). */
const ANGLE_POINT_NAMES: ReadonlySet<string> = new Set([
  'Ascendant',
  'ASC',
  'Asc',
  'MC',
  'Midheaven',
  'IC',
  'Descendant',
  'DSC',
])

/**
 * 앵글이나 출생 순간·좌표에서 계산한 점 — 행운점(ASC 기준 lot, 낮/밤 공식도 섹트 의존)과
 * 버텍스(ARMC·위도). 카이런·릴리스·남교점은 시각·장소와 거의 무관해 여기 없다.
 */
const ANGLE_DERIVED_POINT_NAMES: ReadonlySet<string> = new Set([
  'PartOfFortune',
  'Part of Fortune',
  'Fortune',
  'Vertex',
])

/** 시간 미상 또는 도시 미상 — 그 사람의 ASC·MC·하우스를 믿을 수 없는가. */
export function isPlaceUnreliable(flags: {
  timeUnknown?: boolean | null
  cityUnknown?: boolean | null
}): boolean {
  return !!flags.timeUnknown || !!flags.cityUnknown
}

/** placeUnreliable 일 때 빼야 하는 점(앵글 또는 앵글 파생점)인가. */
export function isPlaceDependentPoint(name: string | null | undefined): boolean {
  if (!name) return false
  return ANGLE_POINT_NAMES.has(name) || ANGLE_DERIVED_POINT_NAMES.has(name)
}
