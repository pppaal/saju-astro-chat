// 띠별 오늘의 운세 — 결정론 엔진.
//
// SEO 데일리 페이지(/fortune/[animal])의 콘텐츠 소스. 오늘의 일진(日辰)
// 지지와 각 띠(년지)의 고전 관계(충 > 형 > 해 > 파 > 육합 > 삼합 > 복음)를
// 판정하고, 관계가 없으면 오행 생극으로 폴백한다. 판정·문구 선택 모두
// 순수 함수 — 같은 (날짜, 띠)는 언제나 같은 결과(결정론 컨벤션, CLAUDE.md).
// LLM 호출 없음. now 는 주입 가능(테스트 고정용).
//
// 재사용: 일진 계산 dayPillar.ts(SSOT), 관계 표 constants.ts(합충형파해),
// 오행 생극 elementBridge.ts. 표를 여기 복제하지 않는다.

import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import {
  BRANCH_LABELS,
  BRANCH_NAMES,
  BRANCH_TO_ELEMENT_EN,
  CHUNG,
  HAI,
  PA,
  SAMHAP,
  STEM_LABELS,
  STEM_NAMES,
  XING,
  YUKHAP,
} from '@/lib/saju/constants'
import { CONTROLS, GENERATES } from '@/lib/saju/elementBridge'

export interface ZodiacAnimal {
  /** URL 슬러그 (영문 동물명) */
  slug: string
  /** 년지 (한자) */
  branch: string
  ko: string
  en: string
  emoji: string
}

// 지지 순서(子→亥) = BRANCH_NAMES 순서와 동일하게 유지할 것 — 테스트가 대조함.
export const ZODIAC_ANIMALS: readonly ZodiacAnimal[] = [
  { slug: 'rat', branch: '子', ko: '쥐띠', en: 'Rat', emoji: '🐭' },
  { slug: 'ox', branch: '丑', ko: '소띠', en: 'Ox', emoji: '🐮' },
  { slug: 'tiger', branch: '寅', ko: '호랑이띠', en: 'Tiger', emoji: '🐯' },
  { slug: 'rabbit', branch: '卯', ko: '토끼띠', en: 'Rabbit', emoji: '🐰' },
  { slug: 'dragon', branch: '辰', ko: '용띠', en: 'Dragon', emoji: '🐲' },
  { slug: 'snake', branch: '巳', ko: '뱀띠', en: 'Snake', emoji: '🐍' },
  { slug: 'horse', branch: '午', ko: '말띠', en: 'Horse', emoji: '🐴' },
  { slug: 'sheep', branch: '未', ko: '양띠', en: 'Sheep', emoji: '🐑' },
  { slug: 'monkey', branch: '申', ko: '원숭이띠', en: 'Monkey', emoji: '🐵' },
  { slug: 'rooster', branch: '酉', ko: '닭띠', en: 'Rooster', emoji: '🐔' },
  { slug: 'dog', branch: '戌', ko: '개띠', en: 'Dog', emoji: '🐶' },
  { slug: 'pig', branch: '亥', ko: '돼지띠', en: 'Pig', emoji: '🐷' },
]

export function getAnimalBySlug(slug: string): ZodiacAnimal | null {
  return ZODIAC_ANIMALS.find((a) => a.slug === slug) ?? null
}

export type DailyRelation =
  | 'chung' // 충 — 정면 충돌
  | 'xing' // 형 — 마찰·시비
  | 'hai' // 해 — 은근한 방해
  | 'pa' // 파 — 균열·차질
  | 'yukhap' // 육합 — 조화
  | 'samhap' // 삼합 — 강한 시너지
  | 'same' // 복음 — 같은 지지
  | 'seng-in' // 일진이 띠를 생함 — 기운을 받음
  | 'seng-out' // 띠가 일진을 생함 — 베풀고 소모
  | 'geuk-in' // 일진이 띠를 극함 — 압박
  | 'geuk-out' // 띠가 일진을 극함 — 주도권
  | 'bihwa' // 비화 — 같은 오행

/** 1(조심) ~ 5(아주 좋음) */
export type DailyGrade = 1 | 2 | 3 | 4 | 5

interface LocalizedText {
  ko: string
  en: string
}

export interface ZodiacDailyFortune {
  /** KST 기준 날짜 (YYYY-MM-DD) */
  date: string
  dateLabel: LocalizedText
  /** 오늘의 일진 — 예: { hanja: '甲子', ko: '갑자일' } */
  dayGanzhi: { hanja: string; ko: string }
  animal: ZodiacAnimal
  relation: DailyRelation
  grade: DailyGrade
  gradeLabel: LocalizedText
  message: LocalizedText
  advice: LocalizedText
}

// ── 관계 판정 ──

function samhapTrioOf(branch: string): string[] | null {
  for (const members of Object.values(SAMHAP)) {
    if (members.includes(branch)) return members
  }
  return null
}

/** 일진 지지(dayBranch) × 띠 지지(animalBranch) → 고전 관계. 흉 관계 우선. */
export function relationForDay(dayBranch: string, animalBranch: string): DailyRelation {
  if (CHUNG[dayBranch] === animalBranch) return 'chung'
  if ((XING[dayBranch] ?? []).includes(animalBranch) && dayBranch !== animalBranch) return 'xing'
  if (HAI[dayBranch] === animalBranch) return 'hai'
  if (PA[dayBranch] === animalBranch) return 'pa'
  if (YUKHAP[dayBranch] === animalBranch) return 'yukhap'
  if (dayBranch !== animalBranch && samhapTrioOf(dayBranch)?.includes(animalBranch)) {
    return 'samhap'
  }
  if (dayBranch === animalBranch) return 'same'

  const dayEl = BRANCH_TO_ELEMENT_EN[dayBranch] as keyof typeof GENERATES
  const aniEl = BRANCH_TO_ELEMENT_EN[animalBranch] as keyof typeof GENERATES
  if (GENERATES[dayEl] === aniEl) return 'seng-in'
  if (GENERATES[aniEl] === dayEl) return 'seng-out'
  if (CONTROLS[dayEl] === aniEl) return 'geuk-in'
  if (CONTROLS[aniEl] === dayEl) return 'geuk-out'
  return 'bihwa'
}

const RELATION_GRADE: Record<DailyRelation, DailyGrade> = {
  chung: 1,
  xing: 2,
  hai: 2,
  pa: 2,
  yukhap: 5,
  samhap: 5,
  same: 3,
  'seng-in': 4,
  'seng-out': 3,
  'geuk-in': 2,
  'geuk-out': 3,
  bihwa: 3,
}

const GRADE_LABELS: Record<DailyGrade, LocalizedText> = {
  5: { ko: '아주 좋음', en: 'Excellent' },
  4: { ko: '좋음', en: 'Good' },
  3: { ko: '보통', en: 'Steady' },
  2: { ko: '주의', en: 'Take care' },
  1: { ko: '조심', en: 'Caution' },
}

// ── 문구 템플릿 ──
// 관계마다 3개 변주 — (JDN + 띠 인덱스) % 3 으로 결정론적으로 선택돼
// 같은 관계라도 날짜가 다르면 문구가 순환한다(중복 콘텐츠 완화).

interface FortuneCopy {
  message: LocalizedText
  advice: LocalizedText
}

const COPY: Record<DailyRelation, FortuneCopy[]> = {
  chung: [
    {
      message: {
        ko: '오늘의 일진이 띠와 정면으로 부딪히는 충(沖)의 날입니다. 계획이 틀어지거나 의견 충돌이 생기기 쉬워, 밀어붙이기보다 한 템포 늦추는 편이 유리합니다.',
        en: 'Today’s day-energy clashes head-on with your sign (chung). Plans may wobble and opinions may collide — slowing down beats pushing through.',
      },
      advice: {
        ko: '큰 결정과 계약은 하루 미루고, 이동·운전은 평소보다 여유 있게 잡으세요.',
        en: 'Postpone big decisions and contracts a day, and leave extra margin when moving around.',
      },
    },
    {
      message: {
        ko: '기운이 서로 맞부딪히는 날이라 사소한 말이 크게 번질 수 있습니다. 오늘의 마찰은 감정이 아니라 타이밍의 문제인 경우가 많습니다.',
        en: 'Energies collide today, so small words can escalate. Most friction today is about timing, not feelings.',
      },
      advice: {
        ko: '반박하고 싶어질 때 한 번만 삼키면 저녁이 편안해집니다.',
        en: 'Swallow one comeback and your evening stays peaceful.',
      },
    },
    {
      message: {
        ko: '충(沖)은 흔들림이지만 동시에 묵은 것을 털어내는 힘이기도 합니다. 미뤄둔 정리·청산에는 오히려 맞는 날입니다.',
        en: 'A clash shakes things — but it also clears out what’s stale. It’s actually a fitting day for overdue clean-ups and closures.',
      },
      advice: {
        ko: '새 일을 벌이기보다, 끝내야 했던 일 하나를 마무리하세요.',
        en: 'Rather than starting something new, finish the one thing you’ve been putting off.',
      },
    },
  ],
  xing: [
    {
      message: {
        ko: '형(刑)이 걸리는 날 — 규칙, 서류, 약속처럼 “정해진 것들”에서 마찰이 나기 쉽습니다. 꼼꼼함이 방패가 됩니다.',
        en: 'A day of xing (friction with rules). Paperwork, rules, and appointments are where snags appear — precision is your shield.',
      },
      advice: {
        ko: '서류·일정·금액은 두 번 확인하고, 구두 약속은 기록으로 남기세요.',
        en: 'Double-check documents, times, and amounts; put verbal agreements in writing.',
      },
    },
    {
      message: {
        ko: '신경이 곤두서기 쉬운 날입니다. 남의 실수가 유난히 눈에 들어오지만, 지적은 관계 비용이 큽니다.',
        en: 'Nerves run high today. Others’ mistakes will stand out — but pointing them out costs more than it fixes.',
      },
      advice: {
        ko: '오늘 하루는 심판이 아니라 관찰자로 지내보세요.',
        en: 'Be an observer today, not a referee.',
      },
    },
    {
      message: {
        ko: '얽힌 일을 억지로 풀려 하면 더 조입니다. 매듭은 순서대로만 풀립니다.',
        en: 'Forcing a tangle only tightens it. Knots come undone in order, not by pulling harder.',
      },
      advice: {
        ko: '급한 일부터가 아니라, 먼저 풀리는 일부터 처리하세요.',
        en: 'Start with what unblocks easily, not what screams loudest.',
      },
    },
  ],
  hai: [
    {
      message: {
        ko: '해(害)의 날 — 겉으로는 조용한데 뒤에서 어긋나는 일이 생기기 쉽습니다. 소문과 뒷말에서 한 걸음 떨어져 계세요.',
        en: 'A day of hai (quiet undermining). Things can slip out of place behind the scenes — keep a step away from gossip.',
      },
      advice: {
        ko: '중요한 이야기는 제3자를 거치지 말고 당사자와 직접 하세요.',
        en: 'Say important things directly to the person, never through a third party.',
      },
    },
    {
      message: {
        ko: '선의가 오해로 돌아올 수 있는 날입니다. 도움을 주기 전에 상대가 원하는지 먼저 확인하면 탈이 없습니다.',
        en: 'Good intentions can be misread today. Check whether help is wanted before giving it.',
      },
      advice: {
        ko: '부탁받지 않은 조언은 아껴두세요.',
        en: 'Save the unsolicited advice for another day.',
      },
    },
    {
      message: {
        ko: '작은 균열이 크게 보이는 날이지만, 실제 손해는 크지 않습니다. 반응 속도를 늦추면 대부분 지나갑니다.',
        en: 'Small cracks look bigger than they are today. Slow your reactions and most of it passes on its own.',
      },
      advice: {
        ko: '거슬리는 일은 하루 재워두고 내일 다시 보세요.',
        en: 'Let today’s irritations sleep a night before acting on them.',
      },
    },
  ],
  pa: [
    {
      message: {
        ko: '파(破)의 날 — 일정이 깨지거나 예정이 어긋나기 쉽습니다. 계획 B를 준비해두면 오히려 여유로운 하루가 됩니다.',
        en: 'A day of pa (breakage). Schedules crack easily — having a plan B turns disruption into slack.',
      },
      advice: {
        ko: '약속은 여유 시간을 두고 잡고, 예비 일정을 하나 챙겨두세요.',
        en: 'Pad your appointments and keep one backup plan ready.',
      },
    },
    {
      message: {
        ko: '깨지는 것이 꼭 나쁜 것만은 아닙니다. 오래 삐걱거리던 것이 오늘 확실히 드러나면, 고칠 기회가 온 것입니다.',
        en: 'Not every break is bad. If something long-creaky finally gives today, that’s your chance to fix it properly.',
      },
      advice: {
        ko: '임시방편 대신 근본 원인을 손보세요.',
        en: 'Fix the root cause, not the symptom.',
      },
    },
    {
      message: {
        ko: '지출 구멍이 나기 쉬운 날입니다. 충동구매와 즉흥 결제만 피해도 절반은 성공입니다.',
        en: 'Money leaks easily today. Skipping impulse buys alone wins you half the day.',
      },
      advice: {
        ko: '장바구니에 담아두고 24시간 뒤에 다시 보세요.',
        en: 'Leave it in the cart and look again in 24 hours.',
      },
    },
  ],
  yukhap: [
    {
      message: {
        ko: '오늘의 일진이 띠와 육합(六合)을 이루는 조화로운 날입니다. 사람과의 일 — 협업, 부탁, 화해 — 가 평소보다 부드럽게 풀립니다.',
        en: 'Today’s energy forms a six-harmony (yukhap) with your sign. People-things — collaboration, requests, reconciliation — flow unusually smoothly.',
      },
      advice: {
        ko: '미뤄온 부탁이나 어려운 대화가 있다면 오늘 꺼내보세요.',
        en: 'That favor you’ve been meaning to ask, that hard talk — today is the day.',
      },
    },
    {
      message: {
        ko: '귀인이 움직이는 날입니다. 혼자 끙끙대던 일도 한 사람에게 털어놓는 순간 실마리가 보입니다.',
        en: 'Helpful people are in motion today. The problem you’ve been carrying alone loosens the moment you share it.',
      },
      advice: {
        ko: '도움을 요청하는 것을 약점이라 생각하지 마세요. 오늘은 특히 잘 통합니다.',
        en: 'Asking for help isn’t weakness — and today it lands especially well.',
      },
    },
    {
      message: {
        ko: '맺고 잇는 기운이 강한 날 — 새 인연, 계약, 합의에 좋은 흐름입니다. 첫인상이 오래 갑니다.',
        en: 'A day strong in binding energy — good for new connections, agreements, and deals. First impressions stick.',
      },
      advice: {
        ko: '중요한 만남이 있다면 5분 일찍 도착하세요.',
        en: 'If you have an important meeting, arrive five minutes early.',
      },
    },
  ],
  samhap: [
    {
      message: {
        ko: '일진과 띠가 삼합(三合)으로 묶이는 시너지의 날입니다. 팀으로 하는 일, 여럿이 힘을 모으는 일에서 성과가 커집니다.',
        en: 'Your sign locks into a three-harmony (samhap) with today’s energy. Team efforts and joint pushes multiply today.',
      },
      advice: {
        ko: '혼자 할 일도 오늘은 같이 하세요 — 합이 곧 속도입니다.',
        en: 'Even solo tasks go better shared today — alignment is speed.',
      },
    },
    {
      message: {
        ko: '흐름이 등을 밀어주는 날입니다. 시작을 망설이던 일이 있다면 오늘의 추진력을 빌리세요.',
        en: 'The current pushes you forward today. Borrow this momentum for the thing you’ve hesitated to start.',
      },
      advice: {
        ko: '가장 무거운 일을 오전에 배치하세요. 탄력이 하루를 끌고 갑니다.',
        en: 'Front-load your heaviest task — momentum will carry the rest.',
      },
    },
    {
      message: {
        ko: '기회가 사람을 타고 오는 날입니다. 오늘 들어오는 제안은 평소보다 한 번 더 진지하게 들여다볼 가치가 있습니다.',
        en: 'Opportunity arrives through people today. Offers that come in deserve a second, serious look.',
      },
      advice: {
        ko: '연락을 미뤄둔 사람 한 명에게 오늘 먼저 연락해보세요.',
        en: 'Reach out first to one person you’ve been meaning to contact.',
      },
    },
  ],
  same: [
    {
      message: {
        ko: '오늘의 일진이 띠와 같은 기운으로 겹치는 복음(伏吟)의 날 — 내 기질이 평소보다 진하게 나옵니다. 장점도 단점도 증폭됩니다.',
        en: 'Today’s branch doubles your own (bogeum) — your core traits run stronger than usual, strengths and flaws alike.',
      },
      advice: {
        ko: '내가 잘하는 방식이 통하는 날이니, 검증된 루틴대로 가세요.',
        en: 'Your proven way works today — stick to your tested routine.',
      },
    },
    {
      message: {
        ko: '자기 목소리가 커지는 날입니다. 추진력은 좋지만 고집으로 보일 수 있으니 결정 전에 한 사람의 의견만 들어보세요.',
        en: 'Your voice runs loud today. Great for drive, but it can read as stubbornness — get one other opinion before deciding.',
      },
      advice: {
        ko: '"내가 맞다"는 확신이 강할수록 한 번 더 확인하세요.',
        en: 'The surer you feel, the more a quick double-check pays.',
      },
    },
    {
      message: {
        ko: '같은 기운이 겹치면 익숙한 것이 편안하게 느껴집니다. 새 도전보다는 하던 일을 다지는 데 좋은 날입니다.',
        en: 'Doubled energy favors the familiar. Better for consolidating what you’ve built than for leaping into the new.',
      },
      advice: {
        ko: '오늘은 확장보다 정리 — 반쯤 걸쳐둔 일을 끝까지 밀어보세요.',
        en: 'Consolidate, don’t expand — push one half-done thing to done.',
      },
    },
  ],
  'seng-in': [
    {
      message: {
        ko: '오늘의 기운이 띠를 생(生)해주는 날 — 에너지가 채워지고 컨디션이 올라옵니다. 받는 흐름이니 무리하지 않아도 일이 굴러갑니다.',
        en: 'Today’s energy feeds your sign — you’re on the receiving end. Vitality rises, and things roll without forcing.',
      },
      advice: {
        ko: '컨디션이 좋은 날일수록 과속 주의 — 여유분을 내일로 남겨두세요.',
        en: 'Good energy tempts overreach — bank some of it for tomorrow.',
      },
    },
    {
      message: {
        ko: '배움과 흡수가 잘 되는 날입니다. 새 정보, 공부, 피드백이 평소보다 깊이 들어옵니다.',
        en: 'A day of easy absorption — new information, study, and feedback sink in deeper than usual.',
      },
      advice: {
        ko: '미뤄둔 공부나 자료 하나를 오늘 소화하세요.',
        en: 'Digest that one article or lesson you’ve been postponing.',
      },
    },
    {
      message: {
        ko: '주변의 호의가 자연스럽게 모이는 날입니다. 사양하지 말고 감사히 받으면 관계가 더 깊어집니다.',
        en: 'Goodwill gathers around you today. Accept it graciously — receiving well deepens bonds.',
      },
      advice: {
        ko: '도움을 받았다면 오늘 안에 짧게라도 고마움을 표현하세요.',
        en: 'If someone helps you, thank them the same day, even briefly.',
      },
    },
  ],
  'seng-out': [
    {
      message: {
        ko: '띠가 오늘의 기운을 생(生)해주는 날 — 베풀고 내어주는 흐름입니다. 보람은 크지만 에너지 소모도 커서 페이스 조절이 필요합니다.',
        en: 'Your sign feeds today’s energy — a day of giving out. Rewarding, but draining; pace yourself.',
      },
      advice: {
        ko: '도와주되 한도를 정하세요. 오늘의 "예스"는 두 개까지만.',
        en: 'Help freely, but cap it — two yeses today, no more.',
      },
    },
    {
      message: {
        ko: '내 시간이 남의 일로 흘러가기 쉬운 날입니다. 나쁜 흐름은 아니지만, 정작 내 일이 밀리지 않게 경계선이 필요합니다.',
        en: 'Your hours drift into other people’s tasks today. Not a bad current — just guard time for your own work.',
      },
      advice: {
        ko: '내 일 먼저 한 시간, 그 다음에 남의 부탁을 받으세요.',
        en: 'One hour for your own work first — then take requests.',
      },
    },
    {
      message: {
        ko: '가르치고 나누기에 좋은 날입니다. 내가 아는 것을 정리해 건네면 상대보다 내가 더 명확해집니다.',
        en: 'A fine day to teach and share. Explaining what you know clarifies it most for you.',
      },
      advice: {
        ko: '누군가에게 아는 것 하나를 정리해서 알려주세요.',
        en: 'Write up or explain one thing you know well to someone.',
      },
    },
  ],
  'geuk-in': [
    {
      message: {
        ko: '오늘의 기운이 띠를 극(剋)하는 압박의 날입니다. 요구와 책임이 몰려올 수 있지만, 이 압박은 감당 가능한 크기입니다.',
        en: 'Today’s energy presses on your sign. Demands and duties may pile up — but this pressure is a size you can carry.',
      },
      advice: {
        ko: '전부 다 하려 하지 말고, 오늘 꼭 해야 할 세 가지만 고르세요.',
        en: 'Don’t do it all — pick the three things that truly must happen today.',
      },
    },
    {
      message: {
        ko: '위에서 누르는 듯한 답답함이 있을 수 있는 날 — 대개 사람이 아니라 상황이 원인입니다. 상황은 내일 바뀝니다.',
        en: 'You may feel leaned on today — usually it’s the situation, not the people. Situations change by tomorrow.',
      },
      advice: {
        ko: '오늘 받은 스트레스를 오늘 사람에게 풀지 마세요.',
        en: 'Don’t hand today’s stress to today’s people.',
      },
    },
    {
      message: {
        ko: '단련의 날입니다. 오늘 버틴 만큼 근력이 붙는 흐름이니, 힘들다고 해서 잘못 가고 있는 것은 아닙니다.',
        en: 'A tempering day. What you withstand today becomes strength — difficulty here doesn’t mean you’re off course.',
      },
      advice: {
        ko: '평가는 오늘 하지 말고, 기록만 해두세요.',
        en: 'Log today; judge it later.',
      },
    },
  ],
  'geuk-out': [
    {
      message: {
        ko: '띠가 오늘의 기운을 극(剋)하는 날 — 주도권이 내 쪽에 있습니다. 협상, 요구, 담판처럼 밀어붙이는 일에 유리합니다.',
        en: 'Your sign presses today’s energy — the initiative is yours. Good for negotiating, asking, and closing.',
      },
      advice: {
        ko: '원하는 것을 명확한 숫자와 기한으로 말하세요. 오늘은 통합니다.',
        en: 'Name what you want with numbers and deadlines — today it lands.',
      },
    },
    {
      message: {
        ko: '추진력이 실리는 날이지만, 힘이 실린 만큼 강하게 보일 수 있습니다. 부드러운 말투가 성과를 지켜줍니다.',
        en: 'Drive comes easy today — and can read as force. A soft tone protects hard-won ground.',
      },
      advice: {
        ko: '요구는 세게, 말투는 부드럽게.',
        en: 'Firm ask, gentle voice.',
      },
    },
    {
      message: {
        ko: '결단에 좋은 날입니다. 오래 재던 선택이 있다면 오늘의 명료함을 믿어볼 만합니다.',
        en: 'A day for decisions. If you’ve been weighing something too long, today’s clarity is trustworthy.',
      },
      advice: {
        ko: '결정했다면 오늘 안에 첫 행동 하나를 실행하세요.',
        en: 'Once decided, take the first concrete step before midnight.',
      },
    },
  ],
  bihwa: [
    {
      message: {
        ko: '오늘의 기운이 띠와 같은 오행으로 나란히 서는 비화(比和)의 날 — 크게 밀어주지도 막지도 않는 담백한 흐름입니다.',
        en: 'Today’s element stands level with yours (bihwa) — a plain current that neither pushes nor blocks.',
      },
      advice: {
        ko: '운에 기대지 말고 루틴에 기대세요. 평소 실력이 그대로 결과가 됩니다.',
        en: 'Lean on routine, not luck — today returns exactly what you put in.',
      },
    },
    {
      message: {
        ko: '동료·또래의 기운이 강한 날입니다. 경쟁이 자극이 되기도, 소모가 되기도 하니 비교보다는 협력 쪽에 서세요.',
        en: 'Peer energy runs strong today. Rivalry can spark or drain — choose collaboration over comparison.',
      },
      advice: {
        ko: '남의 속도 말고 어제의 나와만 비교하세요.',
        en: 'Compare yourself only to yesterday’s you.',
      },
    },
    {
      message: {
        ko: '무난한 날일수록 기본기가 빛납니다. 정리, 운동, 밀린 연락 — 평범한 일들이 오늘의 점수를 만듭니다.',
        en: 'On an even day, fundamentals shine. Tidying, exercise, overdue replies — ordinary acts score today’s points.',
      },
      advice: {
        ko: '10분짜리 작은 일 세 개를 끝내는 것으로 하루를 여세요.',
        en: 'Open the day by finishing three ten-minute tasks.',
      },
    },
  ],
}

// ── 날짜(KST) 유틸 ──

const KST_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** now → KST 달력 날짜 { y, m, d }. 서버가 어느 TZ 에 있어도 한국 날짜 기준. */
export function kstDateParts(now: Date): { y: number; m: number; d: number } {
  const s = KST_DATE_FMT.format(now) // YYYY-MM-DD
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

const MONTH_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// ── 메인 ──

export function computeZodiacDaily(
  animal: ZodiacAnimal,
  now: Date = new Date()
): ZodiacDailyFortune {
  const { y, m, d } = kstDateParts(now)
  const { jdn, stemIndex, branchIndex } = computeDayPillarIndices(y, m, d)
  const dayStem = STEM_NAMES[stemIndex]
  const dayBranch = BRANCH_NAMES[branchIndex]

  const relation = relationForDay(dayBranch, animal.branch)
  const grade = RELATION_GRADE[relation]

  const variants = COPY[relation]
  const animalIndex = ZODIAC_ANIMALS.findIndex((a) => a.slug === animal.slug)
  const copy = variants[(jdn + animalIndex) % variants.length]

  const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return {
    date,
    dateLabel: {
      ko: `${y}년 ${m}월 ${d}일`,
      en: `${MONTH_EN[m - 1]} ${d}, ${y}`,
    },
    dayGanzhi: {
      hanja: `${dayStem}${dayBranch}`,
      ko: `${STEM_LABELS[dayStem].hangul}${BRANCH_LABELS[dayBranch].hangul}일`,
    },
    animal,
    relation,
    grade,
    gradeLabel: GRADE_LABELS[grade],
    message: copy.message,
    advice: copy.advice,
  }
}

/** 12띠 전체를 한 번에 — 인덱스 페이지용. */
export function computeAllZodiacDaily(now: Date = new Date()): ZodiacDailyFortune[] {
  return ZODIAC_ANIMALS.map((a) => computeZodiacDaily(a, now))
}
