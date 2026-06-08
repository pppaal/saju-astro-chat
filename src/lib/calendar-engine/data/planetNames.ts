/**
 * 행성 영문 키 → 한글 이름 — 캘린더 엔진 공용 단일 정의.
 * 추출기·디라이버가 각자 들고 있던 동일 표를 여기로 통합. 10행성 전체를 담아
 * 7행성만 쓰는 소비처도 이 superset 을 그대로 인덱싱한다.
 * (시진 접미사 '시' 변형이나 EN-쌍 매핑이 필요한 추출기는 자기 변형을 따로 둔다.)
 */
export const PLANET_KO: Record<string, string> = {
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
  Uranus: '천왕성',
  Neptune: '해왕성',
  Pluto: '명왕성',
}
