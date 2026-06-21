/**
 * dayDeepRead — 그날(일진)의 *합성 해석* 한 문단 (KO/EN).
 *
 * 새 점괘를 지어내지 않는다. 그날 이미 계산된 신호 — 일진 십신, 사주×점성 교차
 * 페어(polarity), 화해된 톤 — 을 명리/점성 표준 의미로 **이어 붙여** 2~4문장의
 * 읽을거리로 만든다. 같은 입력이면 항상 같은 문장(결정론·재현가능).
 *
 * 구성:
 *   1) 오늘 일진의 기운 한 줄 (일진 + 십신 분야).
 *   2) 가장 센 *우호* 교차가 있으면 — 그 페어가 힘을 보탠다.
 *   3) 가장 센 *충돌* 교차가 있으면 — 그 페어가 마찰을 준다(조심).
 *   4) 톤별 마무리 조언(순풍/평이/역풍).
 * 교차가 없으면 1)+4)만 — 여전히 십신·톤에 근거한 두 문장.
 *
 * 한글 조사 안전: 동적 페어 텍스트("정재 × 금성")엔 주격/목적격 조사를 붙이지
 * 않고 em-dash 로 절을 잇는다(비문 방지).
 */

import { sibsinArea, sibsinAreaEn } from './plainLanguage'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'

export type DeepReadTone = 'positive' | 'caution' | 'mixed'

export interface DeepReadCross {
  /** 사주측 키 — 십신/신살명(KO, 로케일 무관). */
  sajuKo: string
  /** 점성측 키 — 행성명(KO, 예 '금성'). */
  astroKo: string
  polarity: number
}

export interface DayDeepReadArgs {
  /** 일진 한글 읽기 — '갑자'. */
  iljinKr: string
  /** 일진 십신 — '편재'. */
  iljinSibsin: string
  /** 화해된 톤(헤드라인과 동일 권위). */
  tone: DeepReadTone
  /** 그날 사주×점성 교차 페어 (polarity 포함). */
  crosses: DeepReadCross[]
}

// KO 행성명 → EN (교차 페어 EN 표기용). plainLanguage 의 행성 평이어와 별개로
// 페어엔 행성 *이름* 을 쓴다("정재 × 금성" / "Direct Wealth × Venus").
const PLANET_KO_EN: Record<string, string> = {
  태양: 'Sun',
  달: 'Moon',
  수성: 'Mercury',
  금성: 'Venus',
  화성: 'Mars',
  목성: 'Jupiter',
  토성: 'Saturn',
  천왕성: 'Uranus',
  해왕성: 'Neptune',
  명왕성: 'Pluto',
}

const TONE_CLOSE: Record<DeepReadTone, { ko: string; en: string }> = {
  positive: {
    ko: '흐름을 믿고 한 발 더 나아가도 좋아요.',
    en: 'Trust the current and you can step a little further today.',
  },
  caution: {
    ko: '큰 결정은 미루고, 무리 없이 천천히 가세요.',
    en: 'Postpone the big calls and move slowly, without strain.',
  },
  mixed: {
    ko: '결단은 빠르게, 충돌은 한 박자 늦추세요.',
    en: 'Decide quickly, but slow any clash by a beat.',
  },
}

function pairKo(c: DeepReadCross): string {
  return `${c.sajuKo} × ${c.astroKo}`
}
function pairEn(c: DeepReadCross): string {
  return `${SIBSIN_EN[c.sajuKo] ?? c.sajuKo} × ${PLANET_KO_EN[c.astroKo] ?? c.astroKo}`
}

export function deriveDayDeepRead(args: DayDeepReadArgs): { ko: string; en: string } {
  const areaKo = sibsinArea(args.iljinSibsin)
  const areaEn = sibsinAreaEn(args.iljinSibsin)

  // 가장 센 우호/충돌 교차 (polarity 부호로 분리, |polarity| 최대).
  let pos: DeepReadCross | null = null
  let neg: DeepReadCross | null = null
  for (const c of args.crosses) {
    if (c.polarity > 0 && (!pos || c.polarity > pos.polarity)) pos = c
    else if (c.polarity < 0 && (!neg || c.polarity < neg.polarity)) neg = c
  }

  const ko: string[] = []
  const en: string[] = []

  // 1) 오늘 일진의 기운.
  ko.push(`오늘은 ${args.iljinKr}(${areaKo}) 기운이 흐르는 하루입니다.`)
  en.push(`Today carries the energy of ${args.iljinKr} — ${areaEn}.`)

  // 2) 우호 교차.
  if (pos) {
    ko.push(`${pairKo(pos)} — 두 결이 맞물려 힘을 보탭니다.`)
    en.push(`${pairEn(pos)} — the two lines mesh and lend force.`)
  }
  // 3) 충돌 교차. (우호가 없으면 '다만' 없이 단독으로.)
  if (neg) {
    ko.push(`${pos ? '다만 ' : ''}${pairKo(neg)} — 부딪치는 결이 있어 한 박자 조심하세요.`)
    en.push(`${pos ? 'That said, ' : ''}${pairEn(neg)} — these grind, so take it a beat carefully.`)
  }

  // 4) 톤 마무리.
  ko.push(TONE_CLOSE[args.tone].ko)
  en.push(TONE_CLOSE[args.tone].en)

  return { ko: ko.join(' '), en: en.join(' ') }
}
