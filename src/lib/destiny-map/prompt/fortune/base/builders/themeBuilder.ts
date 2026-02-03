/**
 * themeBuilder.ts - 테마별 분석 섹션 빌더
 */

import type { PillarData, HouseData, PlanetData } from '../prompt-types'
import { formatPillar } from '../formatters/ganjiFormatter'
import { getSignFromCusp } from '../formatters/astrologyFormatter'

interface ThemeContext {
  theme: string
  pillars?: {
    year?: PillarData
    month?: PillarData
    day?: PillarData
    time?: PillarData
  }
  sibsinDist: Record<string, number>
  lucky: string
  unlucky: string
  daeunText: string
  currentDaeun?: { element?: string }
  houses: HouseData[] | Record<string, HouseData>
  venus?: PlanetData
  mars?: PlanetData
  jupiter?: PlanetData
  saturn?: PlanetData
  moon?: PlanetData
  neptune?: PlanetData
  ascendant?: { sign?: string }
  mc?: { sign?: string }
  juno?: { sign?: string; house?: number }
  lilith?: { sign?: string; house?: number }
  chiron?: { sign?: string; house?: number }
  ceres?: { sign?: string; house?: number }
  relationshipText: string
  careerText: string
  suitableCareers: string
  yongsinPrimary: string
  yongsinAvoid: string
  healthWeak: string
  geokgukText: string
  geokgukDesc: string
  actualDayMaster: string
  actualDayMasterElement: string
  currentAnnual?: { ganji?: string; element?: string }
  currentMonthly?: { ganji?: string; element?: string }
  currentYear: number
  currentMonth: number
  significantTransits: string
  lunarReturnText: string
  futureMonthlyList: string
  futureAnnualList: string
  solarReturnText: string
  progressionsText: string
  allDaeunText: string
  facts?: { elementRatios?: Record<string, number> }
}

/**
 * 연애/배우자 전용 분석
 */
export function buildLoveAnalysisSection(ctx: ThemeContext): string {
  if (ctx.theme !== 'love') return ''

  const housesArray = Array.isArray(ctx.houses) ? ctx.houses : Object.values(ctx.houses)
  const house7Cusp = housesArray?.[6]?.cusp ?? 0
  const house7Sign = getSignFromCusp(house7Cusp)
  const house5Cusp = housesArray?.[4]?.cusp ?? 0
  const house5Sign = getSignFromCusp(house5Cusp)

  return `
═══════════════════════════════════════
💕 연애/배우자 심층 분석
═══════════════════════════════════════

[사주 연애/배우자 분석]
• 배우자궁(일지): ${ctx.pillars?.day?.earthlyBranch?.name ?? '-'} (${ctx.pillars?.day?.earthlyBranch?.element ?? '-'})
• 정재(남성-아내): ${ctx.sibsinDist['정재'] ?? 0}개 | 편재(여자친구): ${ctx.sibsinDist['편재'] ?? 0}개
• 정관(여성-남편): ${ctx.sibsinDist['정관'] ?? 0}개 | 편관(남자친구): ${ctx.sibsinDist['편관'] ?? 0}개
• 도화살: ${ctx.lucky.includes('도화') ? '있음 → 이성에게 인기' : '없음'} | 홍염살: ${ctx.lucky.includes('홍염') ? '있음 → 강한 성적 매력' : '없음'}
• 원진살/귀문살: ${ctx.unlucky.includes('원진') || ctx.unlucky.includes('귀문') ? '있음 → 관계 트러블 주의' : '없음'}

[점성술 연애 분석]
• Venus(금성): ${ctx.venus?.sign ?? '-'} H${ctx.venus?.house ?? '-'} → 연애 스타일, 끌리는 타입
• Mars(화성): ${ctx.mars?.sign ?? '-'} H${ctx.mars?.house ?? '-'} → 성적 매력, 추구 방식
• 5하우스(연애): ${house5Sign} → 로맨스 스타일, 즐거움
• 7하우스(결혼): ${house7Sign} → 배우자 특성, 결혼관
• Juno(결혼): ${ctx.juno ? `${ctx.juno.sign} H${ctx.juno.house}` : '-'} → 이상적 배우자상
• Lilith(그림자): ${ctx.lilith ? `${ctx.lilith.sign} H${ctx.lilith.house}` : '-'} → 숨겨진 욕망

[연애 타이밍 분석]
• 현재 대운: ${ctx.daeunText} → ${ctx.currentDaeun?.element === '수' || ctx.currentDaeun?.element === '목' ? '감정/인연 활성화 시기' : '안정적 관계 구축 시기'}
• 금성 트랜짓: 5하우스/7하우스 통과 시 연애 기회
• 목성 트랜짓: 7하우스 통과 시 결혼 기회

[해석 포인트]
• 배우자궁 오행 → 배우자 기질/성격
• 금성 사인 → 끌리는 외모/성격 타입
• 7하우스 사인 → 배우자 첫인상/외적 특성
• 5하우스 vs 7하우스 → 연애 vs 결혼 스타일 차이
• 도화+편관/편재 많으면 → 연애는 많으나 결혼 신중
• 정관/정재 강하면 → 진지한 교제, 조기 결혼 경향
`
}

/**
 * 직업/재물 전용 분석
 */
export function buildCareerAnalysisSection(ctx: ThemeContext): string {
  if (ctx.theme !== 'career' && ctx.theme !== 'wealth') return ''

  const housesArray = Array.isArray(ctx.houses) ? ctx.houses : Object.values(ctx.houses)
  const house2Sign = housesArray?.[1]?.sign ?? '-'
  const house6Sign = housesArray?.[5]?.sign ?? '-'
  const house10Sign = housesArray?.[9]?.sign ?? '-'

  const officialStar = (ctx.sibsinDist['정관'] ?? 0) + (ctx.sibsinDist['편관'] ?? 0)
  const wealthStar = (ctx.sibsinDist['정재'] ?? 0) + (ctx.sibsinDist['편재'] ?? 0)
  const outputStar = (ctx.sibsinDist['식신'] ?? 0) + (ctx.sibsinDist['상관'] ?? 0)

  return `
═══════════════════════════════════════
💼 직업/재물 심층 분석 데이터 (職業/財物 CAREER/WEALTH ANALYSIS)
═══════════════════════════════════════

[사주 직업 분석 - 四柱 職業]
• 격국(格局): ${ctx.geokgukText} - ${ctx.geokgukDesc}
• 용신(用神): ${ctx.yongsinPrimary} (기신: ${ctx.yongsinAvoid})
• 관성(官星) 직장운: 정관 ${ctx.sibsinDist['정관'] ?? 0}개 + 편관 ${ctx.sibsinDist['편관'] ?? 0}개 = 총 ${officialStar}개
• 재성(財星) 재물운: 정재 ${ctx.sibsinDist['정재'] ?? 0}개 + 편재 ${ctx.sibsinDist['편재'] ?? 0}개 = 총 ${wealthStar}개
• 식상(食傷) 창의력: 식신 ${ctx.sibsinDist['식신'] ?? 0}개 + 상관 ${ctx.sibsinDist['상관'] ?? 0}개 = 총 ${outputStar}개
• 비겁(比劫) 경쟁력: ${(ctx.sibsinDist['비견'] ?? 0) + (ctx.sibsinDist['겁재'] ?? 0)}개
• 적합 직업군: ${ctx.careerText}
• 업계 추천: ${ctx.suitableCareers}

[점성술 직업 분석 - WESTERN CAREER]
• MC(천정/Medium Coeli): ${ctx.mc?.sign ?? '-'} - 사회적 이미지/커리어 방향
• 10th House(커리어궁): ${house10Sign} - 직업적 성공 영역
• 6th House(일상업무궁): ${house6Sign} - 일하는 방식/근무 환경
• 2nd House(재물궁): ${house2Sign} - 돈 버는 방식/수입원
• Saturn(토성): ${ctx.saturn?.sign ?? '-'} (${ctx.saturn?.house ?? '-'}하우스) - 책임/장기목표/권위
• Jupiter(목성): ${ctx.jupiter?.sign ?? '-'} (${ctx.jupiter?.house ?? '-'}하우스) - 확장/기회/행운
• Mars(화성): ${ctx.mars?.sign ?? '-'} (${ctx.mars?.house ?? '-'}하우스) - 추진력/경쟁/야망

[직업 타이밍 분석]
• 현재 대운(大運): ${ctx.daeunText ?? '-'}
• 토성 트랜짓: 10하우스 통과 시 커리어 전환점/책임 증가
• 목성 트랜짓: 10하우스 통과 시 승진/확장 기회
• 목성 2하우스 통과: 수입 증가 가능성

[해석 포인트]
• 관성 강함(3+) → 조직 생활 유리, 안정적 직장인
• 관성 없음 → 프리랜서/자영업/창업 적합
• 재성 강함(3+) → 사업/투자/재테크 능력
• 식상 강함(3+) → 창의직/예술/기술직 적합
• MC 사인 → 사회에서 보이고 싶은 이미지
• 10하우스 vs 6하우스 → 큰 목표 vs 일상 업무 스타일 차이
• 토성 하우스 → 노력으로 성공할 영역
• 목성 하우스 → 자연스러운 행운/기회 영역
`
}

/**
 * 건강 전용 분석
 */
export function buildHealthAnalysisSection(ctx: ThemeContext): string {
  if (ctx.theme !== 'health') return ''

  const housesArray = Array.isArray(ctx.houses) ? ctx.houses : Object.values(ctx.houses)
  const house6Sign = housesArray?.[5]?.sign ?? '-'

  return `
═══════════════════════════════════════
🏥 건강 심층 분석 데이터 (健康 HEALTH ANALYSIS)
═══════════════════════════════════════

[사주 체질 분석 - 四柱 體質]
• 일간 체질: ${ctx.actualDayMaster} (${ctx.actualDayMasterElement})
• 오행 균형: ${
    Object.entries(ctx.facts?.elementRatios ?? {})
      .map(([k, v]) => `${k}:${v.toFixed?.(1) ?? v}`)
      .join(', ') || '-'
  }
• 부족 오행(용신): ${ctx.yongsinPrimary} → 이 오행 관련 장기 보강 필요
• 과다 오행(기신): ${ctx.yongsinAvoid} → 이 오행 관련 장기 과부하 주의
• 건강 취약 영역: ${ctx.healthWeak}

[오행별 장기/신체 연관표]
• 木(목): 간(肝), 담(膽), 눈, 근육, 손톱, 신경계
• 火(화): 심장(心), 소장(小腸), 혀, 혈관, 혈압
• 土(토): 비장(脾), 위장(胃), 입술, 살, 소화기
• 金(금): 폐(肺), 대장(大腸), 코, 피부, 털, 호흡기
• 水(수): 신장(腎), 방광(膀胱), 귀, 뼈, 치아, 생식기

[점성술 건강 분석 - WESTERN HEALTH]
• 6th House(건강궁): ${house6Sign} - 질병 경향/건강 관리 방식
• 1st House(신체): ASC ${ctx.ascendant?.sign ?? '-'} - 전반적 체력/외모
• Mars(화성): ${ctx.mars?.sign ?? '-'} (${ctx.mars?.house ?? '-'}하우스) - 에너지/염증/외상
• Saturn(토성): ${ctx.saturn?.sign ?? '-'} (${ctx.saturn?.house ?? '-'}하우스) - 만성질환/뼈/관절
• Chiron(카이론): ${ctx.chiron ? `${ctx.chiron.sign} (${ctx.chiron.house}하우스)` : '-'} - 상처/치유의 영역
• Neptune(해왕성): ${ctx.neptune?.sign ?? '-'} (${ctx.neptune?.house ?? '-'}하우스) - 면역/중독성

[건강 해석 가이드]
• 부족 오행 → 해당 장기 기능 약화, 음식/운동으로 보강
• 과다 오행 → 해당 장기 과부하, 절제/휴식 필요
• 6하우스 사인 → 질병 유형 및 건강 관리 스타일
• Chiron 하우스 → 평생 신경 써야 할 건강 영역
• 화성 긴장각 시기 → 급성 질환/사고 주의
• 토성 트랜짓 6하우스 → 건강 점검 필요 시기
• 목(木) 과다/화(火) 부족 → 혈압/심장 주의 등 상생상극 활용
`
}
