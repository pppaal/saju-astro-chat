/**
 * 올해 점성 한 줄 — 연간 프로펙션(annual profection). 매년 본명 상승점에서 한 칸씩
 * 도는 활성 하우스를 나이로 계산(완료 햇수 mod 12)해 그 해 점성 무게중심을 잡는다.
 * 나이 기반이라 ephemeris 불필요(프로덕션·테스트 모두 정확). monthly scope 노출.
 */
import type { NatalContext } from '../context/types'

const HOUSE_THEME_KO: Record<number, string> = {
  1: '자기·몸·새 출발',
  2: '재물·자원·가치관',
  3: '소통·배움·가까운 이동',
  4: '가정·뿌리·내면의 토대',
  5: '연애·창작·즐거움',
  6: '일·건강·일상 루틴',
  7: '관계·파트너·계약',
  8: '변환·깊이·재구성',
  9: '확장·여행·배움',
  10: '커리어·명예·사회적 위치',
  11: '동료·네트워크·목표',
  12: '마무리·치유·내면 정리',
}

export function deriveYearAstro(
  natal: NatalContext,
  year: number,
  lang: 'ko' | 'en' = 'ko'
): string | undefined {
  if (lang === 'en') return undefined // ko 우선
  const birthYear = natal.input?.year
  if (!birthYear) return undefined
  const age = year - birthYear // 완료 햇수 근사
  const house = (((age % 12) + 12) % 12) + 1
  const theme = HOUSE_THEME_KO[house]
  if (!theme) return undefined
  return `점성으로는 올해 ${house}번째 영역(${theme})이 활성화돼요 — 한 해의 무게중심이 이쪽으로 기울어요.`
}
