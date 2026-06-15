/**
 * 영어 서수 접미사 — 집/하우스 번호 등을 1st/2nd/3rd/4th… 로.
 * 이전엔 라벨이 `${n}th` 로 하드코딩돼 1th·2th·3th 같은 문법 오류가 노출됐다.
 */
export function ordinalEn(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}
