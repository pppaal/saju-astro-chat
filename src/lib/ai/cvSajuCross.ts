/**
 * CV (이력서) × 사주 cross interpretation.
 *
 * 사용자가 업로드한 CV를 키워드 추출해서 사주 해석과 매핑.
 * "사주가 가리키는 결"이 "실제 경력에서 어떻게 발현됐나"를 confirm 또는 contrast.
 *
 * 효과: 추상적 사주 narration이 *그 사람의 실제 데이터*에 anchor 됨.
 */

import { logger } from '@/lib/logger'

export interface CVSignals {
  jobs: string[] // 직업/직무 키워드 (디자이너, 개발자, 창업가 등)
  yearsExperience?: number // 경력 연차
  jobChanges?: number // 이직 횟수 추정
  fields: string[] // 분야 (IT, 금융, 의료, 예술 등)
  hasFoundedCompany: boolean
  hasBeenManager: boolean
  hasStudiedAbroad: boolean
}

const JOB_KEYWORDS: Record<string, string[]> = {
  디자이너: ['디자이너', '디자인', 'designer', 'design'],
  개발자: ['개발자', '엔지니어', 'engineer', 'developer', '프로그래머'],
  마케터: ['마케터', '마케팅', 'marketer', 'marketing', '브랜드'],
  영업: ['영업', '세일즈', 'sales', 'BD', 'business development'],
  기획자: ['기획자', '기획', 'planner', 'PM', '프로덕트 매니저'],
  연구원: ['연구원', '연구', 'researcher', 'PhD', '박사', '석사'],
  교사: ['교사', '강사', 'teacher', 'lecturer', '교수'],
  의료: ['의사', '간호사', '약사', 'doctor', 'nurse'],
  법무: ['변호사', '검사', '판사', 'lawyer', '법무'],
  금융: ['은행', '증권', '투자', 'banker', 'analyst', '재무'],
  창업: ['창업', '대표', 'founder', 'CEO', 'co-founder'],
  컨설턴트: ['컨설턴트', '컨설팅', 'consultant', '자문'],
  공무원: ['공무원', '공직', 'public servant'],
  예술: ['작가', '아티스트', 'artist', '음악', '미술', '배우', '작곡'],
  서비스: ['셰프', '바리스타', '요리', '서비스업'],
}

const FIELD_KEYWORDS: Record<string, string[]> = {
  IT: ['스타트업', 'IT', '소프트웨어', 'AI', '플랫폼', '앱', 'SaaS', 'tech'],
  금융: ['은행', '증권', '자산', '핀테크', '투자', '보험', 'finance'],
  의료: ['병원', '제약', '바이오', '헬스케어'],
  교육: ['학원', '학교', '대학', '교육'],
  예술: ['갤러리', '공연', '음악', '영상', '예술'],
  미디어: ['미디어', '방송', '신문', '출판', '광고'],
  법무: ['로펌', '법원', '검찰'],
  공공: ['공공기관', '시청', '정부', '공기업'],
}

const FOUND_COMPANY_RX = /(창업|founder|co-founder|CEO|대표\s*이사|회사를\s*설립|법인\s*설립)/i
const MANAGER_RX = /(팀장|이사|부장|매니저|manager|lead|director|head\s*of)/i
const ABROAD_RX = /(해외|유학|abroad|overseas|글로벌|global|MBA|exchange)/i

/**
 * CV 텍스트에서 signals 추출.
 */
export function extractCVSignals(cvText: string | undefined): CVSignals | null {
  if (!cvText || cvText.length < 50) return null
  const text = cvText.slice(0, 8000) // 안전 cap

  const jobs: string[] = []
  for (const [job, kws] of Object.entries(JOB_KEYWORDS)) {
    if (kws.some((kw) => text.toLowerCase().includes(kw.toLowerCase()))) {
      jobs.push(job)
    }
  }

  const fields: string[] = []
  for (const [f, kws] of Object.entries(FIELD_KEYWORDS)) {
    if (kws.some((kw) => text.toLowerCase().includes(kw.toLowerCase()))) {
      fields.push(f)
    }
  }

  // 경력 연차 추정 (1990-2025 같은 4자리 연도 페어)
  const yearMatches = text.match(/\b(19|20)\d{2}\b/g) || []
  const years = yearMatches.map(Number).filter((y) => y >= 1980 && y <= 2030)
  const minYear = years.length > 0 ? Math.min(...years) : undefined
  const maxYear = years.length > 0 ? Math.max(...years) : undefined
  const yearsExperience =
    minYear && maxYear && maxYear - minYear >= 1 ? maxYear - minYear : undefined

  // 이직 횟수 — "회사명 / 기간" 패턴 카운트 (대략적)
  const companyMarkers = (text.match(/(주식회사|\(주\)|Inc\.|Corp\.|Co\.,)/g) || []).length
  const periodMarkers = (text.match(/\d{4}\s*[.\-~]\s*\d{4}/g) || []).length
  const jobChanges = Math.max(companyMarkers, periodMarkers)

  return {
    jobs,
    yearsExperience,
    jobChanges: jobChanges > 0 ? jobChanges : undefined,
    fields,
    hasFoundedCompany: FOUND_COMPANY_RX.test(text),
    hasBeenManager: MANAGER_RX.test(text),
    hasStudiedAbroad: ABROAD_RX.test(text),
  }
}

interface SajuLite {
  geokguk?: string
  sibsinDistribution?: Record<string, number>
  shinsalList?: string[]
  dayMasterElement?: string
}

/**
 * CV signals + 사주 → cross narration.
 * "사주가 가리키는 결이 실제 경력에 어떻게 나타났는지" expert tone.
 */
export function buildCVSajuCrossKo(cv: CVSignals | null, saju: SajuLite): string {
  if (!cv) return ''
  const lines: string[] = []
  const sibsin = saju.sibsinDistribution || {}
  const sikCount = (sibsin['식신'] || 0) + (sibsin['상관'] || 0)
  const guanCount = (sibsin['정관'] || 0) + (sibsin['편관'] || 0)
  const jaeCount = (sibsin['정재'] || 0) + (sibsin['편재'] || 0)
  const inCount = (sibsin['정인'] || 0) + (sibsin['편인'] || 0)
  const biCount = (sibsin['비견'] || 0) + (sibsin['겁재'] || 0)
  const shinsal = new Set(saju.shinsalList || [])

  // 1) 직업 × 십신 confirm
  const expressionJobs = cv.jobs.filter((j) =>
    ['디자이너', '예술', '마케터', '미디어', '교사'].includes(j)
  )
  if (expressionJobs.length > 0 && sikCount >= 2) {
    lines.push(
      `이력서에 *${expressionJobs.join('·')}* 경력이 들어 있고 사주 식상(식신·상관)이 ${sikCount}개로 두텁다는 점이 정확히 맞물려요. 본명이 가리키는 *표현·창작 결*이 추상적인 가능성에 머무르지 않고 실제 직업으로 발현된 케이스라, 이 영역은 *맞는 길*에 들어와 있다는 강한 증거예요.`
    )
  }

  const responsibilityJobs = cv.jobs.filter((j) =>
    ['공무원', '법무', '의료', '연구원'].includes(j)
  )
  if ((responsibilityJobs.length > 0 || cv.hasBeenManager) && guanCount >= 2) {
    const what = responsibilityJobs.length > 0 ? responsibilityJobs.join('·') : '관리자 직급'
    lines.push(
      `이력서의 *${what}* 경력은 사주 관성(정관·편관) ${guanCount}개와 정확히 맞물리는 결이에요. 책임·평판·시스템 안에서의 자리가 본명에 깊이 박혀 있고, 그게 실제 직업 선택에 그대로 드러난 거라 *내적 결과 외적 길*이 같은 방향으로 정렬된 상태예요.`
    )
  }

  const wealthJobs = cv.jobs.filter((j) => ['영업', '금융', '창업'].includes(j))
  if ((wealthJobs.length > 0 || cv.hasFoundedCompany) && jaeCount >= 2) {
    const what = wealthJobs.length > 0 ? wealthJobs.join('·') : '창업'
    lines.push(
      `이력서의 *${what}* 경력은 사주 재성(정재·편재) ${jaeCount}개와 같은 방향이에요. *자원·돈을 다루는 결*이 본명에 두텁게 들어 있고, 그게 실제 직업으로 발현되어 있으니 이 영역에서 본인은 *직관과 경험이 같이 쌓인 자리*에서 결정해도 안전합니다.`
    )
  }

  if ((cv.jobs.includes('연구원') || cv.jobs.includes('교사')) && inCount >= 2) {
    lines.push(
      `이력서에 *연구·교육* 경력이 들어 있고 사주 인성(정인·편인) ${inCount}개도 두텁다는 점이 정확히 일치해요. 학문·체계·전달의 결이 본명 안에 깊이 박혀 있고 실제 직업으로도 발현된 자리라, 평생 학습이 직업의 일부로 자연스럽게 짜이는 패턴이에요.`
    )
  }

  if (cv.hasFoundedCompany && biCount >= 2) {
    lines.push(
      `이력서에 *창업* 이력이 있고 사주 비겁(비견·겁재) ${biCount}개가 두텁게 들어와 있어, *자기 색으로 한 영역을 정복하는 결*이 추상적 가능성에서 실제 행동으로 옮겨진 상태예요. 본명이 가리키는 1인 사업·자기 이름의 길을 이미 시작한 셈이고, 다음 결정도 같은 결로 이어가도 자연스러워요.`
    )
  }

  // 2) 이직 패턴 × 역마/인신충
  if (cv.jobChanges && cv.jobChanges >= 3) {
    const hasYeokma = shinsal.has('역마') || shinsal.has('지살')
    if (hasYeokma) {
      lines.push(
        `이력서에서 추정된 *${cv.jobChanges}회 이상의 이직·이동* 패턴은 사주 역마 신살과 정확히 맞물려요. 한 자리에 머무르기 어려운 결이 이미 본명에 박혀 있어 *움직이는 자체가 자산*이라는 점을 실제로 증명해온 셈이라, 안정 추구보다 다음 변동을 미리 설계하는 편이 잘 풀려요.`
      )
    } else {
      lines.push(
        `이력서에서 *${cv.jobChanges}회 이상의 이직·이동*이 추정되는데, 사주에 강한 역마 신호는 두드러지지 않아요. 이건 본명 결과 다른 외부 환경 때문에 잦은 이동을 했을 가능성이 있는 자리라, 다음 결정에선 본명의 안정 결을 한 번 더 들여다보는 게 좋아요.`
      )
    }
  }

  // 3) 해외 경력
  if (cv.hasStudiedAbroad) {
    const hasAbroadShinsal = shinsal.has('역마') || shinsal.has('지살') || shinsal.has('화개')
    if (hasAbroadShinsal) {
      lines.push(
        `이력서에 *해외·유학* 이력이 있고 사주에 역마·화개 같은 외부 확장 신살이 들어와 있어, 글로벌·이주·외국 환경이 본명에 *자연스러운 자리*라는 점이 확인돼요. 다음 결정에서도 한국 내부에 갇히기보다 글로벌 옵션을 같이 보는 편이 본명에 더 맞아요.`
      )
    }
  }

  // 4) 분야 × 일간 element
  if (cv.fields.length > 0) {
    const fieldEl: Record<string, string> = {
      IT: '목', // 시작·확장
      금융: '금', // 결단·정리
      예술: '수', // 직관·정서
      교육: '토', // 안정·전달
      미디어: '화', // 표현·발산
      의료: '금', // 정밀
      법무: '금',
      공공: '토',
    }
    const userEl = saju.dayMasterElement
    const matchingFields = cv.fields.filter((f) => fieldEl[f] === userEl)
    if (matchingFields.length > 0 && userEl) {
      lines.push(
        `이력서의 *${matchingFields.join('·')}* 분야가 사주 일간(${userEl}) 결과 같은 톤이에요. 본명의 핵심 결과 일하는 분야가 정렬돼 있다는 건 *분야 자체가 본인을 받쳐주는* 자리에 있다는 뜻이라, 그 분야 내에서 더 깊이 들어가는 결정에 무게를 실어도 좋아요.`
      )
    }
  }

  if (lines.length === 0) {
    // CV는 있는데 매칭되는 cross 신호가 없을 때 기본 한 줄
    return `이력서를 받았어요 (${cv.jobs.slice(0, 2).join('·') || '경력 정보'}). 본명 사주 결과 직접 매칭되는 강한 신호는 없지만, 구체적인 질문에서 사주와 묶어서 같이 풀어드릴게요.`
  }

  return `### 이력서 × 사주 cross\n${lines.join('\n\n')}`
}

/**
 * Counselor LLM 프롬프트에 주입할 narrative section.
 */
export function buildCVCounselorContextKo(
  cvText: string | undefined,
  saju: SajuLite
): string {
  try {
    const signals = extractCVSignals(cvText)
    if (!signals) return ''
    return buildCVSajuCrossKo(signals, saju)
  } catch (err) {
    logger.warn('[cvSajuCross] failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return ''
  }
}
