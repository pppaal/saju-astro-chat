// 12 시진 × 5 테마 narrative DB — KO + EN.
//
// hourBranchNarrative.ts는 시진 자체의 baseline/positive/caution을 담고,
// 이 파일은 5테마(love/money/career/health/growth) 관점에서 그 시진이
// 어떤 활동에 잘 맞는지 한 줄씩 정리. 캘린더 daily detail 화면에서
// 사용자가 "지금 사랑 흐름은?" "지금 일 흐름은?" 같은 질문에 시간대별로
// 바로 답할 수 있게 5층 × 5테마 매트릭스를 시진 layer까지 확장.
//
// 톤: ~해요 / ~좋아요 / ~잘 맞아요 친근체.

type Branch = '자' | '축' | '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해'
type Theme = 'love' | 'money' | 'career' | 'health' | 'growth'

interface ThemeLine {
  ko: string
  en: string
}

export const HOUR_THEME_NARRATIVE: Record<Branch, Record<Theme, ThemeLine>> = {
  자: {
    love:   { ko: '깊은 대화나 솔직한 마음 표현에 어울리는 시간이에요.',
              en: 'A time for deep talks and honest expression.' },
    money:  { ko: '오늘 지출 결산과 내일 예산을 정리하기 좋아요.',
              en: 'Good for closing today\'s spending and planning tomorrow\'s budget.' },
    career: { ko: '내일 업무 우선순위를 정리하기 좋은 시간이에요.',
              en: 'A good time to organize tomorrow\'s work priorities.' },
    health: { ko: '늦은 식사나 자극적인 화면은 피하고 일찍 쉬는 편이 좋아요.',
              en: 'Skip late meals and intense screens; rest early.' },
    growth: { ko: '하루를 돌아보고 일기·기록·명상으로 마무리하면 좋아요.',
              en: 'Reflect on the day with journaling or meditation.' },
  },
  축: {
    love:   { ko: '관계 활동보다 푹 쉬는 게 다음 날 사람을 더 따뜻하게 만들어줘요.',
              en: 'Resting now makes you warmer with people tomorrow.' },
    money:  { ko: '판단력이 낮아지는 시간이라 돈 결정은 내일로 미루세요.',
              en: 'Judgment dips now — postpone money decisions to tomorrow.' },
    career: { ko: '몸이 회복되는 만큼 다음 날 업무 능력도 함께 올라가요.',
              en: 'Body recovery now powers tomorrow\'s work output.' },
    health: { ko: '몸이 가장 푹 쉬어야 하는 시간이에요. 카페인과 화면을 멀리하세요.',
              en: 'The body needs deepest rest — avoid caffeine and screens.' },
    growth: { ko: '꿈과 잠재의식이 활발해져요. 영감이 떠오르면 짧게 메모해두세요.',
              en: 'Dreams and the unconscious activate; jot down insights briefly.' },
  },
  인: {
    love:   { ko: '아침 인사·따뜻한 메시지가 자연스럽게 마음에 와닿는 시간이에요.',
              en: 'A simple morning message lands warmly with someone close.' },
    money:  { ko: '오늘 예산을 가볍게 점검하면 하루 돈 흐름이 가지런해져요.',
              en: 'A quick budget check sets the day\'s money flow straight.' },
    career: { ko: '새 시작이나 도전적인 일을 출발하기에 우호적인 시간이에요.',
              en: 'Favorable for fresh starts and bold first moves.' },
    health: { ko: '가벼운 호흡·스트레칭으로 몸을 천천히 깨우면 좋아요.',
              en: 'Light breathwork or stretching wakes the body gently.' },
    growth: { ko: '하루를 어떻게 가져갈지 짧게 그려보기 좋은 시간이에요.',
              en: 'A good time to sketch how the day should go.' },
  },
  묘: {
    love:   { ko: '서두르지 말고 함께 하는 사람을 한 번 더 챙겨보세요.',
              en: "Don't rush — take a moment to check in with someone close." },
    money:  { ko: '큰 지출보다 작은 정리·체크리스트가 잘 통하는 시간이에요.',
              en: 'Small admin and checklists fit better than big spending.' },
    career: { ko: '머리가 맑은 시간이라 중요한 글쓰기나 기획에 가장 좋아요.',
              en: 'Mind is sharpest — best for writing and big-picture planning.' },
    health: { ko: '아침 산책·물 한 잔으로 리듬을 잡으면 하루가 가벼워져요.',
              en: 'A walk or a glass of water sets the body\'s rhythm.' },
    growth: { ko: '오늘의 핵심 1-2개를 골라두면 흐름이 잘 잡혀요.',
              en: 'Pick 1-2 core items of the day to anchor your focus.' },
  },
  진: {
    love:   { ko: '첫인상·만남 약속에 우호적인 시간이라 자신 있게 가도 좋아요.',
              en: 'Favorable for first impressions and meetings — show up confident.' },
    money:  { ko: '거래 시작이나 첫 입금·송금에 잘 맞는 시간이에요.',
              en: 'A good window for opening trades or first transfers.' },
    career: { ko: '중요한 메일·발표·첫 미팅이 가장 잘 통하는 시간이에요.',
              en: 'Best for sending key emails, presentations, and opening meetings.' },
    health: { ko: '아침 식사를 거르지 말고 충분히 챙겨야 하루 페이스가 좋아져요.',
              en: 'Eat a real breakfast — it sets the day\'s pace.' },
    growth: { ko: '하루의 첫 시간을 어떻게 쓰느냐가 흐름을 결정해요.',
              en: "How you spend the day's first hours decides the flow." },
  },
  사: {
    love:   { ko: '깊은 대화나 솔직한 표현이 평소보다 잘 통하는 시간이에요.',
              en: 'Honest talks land better than usual now.' },
    money:  { ko: '큰 결정·계약·투자 검토에 가장 적합한 시간이에요.',
              en: 'The best window for big decisions, contracts, investment reviews.' },
    career: { ko: '핵심 업무·면접·협상이 가장 잘 풀리는 집중력 정점이에요.',
              en: 'Peak focus — core work, interviews, negotiations all flow.' },
    health: { ko: '에너지가 가장 높은 시간이지만 회의 길어지면 오후가 무거워져요.',
              en: 'Energy is highest, but long meetings drain the afternoon.' },
    growth: { ko: '오래 미뤘던 어려운 일을 끝내기에 가장 좋은 시간이에요.',
              en: 'Best time to finish the hard task you\'ve been putting off.' },
  },
  오: {
    love:   { ko: '점심이나 짧은 만남으로 가까운 관계를 챙기기 좋은 시간이에요.',
              en: 'Lunch or short meetups warm close relationships.' },
    money:  { ko: '큰 거래보다 사람과 나누는 대화에서 기회가 나오는 시간이에요.',
              en: 'Opportunities come through people-talk more than transactions now.' },
    career: { ko: '점심 미팅이나 협업 자리에서 새 연결이 잘 생기는 시간이에요.',
              en: 'Lunch meetings and collaborative spaces spark new connections.' },
    health: { ko: '과식보다 충분한 식사·짧은 산책으로 리듬을 회복하세요.',
              en: 'Eat enough but not heavy; a short walk restores rhythm.' },
    growth: { ko: '사람과 나눈 대화 한 마디가 오후 흐름을 바꿔놓을 수 있어요.',
              en: 'A single conversation can shift the afternoon\'s direction.' },
  },
  미: {
    love:   { ko: '예민한 대화는 미루고 부드러운 메시지로 가는 편이 좋아요.',
              en: 'Postpone sensitive talks — keep messages soft.' },
    money:  { ko: '꼼꼼한 정산이나 영수증·자료 정리가 가장 잘 되는 시간이에요.',
              en: 'Best window for careful reconciliations and document tidying.' },
    career: { ko: '검토·교정·디테일 작업이 가장 잘 통하는 시간이에요.',
              en: 'Best window for review, proofreading, and detail work.' },
    health: { ko: '졸음이 쉽게 와요. 짧게 눈을 감거나 물로 리듬을 잡아주세요.',
              en: 'Drowsiness rises — close eyes briefly or rehydrate.' },
    growth: { ko: '큰 결정은 미루고 자료·기록을 정리하는 편이 잘 풀려요.',
              en: 'Postpone big decisions; tidy notes and material instead.' },
  },
  신: {
    love:   { ko: '대화 자리나 모임에서 새 인연이 자연스럽게 자리잡혀요.',
              en: 'New connections settle naturally in talks and gatherings.' },
    money:  { ko: '협업·공동 프로젝트로 돈 흐름이 만들어지는 시간이에요.',
              en: 'Money flows through collaboration and joint projects now.' },
    career: { ko: '아이디어 회의·네트워킹·새 협업 시작에 우호적이에요.',
              en: 'Favorable for idea sessions, networking, new collaborations.' },
    health: { ko: '오후 후반 활기가 돌아오니 짧은 운동·산책이 잘 맞아요.',
              en: 'Late-afternoon energy returns — light exercise fits well.' },
    growth: { ko: '말이 너무 많아져요. 결정은 한 가지로 모으는 편이 좋아요.',
              en: 'Talk scatters — converge decisions to one item.' },
  },
  유: {
    love:   { ko: '하루의 인사·고마움 한 마디가 관계에 작은 빛을 더해줘요.',
              en: 'A simple thanks or hello tonight brightens the relationship.' },
    money:  { ko: '오늘 결산과 내일 일정 정리가 돈 흐름에 도움이 되는 시간이에요.',
              en: 'Closing today\'s books and tomorrow\'s plan helps money flow.' },
    career: { ko: '체크리스트 마감과 하루 마무리에 가장 잘 맞는 시간이에요.',
              en: 'Best for closing checklists and wrapping up the day.' },
    health: { ko: '저녁 식사 무겁지 않게, 식후 산책 한 번이 다음 날을 가볍게 해줘요.',
              en: 'Keep dinner light; a short walk after sets tomorrow up.' },
    growth: { ko: '하루를 짧게 회고하고 내일 계획을 세우면 흐름이 잘 잡혀요.',
              en: 'A short review and tomorrow\'s plan anchor your flow.' },
  },
  술: {
    love:   { ko: '가까운 사람과의 저녁 대화가 관계를 단단하게 만들어줘요.',
              en: 'Evening talks with close ones strengthen bonds.' },
    money:  { ko: '큰 결정보다 가족·동반자와 가볍게 의논해보기 좋은 시간이에요.',
              en: 'A good time to share money plans casually with family.' },
    career: { ko: '예민한 업무 결정은 다음 날로 미루는 편이 안전해요.',
              en: 'Postpone sensitive work decisions to tomorrow.' },
    health: { ko: '긴장이 풀리는 시간이에요. 가벼운 스트레칭이나 명상이 잘 맞아요.',
              en: 'Tension eases — light stretching or meditation fits.' },
    growth: { ko: '가까운 관계 한 명을 챙기는 작은 행동이 큰 의미가 돼요.',
              en: 'A small gesture toward someone close means a lot now.' },
  },
  해: {
    love:   { ko: '가까운 사람에게 짧은 안부 한 마디로 하루를 닫으면 따뜻해져요.',
              en: 'A short check-in with someone close warms the day to a close.' },
    money:  { ko: '오늘 영수증·지출을 한 번 훑고 내일을 위해 정리해두세요.',
              en: 'Skim today\'s spending; set tomorrow up before sleep.' },
    career: { ko: '내일 핵심 1-2개만 메모해두면 다음 날 시작이 가벼워져요.',
              en: 'Note 1-2 core tasks for tomorrow — the morning feels lighter.' },
    health: { ko: '늦은 식사·SNS·자극적인 콘텐츠는 수면을 흩뜨려요.',
              en: 'Late meals, social media, intense content disrupt sleep.' },
    growth: { ko: '잠들기 전 짧은 독서나 영감 노트가 마음을 차분히 정돈해줘요.',
              en: 'Light reading or a quick insight note settles the mind.' },
  },
}

/** Get theme-specific narrative for an hour branch + theme. */
export function getHourThemeNarrative(
  branch: Branch,
  theme: Theme,
  lang: 'ko' | 'en' = 'ko',
): string {
  const entry = HOUR_THEME_NARRATIVE[branch]?.[theme]
  if (!entry) return ''
  return lang === 'ko' ? entry.ko : entry.en
}
