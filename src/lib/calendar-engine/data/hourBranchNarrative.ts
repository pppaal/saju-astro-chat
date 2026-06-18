// 12 시진(時辰) narrative DB — KO + EN baseline.
//
// 각 지지(子丑寅卯辰巳午未申酉戌亥)가 그 2시간의 기본 결을 결정.
// stem-sibsin은 polarity·strength로 따로 잡히고, 여기는 시진 자체의
// 사람말 baseline (KO + EN 각 3종 — baseline / positive / caution).
//
// 사용처: saju-hour extractor가 signal.evidence.detail에 `narrative`
// 필드를 채움 → 캘린더 daily detail 화면 24h 분석에서 노출.
//
// 톤 규칙:
//  - 한국어: ~해요 / ~좋아요 / ~잘 풀려요 같은 친근체로 통일
//  - 명사형 종결 ("...메모.") 금지
//  - 영어 차용어 ("윈도우") 금지 — '시간' / '시간대' 사용

// 12지지 한글 리터럴. saju/types에 별도 type alias가 없어서 인라인.
type Branch = '자' | '축' | '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해'

export interface HourBranchNarrative {
  /** 24h window like "23-1시" / "11pm-1am". */
  windowKo: string
  windowEn: string
  /** Baseline (polarity-neutral) one-liner. */
  baselineKo: string
  baselineEn: string
  /** When polarity is positive (good fit for this person). */
  positiveKo: string
  positiveEn: string
  /** When polarity is negative (caution window). */
  cautionKo: string
  cautionEn: string
}

export const HOUR_BRANCH_NARRATIVE: Record<Branch, HourBranchNarrative> = {
  자: {
    windowKo: '23-1시 (자시)',
    windowEn: '11pm-1am (Rat hour)',
    baselineKo: '하루를 마무리하는 시간이에요. 깊은 사색이나 기록, 내면 정리에 잘 맞아요.',
    baselineEn: 'A time to wrap up the day. Reflection, journaling, and inner work fit well.',
    positiveKo: '명상하거나 중요한 결정을 다시 점검해보기 좋은 시간이에요.',
    positiveEn: 'A good window to meditate or revisit important decisions.',
    cautionKo: '늦은 메시지나 즉흥적인 결정은 피하고 일찍 자는 편이 좋아요.',
    cautionEn: 'Avoid late-night messages and impulsive decisions; try to sleep early.',
  },
  축: {
    windowKo: '1-3시 (축시)',
    windowEn: '1-3am (Ox hour)',
    baselineKo: '깊은 수면과 회복의 시간이에요. 몸이 가장 푹 쉬어야 하는 때예요.',
    baselineEn: 'The deepest sleep window. Your body needs full rest now.',
    positiveKo: '꿈과 직관이 활발해져요. 영감이 떠오르면 짧게 메모해두세요.',
    positiveEn: 'Dreams and intuition come alive. If insight strikes, jot it down.',
    cautionKo: '잠을 못 자면 회복이 무너지는 때예요. 카페인이나 화면은 멀리하세요.',
    cautionEn: 'Missing sleep here breaks recovery. Skip caffeine and screens.',
  },
  인: {
    windowKo: '3-5시 (인시)',
    windowEn: '3-5am (Tiger hour)',
    baselineKo: '새벽 기운이 올라오는 시간이에요. 호흡과 기상 루틴이 자리잡기 좋아요.',
    baselineEn:
      'Dawn energy starts to rise. A good time to settle into breathwork and a morning routine.',
    positiveKo: '새 시작이나 도전에 우호적이에요. 일찍 일어나면 흐름이 잘 풀려요.',
    positiveEn: 'Favorable for fresh starts and bold moves. Early rising pays off.',
    cautionKo: '잠을 못 잤거나 일어나자마자 격한 운동은 부담돼요. 천천히 깨우세요.',
    cautionEn: "If you slept poorly, don't jump into hard workouts — wake up gently.",
  },
  묘: {
    windowKo: '5-7시 (묘시)',
    windowEn: '5-7am (Rabbit hour)',
    baselineKo: '아침을 정돈하는 시간이에요. 가벼운 산책이나 스트레칭, 계획 검토에 좋아요.',
    baselineEn:
      'Time to set up your morning. A light walk, stretching, and reviewing your plan all fit well.',
    positiveKo: '하루 중 머리가 가장 맑은 시간이에요. 중요한 글쓰기나 기획에 딱 좋아요.',
    positiveEn: 'Your mind is sharpest now. Best window for writing and big-picture planning.',
    cautionKo: '서두르거나 끼니를 거르면 하루 종일 페이스가 흔들려요.',
    cautionEn: "Don't rush or skip breakfast — it throws off your pace all day.",
  },
  진: {
    windowKo: '7-9시 (진시)',
    windowEn: '7-9am (Dragon hour)',
    baselineKo: '본격적인 활동을 시작하는 시간이에요. 출근, 이동, 첫 회의 셋업에 잘 맞아요.',
    baselineEn:
      'The active part of the day begins. Good for the commute, setting up meetings, and first calls.',
    positiveKo: '첫인상이나 발표에 유리해요. 중요한 메일도 이 시간에 보내세요.',
    positiveEn: 'Favorable for first impressions and presentations. Send key emails now.',
    cautionKo: '교통과 약속 시간이 꼬이기 쉬워요. 여유 있게 출발하세요.',
    cautionEn: 'Traffic and timing risks are high — leave with a buffer.',
  },
  사: {
    windowKo: '9-11시 (사시)',
    windowEn: '9-11am (Snake hour)',
    baselineKo: '집중력이 정점에 오르는 시간대예요. 가장 어려운 일이나 결정, 협상이 잘 풀려요.',
    baselineEn: 'Peak focus window. Your hardest tasks, decisions, and negotiations flow here.',
    positiveKo: '계약이나 면접, 핵심 미팅을 잡으면 결과가 좋아요. 두뇌가 가장 날카로워요.',
    positiveEn: 'Schedule contracts, interviews, and key meetings here — your mind is sharpest.',
    cautionKo: '회의를 길게 끌면 오후 에너지가 고갈돼요. 핵심만 빠르게 끝내세요.',
    cautionEn: 'Long meetings drain the afternoon — finish core items fast.',
  },
  오: {
    windowKo: '11-13시 (오시)',
    windowEn: '11am-1pm (Horse hour)',
    baselineKo: '정점을 지난 뒤 첫 휴식 시간이에요. 식사와 짧은 산책으로 리듬을 회복하세요.',
    baselineEn: 'First rest after the peak. A meal and a short walk restore your rhythm.',
    positiveKo: '사람들과 점심 약속을 잡으면 좋아요. 새로운 인연도 자연스럽게 자리잡아요.',
    positiveEn: 'A great time to meet someone over lunch; new connections form naturally.',
    cautionKo: '과식이나 강한 햇빛 노출은 오후 컨디션을 떨어뜨려요.',
    cautionEn: 'Overeating or strong sunlight saps the afternoon.',
  },
  미: {
    windowKo: '13-15시 (미시)',
    windowEn: '1-3pm (Goat hour)',
    baselineKo: '소화와 정리의 시간이에요. 가벼운 후속 업무나 자료 정리가 잘 풀려요.',
    baselineEn: 'Time to digest and tidy up. Follow-ups and admin work flow easily.',
    positiveKo: '꼼꼼한 검토나 교정, 디테일 작업이 가장 잘 되는 시간이에요.',
    positiveEn: 'Best window for careful review, proofreading, and detail work.',
    cautionKo: '졸음이나 집중 흩어짐이 흔해요. 큰 결정은 미루는 편이 안전해요.',
    cautionEn: 'Drowsiness and drift are common — postpone big decisions.',
  },
  신: {
    windowKo: '15-17시 (신시)',
    windowEn: '3-5pm (Monkey hour)',
    baselineKo: '오후 후반 활기가 돌아오는 시간이에요. 협업이나 브레인스토밍에 좋아요.',
    baselineEn: 'A late-afternoon second wind. Collaboration and brainstorming fit well here.',
    positiveKo: '아이디어 회의나 새 협업, 네트워킹 자리에 우호적이에요.',
    positiveEn: 'Favorable for idea meetings, new collabs, and networking.',
    cautionKo: '말이 너무 많아져서 결정이 흩어지기 쉬워요. 한 가지로 모으세요.',
    cautionEn: 'Too much talk scatters decisions — converge to one item.',
  },
  유: {
    windowKo: '17-19시 (유시)',
    windowEn: '5-7pm (Rooster hour)',
    baselineKo: '하루를 마무리하며 정산하는 시간이에요. 끝맺기나 체크리스트 마감에 잘 맞아요.',
    baselineEn: 'Time to wrap up and settle the day. Best for closing out tasks and checklists.',
    positiveKo: '하루를 돌아보고 다음 날 계획을 세우기에 가장 좋은 시간이에요.',
    positiveEn: "Best window for daily review and tomorrow's plan.",
    cautionKo: '술자리나 과한 약속은 다음 날 컨디션을 잡아먹어요.',
    cautionEn: 'Heavy drinking or over-committing now will cost you tomorrow.',
  },
  술: {
    windowKo: '19-21시 (술시)',
    windowEn: '7-9pm (Dog hour)',
    baselineKo: '저녁이 안정되는 시간이에요. 가족이나 가까운 사람, 휴식이 핵심이에요.',
    baselineEn: 'The evening settles. Family, close ties, and rest take center stage.',
    positiveKo: '가까운 사람과 나누는 대화나 소소한 정리가 관계를 단단하게 만들어요.',
    positiveEn: 'Talks with close ones and small tidy-ups strengthen bonds.',
    cautionKo: '예민한 주제나 논쟁은 다음 날로 미루는 편이 좋아요.',
    cautionEn: 'Postpone sensitive topics or arguments to tomorrow.',
  },
  해: {
    windowKo: '21-23시 (해시)',
    windowEn: '9-11pm (Pig hour)',
    baselineKo: '하루를 닫는 시간이에요. 휴식이나 독서, 가벼운 명상으로 마무리하세요.',
    baselineEn: 'Time to close out the day. Rest, read, or do a light meditation.',
    positiveKo: '꿈, 창작, 잠들기 전 짧은 영감 노트가 자리잡기 좋아요.',
    positiveEn: 'A good time for dreams, creative bursts, and a quick pre-sleep note.',
    cautionKo: '늦은 식사나 SNS, 자극적인 콘텐츠는 수면을 흩뜨려요.',
    cautionEn: 'Late meals, social media, or intense content disrupt sleep.',
  },
}

/** Get full narrative for an hour branch. */
function getHourNarrative(branch: Branch): HourBranchNarrative {
  return HOUR_BRANCH_NARRATIVE[branch]
}

/** 24h hour (0-23) → 12지지 branch. 자시(子)는 23-1시라 23·0 둘 다 자. */
const HOUR_TO_BRANCH: Record<number, Branch> = {
  23: '자',
  0: '자',
  1: '축',
  2: '축',
  3: '인',
  4: '인',
  5: '묘',
  6: '묘',
  7: '진',
  8: '진',
  9: '사',
  10: '사',
  11: '오',
  12: '오',
  13: '미',
  14: '미',
  15: '신',
  16: '신',
  17: '유',
  18: '유',
  19: '술',
  20: '술',
  21: '해',
  22: '해',
}

function branchFromHour(hour: number): Branch {
  return HOUR_TO_BRANCH[hour] ?? '자'
}

/** Pick the narrative string matching a polarity value. */
export function pickHourNarrative(
  branch: Branch,
  polarity: number,
  lang: 'ko' | 'en' = 'ko'
): string {
  const n = HOUR_BRANCH_NARRATIVE[branch]
  if (polarity >= 1) return lang === 'ko' ? n.positiveKo : n.positiveEn
  if (polarity <= -1) return lang === 'ko' ? n.cautionKo : n.cautionEn
  return lang === 'ko' ? n.baselineKo : n.baselineEn
}
