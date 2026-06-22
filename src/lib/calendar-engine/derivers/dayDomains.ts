/**
 * dayDomains — 그날(일진)의 십신 기운을 6개 생활 분야로 풀어주는 deriver (KO/EN).
 *
 * 새 점괘를 지어내지 않는다. 그날 *일진 십신*(일간 기준 그날 천간/지지의 십신)이
 * 어떤 기운인지 + 그 기운이 각 분야에 무슨 의미인지를 명리 표준 의미로 엮을 뿐.
 * 같은 토대(SIBSIN_GUIDE)와 톤을 공유한다.
 *
 * 분야: 연애 / 재물 / 직업 / 인간관계(귀인) / 공부·문서 / 건강.
 * 연애만 성별 의존(남=재성, 여=관성이 배우자성). 점수 구간(band)은 섹션 머리말
 * 한 줄로 톤을 잡고, 분야별 '오늘 켜짐(active)' 플래그로 강조한다.
 */

import { translateSignalLabel } from './signalI18n'
import { hashStringToInt, pickBySeed } from './personSeed'
import { PLANET_KO as PLANET_KO_BASE } from '@/lib/calendar-engine/data/planetNames'

/** ko/en 한 쌍. */
type Pair = { ko: string; en: string }

/**
 * 같은 사람(seed)에게 같은 상태(key)면 항상 같은 변주, 다른 사람이면 다른 변주.
 * 변주 풀은 모두 *같은 명리 의미*를 다른 표현으로 옮긴 것이라 근거를 해치지 않는다.
 * pickBySeed 가 (seed + key) % len 으로 회전하므로, key 는 (분야·밴드 등) 상태별로
 * 안정적인 작은 정수면 된다.
 */
function pickPair(pool: readonly Pair[], seed: number, key: number, ko: boolean): string {
  const p = pickBySeed(pool, seed, key)
  return ko ? p.ko : p.en
}

export type DayScoreBand = 'good' | 'mid' | 'low'

/** 십신 5분류 — 비겁/식상/재성/관성/인성. */
type SibsinCategory = 'self' | 'output' | 'wealth' | 'officer' | 'resource'

const SIBSIN_CATEGORY: Record<string, SibsinCategory> = {
  비견: 'self',
  겁재: 'self',
  식신: 'output',
  상관: 'output',
  정재: 'wealth',
  편재: 'wealth',
  정관: 'officer',
  편관: 'officer',
  정인: 'resource',
  편인: 'resource',
}

/** 그날 실제 신호 한 개를 분야 근거로 표시 — 트랜짓·신살·교차. */
export interface DomainEvidence {
  /** 표시 텍스트 (호출 시 locale 반영해서 ko/en 중 하나). */
  text: string
  polarity: number
  /** 'astro'=트랜짓 · 'saju'=신살 · 'cross'=사주×점성 교차 · 'moon'=시별 달 절정. */
  kind: 'astro' | 'saju' | 'cross' | 'moon'
  /** moon 근거일 때만 — 시각 창(괄호 제거 전 원본). 본문에 시각을 엮을 때 읽는다. */
  when?: string
  whenEn?: string
}

export interface DayDomainAdvice {
  key: string
  icon: string
  label: string
  labelEn: string
  body: string
  bodyEn: string
  /** 오늘 이 분야가 켜졌는가 — 십신이 직접 관장하거나 실제 신호가 붙으면 true. */
  active: boolean
  /** 그날 실제로 이 분야에 떨어진 신호 근거 (없으면 빈 배열 = 십신 기본 조언만). */
  evidence: DomainEvidence[]
}

export interface DayDomainsResult {
  /** 점수 구간 머리말(순풍/평이/역풍). */
  bandNote: string
  bandNoteEn: string
  domains: DayDomainAdvice[]
}

const DOMAIN_META: Array<{ key: string; icon: string; ko: string; en: string }> = [
  { key: 'love', icon: '❤️', ko: '연애', en: 'Love' },
  { key: 'money', icon: '💰', ko: '재물·돈', en: 'Money' },
  { key: 'career', icon: '💼', ko: '직업·일', en: 'Career' },
  { key: 'people', icon: '🤝', ko: '인간관계·귀인', en: 'People & allies' },
  { key: 'study', icon: '📚', ko: '공부·문서', en: 'Study & papers' },
  { key: 'health', icon: '🌿', ko: '건강', en: 'Health' },
]

// 카테고리 × 분야 → 그날 조언 (연애는 loveLine 으로 별도 처리하므로 여기선 5분야).
// 각 칸은 *같은 명리 의미*를 옮긴 3~4개 변주 풀 — seed 로 사람마다 다른 표현을 고른다.
// 변주 index 0 은 원문(레거시 골든)으로 둔다. 의미는 그대로, 톤만 회전.
const ADVICE: Record<SibsinCategory, Record<string, readonly Pair[]>> = {
  self: {
    money: [
      {
        ko: '내 힘으로 버는 데 집중할 날. 동업·보증·돈 빌려주기는 오늘만은 미루세요(빠져나가기 쉬움).',
        en: 'Focus on earning by your own hand. Hold off on partnerships, guarantees or lending today — money slips out easily.',
      },
      {
        ko: '오늘은 스스로 버는 쪽에 힘이 실려요. 보증·동업·돈 빌려주기는 한 박자 미루는 게 안전합니다(새기 쉬움).',
        en: 'Today the strength is in earning solo — push partnerships, guarantees and lending back a beat; money leaks easily.',
      },
      {
        ko: '내 노동의 대가는 잘 들어오는 날. 다만 남과 얽힌 돈(보증·동업·대여)은 빠져나가기 쉬우니 보류하세요.',
        en: 'Pay for your own effort comes in cleanly; just shelve money tangled with others — guarantees, partnerships, loans slip away.',
      },
    ],
    career: [
      {
        ko: '주도적으로 밀어붙이기 좋은 날. 혼자 처리할 일에 집중하고 불필요한 충돌은 피하세요.',
        en: 'A good day to drive things yourself. Focus on solo work and avoid needless clashes.',
      },
      {
        ko: '내 손으로 끌고 가기 좋은 날 — 혼자 끝낼 수 있는 일부터 잡고, 괜한 마찰은 비켜 가세요.',
        en: 'Good for steering with your own hands — grab work you can finish alone and sidestep pointless friction.',
      },
      {
        ko: '자기 주도가 통하는 날. 독립적으로 처리할 과제에 집중하되, 기 싸움은 만들지 마세요.',
        en: 'Self-direction works today — concentrate on tasks you own, but don’t start turf battles.',
      },
      {
        ko: '추진력이 사는 날 — 혼자 결정해도 좋은 일에 힘을 쓰고, 부딪칠 자리는 줄이세요.',
        en: 'Momentum is with you — spend it on calls you can make alone, and cut down on clash points.',
      },
    ],
    people: [
      {
        ko: '친구·동료와의 자리가 늘어요. 경쟁보다 협력으로 가면 내 편이 생깁니다.',
        en: 'Time with friends and peers grows. Choose teamwork over rivalry and allies form.',
      },
      {
        ko: '또래·동료와 어울릴 일이 많은 날. 겨루기보다 손을 맞잡으면 우군이 늘어요.',
        en: 'Lots of mixing with peers today — join hands rather than compete and your circle of allies grows.',
      },
      {
        ko: '동료·친구와 엮이는 날 — 라이벌 의식을 내려놓고 함께 가면 내 편이 됩니다.',
        en: 'A day of ties with peers — drop the rivalry, go together, and they become your side.',
      },
    ],
    study: [
      {
        ko: '혼자 집중하는 공부에 좋은 날. 스스로 정리하면 머리에 잘 남아요.',
        en: 'Good for solo, focused study — organizing it yourself makes it stick.',
      },
      {
        ko: '혼자 파고드는 공부가 잘 되는 날. 직접 정리해 두면 오래 기억에 남습니다.',
        en: 'Deep solo study flows today — tidy it up yourself and it lingers in memory.',
      },
      {
        ko: '스스로 집중하기 좋은 날 — 남의 자료보다 내 손으로 정리한 게 더 오래 갑니다.',
        en: 'Good for self-focus — what you organize by hand lasts longer than borrowed notes.',
      },
    ],
    health: [
      {
        ko: '활력이 도는 날 — 운동·몸 쓰기 좋아요. 경쟁심에 무리하다 다치지 않게.',
        en: 'Energy runs high — great for exercise and moving your body. Just don’t push into injury.',
      },
      {
        ko: '기운이 차오르는 날 — 운동·신체 활동에 딱이에요. 다만 승부욕에 과하게 밀어붙이진 마세요.',
        en: 'Vitality is up — perfect for exercise and physical activity; just don’t let competitiveness overdo it.',
      },
      {
        ko: '몸이 가벼운 날 — 운동·활동에 좋습니다. 무리한 경쟁만 피하면 다칠 일이 없어요.',
        en: 'Your body feels light — good for exercise and activity; skip the all-out competition and you won’t get hurt.',
      },
    ],
  },
  output: {
    money: [
      {
        ko: '아이디어가 돈이 되는 날(식상생재). 콘텐츠·영업·판매·부업에 유리해요.',
        en: 'Ideas turn into income today — favorable for content, sales and side work.',
      },
      {
        ko: '재주가 수입으로 이어지는 날(식상생재) — 콘텐츠·세일즈·판매·부업에 힘이 실려요.',
        en: 'Your talents convert to income today — content, sales, selling and side gigs all get a lift.',
      },
      {
        ko: '만들고 파는 흐름이 돈을 부르는 날. 콘텐츠·영업·판매·부업 쪽이 특히 유리합니다.',
        en: 'Making and selling pulls money in today — content, sales, selling and side work especially favored.',
      },
    ],
    career: [
      {
        ko: '발표·기획·창작에 빛나는 날. 다만 윗사람 비판은 한 박자 늦추세요(말로 적 만들기 쉬움).',
        en: 'You shine in presenting, planning and creating. Hold back criticism of superiors — words make enemies today.',
      },
      {
        ko: '표현·기획·창작이 살아나는 날. 단, 상사 비판은 한 템포 참으세요 — 말이 적을 만들기 쉬운 날입니다.',
        en: 'Expression, planning and creation come alive — but hold criticism of the boss a beat; words make enemies today.',
      },
      {
        ko: '아이디어를 펼치고 발표하기 좋은 날. 다만 윗사람을 향한 말은 한 번 더 다듬으세요(설화 주의).',
        en: 'Great for unfolding and presenting ideas — just polish words aimed at superiors twice; loose talk bites today.',
      },
    ],
    people: [
      {
        ko: '사람을 즐겁게 하는 날 — 모임·네트워킹에 유리. 말이 과하지 않게만.',
        en: 'A day that delights people — good for gatherings and networking. Just don’t overtalk.',
      },
      {
        ko: '분위기를 띄우는 날 — 모임·인맥 자리에 유리해요. 말만 너무 앞서지 않게 하세요.',
        en: 'You lift the mood today — gatherings and networking go well; just don’t let talk run ahead of you.',
      },
      {
        ko: '사람들과 어울리기 즐거운 날 — 모임·네트워킹에 좋습니다. 다만 과한 입은 한 번 닫으세요.',
        en: 'A fun day among people — good for gatherings and networking; rein the chatter in once.',
      },
    ],
    study: [
      {
        ko: '글쓰기·발표·표현 공부에 좋은 날. 암기보다 직접 만들어 보면 빨라요.',
        en: 'Good for writing, presenting and expressive study — produce rather than just memorize.',
      },
      {
        ko: '쓰기·발표·표현 위주 공부가 잘 되는 날. 외우기보다 직접 만들어 보면 더 빨리 늡니다.',
        en: 'Writing, presenting and expressive study click today — build something rather than memorize and you speed up.',
      },
      {
        ko: '표현형 공부에 강한 날 — 글·발표로 풀면 잘 됩니다. 손으로 만들어 볼수록 빨라요.',
        en: 'Strong day for expressive learning — work it through writing or speaking; the more you make, the faster it goes.',
      },
    ],
    health: [
      {
        ko: '잘 먹고 잘 쉬면 회복이 빠른 날. 과로·과음만 조심하세요.',
        en: 'Eat well and rest and you recover fast — just avoid overwork and overdrinking.',
      },
      {
        ko: '먹고 쉬는 게 보약인 날 — 회복이 빠릅니다. 과로와 과음만 멀리하세요.',
        en: 'Food and rest are the real tonic today — recovery is quick; just keep overwork and overdrinking away.',
      },
      {
        ko: '잘 챙겨 먹고 푹 쉬면 몸이 빨리 돌아오는 날. 무리·과음만 피하면 됩니다.',
        en: 'Eat properly and rest fully and the body bounces back fast — just dodge strain and overdrinking.',
      },
    ],
  },
  wealth: {
    money: [
      {
        ko: '돈 기운이 켜진 날 — 거래·계약·수금·합리적 쇼핑 판단에 유리. 다만 욕심·투기는 한 박자 늦추세요.',
        en: 'Money energy is switched on — favorable for deals, contracts, collecting and smart spending. Rein in greed and speculation by a beat.',
      },
      {
        ko: '돈 기운이 켜진 날 — 거래·계약·수금·현명한 소비에 유리합니다. 욕심과 투기만 한 박자 누르세요.',
        en: 'Money energy is on today — good for deals, contracts, collecting and wise spending; just press greed and speculation down a beat.',
      },
      {
        ko: '돈 기운이 켜진 날 — 흥정·계약·받을 돈·합리적 지출 판단이 잘 섭니다. 다만 한탕·욕심은 미루세요.',
        en: 'Money energy is switched on — bargaining, contracts, collecting and sensible spending land well; shelve the get-rich-quick urge.',
      },
    ],
    career: [
      {
        ko: '실적·성과로 보여주기 좋은 날. 영업·협상·결과 중심 업무에 유리해요.',
        en: 'A day to show results — favorable for sales, negotiation and outcome-driven work.',
      },
      {
        ko: '숫자·결과로 증명하기 좋은 날 — 영업·협상·성과 중심 업무에 힘이 실려요.',
        en: 'Good day to prove it with numbers and results — sales, negotiation and outcome-driven work get a boost.',
      },
      {
        ko: '성과로 말하기 좋은 날. 영업·협상·딜 마무리처럼 결과가 남는 일에 유리합니다.',
        en: 'A day to let results speak — favorable for sales, negotiation and closing deals where outcomes stick.',
      },
    ],
    people: [
      {
        ko: '실리로 엮인 사람과의 자리. 먼저 베풀면 돌아오는 날이에요.',
        en: 'Time with practical connections — give first and it comes back today.',
      },
      {
        ko: '득실로 연결된 사람과의 자리 — 내가 먼저 챙겨 주면 돌아옵니다.',
        en: 'Time among interest-based ties — look after them first and it returns to you.',
      },
      {
        ko: '실속으로 맺어진 관계의 날. 베풂이 곧 투자가 되어 돌아오는 흐름이에요.',
        en: 'A day of practical relationships — giving acts as an investment that circles back.',
      },
    ],
    study: [
      {
        ko: '집중이 흩어지기 쉬운 날 — 이론보다 실전·응용 위주로 가세요.',
        en: 'Focus scatters easily — go for practice and application over theory.',
      },
      {
        ko: '집중이 잘 안 묶이는 날 — 이론을 파기보다 실전·응용 위주로 가볍게 가세요.',
        en: 'Focus won’t lock in easily — keep it practical and applied rather than digging into theory.',
      },
      {
        ko: '책상 앞 집중이 흐트러지기 쉬운 날. 개념 암기보다 문제 풀이·실전 위주가 낫습니다.',
        en: 'Desk focus drifts today — favor problem-solving and hands-on practice over memorizing concepts.',
      },
    ],
    health: [
      {
        ko: '활동량이 많아 피로가 쌓이기 쉬워요. 끼니를 거르지 말고 규칙적으로.',
        en: 'Lots of motion piles up fatigue — keep regular meals and don’t skip them.',
      },
      {
        ko: '움직임이 많아 피로가 누적되기 쉬운 날. 끼니를 거르지 말고 규칙적으로 챙기세요.',
        en: 'High activity stacks up fatigue today — don’t skip meals and keep them regular.',
      },
      {
        ko: '바쁘게 도느라 지치기 쉬운 날 — 식사 거르지 말고 일정한 리듬을 지키세요.',
        en: 'Running around tires you out today — don’t miss meals and hold a steady rhythm.',
      },
    ],
  },
  officer: {
    career: [
      {
        ko: '자리·인정·승진 기운이 도는 날. 책임을 맡고 규범을 지키면 점수가 올라가요.',
        en: 'Standing, recognition and promotion energy — take responsibility and keep the rules to gain points.',
      },
      {
        ko: '지위·인정·승진의 기운이 도는 날 — 책임을 떠안고 원칙을 지킬수록 평가가 올라갑니다.',
        en: 'Position, recognition and promotion are in the air — take on responsibility and hold to principle and your standing rises.',
      },
      {
        ko: '인정받고 자리를 굳히기 좋은 날. 맡은 책임을 다하고 규범을 지키면 점수로 돌아와요.',
        en: 'Good day to be recognized and cement your position — meet your duties and keep the rules, and it pays back in standing.',
      },
    ],
    money: [
      {
        ko: '안정적 관리의 날 — 큰 투자보다 정리·납부·규칙적 운용이 맞아요.',
        en: 'A day for steady management — settling, paying and routine handling over big bets.',
      },
      {
        ko: '돈은 지키고 다듬는 날 — 큰 베팅보다 정산·납부·규칙적인 운용이 맞습니다.',
        en: 'A day to guard and tidy money — settling, paying and routine handling beat big bets.',
      },
      {
        ko: '관리에 무게를 둘 날. 새 투자를 벌이기보다 정리·납부·꾸준한 운용에 집중하세요.',
        en: 'Lean on management today — focus on settling, paying and steady handling rather than launching new investments.',
      },
    ],
    people: [
      {
        ko: '윗사람·공적 관계에 유리한 날. 예의와 약속을 지키면 신뢰가 쌓입니다.',
        en: 'Favorable for superiors and formal ties — courtesy and kept promises build trust.',
      },
      {
        ko: '상사·공식 관계에 점수 따기 좋은 날 — 예의를 지키고 약속을 지키면 신뢰가 쌓여요.',
        en: 'Good for scoring with superiors and formal ties — mind your manners and keep promises to build trust.',
      },
      {
        ko: '윗선·공적인 자리에 유리한 날. 격식과 약속을 지키는 모습이 곧 신뢰로 남습니다.',
        en: 'Favorable for higher-ups and formal settings — keeping form and your word reads as trustworthiness.',
      },
    ],
    study: [
      {
        ko: '시험·자격·규칙적 공부에 좋은 날. 계획대로 밀고 나가면 잘 됩니다.',
        en: 'Good for exams, credentials and disciplined study — stick to the plan.',
      },
      {
        ko: '시험·자격·규율 있는 공부에 좋은 날 — 세운 계획대로 밀고 가면 결과가 따라옵니다.',
        en: 'Good for exams, credentials and disciplined study — drive the plan you set and results follow.',
      },
      {
        ko: '규칙적인 공부가 통하는 날. 시험·자격 준비는 계획표를 지킬수록 잘 풀려요.',
        en: 'Disciplined study pays today — for exams and credentials, the more you keep the schedule the better it goes.',
      },
    ],
    health: [
      {
        ko: '압박·스트레스가 몸에 올 수 있는 날. 무리·사고를 조심하고 쉬는 시간을 꼭 넣으세요.',
        en: 'Pressure and stress can hit the body — avoid strain and accidents, and build in rest.',
      },
      {
        ko: '긴장·압박이 몸으로 오기 쉬운 날 — 무리와 사고를 조심하고 쉬는 시간을 꼭 끼워 넣으세요.',
        en: 'Tension and pressure can land on the body — watch for strain and accidents, and be sure to slot in rest.',
      },
      {
        ko: '스트레스가 몸에 쌓이기 쉬운 날. 과로·부주의한 사고를 피하고 틈틈이 쉬어 가세요.',
        en: 'Stress builds up in the body today — avoid overwork and careless accidents, and rest in between.',
      },
    ],
  },
  resource: {
    study: [
      {
        ko: '공부·시험·자격에 최고의 날. 집중이 잘 되고 배운 게 오래 남아요.',
        en: 'A top day for study, exams and credentials — focus comes easily and learning lasts.',
      },
      {
        ko: '공부·시험·자격에 최고의 날 — 집중이 깊게 잡히고 배운 게 오래 남습니다.',
        en: 'A top day for study, exams and credentials — focus settles deep and what you learn sticks around.',
      },
      {
        ko: '공부·시험·자격에 최고의 날. 머리가 맑아 집중이 잘 되고, 익힌 것이 오래 갑니다.',
        en: 'A top day for study, exams and credentials — a clear head makes focus easy and learning endures.',
      },
    ],
    money: [
      {
        ko: '문서·계약·부동산 관련에 유리. 즉흥 지출보다는 신중하게 결정하세요.',
        en: 'Favorable for documents, contracts and property — decide carefully over impulse spending.',
      },
      {
        ko: '문서·계약·부동산 일에 유리한 날 — 충동 지출은 누르고 신중하게 결정하세요.',
        en: 'Favorable for documents, contracts and property — hold back impulse spending and decide with care.',
      },
      {
        ko: '서류·계약·부동산 쪽이 잘 풀리는 날. 즉흥적으로 지르기보다 한 번 더 따져 보세요.',
        en: 'Paperwork, contracts and property go smoothly today — weigh it once more rather than buying on impulse.',
      },
    ],
    career: [
      {
        ko: '배움·문서·승인·후원이 들어오는 날. 기획·연구·준비에 좋아요.',
        en: 'Learning, documents, approvals and backing come in — good for planning, research and prep.',
      },
      {
        ko: '배움·문서·결재·후원이 들어오는 날 — 기획·연구·사전 준비에 힘이 실려요.',
        en: 'Learning, documents, sign-offs and backing arrive — planning, research and prep get a lift.',
      },
      {
        ko: '승인·문서·지원이 들어오기 좋은 날. 새로 벌이기보다 기획·연구·준비에 쓰세요.',
        en: 'A good day for approvals, documents and support to land — spend it on planning, research and prep rather than launching.',
      },
    ],
    people: [
      {
        ko: '귀인·스승·윗사람의 도움이 오는 날 — 막히면 먼저 조언을 구해보세요.',
        en: 'Help from mentors and elders arrives — when stuck, ask for advice first.',
      },
      {
        ko: '귀인·스승·윗사람의 손길이 닿는 날 — 막히는 데가 있으면 먼저 조언을 청하세요.',
        en: 'A mentor or elder’s hand reaches you today — when you hit a wall, ask for advice first.',
      },
      {
        ko: '윗사람·스승의 도움이 오기 좋은 날. 혼자 끙끙대기보다 먼저 조언을 구하는 게 빠릅니다.',
        en: 'A good day for help from elders and mentors — asking for advice beats struggling alone.',
      },
    ],
    health: [
      {
        ko: '휴식·회복에 좋은 날. 잠과 충전으로 몸을 채우세요.',
        en: 'Good for rest and recovery — refill with sleep and downtime.',
      },
      {
        ko: '쉬고 회복하기 좋은 날 — 충분한 잠과 재충전으로 몸을 채우세요.',
        en: 'Good for resting and recovering — fill the body back up with sleep and downtime.',
      },
      {
        ko: '몸을 돌보고 회복하기 좋은 날. 잠과 휴식으로 에너지를 다시 채워 두세요.',
        en: 'A good day to tend the body and recover — top your energy back up with sleep and rest.',
      },
    ],
  },
}

function isFemale(sex: string): boolean {
  return sex === '여' || /female|^f$/i.test(sex)
}
function isMale(sex: string): boolean {
  return sex === '남' || /male|^m$/i.test(sex)
}

// 연애 분야 변주 풀 — (카테고리 × 성별 분기) 별로 3~4개. 의미는 그대로, 표현만 회전.
// 키는 'love:' + cat + ':' + 분기(m/f/neutral) 로 안정적 작은 정수를 만든다.
const LOVE_POOLS: Record<string, readonly Pair[]> = {
  'wealth:m': [
    {
      ko: '남성에겐 이성 인연·데이트 운이 켜진 날 — 먼저 다가가도 좋아요. 다만 가벼운 끌림과 진심은 구분하세요.',
      en: 'For men, romance and dating switch on — fine to make the first move, but tell a passing pull from the real thing.',
    },
    {
      ko: '남성에겐 이성운·데이트 흐름이 켜진 날 — 먼저 손 내밀어도 좋습니다. 순간의 끌림과 진심만 구분하세요.',
      en: 'For men, the romance-and-dating current is on — fine to reach out first; just separate a fleeting pull from the real thing.',
    },
    {
      ko: '남성에게 이성 인연이 잘 닿는 날 — 적극적으로 다가가도 좋아요. 단, 가벼운 호감과 진심은 헷갈리지 마세요.',
      en: 'For men, romantic connections land well today — going after it is fine; just don’t confuse a light spark with real feeling.',
    },
  ],
  'wealth:f': [
    {
      ko: '현실 감각으로 관계를 챙기기 좋은 날. 선물·데이트 같은 실질적 표현이 잘 통해요.',
      en: 'A good day to tend the relationship practically — concrete gestures like gifts or a date land well.',
    },
    {
      ko: '실질적으로 관계를 챙기기 좋은 날 — 선물이나 데이트처럼 손에 잡히는 표현이 잘 먹혀요.',
      en: 'Good day to care for the relationship in concrete ways — tangible gestures like a gift or a date go over well.',
    },
    {
      ko: '현실적인 다정함이 통하는 날. 말보다 선물·데이트 같은 구체적인 행동으로 마음을 보여주세요.',
      en: 'Practical warmth works today — show your heart through concrete acts like a gift or a date rather than words.',
    },
  ],
  'officer:f': [
    {
      ko: '여성에겐 좋은 인연·배우자운이 강한 날 — 진중한 만남에 특히 유리해요.',
      en: 'For women, a strong window for a good partner — especially favorable for serious connections.',
    },
    {
      ko: '여성에겐 좋은 인연·배우자 운이 강하게 도는 날 — 진지한 만남에 특히 유리합니다.',
      en: 'For women, a good-partner window runs strong — especially favorable for serious meetings.',
    },
    {
      ko: '여성에게 인연·배우자운이 무르익는 날 — 가벼운 만남보다 진중한 인연에 더 유리해요.',
      en: 'For women, partner luck ripens today — favorable for serious bonds over casual ones.',
    },
  ],
  'officer:m': [
    {
      ko: '책임감 있게 다가가면 신뢰를 얻는 날. 약속을 지키는 모습이 점수가 됩니다.',
      en: 'Approach with reliability and you earn trust today — keeping your word scores points.',
    },
    {
      ko: '믿음직하게 다가갈수록 신뢰가 쌓이는 날 — 약속을 지키는 모습이 그대로 점수가 됩니다.',
      en: 'The more dependably you approach, the more trust you build — keeping your word scores directly.',
    },
    {
      ko: '진중하게 책임지는 태도가 통하는 날. 말한 것을 지키면 그게 곧 매력이 됩니다.',
      en: 'A steady, responsible attitude works today — keeping your word becomes the attraction itself.',
    },
  ],
  'output:neutral': [
    {
      ko: '매력과 표현력이 살아나는 날 — 먼저 연락·고백·데이트에 좋아요. 말이 과하지 않게만.',
      en: 'Charm and expression come alive — great for reaching out, confessing or a date. Just don’t overtalk.',
    },
    {
      ko: '매력과 말솜씨가 살아나는 날 — 먼저 연락하거나 고백·데이트에 좋습니다. 입만 너무 앞서지 않게요.',
      en: 'Charm and a way with words come alive — good for reaching out, confessing or a date; just don’t let talk run ahead.',
    },
    {
      ko: '끌림과 표현력이 빛나는 날 — 먼저 다가가 연락·고백·데이트에 유리해요. 과한 말만 조심하세요.',
      en: 'Attraction and expressiveness shine — favorable for making the first move, confessing or a date; just watch overtalking.',
    },
  ],
  'self:neutral': [
    {
      ko: '주관이 강해지는 날 — 끌고 가려 하기보다 상대 말을 한 번 더 들어주면 좋아요.',
      en: 'Your will runs strong — listen once more instead of steering, and it goes better.',
    },
    {
      ko: '내 고집이 세지는 날 — 끌고 가려 들기보다 상대 말을 한 번 더 들어 주면 한결 부드러워요.',
      en: 'Your stubborn streak strengthens — listen once more rather than steering, and things soften.',
    },
    {
      ko: '자기 주장이 강해지는 날 — 밀어붙이기보다 상대 이야기를 한 번 더 들어 주세요.',
      en: 'Self-assertion runs high — give the other person’s words one more listen instead of pushing.',
    },
  ],
  'resource:neutral': [
    {
      ko: '깊은 대화와 정서적 교감의 날. 서두르기보다 마음을 나누면 가까워져요.',
      en: 'A day of deep talk and emotional closeness — share feelings rather than rush.',
    },
    {
      ko: '깊은 대화와 정서적 교감이 잘 되는 날. 서두르기보다 속마음을 나누면 가까워집니다.',
      en: 'Deep talk and emotional closeness flow today — share what’s inside rather than rush and you draw nearer.',
    },
    {
      ko: '마음을 나누기 좋은 날 — 진도를 서두르기보다 차분한 대화로 정을 쌓으세요.',
      en: 'A good day to share feelings — build closeness through calm conversation rather than rushing the pace.',
    },
  ],
}

/** 연애 분야 — 성별 의존(남=재성, 여=관성이 배우자·이성 인연). seed 로 표현만 개인화. */
function loveLine(cat: SibsinCategory, sex: string, ko: boolean, seed: number): string {
  const female = isFemale(sex)
  let poolKey: string
  switch (cat) {
    case 'wealth':
      poolKey = isMale(sex) ? 'wealth:m' : 'wealth:f'
      break
    case 'officer':
      poolKey = female ? 'officer:f' : 'officer:m'
      break
    case 'output':
      poolKey = 'output:neutral'
      break
    case 'self':
      poolKey = 'self:neutral'
      break
    case 'resource':
      poolKey = 'resource:neutral'
      break
  }
  const pool = LOVE_POOLS[poolKey!]
  return pickPair(pool, seed, hashStringToInt('love:' + poolKey!), ko)
}

/** 오늘 십신이 직접 켜는 분야 집합(강조용). 연애는 성별로 분기. */
function activeDomains(cat: SibsinCategory, sex: string): Set<string> {
  const s = new Set<string>()
  switch (cat) {
    case 'self':
      s.add('health').add('people')
      break
    case 'output':
      s.add('love').add('career')
      break
    case 'wealth':
      s.add('money')
      if (isMale(sex)) s.add('love')
      break
    case 'officer':
      s.add('career')
      if (isFemale(sex)) s.add('love')
      break
    case 'resource':
      s.add('study').add('people')
      break
  }
  return s
}

// 섹션 머리말 변주 풀 — band 별 3~4개. 의미는 그대로(순풍/평이/역풍), 표현만 회전.
const BAND_NOTE: Record<DayScoreBand, readonly Pair[]> = {
  good: [
    {
      ko: '오늘은 순풍 — 켜진 분야는 적극적으로 밀어붙여도 좋아요.',
      en: 'Tailwind today — push hard on the domains that are switched on.',
    },
    {
      ko: '오늘은 바람이 등을 밀어주는 날 — 켜진 분야는 망설이지 말고 밀어붙이세요.',
      en: 'The wind’s at your back today — don’t hesitate to push hard on the active domains.',
    },
    {
      ko: '흐름이 받쳐주는 하루 — 아래 켜진 분야는 적극적으로 나가도 좋습니다.',
      en: 'A day the flow has your back — feel free to go all in on the active areas below.',
    },
  ],
  mid: [
    // '큰 기복 없이' 같은 단정은 강한 흉신(−3)이 깔린 날과 모순될 수 있어 피한다.
    {
      ko: '무리한 확장만 피하면 무난한 하루 — 아래 켜진 분야 위주로.',
      en: 'Steady if you avoid overreaching — lean on the active areas below.',
    },
    {
      ko: '욕심내 벌이지만 않으면 무난한 하루 — 켜진 분야 위주로 가세요.',
      en: 'A fine day as long as you don’t overreach — lean on the active areas.',
    },
    {
      ko: '크게 벌이지 않으면 평이한 하루 — 아래 켜진 분야에 무게를 두세요.',
      en: 'An even day if you don’t bite off too much — put your weight on the active areas below.',
    },
  ],
  low: [
    {
      ko: '오늘은 역풍 — 큰 결정은 미루고 켜진 분야도 한 박자 천천히.',
      en: 'Headwind today — postpone big calls and take even the active domains a beat slower.',
    },
    {
      ko: '오늘은 바람이 거스르는 날 — 큰 결정은 미루고 켜진 분야도 한 박자 늦춰 가세요.',
      en: 'The wind runs against you today — defer big calls and take even the active domains a beat slower.',
    },
    {
      ko: '결이 거센 하루 — 중요한 결정은 보류하고, 켜진 분야도 천천히 가는 게 낫습니다.',
      en: 'A rough-grained day — hold off on big decisions and ease even the active domains along.',
    },
  ],
}

// ── 그날 실제 신호 → 분야 분류용 매핑 (행성·신살·교차). ─────────────────────
// 새 계산이 아니라, 이미 셀에 계산된 신호를 분야로 나눌 뿐. 사람마다 본명이
// 달라 트랜짓·신살이 다르므로 분야 근거도 1인 1결과가 된다.

// 행성 → 분야 (점성 표준 주관). day.transits.body 는 영문 행성명.
const PLANET_DOMAINS: Record<string, string[]> = {
  Venus: ['love', 'money'],
  Jupiter: ['money', 'career'],
  Saturn: ['career', 'health'], // 토성=제약·압박·만성피로·뼈 (공부는 수성/인성)
  Mercury: ['study', 'career'],
  Mars: ['health', 'career'],
  Sun: ['career', 'health'],
  Moon: ['health', 'people', 'love'], // 달=감정·대중·정서 교감
  Uranus: ['career'],
  Neptune: ['love', 'health'], // 해왕성=이상화된 연애·면역/수면 (명료한 학습과 상충)
  Pluto: ['money', 'career'],
}
// 행성 한글 라벨 — 공용 SSOT(planetNames)에서 파생(앵글 키는 안 쓰지만 무해).
const PLANET_KO_SHORT: Record<string, string> = { ...PLANET_KO_BASE }
// 엔진 신호의 aspectType 은 영문('trine'…)이라, KO 표시는 영문→한글로 옮긴다.
// (일부 경로는 한글일 수 있어 양방향 폴백.)
const ASPECT_EN: Record<string, string> = {
  합: 'conjunction',
  사각: 'square',
  삼각: 'trine',
  대립: 'opposition',
  섹스타일: 'sextile',
  퀸컹스: 'quincunx',
  반섹스타일: 'semisextile',
}
const ASPECT_KO: Record<string, string> = {
  conjunction: '합',
  square: '사각',
  trine: '삼각',
  opposition: '대립',
  sextile: '육각',
  quincunx: '퀸컹스',
  semisextile: '반육각',
}

// 신살 이름(부분일치) → 분야. 명리 표준 의미.
const SHINSAL_DOMAINS: Array<{ match: string; domains: string[] }> = [
  { match: '도화', domains: ['love'] },
  { match: '홍염', domains: ['love'] },
  { match: '금여', domains: ['love'] },
  { match: '역마', domains: ['career'] },
  { match: '문창', domains: ['study'] },
  { match: '학당', domains: ['study'] },
  { match: '화개', domains: ['study'] },
  { match: '귀인', domains: ['people'] }, // 천을·천덕·월덕·복성·태극귀인 등
  { match: '천덕', domains: ['people'] }, // '천덕'(단독) — '귀인' 미부착 출력 대비
  { match: '월덕', domains: ['people'] },
  { match: '태극', domains: ['people'] },
  { match: '복성', domains: ['people'] },
  { match: '양인', domains: ['health'] },
  { match: '백호', domains: ['health'] },
  { match: '괴강', domains: ['career'] },
  { match: '재고', domains: ['money'] },
]

// 교차활성 텍스트 키워드 → 분야 (사주측·점성측·뜻을 한데 스캔).
const CROSS_KEYWORDS: Array<{ keys: string[]; domain: string }> = [
  {
    keys: ['도화', '홍염', '금성', 'Venus', '연애', '배우자', '합', '삼합', '육합'],
    domain: 'love',
  },
  { keys: ['재성', '재물', '편재', '정재', '목성', 'Jupiter'], domain: 'money' },
  // '편관'은 1차 직업(七殺=권력·책임). '충'=직업변동. '직'은 오탐 줄이려 '직업/직장'으로.
  {
    keys: ['관성', '정관', '편관', '토성', 'Saturn', '태양', 'Sun', '명예', '직업', '직장', '충'],
    domain: 'career',
  },
  { keys: ['인성', '정인', '편인', '수성', 'Mercury', '문서', '문창'], domain: 'study' },
  // 합=협력/인연, 충=관계균열, 형=마찰 — 모두 사람 축에도 작용.
  { keys: ['귀인', '비견', '겁재', '합', '충', '형', 'Moon'], domain: 'people' },
  // 형=수술·사고, 화성=다툼·열 — 건강. ('편관'은 직업으로 일원화, '충'은 직업/관계로 이동.)
  { keys: ['화성', 'Mars', '형'], domain: 'health' },
]
function crossDomains(hay: string): string[] {
  const out = new Set<string>()
  for (const rule of CROSS_KEYWORDS) {
    if (rule.keys.some((k) => hay.includes(k))) out.add(rule.domain)
  }
  return [...out]
}

export interface DayEvidenceInput {
  transits: Array<{ body?: string; aspect?: string; polarity: number }>
  shinsal: string[]
  crossActivations: Array<{
    sajuSide: string
    astroSide: string
    /** 분야 라우팅용 KO 텍스트(로케일 무관). 없으면 sajuSide/astroSide 로 폴백. */
    route?: string
    meaning?: string
    polarity: number
  }>
  /** 시(時)별 달 절정 — 본명 점(body)으로 분야 라우팅 + 시각 칩. */
  moon?: Array<{
    body: string // 'Venus'·'Sun'·'Ascendant'…
    aspectKo: string
    aspectEn: string
    when: string // '13-15시 (미시)'
    whenEn: string
    polarity: number
  }>
}

// 달이 건드린 본명 점 → 분야 (행성은 PLANET_DOMAINS 재사용 + 앵글 보강).
const MOON_POINT_DOMAINS: Record<string, string[]> = {
  ...{
    Venus: ['love', 'money'],
    Jupiter: ['money', 'career'],
    Saturn: ['career', 'health'],
    Mercury: ['study', 'career'],
    Mars: ['health', 'career'],
    Sun: ['career', 'health'],
    Moon: ['health', 'people', 'love'],
    Uranus: ['career'],
    Neptune: ['love', 'health'],
    Pluto: ['money', 'career'],
  },
  Ascendant: ['health'],
  MC: ['career'],
}

/** 그날 실제 신호를 분야별 근거로 분류 (locale 반영 텍스트). */
function classifyEvidence(input: DayEvidenceInput, ko: boolean): Record<string, DomainEvidence[]> {
  const out: Record<string, DomainEvidence[]> = {
    love: [],
    money: [],
    career: [],
    people: [],
    study: [],
    health: [],
  }
  // 트랜짓 (점성)
  for (const t of input.transits) {
    const body = t.body ?? ''
    const doms = PLANET_DOMAINS[body]
    if (!doms) continue
    const aspect = t.aspect ?? ''
    const text = ko
      ? `${PLANET_KO_SHORT[body] ?? body} ${ASPECT_KO[aspect] ?? aspect}`.trim()
      : `${body} ${ASPECT_EN[aspect] ?? aspect}`.trim()
    for (const d of doms) out[d].push({ text, polarity: t.polarity, kind: 'astro' })
  }
  // 신살 (사주) — EN 로케일에선 신살명을 영문으로(원문 한글 누출 방지).
  for (const s of input.shinsal) {
    const label = ko ? s : translateSignalLabel(s, 'en')
    for (const rule of SHINSAL_DOMAINS) {
      if (s.includes(rule.match)) {
        for (const d of rule.domains) out[d].push({ text: label, polarity: 0, kind: 'saju' })
      }
    }
  }
  // 사주 × 점성 교차
  for (const c of input.crossActivations) {
    // 라우팅은 KO route 로(로케일 무관) — EN 표시일 때도 분야 분류가 동일해야
    // 같은 차트가 KO/EN 에서 정반대 톤이 되는 버그가 안 난다.
    const doms = crossDomains(c.route ?? `${c.sajuSide} ${c.astroSide} ${c.meaning ?? ''}`)
    const text = `${c.sajuSide} ↔ ${c.astroSide}`
    for (const d of doms) out[d].push({ text, polarity: c.polarity, kind: 'cross' })
  }
  // 시(時)별 달 절정 — 달이 건드린 본명 점으로 분야 라우팅, 칩에 시각 포함.
  for (const mn of input.moon ?? []) {
    const doms = MOON_POINT_DOMAINS[mn.body]
    if (!doms) continue
    const short = (ko ? mn.when : mn.whenEn).replace(/\s*\(.*\)/, '').trim()
    const text = ko ? `${short} 달${mn.aspectKo}` : `${short} Moon ${mn.aspectEn}`
    for (const d of doms)
      out[d].push({ text, polarity: mn.polarity, kind: 'moon', when: mn.when, whenEn: mn.whenEn })
  }
  // 분야별 중복 제거 + |polarity| 높은 순 4개(시각 달 칩 자리 확보).
  // astro 칩은 *행성* 기준으로 묶는다 — 같은 행성이 여러 각(수성 사각·육각·삼각)
  // 으로 동시에 잡히면 한 행성당 가장 센 한 칩만 남겨 중복·기하 모순을 없앤다.
  const dedupKey = (e: DomainEvidence) =>
    e.kind === 'astro' ? `astro:${e.text.split(' ')[0]}` : `${e.kind}:${e.text}`
  for (const d of Object.keys(out)) {
    const seen = new Set<string>()
    const sorted = out[d]
      .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))
      .filter((e) => {
        const k = dedupKey(e)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    const capped = sorted.slice(0, 4)
    // 시별 달(moon) 칩은 |polarity| 가 낮아 4개 컷에 잘 밀려난다. 본문 시각 클로즈
    // + 🌙 칩이 사라지지 않게, 4개 안에 moon 이 없으면 가장 센 moon 한 개를 보장.
    if (!capped.some((e) => e.kind === 'moon')) {
      const moon = sorted.find((e) => e.kind === 'moon')
      if (moon) {
        if (capped.length >= 4) capped[3] = moon
        else capped.push(moon)
      }
    }
    out[d] = capped
  }
  return out
}

// 분야별 '주의' 본문 — 그날 그 분야의 근거가 뚜렷이 부정적일 때(합 ≤ -2) 긍정
// 십신 조언을 대신한다. 칩(긴장 신호)과 톤을 맞춰 모순을 없애는 용도.
// 분야별 '주의' 본문 변주 풀 — 분야별 3~4개. 의미(마찰·방어)는 그대로, 표현만 회전.
// 모든 변주에 분야 핵심 신호어('마찰'/friction 계열)를 유지해 칩과 톤이 어긋나지 않게.
const CAUTION_BODY: Record<string, readonly Pair[]> = {
  love: [
    {
      ko: '연애·관계에 거스르는 기운이 도는 날 — 서운한 말이나 즉흥 고백은 미루세요.',
      en: 'Relationships hit friction today — hold off on touchy talks or impulsive confessions.',
    },
    {
      ko: '관계에 마찰이 끼는 날 — 서운한 말이나 충동적인 고백은 한 박자 미루세요.',
      en: 'Friction creeps into ties today — push back hurtful words or impulsive confessions a beat.',
    },
    {
      ko: '연애에 결이 어긋나는 날 — 예민한 대화나 즉흥적인 고백은 오늘만 미뤄 두세요.',
      en: 'Romance runs against the grain today — shelve touchy talks and impulsive confessions just for now.',
    },
  ],
  money: [
    {
      ko: '돈 흐름이 거슬리는 날 — 큰 지출·투자·보증은 미루고 지키기에 집중하세요.',
      en: 'Money runs rough today — postpone big spends, investments and guarantees; play defense.',
    },
    {
      ko: '돈 흐름에 마찰이 끼는 날 — 큰 지출·투자·보증은 미루고 방어에 집중하세요.',
      en: 'Money flow hits friction today — defer big spends, investments and guarantees; focus on defense.',
    },
    {
      ko: '돈이 거슬리게 도는 날 — 큰 결제·투자·보증은 보류하고 지키는 데 무게를 두세요.',
      en: 'Money moves roughly today — hold off on big payments, investments and guarantees, and lean on guarding it.',
    },
  ],
  career: [
    {
      ko: '일에 마찰이 끼는 날 — 새로 벌이거나 부딪치기보다 마무리·점검 위주로.',
      en: 'Work hits friction today — wrap up and review rather than start new or clash.',
    },
    {
      ko: '업무에 마찰이 끼는 날 — 새로 벌이거나 부딪치기보다 정리·점검에 집중하세요.',
      en: 'Friction shows up in work today — focus on wrapping up and checking rather than starting new or clashing.',
    },
    {
      ko: '일이 거슬리게 풀리는 날 — 새 일을 벌이기보다 마무리하고 점검하는 쪽으로 가세요.',
      en: 'Work runs against the grain today — lean toward finishing and reviewing instead of launching anew.',
    },
  ],
  people: [
    {
      ko: '사람 사이가 삐걱대는 날 — 예민한 자리·논쟁은 피하고 한 걸음 물러서세요.',
      en: 'Ties feel scratchy today — avoid charged settings and step back a little.',
    },
    {
      ko: '관계에 마찰이 이는 날 — 예민한 자리나 논쟁은 피하고 한 발 물러서세요.',
      en: 'Friction stirs in relationships today — avoid charged settings or debates and step back a pace.',
    },
    {
      ko: '사람 사이가 거슬리는 날 — 날 선 자리·말다툼은 비켜 가고 한 걸음 물러서세요.',
      en: 'People feel scratchy today — sidestep tense settings and arguments, and give a little ground.',
    },
  ],
  study: [
    {
      ko: '집중이 흐트러지는 날 — 새 분량보다 복습·정리 위주로 가볍게 가세요.',
      en: 'Focus scatters today — review and tidy rather than take on new material.',
    },
    {
      ko: '집중에 마찰이 끼는 날 — 새 진도보다 복습·정리 위주로 가볍게 가세요.',
      en: 'Focus hits friction today — go light with review and tidying rather than new material.',
    },
    {
      ko: '집중이 자꾸 흩어지는 날 — 새 분량을 늘리기보다 복습하고 정리하는 쪽이 낫습니다.',
      en: 'Focus keeps slipping today — better to review and tidy than to pile on new material.',
    },
  ],
  health: [
    {
      ko: '몸에 무리가 오기 쉬운 날 — 과로·과격한 운동·사고를 조심하고 쉬어가세요.',
      en: 'The body strains easily today — avoid overwork, hard workouts and accidents; rest.',
    },
    {
      ko: '몸에 무리가 가기 쉬운 날 — 과로·격한 운동·사고를 조심하고 틈틈이 쉬어가세요.',
      en: 'The body takes strain easily today — watch overwork, hard workouts and accidents, and rest in between.',
    },
    {
      ko: '몸이 쉽게 지치는 날 — 과로와 격한 운동, 부주의한 사고를 피하고 쉬어 가세요.',
      en: 'The body tires easily today — avoid overwork, intense workouts and careless accidents, and take rest.',
    },
  ],
}

// 분야별 band-aware 한 줄 — 섹션 머리말(BAND_NOTE)과 *다른* 짧은 문장으로,
// 그 분야에 한정해 톤만 잡는다. 'caution' 은 polaritySum ≤ -2(주의 본문) 가지로,
// 순풍이라도 "밀어붙이라"고 말하지 않게 톤을 누른다(칩과 모순 방지).
// 분야별 band 한 줄 변주 풀 — 가지별 3~4개. 동적 텍스트가 없는 독립 클로즈라
// 조사 안전(앞 문장과 마침표로 끊겨 이어진다). 의미는 그대로, 표현만 회전.
const BAND_DOMAIN_CLAUSE: Record<DayScoreBand | 'caution', readonly Pair[]> = {
  good: [
    {
      ko: ' 흐름이 받쳐주니 한 발 더 내디뎌도 좋아요.',
      en: ' The flow is behind you, so it’s fine to lean in a step further.',
    },
    {
      ko: ' 흐름이 등을 밀어주니 한 발 더 나가도 좋습니다.',
      en: ' The current has your back, so it’s fine to lean in a little more.',
    },
    {
      ko: ' 받쳐주는 흐름이라 평소보다 한 발 더 밀어붙여도 괜찮아요.',
      en: ' With the flow supporting you, it’s fine to lean in a step beyond usual.',
    },
  ],
  mid: [
    {
      ko: ' 욕심만 내려놓으면 꾸준히 가기 좋은 결입니다.',
      en: ' Set greed aside and it’s a fine groove to keep steady in.',
    },
    {
      ko: ' 욕심만 비우면 꾸준히 밀고 가기 좋은 결이에요.',
      en: ' Empty out the greed and it’s a good groove to keep pushing steadily.',
    },
    {
      ko: ' 과욕만 덜어내면 일정하게 가기 좋은 흐름입니다.',
      en: ' Trim the overreach and it’s a flow good for keeping an even pace.',
    },
  ],
  low: [
    {
      ko: ' 결이 거세니 무리하지 말고 한 박자 천천히 가세요.',
      en: ' The grain runs rough, so don’t force it — go a beat slower.',
    },
    {
      ko: ' 결이 거치니 억지로 밀지 말고 한 박자 늦춰 가세요.',
      en: ' The grain runs coarse, so don’t push it — take it a beat slower.',
    },
    {
      ko: ' 흐름이 거센 날이라 무리하기보다 천천히 한 박자 늦춰 가세요.',
      en: ' On a rough-flowing day, ease off rather than force it — a beat slower.',
    },
  ],
  caution: [
    {
      ko: ' 오늘은 벌이기보다 지키고 추스르는 쪽이 낫습니다.',
      en: ' Today leans toward holding steady and regrouping rather than pushing.',
    },
    {
      ko: ' 오늘은 새로 벌이기보다 지키고 추스르는 편이 낫습니다.',
      en: ' Today favors guarding and regrouping over starting something new.',
    },
    {
      ko: ' 오늘은 밀어붙이기보다 지키며 추스르는 쪽으로 가세요.',
      en: ' Today, go toward guarding and regrouping rather than pushing forward.',
    },
  ],
}

/**
 * 분야별 band-aware 한 줄. 주의 본문 가지(caution)면 band 무관하게 누른 톤을 쓴다.
 * 머리말과 겹치지 않게 짧고 분야 한정으로. seed 로 사람마다 표현만 회전.
 */
function bandDomainClause(band: DayScoreBand, caution: boolean, ko: boolean, seed: number): string {
  const branch: DayScoreBand | 'caution' = caution ? 'caution' : band
  const pool = BAND_DOMAIN_CLAUSE[branch]
  return pickPair(pool, seed, hashStringToInt('bdc:' + branch), ko)
}

/**
 * 그 분야의 *가장 센 실제 신호*(|polarity| 최대, moon 제외 — moon 은 moonTimeClause 가
 * 따로 시각으로 엮음)를 산문 한 줄로 엮는다. 동적 텍스트(예: '편재 ↔ 금성', '천을귀인',
 * '토성 사각')에 한국어 주격/목적격 조사(이/가·을/를·은/는)를 직접 붙이면 비문이 되므로,
 * em-dash·콜론·쉼표 구조로만 잇는다. 방향(부호)에 따라 동사를 고른다.
 */
function strongSignalClause(ev: DomainEvidence[], ko: boolean): string {
  let best: DomainEvidence | null = null
  for (const e of ev) {
    if (e.kind === 'moon') continue
    if (e.polarity === 0) continue // 신살(중립 polarity 0)은 방향이 없어 산문화 보류
    if (!best || Math.abs(e.polarity) > Math.abs(best.polarity)) best = e
  }
  if (!best) return ''
  const text = best.text.trim()
  if (!text) return ''
  if (best.polarity > 0) {
    // 동적 텍스트 뒤에 조사 없이 em-dash 로 이어 받침 유무와 무관하게 자연스럽게.
    return ko
      ? ` 오늘은 ${text} — 이 분야를 밀어주는 신호예요.`
      : ` Today, ${text} is the signal pushing this area forward.`
  }
  return ko
    ? ` 다만 ${text} — 이 분야에 마찰을 더하니 살펴보세요.`
    : ` That said, ${text} adds friction here, so keep an eye on it.`
}

/**
 * 분야 근거 중 시별 달(moon) 신호가 있으면, 가장 센(|polarity| 최대) 달의 시각을
 * 본문에 한 줄로 엮는다. 시각 창만 남기고 "달…" 꼬리는 떼어 시간만 보이게 한다.
 * (예: "21-23시 달삼각" → "21-23시"). 차트별 신호가 달라 1인 1결과로 일반화된다.
 */
function moonTimeClause(ev: DomainEvidence[], ko: boolean): string {
  let best: DomainEvidence | null = null
  for (const e of ev) {
    if (e.kind !== 'moon') continue
    if (!best || Math.abs(e.polarity) > Math.abs(best.polarity)) best = e
  }
  if (!best) return ''
  const raw = (ko ? best.when : best.whenEn) ?? best.text
  const time = raw.replace(/\s*\(.*\)/, '').trim()
  if (!time) return ''
  if (best.polarity >= 0) {
    return ko ? ` 특히 ${time}에 흐름이 살아나요.` : ` Especially ${time} the flow picks up.`
  }
  return ko ? ` ${time}엔 한 박자 늦추세요.` : ` Around ${time}, ease off a beat.`
}

export function deriveDayDomains(args: {
  iljinSibsin: string
  sex: string
  scoreBand: DayScoreBand
  /** 그날 실제 신호 — 주면 분야별 근거가 붙고, 없으면 십신 기본 조언만. */
  evidence?: DayEvidenceInput
  /** evidence 텍스트 locale (기본 ko). */
  ko?: boolean
  /**
   * 본명(natal)에서 뽑은 개인 시드 — 고정 문구 풀을 회전해 사람마다 다른 표현을
   * 결정론적으로 고른다(같은 시드+입력 → 같은 출력). 판단(점수·신호)은 안 바꾸고
   * 표현만 개인화한다. 기본 0(레거시: 변주 풀의 첫 항목).
   */
  seed?: number
}): DayDomainsResult | null {
  const cat = SIBSIN_CATEGORY[args.iljinSibsin]
  if (!cat) return null
  const seed = args.seed ?? 0
  const activeDomainSet = activeDomains(cat, args.sex)
  const evidenceByDomain = args.evidence ? classifyEvidence(args.evidence, args.ko !== false) : null
  const domains: DayDomainAdvice[] = DOMAIN_META.map((d) => {
    const ev = evidenceByDomain?.[d.key] ?? []
    // 근거 극성 합 — 톤·배지를 그날 *그 분야의 실제 신호*에 맞춘다. 같은 일진이라도
    // 본명이 다르면 분야별 신호(트랜짓)가 달라 결과가 사람마다 갈린다(개인화).
    const polaritySum = ev.reduce((s, e) => s + e.polarity, 0)
    // 본문: 근거가 뚜렷이 부정적(합 ≤ -2)이면 긍정 십신 조언 대신 '주의' 본문으로
    // 바꿔, 칩(긴장 신호)과 글의 톤이 어긋나지 않게 한다(모순 제거).
    const caution = polaritySum <= -2
    let body: string
    let bodyEn: string
    if (caution) {
      // 주의 본문 풀 — 분야(d.key)를 키로 섞어 같은 분야라도 사람마다 다른 표현.
      const cKey = hashStringToInt('caution:' + d.key)
      body = pickPair(CAUTION_BODY[d.key], seed, cKey, true)
      bodyEn = pickPair(CAUTION_BODY[d.key], seed, cKey, false)
    } else if (d.key === 'love') {
      body = loveLine(cat, args.sex, true, seed)
      bodyEn = loveLine(cat, args.sex, false, seed)
    } else {
      // ADVICE 풀 — (cat, domain) 을 키로 섞어 같은 일진·분야라도 사람마다 다른 표현.
      const aKey = hashStringToInt('advice:' + cat + ':' + d.key)
      body = pickPair(ADVICE[cat][d.key], seed, aKey, true)
      bodyEn = pickPair(ADVICE[cat][d.key], seed, aKey, false)
    }
    // (2) band-aware 한 줄 — 점수 구간에 맞춰 톤을 잡는다. 주의(caution) 가지면
    // 순풍이라도 "밀어붙이라" 대신 누른 톤을 써 칩과 모순이 안 나게 한다.
    body += bandDomainClause(args.scoreBand, caution, true, seed)
    bodyEn += bandDomainClause(args.scoreBand, caution, false, seed)
    // (3) 그 분야의 가장 센 실제 신호를 산문 한 줄로 — 조사 없이 em-dash 로 이어
    // 동적 텍스트의 한국어 받침 문제를 피한다(particle-safe).
    body += strongSignalClause(ev, true)
    bodyEn += strongSignalClause(ev, false)
    // 시별 달 근거가 있으면 실제 절정 시각을 본문에 엮어 더 구체적으로(KO/EN).
    const koClause = moonTimeClause(ev, true)
    const enClause = moonTimeClause(ev, false)
    if (koClause) body += koClause
    if (enClause) bodyEn += enClause
    // '주목' 배지 = 그날 *십신이 관장하는* 분야(=오늘의 테마) 1~2개만 — 단,
    // 근거가 net-negative 면(긴장 분야) 배지를 달지 않는다(긍정 강조와 모순 방지).
    // 트랜짓은 매일 거의 모든 분야에 깔려 배지로 쓰면 다 켜져버리므로, 실제
    // 신호는 배지 대신 분야별 '근거' 칩으로 보여준다(분리).
    const active = activeDomainSet.has(d.key) && (ev.length === 0 || polaritySum >= 0)
    return {
      key: d.key,
      icon: d.icon,
      label: d.ko,
      labelEn: d.en,
      body,
      bodyEn,
      active,
      evidence: ev,
    }
  })
  // 섹션 머리말도 풀에서 — band 를 키로 섞어 같은 밴드라도 사람마다 다른 표현.
  const bnKey = hashStringToInt('band:' + args.scoreBand)
  return {
    bandNote: pickPair(BAND_NOTE[args.scoreBand], seed, bnKey, true),
    bandNoteEn: pickPair(BAND_NOTE[args.scoreBand], seed, bnKey, false),
    domains,
  }
}
