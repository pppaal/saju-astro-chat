// 12 시진(時辰) narrative DB — KO + EN baseline.
//
// 각 지지(子丑寅卯辰巳午未申酉戌亥)가 그 2시간 윈도우의 기본 결을 결정.
// stem-sibsin은 polarity·strength로 따로 잡히고, 여기는 시진 자체의
// 사람말 baseline (KO 두 줄, EN 두 줄).
//
// 사용처: saju-hour extractor가 signal.evidence.detail에 `narrative`
// 필드 채움 → 캘린더 daily detail 화면 24h 분석에서 노출.

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
    baselineKo: '하루를 마무리하는 시간. 깊은 사색·기록·내면 정리에 잘 맞아요.',
    baselineEn: 'Day-closing hour. Best for reflection, journaling, inner work.',
    positiveKo: '명상·정리·중요한 결정 다시 점검하기 좋은 시간.',
    positiveEn: 'Good window for meditation, review, and revisiting key decisions.',
    cautionKo: '늦은 메시지·즉흥적 결정은 피하고 일찍 자는 편이 좋아요.',
    cautionEn: 'Avoid late-night messages and impulsive decisions; sleep early.',
  },
  축: {
    windowKo: '1-3시 (축시)',
    windowEn: '1-3am (Ox hour)',
    baselineKo: '깊은 수면·회복의 시간. 몸이 가장 쉬어야 하는 윈도우.',
    baselineEn: 'Deepest sleep window. The body should be at full rest.',
    positiveKo: '꿈·직관·잠재의식이 활발 — 영감이 떠오르면 짧게 메모.',
    positiveEn: 'Dreams and intuition are active — note any insight briefly.',
    cautionKo: '잠 못 자면 회복이 무너지는 시간 — 카페인·스크린 멀리하세요.',
    cautionEn: 'Missing sleep here breaks recovery — avoid caffeine and screens.',
  },
  인: {
    windowKo: '3-5시 (인시)',
    windowEn: '3-5am (Tiger hour)',
    baselineKo: '새벽 기운이 솟는 시간. 호흡·기상 루틴이 자리잡는 윈도우.',
    baselineEn: 'Dawn energy rises. Breathwork and morning routines settle.',
    positiveKo: '새 시작·도전·계획 출발에 우호적. 일찍 일어나면 운이 와요.',
    positiveEn: 'Favorable for fresh starts and bold moves. Early rising pays.',
    cautionKo: '불면·기상 직후 격한 운동은 부담. 천천히 깨우세요.',
    cautionEn: 'Insomnia or sudden hard workouts right after waking strain you.',
  },
  묘: {
    windowKo: '5-7시 (묘시)',
    windowEn: '5-7am (Rabbit hour)',
    baselineKo: '아침 시작·정돈의 시간. 가벼운 산책·스트레칭·계획 검토에 좋아요.',
    baselineEn: 'Morning setup hour. Light walk, stretching, planning fits.',
    positiveKo: '주간 가장 머리가 맑은 시간 — 중요한 글쓰기·기획에 적합.',
    positiveEn: 'Sharpest mind of the day — best for writing and planning.',
    cautionKo: '서두르거나 끼니를 거르면 하루 종일 페이스 흔들려요.',
    cautionEn: "Don't rush or skip breakfast — pace breaks for the day.",
  },
  진: {
    windowKo: '7-9시 (진시)',
    windowEn: '7-9am (Dragon hour)',
    baselineKo: '본격 활동 시작 시간. 출근·이동·중요한 회의 셋업에 잘 맞아요.',
    baselineEn: 'Active phase begins. Commute, meeting setup, first calls.',
    positiveKo: '인상·첫 만남·발표에 유리 — 첫 메일도 이 시간에 보내세요.',
    positiveEn: 'Favorable for first impressions, presentations, opening emails.',
    cautionKo: '교통·약속 시간 변수 큼. 여유 있게 출발하세요.',
    cautionEn: 'Traffic and timing risk high — leave with buffer.',
  },
  사: {
    windowKo: '9-11시 (사시)',
    windowEn: '9-11am (Snake hour)',
    baselineKo: '집중력 정점 시간대. 가장 어려운 일·결정·협상이 잘 풀려요.',
    baselineEn: 'Peak focus window. Hardest tasks, decisions, negotiations.',
    positiveKo: '계약·면접·핵심 미팅 잡으면 결과 좋음. 두뇌가 가장 날카로움.',
    positiveEn: 'Schedule contracts, interviews, key meetings here for best results.',
    cautionKo: '회의 끌면 오후 에너지 고갈. 핵심만 빠르게 끝내세요.',
    cautionEn: 'Stretched meetings drain the afternoon — finish core items fast.',
  },
  오: {
    windowKo: '11-13시 (오시)',
    windowEn: '11am-1pm (Horse hour)',
    baselineKo: '정점 후 첫 휴식 윈도우. 식사·짧은 산책으로 리듬 회복.',
    baselineEn: 'First rest after peak. Meal and short walk restore rhythm.',
    positiveKo: '관계·사람 챙기는 점심 약속에 좋음. 새 인연도 잘 자리잡아요.',
    positiveEn: 'Good for lunch with people; new connections settle naturally.',
    cautionKo: '과식·뜨거운 차 직사광선 노출은 오후 컨디션 떨어뜨려요.',
    cautionEn: 'Overeating or direct heat hurts the afternoon.',
  },
  미: {
    windowKo: '13-15시 (미시)',
    windowEn: '1-3pm (Goat hour)',
    baselineKo: '소화·정리의 시간. 가벼운 후속 업무·자료 정리가 잘 됨.',
    baselineEn: 'Digest-and-organize window. Follow-ups and admin work flow.',
    positiveKo: '꼼꼼한 검토·교정·디테일 작업이 가장 잘 되는 시간.',
    positiveEn: 'Best window for careful review, proofreading, detail work.',
    cautionKo: '졸음·집중 흩어짐 흔함. 큰 결정은 미루는 편이 안전.',
    cautionEn: 'Drowsiness and drift common — postpone big decisions.',
  },
  신: {
    windowKo: '15-17시 (신시)',
    windowEn: '3-5pm (Monkey hour)',
    baselineKo: '오후 후반 활기 회복 시간. 사람과의 협업·브레인스토밍에 좋아요.',
    baselineEn: 'Late-afternoon recharge. Collaboration and brainstorming fit.',
    positiveKo: '아이디어 회의·새 협업 시작·네트워킹 자리에 우호적.',
    positiveEn: 'Favorable for idea meetings, new collabs, networking.',
    cautionKo: '말이 너무 많아져서 결정 흩어지기 쉬움. 한 가지로 모으세요.',
    cautionEn: 'Talkiness scatters decisions — converge to one item.',
  },
  유: {
    windowKo: '17-19시 (유시)',
    windowEn: '5-7pm (Rooster hour)',
    baselineKo: '하루 마무리 + 정산 시간. 끝맺기·체크리스트 마감에 적합.',
    baselineEn: 'Day wrap-up. Closing tasks and checklists fit best.',
    positiveKo: '하루 종합 회고·다음 날 계획 짜기에 가장 좋음.',
    positiveEn: "Best window for daily review and tomorrow's plan.",
    cautionKo: '술자리·과한 약속은 다음 날 컨디션 잡아먹어요.',
    cautionEn: 'Heavy drinks or commitments here cost tomorrow.',
  },
  술: {
    windowKo: '19-21시 (술시)',
    windowEn: '7-9pm (Dog hour)',
    baselineKo: '저녁 안정 시간. 가족·친밀한 관계·휴식이 핵심.',
    baselineEn: 'Evening anchoring. Family, close ties, rest take center.',
    positiveKo: '가까운 사람과의 대화·소소한 정리가 관계를 단단하게 만들어요.',
    positiveEn: 'Talks with close ones and tidy-up strengthen bonds.',
    cautionKo: '예민한 주제·논쟁은 다음 날로 미루는 편이 좋아요.',
    cautionEn: 'Postpone sensitive topics or arguments to tomorrow.',
  },
  해: {
    windowKo: '21-23시 (해시)',
    windowEn: '9-11pm (Pig hour)',
    baselineKo: '하루를 닫는 시간. 휴식·독서·가벼운 명상으로 마무리.',
    baselineEn: 'Day-closing window. Rest, reading, light meditation.',
    positiveKo: '꿈·창작·잠들기 전 짧은 영감 노트가 자리잡기 좋음.',
    positiveEn: 'Dreams, creative bursts, pre-sleep insight notes settle here.',
    cautionKo: '늦은 식사·SNS·자극적 콘텐츠는 수면을 흩뜨려요.',
    cautionEn: 'Late meals, social media, intense content disrupt sleep.',
  },
}

/** Get full narrative for an hour branch. */
export function getHourNarrative(branch: Branch): HourBranchNarrative {
  return HOUR_BRANCH_NARRATIVE[branch]
}

/** Pick the narrative string matching a polarity value. */
export function pickHourNarrative(
  branch: Branch,
  polarity: number,
  lang: 'ko' | 'en' = 'ko',
): string {
  const n = HOUR_BRANCH_NARRATIVE[branch]
  if (polarity >= 1) return lang === 'ko' ? n.positiveKo : n.positiveEn
  if (polarity <= -1) return lang === 'ko' ? n.cautionKo : n.cautionEn
  return lang === 'ko' ? n.baselineKo : n.baselineEn
}
