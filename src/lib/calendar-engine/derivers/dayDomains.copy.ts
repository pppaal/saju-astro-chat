/**
 * dayDomains 카피/데이터 테이블 — 일진 6분야 조언의 변주 풀(순수 데이터).
 * dayDomains.ts 에서 추출(로직과 분리). 의미는 명리 표준, 표현만 seed 로 회전.
 * 타입은 dayDomains.types(순환 없는 공유 소형 타입)에서 import.
 */
import type { Pair, SibsinCategory, DayScoreBand } from './dayDomains.types'

// 카테고리 × 분야 → 그날 조언 (연애는 loveLine 으로 별도 처리하므로 여기선 5분야).
// 각 칸은 *같은 명리 의미*를 옮긴 3~4개 변주 풀 — seed 로 사람마다 다른 표현을 고른다.
// 변주 index 0 은 원문(레거시 골든)으로 둔다. 의미는 그대로, 톤만 회전.
export const ADVICE: Record<SibsinCategory, Record<string, readonly Pair[]>> = {
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
      {
        ko: '남과 얽힌 돈이 새기 쉬운 날 — 내 일로 번 돈만 챙기고, 친구·형제가 끌어들이는 투자나 한턱은 오늘만 거절하세요.',
        en: 'A day money tangled with others slips away — keep what your own work earns and decline today’s investment pitch or treat from friends and siblings.',
      },
      {
        ko: '지갑은 내 손에 쥐고 가는 날. 더치페이로 깔끔히 나누고, 빌려주거나 떠안는 돈은 오늘 만들지 마세요.',
        en: 'Keep the purse in your own hand today — split the bill cleanly and don’t take on loans or shared debts.',
      },
      {
        ko: '들어오는 건 내 노동의 대가뿐인 날. 공동 지갑·계 모임·보증서는 새는 구멍이 되기 쉬우니 손대지 마세요.',
        en: 'Only the pay for your own labor comes in today — joint funds, group savings and co-signing become leaks, so leave them be.',
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
      {
        ko: '내가 책임지는 일에 강한 날 — 밀린 단독 과제를 끝내 두고, 동료와의 영역 다툼은 내일로 미루세요.',
        en: 'Strong on work you own — clear a backlogged solo task and leave any turf dispute with a colleague for tomorrow.',
      },
      {
        ko: '독립적으로 치고 나가기 좋은 날. 결재·승인 기다리는 일보다 내 선에서 끝낼 일을 먼저 잡고, 고집 부려 적 만들지 마세요.',
        en: 'Good for breaking forward on your own — pick up what you can finish at your level over work stuck waiting for sign-off, and don’t dig in and make enemies.',
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
      {
        ko: '또래·동기 기운이 도는 날 — 형제·동기·옛 친구에게 먼저 연락하면 반갑게 닿아요. 다만 돈·자존심 겨루기는 갈등을 키웁니다.',
        en: 'Siblings, classmates and old friends respond warmly if you reach out first — just keep money and ego contests off the table, they only escalate.',
      },
      {
        ko: '편 만들기 좋은 날. 같은 처지의 동료와 손잡고 일을 나누면 혼자 할 때보다 멀리 갑니다.',
        en: 'A good day to build a team — split the load with peers in the same boat and you go further than alone.',
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
      {
        ko: '스터디·과외보다 독학이 잘 붙는 날 — 오답노트나 요약을 직접 손으로 다시 써 보면 확실히 남아요.',
        en: 'Self-study beats group sessions today — rewrite your error log or summary by hand and it locks in.',
      },
      {
        ko: '내 페이스로 파고들기 좋은 날. 어려운 한 단원을 끝까지 혼자 붙들면 오늘 안에 뚫립니다.',
        en: 'Good for grinding at your own pace — wrestle one hard chapter alone to the end and you break through today.',
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
      {
        ko: '에너지가 넘치는 날 — 미뤄둔 운동을 시작하기 딱이에요. 다만 무게 욕심·승부 운동은 부상으로 이어지니 한 단계 낮춰 가세요.',
        en: 'Energy to spare — perfect to start the workout you’ve put off; just dial back on heavy lifts and competitive play that lead to injury.',
      },
      {
        ko: '몸 쓰기 좋은 날이지만 그 힘이 무리수로 새기 쉬워요. 준비운동을 챙기고 끝까지 다 쏟지는 마세요.',
        en: 'A good day to move, but that energy leaks into overdoing it — warm up properly and don’t empty the tank to the last drop.',
      },
    ],
  },
  output: {
    money: [
      {
        ko: '아이디어가 돈이 되는 날. 콘텐츠·영업·판매·부업에 유리해요.',
        en: 'Ideas turn into income today — favorable for content, sales and side work.',
      },
      {
        ko: '재주가 수입으로 이어지는 날 — 콘텐츠·세일즈·판매·부업에 힘이 실려요.',
        en: 'Your talents convert to income today — content, sales, selling and side gigs all get a lift.',
      },
      {
        ko: '만들고 파는 흐름이 돈을 부르는 날. 콘텐츠·영업·판매·부업 쪽이 특히 유리합니다.',
        en: 'Making and selling pulls money in today — content, sales, selling and side work especially favored.',
      },
      {
        ko: '만든 게 곧 돈이 되는 날 — 만들어 둔 결과물에 값을 매겨 내놓기 좋아요. 견적·제안·판매글을 오늘 띄우세요.',
        en: 'What you make turns into money today — price what you’ve made and put it out; send the quote, pitch or sales post now.',
      },
      {
        ko: '내 솜씨가 곧 매출이 되는 날. 부업·외주·중고 판매처럼 직접 팔아 버는 일에 손을 대 보세요.',
        en: 'Your craft turns straight into revenue — try hands-on selling like a side gig, freelance job or resale.',
      },
      {
        ko: '아이디어를 현금으로 바꾸기 좋은 날 — 새 고객에게 먼저 제안하고, 받을 돈은 미루지 말고 청구하세요.',
        en: 'Good for turning ideas into cash — pitch a new client first and bill what you’re owed without delay.',
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
      {
        ko: '기획안·발표·시연이 통하는 날 — 미뤄둔 제안서를 마무리해 올리세요. 다만 날카로운 말은 회의에서 적을 만드니 톤을 누르세요.',
        en: 'Proposals, presentations and demos land today — finish and submit the pitch you’ve put off; just soften your tone, a sharp word in a meeting makes enemies.',
      },
      {
        ko: '창의력이 솟는 날. 새 기획·콘텐츠를 던지기 좋지만, 규칙·상사에게 정면으로 토 달면 도로 손해입니다.',
        en: 'Creativity surges — good to float new plans and content, but openly defying rules or the boss backfires on you.',
      },
      {
        ko: '말과 글로 성과를 보여 주기 좋은 날 — 회의·피칭·데모에 강해요. 비판은 대안과 함께 부드럽게 꺼내세요.',
        en: 'A day to show results through words and writing — strong in meetings, pitches and demos; wrap any criticism in an alternative and keep it soft.',
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
      {
        ko: '말솜씨가 빛나는 날 — 발표·소개팅·모임 주선에 유리해요. 다만 농담이 선을 넘거나 말이 앞서면 뒷말이 생기니 한 번 거르세요.',
        en: 'Your way with words shines — good for hosting, intros and gatherings; just filter once, a joke that crosses the line or talk that races ahead breeds gossip.',
      },
      {
        ko: '먼저 분위기를 띄워 새 인연을 트기 좋은 날. 듣기 7, 말하기 3으로 가면 호감이 오래 남아요.',
        en: 'Good for warming the room and opening new connections — keep it 70% listening, 30% talking and the goodwill lasts.',
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
      {
        ko: '배운 걸 내 말로 풀어 보기 좋은 날 — 남에게 설명하거나 요약·발표 자료로 만들면 진짜 내 것이 됩니다.',
        en: 'Good for putting what you learned into your own words — teach it to someone or turn it into a summary or slides and it becomes truly yours.',
      },
      {
        ko: '에세이·리포트·면접 답변처럼 표현하는 공부가 잘 붙는 날. 외우기만 하기보다 문장으로 출력해 보세요.',
        en: 'Expressive study like essays, reports and interview answers sticks today — output it in full sentences rather than just memorizing.',
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
      {
        ko: '먹고 누리는 기운이 도는 날 — 잘 챙겨 먹으면 회복이 빨라요. 다만 기운을 쏟아내듯 쓰는 날이라 폭식·과음·과로는 도로 탈이 납니다.',
        en: 'This is the energy of eating and enjoying — eat well and you bounce back; just don’t binge, overdrink or overwork, you’re spending energy out fast.',
      },
      {
        ko: '입이 즐거운 날이라 과식·야식으로 흐르기 쉬워요. 맛있게 먹되 양은 한 끼만큼, 수면은 충분히 챙기세요.',
        en: 'A day the palate runs the show, so it slides into overeating and late snacks — enjoy it but keep portions to one meal and sleep enough.',
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
      {
        ko: '돈 기운이 켜진 날 — 받을 돈을 받고, 미룬 계약·정산을 매듭짓기 좋아요. 다만 코인·도박 같은 한탕은 욕심이 화를 부릅니다.',
        en: 'Money energy is switched on — collect what you’re owed and close pending contracts and settlements; just keep gambles like crypto or betting at bay, that greed bites.',
      },
      {
        ko: '돈 감각이 또렷한 날. 가계부를 정리하고 큰 지출은 견적 두세 곳 비교 후에 결정하면 손해가 없어요.',
        en: 'A clear-headed money day — tidy the budget and compare two or three quotes before any big spend and you won’t lose out.',
      },
      {
        ko: '들어올 돈은 챙기고 나갈 돈은 따지는 날. 계약서 조항·수수료를 꼼꼼히 읽고, 충동구매만 한 박자 참으세요.',
        en: 'Bring in what’s coming and scrutinize what’s going out — read the contract terms and fees closely, and just hold the impulse buy a beat.',
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
      {
        ko: '결과로 말하는 날 — 매출·견적·KPI처럼 숫자로 남는 일에 강해요. 협상은 끌지 말고 오늘 클로징을 시도하세요.',
        en: 'A day results speak — strong on anything that shows up as numbers like sales, quotes or KPIs; don’t drag the negotiation, try to close today.',
      },
      {
        ko: '실용적 손익 감각이 살아나는 날. 비용 대비 효과가 분명한 일부터 처리하고, 거래처와 단가·납기를 매듭지으세요.',
        en: 'Your practical sense of cost-and-return sharpens — tackle the work with clear ROI first and nail down price and deadline with vendors.',
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
      {
        ko: '거래처·고객처럼 이해로 맺어진 사람과 풀기 좋은 날 — 밥값·작은 선물을 먼저 내면 신뢰가 쌓여 돌아옵니다.',
        en: 'Good for working with interest-based ties like clients and vendors — pick up the tab or a small gift first and the trust circles back.',
      },
      {
        ko: '돈·일로 얽힌 관계가 부드러워지는 날. 빌려준 돈·미수금은 오늘 정중히 짚으면 관계도 회수도 깔끔합니다.',
        en: 'Money- and work-bound ties soften today — raise an unpaid loan or receivable politely now and both the relationship and the collection stay clean.',
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
      {
        ko: '돈 기운에 책상 집중이 흩어지는 날 — 추상 이론은 미루고, 기출·실전 문제처럼 손이 가는 공부로 가세요.',
        en: 'Money energy pulls desk focus apart today — shelve abstract theory and go for hands-on work like past papers and practice problems.',
      },
      {
        ko: '오래 앉아 외우기보다 바로 써먹을 실용 지식이 잘 붙는 날. 자격증 실기·실습·현장 적용 위주로 가볍게 가세요.',
        en: 'Practical, ready-to-use knowledge sticks better than long memorizing today — keep it light with hands-on certification prep, labs and field application.',
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
      {
        ko: '돈·일을 좇아 바삐 도느라 끼니·잠을 놓치기 쉬운 날. 식사 시간을 알람으로 박아 두고 규칙을 지키세요.',
        en: 'Chasing money and work keeps you running, so meals and sleep slip — set an alarm for mealtimes and hold the routine.',
      },
      {
        ko: '재물에 신경 쓰다 몸을 뒤로 미루기 쉬워요. 일하다 한 시간에 한 번은 일어나 움직이고, 과로 신호를 무시하지 마세요.',
        en: 'Money worries push the body to the back burner — stand and move once an hour while you work, and don’t ignore the signs of overwork.',
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
      {
        ko: '인정·자리 기운이 도는 날 — 보고·결재·평가처럼 공식 절차에서 점수가 나요. 맡은 책임을 먼저 끝내 보여 주고, 마감과 약속은 칼같이 지키세요.',
        en: 'Recognition energy is on — points come from formal steps like reports, sign-offs and reviews; finish and show what you owe first, and hold deadlines and promises to the letter.',
      },
      {
        ko: '윗선의 시선이 닿는 날. 자청해서 책임을 맡고 규정대로 처리하면 승진·인정으로 돌아오니, 튀는 행동보다 신뢰를 쌓으세요.',
        en: 'Eyes from above are on you — volunteer for responsibility and go by the book and it returns as recognition; build trust rather than stand out loudly.',
      },
      {
        ko: '강한 압박이 일을 밀어붙이는 날 — 큰 책임도 정면으로 받으면 평가가 오르지만, 무리수와 충돌은 사고로 번지니 절차를 지키세요.',
        en: 'Strong pressure drives the work — take big responsibility head-on and your standing rises, but reckless moves and clashes spill into trouble, so follow procedure.',
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
      {
        ko: '돈은 규율로 지키는 날 — 세금·공과금·카드값처럼 밀린 납부를 끝내고, 새 투자나 빚은 벌이지 마세요.',
        en: 'A day to guard money by discipline — clear overdue payments like taxes, utilities and card bills, and don’t start new investments or debts.',
      },
      {
        ko: '절제의 기운이 도는 날이라 충동 지출을 다잡기 좋아요. 자동이체·예산 한도를 점검하고, 규칙적인 운용으로 새는 돈을 막으세요.',
        en: 'Self-control runs high, so it’s good for reining in impulse spending — check auto-payments and budget caps, and plug leaks with steady handling.',
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
      {
        ko: '상사·선배·공적 인물과 점수 따기 좋은 날 — 먼저 보고하고 시간 약속을 지키면 믿음이 쌓여요. 윗사람과의 정면 충돌만은 피하세요.',
        en: 'A day to score with bosses, seniors and formal figures — report first and keep your appointments and trust builds; just avoid a head-on clash with those above you.',
      },
      {
        ko: '격식 있는 자리에서 신뢰를 얻는 날. 예의·복장·말투를 한 단계 갖추면 공적 관계에서 인정을 받습니다.',
        en: 'A day trust is earned in formal settings — step up your manners, dress and tone and you win recognition in official relationships.',
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
      {
        ko: '규율이 받쳐 주는 날 — 정해진 분량을 시간표대로 끝내기 좋아요. 시험·고시·승진 시험처럼 인내가 필요한 공부에 특히 강합니다.',
        en: 'Discipline backs you — good for finishing a set quota on schedule; especially strong for endurance study like exams, licensing and promotion tests.',
      },
      {
        ko: '엉덩이로 버티는 공부가 통하는 날. 미룬 진도를 데드라인을 박아 밀어붙이고, 모의고사로 실전 감각을 점검하세요.',
        en: 'Sit-and-grind study works today — push the backlog forward with a firm deadline and check your edge with a mock exam.',
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
      {
        ko: '책임의 압박이 어깨·목·위장으로 오기 쉬운 날 — 책임을 짊어지더라도 점심엔 잠깐 걷고, 자기 전 긴장을 풀어 주세요.',
        en: 'The pressure of duty tends to land on the shoulders, neck and stomach — carry the load but walk a bit at lunch and unwind the tension before bed.',
      },
      {
        ko: '스트레스가 몸을 누르는 날이라 무리하면 사고로 번져요. 마감에 쫓겨도 무리한 운전·기계 작업·과로는 한 박자 늦추세요.',
        en: 'Stress weighs on the body, and pushing it spills into accidents — even under a deadline, slow risky driving, machine work and overwork by a beat.',
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
      {
        ko: '배움의 기운이 도는 날 — 흡수력이 좋아 어려운 개념도 머리에 잘 들어와요. 시험·자격증·논문처럼 깊이 파는 공부에 오늘을 쓰세요.',
        en: 'Learning energy is on — absorption runs high and hard concepts go in easily; spend today on deep study like exams, certifications and papers.',
      },
      {
        ko: '머리가 맑은 날. 새 단원을 처음 배우거나 두꺼운 책을 잡기 좋고, 멘토·강의에서 배운 게 그대로 쌓입니다.',
        en: 'A clear-headed day — good to learn a new chapter from scratch or take on a thick book, and what a mentor or lecture gives you stacks up cleanly.',
      },
      {
        ko: '배움의 별이 켜진 날 — 자격·면허·승인 서류를 준비하거나, 어려운 원전을 차분히 읽어 내리기 좋아요.',
        en: 'The star of learning is lit — good to prep credentials, licenses and approval papers, or calmly read through a difficult source text.',
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
      {
        ko: '문서 기운이 도는 날 — 계약서·등기·보험·대출 서류를 검토하고 매듭짓기 좋아요. 조건을 끝까지 읽고 사인은 신중히.',
        en: 'A day for paperwork — good to review and finalize contracts, deeds, insurance and loan papers; read every clause and sign with care.',
      },
      {
        ko: '돈은 벌기보다 정돈하는 날. 보증·임대·자격 관련 서류를 챙기고, 즉흥 지출보다 장기 계획을 세우세요.',
        en: 'A day to organize money rather than chase it — sort out guarantee, lease and credential papers, and plan long-term over impulse spending.',
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
      {
        ko: '배움·문서 기운이 받쳐 주는 날 — 자료 조사·기획서·매뉴얼처럼 밑작업이 잘 돼요. 실행을 서두르기보다 탄탄한 준비로 토대를 깔아 두세요.',
        en: 'Learning and paperwork back you — groundwork like research, proposals and manuals goes well; lay a solid base with prep rather than rushing to execute.',
      },
      {
        ko: '윗사람·멘토의 후원과 결재가 닿기 좋은 날. 혼자 밀어붙이기보다 검토를 받고 문서로 남겨 두면 일이 단단해집니다.',
        en: 'A day backing and sign-off from elders and mentors reach you — get it reviewed and put it on paper rather than going it alone, and the work holds firm.',
      },
    ],
    people: [
      {
        ko: '스승·윗사람의 도움이 오는 날 — 막히면 먼저 조언을 구해보세요.',
        en: 'Help from mentors and elders arrives — when stuck, ask for advice first.',
      },
      {
        ko: '스승·윗사람의 손길이 닿는 날 — 막히는 데가 있으면 먼저 조언을 청하세요.',
        en: 'A mentor or elder’s hand reaches you today — when you hit a wall, ask for advice first.',
      },
      {
        ko: '윗사람·스승의 도움이 오기 좋은 날. 혼자 끙끙대기보다 먼저 조언을 구하는 게 빠릅니다.',
        en: 'A good day for help from elders and mentors — asking for advice beats struggling alone.',
      },
      {
        ko: '도와줄 사람이 닿는 날 — 스승·선배·어머니 같은 윗사람에게 먼저 연락해 보세요. 도움을 청하면 막힌 데가 풀립니다.',
        en: 'A day help reaches you — reach out first to elders like a teacher, senior or your mother; ask for help and the blockage clears.',
      },
      {
        ko: '도움을 받기 좋은 날. 혼자 끌어안은 문제를 믿을 만한 어른·전문가에게 털어놓으면 길이 보입니다.',
        en: 'A day to receive help — lay a problem you’ve carried alone before a trusted elder or expert and a path appears.',
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
      {
        ko: '받아 채우는 기운이 도는 날 — 충전이 잘 되는 날이에요. 일정을 비우고 푹 자거나, 몸을 데우는 음식·반신욕으로 회복에 집중하세요.',
        en: 'A day for taking energy back in — recharge runs well today; clear the schedule for deep sleep, or focus on recovery with warming food and a warm soak.',
      },
      {
        ko: '쉴수록 이득인 날. 무리한 운동보다 산책·스트레칭처럼 부드러운 활동과 충분한 수면으로 몸을 채워 두세요.',
        en: 'A day where rest pays — refill the body with gentle activity like a walk or stretching and plenty of sleep rather than hard exercise.',
      },
    ],
  },
}

// 연애 분야 변주 풀 — (카테고리 × 성별 분기) 별로 3~4개. 의미는 그대로, 표현만 회전.
// 키는 'love:' + cat + ':' + 분기(m/f/neutral) 로 안정적 작은 정수를 만든다.
export const LOVE_POOLS: Record<string, readonly Pair[]> = {
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
    {
      ko: '남성에겐 이성운이 또렷한 날 — 마음 가는 상대에게 먼저 연락하거나 데이트를 청해 보세요. 충동적 끌림만 한 번 거르면 됩니다.',
      en: 'For men, romance runs clear today — message the one on your mind or ask for a date; just filter the impulsive spark once.',
    },
    {
      ko: '남성에게 데이트·소개가 잘 풀리는 날. 실질적인 호의(밥·선물·시간)로 다가가면 닿아요. 다만 여러 끌림에 한꺼번에 흔들리진 마세요.',
      en: 'Dates and intros go smoothly for men today — approach with concrete kindness like a meal, a gift or your time; just don’t get pulled in several directions at once.',
    },
    {
      ko: '남성에게 이성 기운이 살아나는 날 — 먼저 움직이면 인연이 닿습니다. 외모·분위기에 끌린 건지 진심인지만 스스로 점검하세요.',
      en: 'Romantic energy stirs for men — move first and the connection lands; just check whether it’s looks and vibe pulling you or real feeling.',
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
    {
      ko: '여성에겐 손에 잡히는 다정함이 통하는 날 — 작은 선물·맛있는 식사·함께한 시간으로 마음을 전하면 관계가 단단해져요.',
      en: 'For women, tangible warmth works today — a small gift, a good meal or shared time firms up the bond.',
    },
    {
      ko: '말보다 행동으로 챙기기 좋은 날. 상대가 필요로 하는 걸 실제로 해 주면 마음이 빠르게 가까워집니다.',
      en: 'A day to care through action over words — actually do what the other person needs and closeness comes fast.',
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
    {
      ko: '여성에겐 좋은 인연이 닿는 날 — 진지한 만남·소개·맞선처럼 미래를 보는 자리에 특히 유리합니다.',
      en: 'For women, a good match draws near — especially favorable for serious meetings and intros that look to the future.',
    },
    {
      ko: '여성에게 배우자운이 켜진 날 — 책임감 있고 듬직한 상대가 눈에 들어와요. 가벼운 썸보다 진중한 관계로 갈 기운입니다.',
      en: 'Partner luck is on for women — a reliable, steady type catches your eye; the energy leans toward a serious bond over a casual fling.',
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
    {
      ko: '듬직함이 곧 매력이 되는 날 — 약속 시간을 지키고 한 말을 끝까지 책임지면 상대의 신뢰가 깊어집니다.',
      en: 'Dependability is the charm today — keep your appointments and stand by what you said and the other’s trust deepens.',
    },
    {
      ko: '가볍게 들이대기보다 진중하게 다가가기 좋은 날. 일관된 태도로 믿음을 주면 관계가 한 단계 올라갑니다.',
      en: 'A day to approach with depth over a casual move — give trust through a steady manner and the relationship steps up.',
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
    {
      ko: '매력이 한껏 끌어올라오는 날 — 먼저 연락하고 마음을 표현하기 좋아요. 다만 농담·말이 선을 넘으면 역효과니 한 박자 거르세요.',
      en: 'Your charm runs high today — good to reach out first and voice your feelings; just filter once, jokes or words crossing the line backfire.',
    },
    {
      ko: '표현력이 빛나 호감을 사기 쉬운 날. 재치 있는 한마디·다정한 메시지로 분위기를 열되, 진심 없는 빈말은 금세 들통납니다.',
      en: 'Expressiveness shines and goodwill comes easily — open the mood with a witty line or a warm message, but empty flattery shows fast.',
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
    {
      ko: '내 주관이 앞서기 쉬운 날 — 내 방식만 고집하면 부딪치기 쉬워요. 이기려 들기보다 한 발 양보하면 관계가 부드러워집니다.',
      en: 'Your will runs ahead today — insisting on your way invites friction; yield a step rather than win and the bond softens.',
    },
    {
      ko: '독립심이 세져 거리감이 생기기 쉬운 날. 상대를 통제하려 하기보다 먼저 안부를 묻고 들어 주면 마음이 닿습니다.',
      en: 'Independence runs high and distance creeps in — ask after them and listen first rather than trying to control, and your heart reaches them.',
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
    {
      ko: '따뜻한 기운이 마음을 감싸는 날 — 손잡고 산책하거나 차 한 잔 두고 속 이야기를 나누기 좋아요. 진도보다 마음의 거리를 좁히세요.',
      en: 'A warm, settling energy holds the feelings today — good for a hand-held walk or heart talk over a cup of tea; close the emotional distance over the pace.',
    },
    {
      ko: '편안한 안정감으로 가까워지는 날. 화려한 이벤트보다 곁에서 들어 주고 보살피는 다정함이 더 오래 남습니다.',
      en: 'A day closeness grows through quiet security — a caring, listening warmth beside them lasts longer than a flashy event.',
    },
  ],
}

// 섹션 머리말 변주 풀 — band 별 3~4개. 의미는 그대로(순풍/평이/역풍), 표현만 회전.
export const BAND_NOTE: Record<DayScoreBand, readonly Pair[]> = {
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

// 분야별 '주의' 본문 — 그날 그 분야의 근거가 뚜렷이 부정적일 때(합 ≤ -2) 긍정
// 십신 조언을 대신한다. 칩(긴장 신호)과 톤을 맞춰 모순을 없애는 용도.
// 분야별 '주의' 본문 변주 풀 — 분야별 3~4개. 의미(마찰·방어)는 그대로, 표현만 회전.
// 모든 변주에 분야 핵심 신호어('마찰'/friction 계열)를 유지해 칩과 톤이 어긋나지 않게.
export const CAUTION_BODY: Record<string, readonly Pair[]> = {
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
    {
      ko: '관계에 마찰이 도는 날 — 오해가 커지기 쉬워요. 따지기보다 한 박자 쉬고, 무거운 대화나 결별 같은 큰 결정은 미루세요.',
      en: 'Friction runs through the relationship today — misunderstandings swell easily; pause a beat instead of arguing and defer heavy talks or big calls like a breakup.',
    },
    {
      ko: '연애에 마찰이 끼는 날이라 사소한 일에도 날이 서요 — 카톡 답장은 한 박자 늦게, 서운함은 가라앉힌 뒤에 말하세요.',
      en: 'Friction in love makes small things prickly — reply a beat slower and voice hurt only after it settles.',
    },
    {
      ko: '관계의 결이 거슬리는 날 — 질투·의심이 고개를 들기 쉬워요. 확인 사살하듯 캐묻기보다 거리를 조금 두는 게 안전합니다.',
      en: 'The grain of the relationship feels rough — jealousy and doubt rise easily; give a little space rather than interrogate.',
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
    {
      ko: '돈 흐름에 마찰이 끼는 날 — 새는 구멍이 생기기 쉬워요. 충동구매·대출·보증은 멈추고, 카드 명세서부터 점검하세요.',
      en: 'Friction in the money flow opens leaks — stop impulse buys, loans and co-signing, and start by checking your card statement.',
    },
    {
      ko: '돈이 거슬리게 도는 날이라 손해 보기 쉬워요. 솔깃한 투자·한탕 제안은 오늘만은 거절하고, 지키는 쪽에 무게를 두세요.',
      en: 'Money runs rough and losses come easy — turn down tempting investments and quick-win pitches just for today, and lean on holding what you have.',
    },
    {
      ko: '재물에 마찰이 이는 날 — 큰 계약·송금은 한 번 더 확인하고, 돈 얽힌 부탁은 정중히 미루는 게 안전합니다.',
      en: 'Friction stirs around money — double-check big contracts and transfers, and politely defer requests with money attached.',
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
    {
      ko: '업무에 마찰이 끼는 날 — 상사·동료와 부딪치기 쉬워요. 새 프로젝트·중요한 보고는 미루고, 메일은 한 번 더 읽고 보내세요.',
      en: 'Friction in work makes clashes with boss and colleagues likely — defer new projects and key reports, and reread your emails before sending.',
    },
    {
      ko: '일의 결이 거슬리는 날 — 무리하게 밀어붙이면 실수가 납니다. 큰 결정·계약은 보류하고 밀린 일을 점검·정리하세요.',
      en: 'The grain of work runs rough — forcing it breeds mistakes; hold big decisions and contracts and review and tidy the backlog instead.',
    },
    {
      ko: '직장에 마찰이 이는 날 — 괜한 충돌은 피하고, 사고·실수가 잦으니 마감과 숫자를 두 번 확인하세요.',
      en: 'Friction stirs at work — sidestep needless clashes, and with slips more frequent, double-check deadlines and numbers.',
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
    {
      ko: '관계에 마찰이 끼는 날 — 말 한마디가 오해를 부르기 쉬워요. 단톡방 논쟁·뒷말은 멀리하고, 예민한 사람과의 자리는 줄이세요.',
      en: 'Friction in ties turns one word into a misunderstanding — steer clear of group-chat debates and gossip, and trim time with prickly people.',
    },
    {
      ko: '사람 사이가 삐걱대는 날 — 충돌이 잦으니 굳이 옳고 그름을 가리려 들지 말고, 오늘은 한 걸음 물러서서 듣기만 하세요.',
      en: 'Ties grind today — with clashes frequent, don’t push to settle who’s right; step back and just listen for now.',
    },
    {
      ko: '인간관계에 마찰이 도는 날 — 부탁·중재에 끼면 손해 보기 쉬워요. 남의 다툼에 발 들이지 말고 거리를 두세요.',
      en: 'Friction runs through your circle — getting roped into favors or mediation costs you; stay out of others’ disputes and keep your distance.',
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
    {
      ko: '집중에 마찰이 끼는 날 — 머리에 잘 안 들어와요. 새 단원·어려운 책은 미루고, 짧게 끊어 복습하거나 가벼운 정리만 하세요.',
      en: 'Friction in focus keeps it from sinking in — shelve new chapters and hard books, and stick to short review blocks or light tidying.',
    },
    {
      ko: '공부 결이 어긋나는 날 — 무리하게 진도를 빼면 도로 헷갈려요. 새 분량보다 오답·요약 정리로 마무리하세요.',
      en: 'The grain of study runs off today — forcing new ground only muddles it; wrap up with error logs and summaries over new material.',
    },
    {
      ko: '집중에 마찰이 이는 날이라 능률이 떨어져요 — 시험·중요한 암기는 컨디션 좋은 날로 미루고, 오늘은 가볍게 훑으세요.',
      en: 'Friction in focus drops your efficiency — push exams and key memorizing to a better day and just skim lightly now.',
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
    {
      ko: '몸에 마찰이 오기 쉬운 날 — 무리하면 탈이 나요. 과격한 운동·무리한 일정은 줄이고, 날카로운 도구·운전은 한 번 더 조심하세요.',
      en: 'Friction reaches the body today — push it and it breaks; cut intense workouts and packed schedules, and take extra care with sharp tools and driving.',
    },
    {
      ko: '몸의 결이 거슬리는 날 — 피로·통증 신호를 무시하면 키워요. 무리한 약속을 줄이고 일찍 잠자리에 드세요.',
      en: 'The body’s grain runs rough — ignoring fatigue and pain signals only grows them; cut taxing plans and get to bed early.',
    },
    {
      ko: '건강에 마찰이 이는 날 — 작은 부주의가 사고로 번지기 쉬워요. 급한 동작·무리한 운동을 피하고 천천히 움직이세요.',
      en: 'Friction stirs in your health — a small slip spills into an accident; avoid sudden moves and hard exercise, and go slowly.',
    },
  ],
}

// 분야별 band-aware 한 줄 — 섹션 머리말(BAND_NOTE)과 *다른* 짧은 문장으로,
// 그 분야에 한정해 톤만 잡는다. 'caution' 은 polaritySum ≤ -2(주의 본문) 가지로,
// 순풍이라도 "밀어붙이라"고 말하지 않게 톤을 누른다(칩과 모순 방지).
// 분야별 band 한 줄 변주 풀 — 가지별 3~4개. 동적 텍스트가 없는 독립 클로즈라
// 조사 안전(앞 문장과 마침표로 끊겨 이어진다). 의미는 그대로, 표현만 회전.
export const BAND_DOMAIN_CLAUSE: Record<DayScoreBand | 'caution', readonly Pair[]> = {
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
