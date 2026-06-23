/**
 * dayActions — 그날 "이렇게 해보세요" 행동 처방 (KO/EN).
 *
 * 기존 화면은 점수 구간(band)만 보고 칩 2개를 띄워 빈약했다. 여기선 그날 *일진
 * 십신*(일간 기준 그날의 십신)을 명리 표준 의미로 풀어 — 오늘 하면 좋은 구체
 * 행동(do) · 오늘은 피할 것(avoid) · 한 끗 팁(tip) — 을 만든다. band 는 톤만
 * 조절(순풍=밀기 / 평이=핵심만 / 역풍=정리·점검). 새 점괘는 짓지 않는다:
 * 십신·band 라는 *이미 계산된* 판단을 행동어로 옮길 뿐. 같은 입력 → 같은 출력.
 *
 * seed(본명 개인 시드)로 표현만 사람마다 회전(판단 불변). 각 십신은 do/avoid 를
 * 넉넉한 풀(4~6개)로 갖고, 노출은 항상 고정 개수(do 2 + avoid 2 + tip 1)다.
 * do/avoid 풀은 명리 표준 의미(getSibseong: 비겁=자아·경쟁, 식상=표현·생재,
 * 재성=재물·현실, 관성=책임·압박, 인성=학습·수용)에서 어긋나지 않게 적었다.
 *
 * 저강도(역풍, low) 밴드에선 같은 풀에서 *더 방어적인* 항목 쪽으로 살짝 치우쳐
 * 고르고, 순풍(good) 밴드에선 더 적극적인 쪽으로 치우친다(판단 불변, 선택 편향만).
 */

import { pickBySeed, hashStringToInt } from './personSeed'

type Pair = { ko: string; en: string }

export type DayActionBand = 'good' | 'mid' | 'low'

export interface DayActions {
  /** 오늘 하면 좋은 구체 행동 (3개). */
  do: string[]
  doEn: string[]
  /** 오늘은 피할 것 (2개, 역풍이면 3개). */
  avoid: string[]
  avoidEn: string[]
  /** 한 끗 — 태도/타이밍 한 줄. */
  tip: string
  tipEn: string
}

/**
 * 십신 10종 → 그날의 행동 풀.
 *   do    — 이 십신이 오늘 밀어주는 구체 행동 풀(4~6개). 2개 노출.
 *   avoid — 이 십신의 그늘 — 피할 것 풀(4~6개). 2개(역풍이면 +공통 1개) 노출.
 *   tip   — 한 끗(태도/타이밍) 풀(3~4개). 1개 노출.
 * 풀의 *앞쪽*은 더 적극적/확장적, *뒤쪽*은 더 방어적/수렴적으로 배열한다.
 * 그래야 band 가 순풍이면 앞쪽, 역풍이면 뒤쪽으로 치우쳐 골라도 의미가 자연스럽다.
 */
interface SibsinActions {
  do: readonly Pair[]
  avoid: readonly Pair[]
  tip: readonly Pair[]
}

// 명리 표준 의미 기반. 십신별 "오늘 이 기운이 켜졌을 때" 실전 행동.
// (앞=확장/적극, 뒤=방어/수렴 순으로 배열 — band 편향 선택용.)
const SIBSIN_ACTIONS: Record<string, SibsinActions> = {
  // 비견 — 같은 오행·같은 음양. 자립·동료·경쟁. 내 힘/내 페이스.
  비견: {
    do: [
      {
        ko: '혼자 끝낼 수 있는 일부터 내 손으로 처리하기',
        en: 'tackle what you can finish solo, by your own hand',
      },
      {
        ko: '내 결정권이 분명한 일을 주도적으로 밀기',
        en: 'drive the calls that are clearly yours to make',
      },
      {
        ko: '동료·친구를 경쟁자 대신 한 팀으로 끌어들이기',
        en: 'pull peers in as teammates instead of rivals',
      },
      {
        ko: '내 몫·내 영역의 경계를 차분히 정리해 두기',
        en: 'quietly tidy the boundaries of what is yours',
      },
      {
        ko: '오래된 친구·동기에게 먼저 안부 건네 내 편 다지기',
        en: 'reach out to an old friend or peer to firm up your circle',
      },
    ],
    avoid: [
      {
        ko: '동업·보증·돈 빌려주기 (오늘은 빠져나가기 쉬움)',
        en: 'partnerships, guarantees or lending — money slips out today',
      },
      {
        ko: '고집으로 밀어붙여 기 싸움 만들기',
        en: 'forcing your will into a turf battle',
      },
      {
        ko: '남과 비교하다 멀쩡한 내 페이스 흔들기',
        en: 'shaking your own pace by comparing with others',
      },
      {
        ko: '내 몫이 줄까 봐 협력을 거절하기',
        en: 'refusing teamwork out of fear your share shrinks',
      },
    ],
    tip: [
      {
        ko: '내 페이스대로 가되, 상대 말도 한 번 더 들어주세요.',
        en: 'Keep your pace, but give the other side one more listen.',
      },
      {
        ko: '독립적으로 움직일수록 일이 깔끔해집니다.',
        en: 'The more independently you move, the cleaner it lands.',
      },
      {
        ko: '경쟁은 나를 키우는 자극으로만 쓰고, 미움은 두지 마세요.',
        en: 'Use rivalry only as fuel to grow — leave the resentment out.',
      },
    ],
  },
  // 겁재 — 같은 오행·다른 음양. 추진력·돌파·재물 누수. 속도 살리되 돈은 조심.
  겁재: {
    do: [
      {
        ko: '추진력이 필요한 일을 단숨에 밀고 나가기',
        en: 'drive the thing that needs momentum in one push',
      },
      {
        ko: '미뤄둔 일을 기세 탔을 때 한 번에 끝내기',
        en: 'finish the put-off task while the drive is hot',
      },
      {
        ko: '한 팀으로 묶일 사람과 역할 나눠 속도 내기',
        en: 'split roles with a real teammate and pick up speed',
      },
      {
        ko: '지출 계획을 미리 적어 충동에 선 그어두기',
        en: 'write the spending plan first to fence off impulse',
      },
      {
        ko: '욱하기 전에 자리를 잠깐 비워 열기 식히기',
        en: 'step away a moment to cool the heat before snapping',
      },
    ],
    avoid: [
      {
        ko: '큰 지출·충동구매·투자 (돈이 새기 쉬움)',
        en: 'big spends, impulse buys or bets — money leaks today',
      },
      {
        ko: '욱하는 마음에 관계 밀어붙이기',
        en: 'pushing a relationship on a hot impulse',
      },
      {
        ko: '친구·동료와 돈 얽히기 (보증·공동구매·빌려주기)',
        en: 'tangling money with friends — guarantees, joint buys, loans',
      },
      {
        ko: '한탕으로 단번에 만회하려는 베팅',
        en: 'a one-shot bet to win it all back at once',
      },
    ],
    tip: [
      {
        ko: '속도는 살리되, 돈과 감정엔 한 박자 브레이크를.',
        en: 'Keep the speed, but brake a beat on money and temper.',
      },
      {
        ko: '경쟁심은 일에만 쓰고 사람에겐 거두세요.',
        en: 'Spend the competitive edge on tasks, not on people.',
      },
      {
        ko: '큰돈이 움직일 일은 오늘 결정만, 결제는 내일로.',
        en: 'Decide today on big money, but pay tomorrow.',
      },
    ],
  },
  // 식신 — 일간이 생함·같은 음양. 표현·생산·먹고 즐김(식상생재). 편안할 때 잘 나옴.
  식신: {
    do: [
      {
        ko: '만들고 표현하는 일 (콘텐츠·기획·요리·운동)',
        en: 'making and expressing — content, planning, cooking, a workout',
      },
      {
        ko: '재능을 수입으로 잇는 한 걸음 (판매·홍보·견적)',
        en: 'turn a skill into income — a sale, a pitch, a quote',
      },
      {
        ko: '꾸준히 쌓는 작업을 즐기면서 이어가기',
        en: 'enjoy and continue the steady, building work',
      },
      {
        ko: '몸을 잘 챙기기 — 제대로 된 식사·가벼운 운동',
        en: 'tend the body well — a proper meal, light exercise',
      },
      {
        ko: '벌여둔 것 중 하나를 골라 끝까지 마무리',
        en: 'pick one open project and carry it to the finish',
      },
    ],
    avoid: [
      {
        ko: '과식·과음·늘어지는 게으름',
        en: 'overeating, overdrinking, drifting into idleness',
      },
      {
        ko: '벌여만 놓고 마무리 안 하기',
        en: 'starting lots and finishing none',
      },
      {
        ko: '편하다고 마감·약속을 슬쩍 미루기',
        en: 'quietly sliding a deadline because it feels easy',
      },
      {
        ko: '즐기는 데 빠져 해야 할 핵심을 뒤로 밀기',
        en: 'pushing the must-do back while chasing the fun',
      },
    ],
    tip: [
      {
        ko: '편안할 때 가장 잘 나옵니다 — 즐기듯 하세요.',
        en: 'You do best at ease — work it like play.',
      },
      {
        ko: '오늘 만든 것은 내일의 밑천이 됩니다.',
        en: 'What you make today becomes tomorrow’s seed money.',
      },
      {
        ko: '잘 먹고 잘 쉬는 것도 오늘의 실력입니다.',
        en: 'Eating and resting well is part of today’s skill, too.',
      },
    ],
  },
  // 상관 — 일간이 생함·다른 음양. 재능·말솜씨·파격, 관성을 침(설화 주의).
  상관: {
    do: [
      {
        ko: '재능·말솜씨로 발표·세일즈·창작 풀기',
        en: 'use your talent and tongue for pitching, sales, creating',
      },
      {
        ko: '새로운 방식으로 판을 다시 짜보기',
        en: 'reframe the setup in a fresh, original way',
      },
      {
        ko: '막힌 문제를 남다른 각도로 비틀어 풀기',
        en: 'crack a stuck problem from an offbeat angle',
      },
      {
        ko: '비판하고 싶은 말은 개선안으로 바꿔 전하기',
        en: 'turn the urge to criticize into a concrete suggestion',
      },
      {
        ko: '중요한 메시지는 보내기 전에 한 번 더 다듬기',
        en: 'polish any important message once more before sending',
      },
    ],
    avoid: [
      {
        ko: '윗사람·규칙에 대한 직설 비판 (설화 주의)',
        en: 'blunt criticism of bosses or rules — loose talk bites',
      },
      {
        ko: '잘난 척으로 비치는 과한 말',
        en: 'overtalking that reads as showing off',
      },
      {
        ko: '계약·공식 절차를 내 식대로 건너뛰기',
        en: 'skipping contracts or formal steps your own way',
      },
      {
        ko: '욱한 김에 단톡·SNS에 글 올리기',
        en: 'posting to a group chat or social feed on impulse',
      },
    ],
    tip: [
      {
        ko: '말 한마디만 다듬으면 재능이 빛납니다.',
        en: 'Polish one sentence and the talent shines.',
      },
      {
        ko: '비판은 대안과 함께 — 그래야 힘이 됩니다.',
        en: 'Pair any critique with a fix — then it lands as strength.',
      },
      {
        ko: '튀는 아이디어는 좋지만, 절차는 지키고 가세요.',
        en: 'Bold ideas are fine — just keep the process intact.',
      },
    ],
  },
  // 정재 — 일간이 극함·다른 음양. 정당한 재물·성실·정확(현금흐름·정산).
  정재: {
    do: [
      {
        ko: '받을 돈 챙기기·계약·정산·합리적 소비 판단',
        en: 'collect what’s owed, settle contracts, spend sensibly',
      },
      {
        ko: '가계·지출을 한 번 점검하고 새는 곳 막기',
        en: 'review your spending and plug the small leaks',
      },
      {
        ko: '성실하게 쌓는 일에 꾸준히 시간 쓰기',
        en: 'put steady hours into work that compounds honestly',
      },
      {
        ko: '숫자·서류를 꼼꼼히 맞춰 빈틈 없이 마감',
        en: 'reconcile numbers and papers cleanly to the last detail',
      },
      {
        ko: '작은 약속·디테일을 정확히 지켜 신뢰 쌓기',
        en: 'keep small promises and details exactly to build trust',
      },
    ],
    avoid: [
      {
        ko: '한탕·투기·즉흥적인 큰 지출',
        en: 'get-rich-quick bets and impulsive big spends',
      },
      {
        ko: '확실치 않은 곳에 돈 묶기',
        en: 'tying money up where it isn’t certain',
      },
      {
        ko: '대충 어림짐작으로 숫자·계약 넘기기',
        en: 'eyeballing numbers or contracts instead of checking',
      },
      {
        ko: '눈앞 이익에 욕심내 원칙 깨기',
        en: 'breaking your rule for a near-term gain',
      },
    ],
    tip: [
      {
        ko: '오늘은 지키고 모으는 쪽이 버는 쪽입니다.',
        en: 'Today, guarding and saving is the way you earn.',
      },
      {
        ko: '작게 자주 — 꾸준함이 곧 수익입니다.',
        en: 'Small and often — consistency is the return.',
      },
      {
        ko: '정확함이 곧 돈입니다 — 한 번 더 맞춰보세요.',
        en: 'Accuracy is money today — reconcile it once more.',
      },
    ],
  },
  // 편재 — 일간이 극함·같은 음양. 활동성 재물·인맥·유통·확장(판 크게, 베팅 작게).
  편재: {
    do: [
      {
        ko: '기회·인맥·유통을 넓히는 영업·확장 움직임',
        en: 'widen opportunity — sales, networks, distribution',
      },
      {
        ko: '여러 갈래를 동시에 굴려 흐름 만들기',
        en: 'run several threads at once to build flow',
      },
      {
        ko: '새 거래처·소개 자리에 먼저 손 내밀기',
        en: 'make the first move toward a new lead or intro',
      },
      {
        ko: '들어온 기회는 작게 시험해 보고 키우기',
        en: 'test an incoming chance small, then scale it',
      },
      {
        ko: '쓸 돈과 굴릴 돈의 선을 미리 그어두기',
        en: 'draw the line between money to spend and to deploy',
      },
    ],
    avoid: [
      {
        ko: '욕심에 베팅 키우기·무리한 빚',
        en: 'sizing up the bet on greed, or overreaching on debt',
      },
      {
        ko: '돈과 인연을 가볍게 다루기',
        en: 'treating money and ties too lightly',
      },
      {
        ko: '확인 안 된 큰 건에 목돈 한 번에 넣기',
        en: 'dropping a lump sum into one unverified big deal',
      },
      {
        ko: '벌인 일이 많아 정작 수금·정산을 놓치기',
        en: 'letting collections slip because too much is in motion',
      },
    ],
    tip: [
      {
        ko: '판은 크게 보되 베팅은 작게 가세요.',
        en: 'See the board big, place the bet small.',
      },
      {
        ko: '굴리는 손은 많게, 거는 돈은 적게.',
        en: 'Many hands turning, little money staked.',
      },
      {
        ko: '기회는 넓히되, 받을 돈부터 먼저 챙기세요.',
        en: 'Widen the opportunities, but collect what’s owed first.',
      },
    ],
  },
  // 정관 — 일간이 극받음·다른 음양. 책임·규범·명예·신뢰(원칙대로 처신).
  정관: {
    do: [
      {
        ko: '책임 맡기·규칙 지키기·공식 자리에서 신뢰 쌓기',
        en: 'take responsibility, keep the rules, earn trust formally',
      },
      {
        ko: '맡은 일을 원칙대로 깔끔히 마무리',
        en: 'finish your duties cleanly, by the book',
      },
      {
        ko: '약속·일정·보고를 제때 정확히 챙기기',
        en: 'keep promises, schedules and reports on time',
      },
      {
        ko: '윗사람·결정권자에게 진행 상황 먼저 보고',
        en: 'brief your boss or decision-maker on progress first',
      },
      {
        ko: '미뤄둔 공식 절차·서류를 규정대로 정리',
        en: 'clear the postponed formalities and papers by the book',
      },
    ],
    avoid: [
      {
        ko: '편법·약속 어기기 (오늘 특히 표가 남)',
        en: 'shortcuts or broken promises — they show today',
      },
      {
        ko: '융통성 없이 사람 몰아붙이기',
        en: 'cornering people with rigid rules',
      },
      {
        ko: '규정·절차를 가볍게 보고 건너뛰기',
        en: 'brushing past rules and procedures as trivial',
      },
      {
        ko: '책임을 미루다 신뢰에 금 가게 하기',
        en: 'dodging duty until it cracks your credibility',
      },
    ],
    tip: [
      {
        ko: '바르게 처신하는 모습이 그대로 점수가 됩니다.',
        en: 'Conducting yourself well scores directly today.',
      },
      {
        ko: '책임을 먼저 지면 자리가 따라옵니다.',
        en: 'Shoulder the duty first and the standing follows.',
      },
      {
        ko: '원칙은 사람을 가두는 게 아니라 지켜주는 것입니다.',
        en: 'Rules aren’t a cage today — they’re what protects you.',
      },
    ],
  },
  // 편관(칠살) — 일간이 극받음·같은 음양. 압박·결단·위기관리(센 기운, 방향 잡기).
  편관: {
    do: [
      {
        ko: '결단·위기관리·미뤄둔 어려운 일 정면 돌파',
        en: 'decide, manage risk, face the hard thing head-on',
      },
      {
        ko: '압박이 큰 자리에서 중심 잡기',
        en: 'hold your center where the pressure is heavy',
      },
      {
        ko: '가장 무겁고 두려운 일을 제일 먼저 처리',
        en: 'take the heaviest, scariest task first',
      },
      {
        ko: '밀어붙이기 전에 위험·퇴로를 먼저 점검',
        en: 'map the risks and the exit before you push',
      },
      {
        ko: '거센 기운을 운동·노동으로 건강하게 빼기',
        en: 'burn off the hard energy through exercise or labor',
      },
    ],
    avoid: [
      {
        ko: '무리한 강행·충돌·과로 (몸·사고 주의)',
        en: 'forcing it, clashing, overwork — watch body and accidents',
      },
      {
        ko: '욱한 결정으로 일 키우기',
        en: 'enlarging a problem with a hot-headed call',
      },
      {
        ko: '권위·상대와 정면으로 부딪쳐 판 깨기',
        en: 'butting head-on with authority and blowing up the deal',
      },
      {
        ko: '몸이 보내는 경고를 무시하고 밀어붙이기',
        en: 'pushing through the warning signs your body sends',
      },
    ],
    tip: [
      {
        ko: '센 기운이라 방향만 잡으면 멀리 갑니다.',
        en: 'It’s strong energy — aim it and it carries far.',
      },
      {
        ko: '밀어붙이기 전에 한 번 숨 고르세요.',
        en: 'Take one breath before you push.',
      },
      {
        ko: '두려운 일일수록 먼저 손대면 하루가 가벼워집니다.',
        en: 'Touch the scary task first and the day gets lighter.',
      },
    ],
  },
  // 정인 — 일간이 생받음·다른 음양. 학습·문서·수용·휴식(받아들이고 채움).
  정인: {
    do: [
      {
        ko: '공부·자격·문서 검토·멘토에게 조언 구하기',
        en: 'study, credentials, reviewing papers, asking a mentor',
      },
      {
        ko: '계약·서류를 차분히 정독하고 도장 찍기',
        en: 'read contracts and papers calmly before you sign',
      },
      {
        ko: '막히는 일은 윗사람·전문가에게 먼저 물어보기',
        en: 'ask an elder or expert first where you’re stuck',
      },
      {
        ko: '충분히 쉬고 재충전하기',
        en: 'rest properly and refill your tank',
      },
      {
        ko: '배운 것을 내 말로 정리해 오래 남기기',
        en: 'restate what you learned in your own words to keep it',
      },
    ],
    avoid: [
      {
        ko: '서두른 결정·즉흥 지출',
        en: 'rushed decisions and impulse spending',
      },
      {
        ko: '생각만 하다 실행 미루기',
        en: 'thinking in circles and deferring action',
      },
      {
        ko: '문서를 대충 훑고 서명·동의하기',
        en: 'skimming a document and signing off anyway',
      },
      {
        ko: '의존이 길어져 스스로 결정 안 하기',
        en: 'leaning so long you stop deciding for yourself',
      },
    ],
    tip: [
      {
        ko: '받아들이고 익히는 데 좋은 날 — 채우세요.',
        en: 'A day for taking in and learning — fill up.',
      },
      {
        ko: '막히면 혼자 끙끙대지 말고 먼저 물어보세요.',
        en: 'When stuck, ask first instead of grinding alone.',
      },
      {
        ko: '쉬는 것도 공부입니다 — 채워야 다시 나갑니다.',
        en: 'Resting is study too — refill, then move out again.',
      },
    ],
  },
  // 편인 — 일간이 생받음·같은 음양. 연구·직관·특수기술·재정비(깊이 파되 한 가지).
  편인: {
    do: [
      {
        ko: '연구·특수 기술·직관이 필요한 일 파고들기',
        en: 'dig into research, niche skills, intuition-led work',
      },
      {
        ko: '남다른 관점이 통할 기획·분석에 집중',
        en: 'lean into planning or analysis where your odd angle wins',
      },
      {
        ko: '한 가지 주제를 끝까지 깊게 파보기',
        en: 'dig one subject all the way to the bottom',
      },
      {
        ko: '혼자만의 시간으로 재충전·재정비',
        en: 'recharge and regroup in solo time',
      },
      {
        ko: '직관이 보내는 신호를 메모해 두고 검증하기',
        en: 'jot down the hunch, then check it against facts',
      },
    ],
    avoid: [
      {
        ko: '잡생각으로 일 미루기·고립되기',
        en: 'stalling in overthought, isolating yourself',
      },
      {
        ko: '근거 없는 의심으로 관계 비틀기',
        en: 'twisting a relationship with groundless suspicion',
      },
      {
        ko: '시작만 여러 개 벌이고 끝을 안 보기',
        en: 'opening many threads and finishing none',
      },
      {
        ko: '직감만 믿고 큰 결정·지출 밀어붙이기',
        en: 'forcing a big call or spend on a gut feeling alone',
      },
    ],
    tip: [
      {
        ko: '남다른 관점이 무기가 되는 날입니다.',
        en: 'Your offbeat angle is the weapon today.',
      },
      {
        ko: '깊이 파되, 한 가지만 끝까지.',
        en: 'Dig deep — but only one thing, to the end.',
      },
      {
        ko: '직관은 단서로, 결정은 근거로 내리세요.',
        en: 'Let intuition find the clue, but decide on evidence.',
      },
    ],
  },
}

// band 선두 행동 풀 — do 맨 앞에 얹어 그날 톤을 잡는다(순풍/평이/역풍). seed 로 회전.
const BAND_LEAD: Record<DayActionBand, readonly Pair[]> = {
  good: [
    {
      ko: '잘 풀리는 일은 오늘 한 발 더 밀어붙이기',
      en: 'push what’s working one step further today',
    },
    {
      ko: '미뤄둔 좋은 기회를 오늘 잡기',
      en: 'grab the good chance you’ve been putting off',
    },
    {
      ko: '먼저 연락·제안해 흐름을 내 쪽으로 당기기',
      en: 'reach out or pitch first to pull the flow your way',
    },
  ],
  mid: [
    {
      ko: '무리한 확장은 빼고 핵심부터 처리하기',
      en: 'drop the overreach and handle the core first',
    },
    {
      ko: '벌이기보다 지금 가진 일을 끝까지 다듬기',
      en: 'refine what you already hold rather than start more',
    },
    {
      ko: '오늘 할 일을 셋만 골라 확실히 끝내기',
      en: 'pick just three to-dos and close them for sure',
    },
  ],
  low: [
    {
      ko: '새로 벌이기보다 정리·점검부터 하기',
      en: 'tidy and review before starting anything new',
    },
    {
      ko: '큰 결정은 미루고 몸·마음 추스르기',
      en: 'defer big calls and steady body and mind',
    },
    {
      ko: '욕심을 덜고 꼭 지켜야 할 것만 지키기',
      en: 'trim the wants and protect only what must hold',
    },
  ],
}

// band 가 low 면 avoid 에 공통 한 줄을 더한다(과욕·큰 결정 누르기). seed 로 회전.
const BAND_AVOID_LOW: readonly Pair[] = [
  {
    ko: '오늘 큰 승부·새 계약 띄우기 (역풍이라 한 박자 늦게)',
    en: 'launching a big play or new contract — headwind, so a beat late',
  },
  {
    ko: '무리한 결정을 오늘 안에 끝내려 몰아붙이기',
    en: 'forcing a heavy decision to close inside today',
  },
  {
    ko: '거스르는 흐름에 맞서 억지로 정면 돌파하기',
    en: 'bulling head-on against a flow that runs against you',
  },
]

const SIBSIN_CATEGORY_FALLBACK: Record<string, keyof typeof SIBSIN_ACTIONS> = {
  // 혹시 모를 표기 변형 대비 — 표준 10종 외 입력은 가장 가까운 십신으로.
}

/**
 * 같은 풀에서 *서로 다른* n개를 결정론적으로 고른다. band 편향(bias)으로 시작
 * 오프셋을 밀어 — good 이면 풀 앞쪽(적극), low 면 뒤쪽(방어)에서 출발 — 같은
 * 십신이라도 밴드에 따라 다른 행동이 노출되게 한다(판단 불변, 표현·선택만).
 * seed 로 사람마다 다시 회전. 풀이 n보다 작으면 있는 만큼만 안전하게 반환.
 */
function pickDistinct(
  pool: readonly Pair[],
  seed: number,
  key: number,
  n: number,
  bias: number
): Pair[] {
  const len = pool.length
  if (len === 0) return []
  const start = pickIndex(len, seed, key + bias)
  const out: Pair[] = []
  const take = Math.min(n, len)
  for (let i = 0; i < take; i++) {
    out.push(pool[(start + i) % len])
  }
  return out
}

/** (seed + key) 를 풀 길이로 모듈로 — pickBySeed 와 동일 규칙(음수 안전). */
function pickIndex(len: number, seed: number, key: number): number {
  return (((Math.trunc(seed) + Math.trunc(key)) % len) + len) % len
}

/** band → do/avoid 선택 편향. low=방어(뒤쪽), good=적극(앞쪽), mid=중립. */
function bandBias(band: DayActionBand): number {
  if (band === 'good') return 0 // 풀 앞쪽(적극) 그대로
  if (band === 'low') return 2 // 풀 뒤쪽(방어)으로 두 칸 밀기
  return 1 // mid — 한 칸
}

export function deriveDayActions(args: {
  iljinSibsin: string
  scoreBand: DayActionBand
  seed?: number
}): DayActions | null {
  const key = SIBSIN_ACTIONS[args.iljinSibsin]
    ? args.iljinSibsin
    : SIBSIN_CATEGORY_FALLBACK[args.iljinSibsin]
  if (!key) return null
  const sib = SIBSIN_ACTIONS[key]
  const seed = args.seed ?? 0
  const bias = bandBias(args.scoreBand)

  // band 선두 행동 1개(seed 회전) + 십신 do 2개(밴드 편향 회전) = do 3개.
  const lead = pickBySeed(
    BAND_LEAD[args.scoreBand],
    seed,
    hashStringToInt('lead:' + args.scoreBand)
  )
  const dos = pickDistinct(sib.do, seed, hashStringToInt('do:' + key), 2, bias)
  const doKo = [lead.ko, dos[0].ko, dos[1].ko]
  const doEn = [lead.en, dos[0].en, dos[1].en]

  // 십신 avoid 2개(밴드 편향 회전) + (low band 공통 1개, seed 회전).
  const avoids = pickDistinct(sib.avoid, seed, hashStringToInt('avoid:' + key), 2, bias)
  const avoidKo = [avoids[0].ko, avoids[1].ko]
  const avoidEn = [avoids[0].en, avoids[1].en]
  if (args.scoreBand === 'low') {
    const extra = pickBySeed(BAND_AVOID_LOW, seed, hashStringToInt('avoidlow'))
    avoidKo.push(extra.ko)
    avoidEn.push(extra.en)
  }

  // 한 끗 팁 — 십신 풀에서 seed 회전.
  const tip = pickBySeed(sib.tip, seed, hashStringToInt('tip:' + key))

  return {
    do: doKo,
    doEn,
    avoid: avoidKo,
    avoidEn,
    tip: tip.ko,
    tipEn: tip.en,
  }
}
