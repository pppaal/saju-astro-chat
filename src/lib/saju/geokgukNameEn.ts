/**
 * 격국 이름 KO→EN — 단일 출처(GeokgukType 전체 29종 + 미정).
 *
 * EN 이 주 시장이라 한 용어에 영어 이름은 하나여야 한다. 예전엔 캘린더(dayTierEnMaps,
 * 'Geonrok (Officer stipend)')와 상담사 컨텍스트(counselorContext GEOKGUK_SPECIAL_EN,
 * 'Established-rank (Geollok)')가 같은 격국을 다르게 불러, LLM 이 화면과 다른 이름으로
 * 답했다(G13). 화면에 보이는 캘린더 표기를 정본으로 이 중립 모듈에 두고, 캘린더 표면
 * (Life 머리말·Day 본명 풀이)과 상담사 컨텍스트가 모두 여기서 읽는다.
 * 고전 격국 어휘라 사실상 불변 — 표기는 로마자(한국어 독음) + 괄호 영어 뜻.
 */
export const GEOKGUK_NAME_EN: Readonly<Record<string, string>> = {
  // 정격 8
  식신격: 'Siksin (Eating-god)',
  상관격: 'Sanggwan (Hurting-officer)',
  편재격: 'Pyeonjae (Indirect-wealth)',
  정재격: 'Jeongjae (Direct-wealth)',
  편관격: 'Pyeongwan (Indirect-officer)',
  정관격: 'Jeonggwan (Direct-officer)',
  편인격: 'Pyeonin (Indirect-resource)',
  정인격: 'Jeongin (Direct-resource)',
  // 종격 5
  종왕격: 'Jongwang (Dominant self)',
  종강격: 'Jonggang (Dominant resource)',
  종아격: 'Jongah (Dominant output)',
  종재격: 'Jongjae (Dominant wealth)',
  종살격: 'Jongsal (Dominant officer)',
  // 비격 4
  건록격: 'Geonrok (Officer stipend)',
  양인격: 'Yangin (Blade edge)',
  월겁격: 'Wolgeop (Monthly rob)',
  잡기격: 'Japgi (Mixed storage)',
  // 화기격국 5
  갑기화토격: 'Gap-Gi Earth transformation',
  을경화금격: 'Eul-Gyeong Metal transformation',
  병신화수격: 'Byeong-Sin Water transformation',
  정임화목격: 'Jeong-Im Wood transformation',
  무계화화격: 'Mu-Gye Fire transformation',
  // 특수격국 5
  곡직격: 'Gokjik (Curved-straight Wood)',
  염상격: 'Yeomsang (Blazing Fire)',
  가색격: 'Gasaek (Sowing-reaping Earth)',
  종혁격: 'Jonghyeok (Reforming Metal)',
  윤하격: 'Yunha (Flowing Water)',
  // 미정
  미정: 'Undetermined',
}

/** 격국 EN 이름 — 표에 없으면 null(호출부가 폴백을 고른다). */
export function geokgukNameEn(name: string | null | undefined): string | null {
  if (!name) return null
  return GEOKGUK_NAME_EN[name] ?? null
}
