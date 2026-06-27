/**
 * lifetimeFlow 양언어 데이터 테이블 — 인생 흐름 서술의 라벨/숏폼/변주 풀(순수 데이터).
 * lifetimeFlow.ts 에서 추출(로직과 분리). 의미는 명리·점성 표준, 표현만 정리.
 */
import type { TwelveStageType } from '@/lib/saju/interpretations'

// 12운성을 인생 단계 줄에 쓸 때의 *추상 에너지* 글로스(감사 BUG-4).
// 공유 해석 테이블(getTwelveStageInterpretation)의 의미는 "새 생명이 잉태", "성인이
// 되어 관을 쓰는", "권력의 정점"처럼 *문자 그대로의 인생 사건/성공* 비유라, 80세
// 단계에 "잉태"가 붙거나(연령 부적합) 역풍(favor<0) 단계에 "권력의 정점"이 붙어
// 운(luck)과 모순돼 보였다. 여기선 일간의 *내적 활력 결*만 나이·운과 무관하게
// 묘사한다 — "기운의 흐름으로 보면, …" 프레이밍과 맞물려 vitality 신호로 읽힌다.
// EN 은 소문자 시작(템플릿이 중간에 끼움), 끝 구두점 없음(이중 마침표 방지).
export const ENERGY_GLOSS_KO: Record<TwelveStageType, string> = {
  장생: '기운이 새로 솟는 시작의 결',
  목욕: '다듬으며 자리를 찾아가는 결',
  관대: '기운이 한껏 자라 채비를 갖추는 결',
  건록: '안정되게 무르익는 전성의 결',
  제왕: '기운이 가장 무르익은 절정의 결',
  쇠: '정점을 지나 부드러워지는 결',
  병: '속도를 늦추고 안을 돌보는 결',
  사: '거두어 정리하는 결',
  묘: '갈무리하고 응축하는 결',
  절: '비우고 끊어 새로워지는 결',
  태: '안에서 새 기운이 깃드는 잠재의 결',
  양: '조용히 기르며 채비하는 결',
}

export const ENERGY_GLOSS_EN: Record<TwelveStageType, string> = {
  장생: 'fresh energy rising — a starting grain',
  목욕: 'finding form, settling in',
  관대: 'energy filling out, gearing up',
  건록: 'steady, ripened vigor',
  제왕: 'vitality at its fullest',
  쇠: 'past the peak, easing',
  병: 'slowing down, tending inward',
  사: 'gathering in, winding down',
  묘: 'storing up, condensing',
  절: 'clearing out, renewing',
  태: 'new energy quietly forming — latent',
  양: 'nurturing quietly, getting ready',
}

export const STRUCTURE_READ: Record<string, { ko: string; en: string }> = {
  // 신약(身弱) — 받칠 힘이 빠듯한데 특정 기운이 과한 구조. 내 편(비겁)·채움(인성) 운에 풀림.
  'weak-재성': {
    ko: '재다신약 — 재물·현실·관계가 많아 오히려 끌려다니기 쉬운 구조예요. 욕심내 벌이기보다, 내 편이 드는(비겁)·나를 채워주는(인성) 시기에 자리를 잡아요.',
    en: 'Wealth-heavy, weaker self — so much money, reality and relationship pull that you can get dragged along. You settle not by overreaching, but when allies (peers) and what replenishes you (resource) are with you.',
  },
  'weak-관성': {
    ko: '관다신약 — 책임·압박·상대의 요구는 큰데 받칠 힘은 빠듯한 구조예요. 무리해 버티기보다, 나를 지켜주는(인성)·내 편이 드는(비겁) 시기에 숨통이 트여요.',
    en: 'Officer-heavy, weaker self — heavy duty and pressure against limited reserves. Relief comes not from gritting it out, but when protection (resource) and allies (peers) back you.',
  },
  'weak-식상': {
    ko: '식상과다 신약 — 끼와 표현을 다 쏟아내느라 쉽게 지치는 구조예요. 비우기만 하기보다, 나를 채워주는(인성)·내 편이 드는(비겁) 시기에 충전돼요.',
    en: 'Output-heavy, weaker self — you pour out talent and expression until you run dry. You recharge when resource and peers refill you, not by only giving out.',
  },
  'weak-인성': {
    ko: '인성과다 신약 — 받쳐주는 기운은 두터운데 정작 펼치는 힘이 눌리는 구조예요. 생각만 쌓기보다, 직접 풀어내고(식상)·현실에 부딪히는(재성) 시기에 트여요.',
    en: 'Resource-heavy, weaker self — plenty of backing, but your outward drive gets smothered. You open up by expressing (output) and meeting reality (wealth), not by only absorbing.',
  },
  'weak-비겁': {
    ko: '비겁의지형 신약 — 혼자선 빠듯해도 동료·형제·내 편의 힘으로 버티는 구조예요. 함께 가고(비겁)·배움으로 채우는(인성) 시기에 단단해져요.',
    en: 'Peer-leaning, weaker self — on your own you run short, but you hold up through allies, siblings, your people. You firm up when you move together (peers) and fill up through learning (resource).',
  },
  // 신강(身强) — 힘이 충분한 구조. 힘을 풀어내고(식상)·거두고(재성)·다스리는(관성) 운에 결실.
  'strong-비겁': {
    ko: '비겁과다 신강 — 내 힘이 세고 경쟁·동료 기운도 강해, 재물이 흩어지거나 부딪히기 쉬운 구조예요. 힘을 풀어내고(식상)·절제로 다듬는(관성) 시기에 결실로 모여요.',
    en: 'Peer-heavy, strong self — abundant force and rivalry can scatter wealth or clash. It gathers into results when you channel it out (output) and temper it (officer).',
  },
  'strong-재성': {
    ko: '신왕재왕 — 나도 세고 재물도 두터운, 벌이를 감당할 그릇이 되는 구조예요. 행동으로 잡고(재성)·표현으로 푸는(식상) 시기에 크게 거둬요.',
    en: 'Strong self, strong wealth — a frame that can carry what it earns. You reap big when you seize through action (wealth) and channel through output.',
  },
  'strong-관성': {
    ko: '신왕관왕 — 힘도 충분하고 책임·자리도 또렷한, 권한을 감당하는 구조예요. 자리·책임을 맡고(관성)·표현으로 푸는(식상) 시기에 크게 서요.',
    en: 'Strong self, strong officer — ample force and clear standing, a frame that can carry authority. You rise when you take on duty (officer) and channel through output.',
  },
  'strong-식상': {
    ko: '신강 식상 — 힘이 충분해 끼를 마음껏 풀어낼 수 있는 구조예요. 표현·재능으로 펼치고(식상)·현실로 잇는(재성) 시기에 풀려요.',
    en: 'Strong self with output — enough force to pour your talent out freely. You open up when you express (output) and convert it into reality (wealth).',
  },
  'strong-인성': {
    ko: '인성과다 신강 — 받쳐주는 힘이 넘쳐 오히려 굼떠지기 쉬운 구조예요. 직접 풀어내고(식상)·현실에 부딪히는(재성) 시기에 비로소 움직여요.',
    en: 'Resource-heavy, strong self — so much backing you can turn sluggish. You finally move when you express (output) and meet reality (wealth).',
  },
  // 중화(中和) — 한쪽으로 치우치지 않은 균형. 그때그때 부족한 기운을 채우는 운에 무난히.
  'medium-비겁': {
    ko: '중화에 가까운 균형형 — 주체성·동료 기운이 살짝 도드라지되 큰 치우침은 없어요. 큰 기복보다 꾸준함으로, 그때그때 부족한 기운을 채우는 운에 무난히 풀려요.',
    en: 'Close to balanced, with a touch of agency/peer flavor — no strong tilt. Steadiness over big swings; you do fine whenever the cycle tops up what is momentarily short.',
  },
  'medium-식상': {
    ko: '중화에 가까운 균형형 — 표현·재능 기운이 살짝 도드라지되 큰 치우침은 없어요. 큰 기복보다 꾸준함으로, 그때그때 부족한 기운을 채우는 운에 무난히 풀려요.',
    en: 'Close to balanced, with a touch of expressive flavor — no strong tilt. Steadiness over big swings; you do fine whenever the cycle tops up what is momentarily short.',
  },
  'medium-재성': {
    ko: '중화에 가까운 균형형 — 현실·실리 감각이 살짝 도드라지되 큰 치우침은 없어요. 큰 기복보다 꾸준함으로, 그때그때 부족한 기운을 채우는 운에 무난히 풀려요.',
    en: 'Close to balanced, with a touch of practical flavor — no strong tilt. Steadiness over big swings; you do fine whenever the cycle tops up what is momentarily short.',
  },
  'medium-관성': {
    ko: '중화에 가까운 균형형 — 책임·자리 감각이 살짝 도드라지되 큰 치우침은 없어요. 큰 기복보다 꾸준함으로, 그때그때 부족한 기운을 채우는 운에 무난히 풀려요.',
    en: 'Close to balanced, with a touch of duty flavor — no strong tilt. Steadiness over big swings; you do fine whenever the cycle tops up what is momentarily short.',
  },
  'medium-인성': {
    ko: '중화에 가까운 균형형 — 배움·내공 기운이 살짝 도드라지되 큰 치우침은 없어요. 큰 기복보다 꾸준함으로, 그때그때 부족한 기운을 채우는 운에 무난히 풀려요.',
    en: 'Close to balanced, with a touch of studious flavor — no strong tilt. Steadiness over big swings; you do fine whenever the cycle tops up what is momentarily short.',
  },
}

// 편관(칠살) 전용 본문 — 관성으로 묶이지만 정관(질서·책임)과 달리 칠살은 *압박·
// 도전*의 결이다. BAND_CAT 의 부드러운 관성 문구("자리를 정리")가 편관에 붙으면
// 톤이 어긋나, 편관일 때만 압박을 인정하는 문구로 교체한다(감사 M7).
export const PYEONGWAN_BODY_KO: Record<string, string> = {
  초년기: '센 압박이나 강한 어른·환경을 일찍 겪는 편이에요. 눌리기보다 부딪히며 단단해져요',
  청년기: '강하게 밀어붙이는 도전이 많은 시기예요. 책임과 압박을 정면으로 돌파해요',
  중년기: '큰 책임과 외부 압박이 정점에 올라요. 칼날 위에서 균형을 잡는 시기예요',
  장년기: '오래 짊어진 압박을 마무리하는 시기예요. 무리한 승부보다 정리가 나아요',
}

export const PYEONGWAN_BODY_EN: Record<string, string> = {
  초년기: 'You meet strong pressure or forceful adults early — you toughen by pushing back rather than caving',
  청년기: 'A season of hard, driving challenges — you take responsibility and pressure head-on',
  중년기: 'Big responsibility and outside pressure peak — a season of balancing on a knife-edge',
  장년기: 'A season of winding down long-carried pressure — tidying up beats forcing one more contest',
}

// ════════════════════════════ EN copy ════════════════════════════
// EN band labels for output (BAND_CAT_EN keys mirror Korean band names so we
// can pick by Korean band label). Phase output uses BAND_LABEL_EN for the
// visible 'label' field.
export const BAND_LABEL_EN: Record<string, string> = {
  초년기: 'Early years',
  청년기: 'Young adulthood',
  중년기: 'Midlife',
  장년기: 'Elder years',
}

// 같은 톤이 연속 단계에 반복돼 글이 단조로워지지 않도록 variant 3 개씩 준비.
// 단계 순서대로 회전하면서 직전 단계 톤과 같으면 다음 인덱스 사용 — "큰 굴곡
// 없이 차분히 자기 몫을 다지는 흐름" 이 청년기·중년기에 똑같이 박히던 회귀
// (사용자 지적 2026-06) 를 해결.
// 톤 풀 — 사람마다 같은 글을 안 읽도록 favor 레벨당 7종으로 확장(감사 후속).
// KO/EN 은 같은 인덱스 = 같은 의미로 1:1 정렬(어댑터가 같은 idx 로 둘 다 뽑음).
export const TONE_VARIANTS_KO: Record<'good' | 'hard' | 'mid', readonly string[]> = {
  good: [
    '바람이 등을 밀어주어, 애쓴 만큼 멀리 나아가는 때예요.',
    '물길이 트여, 마음먹은 일이 자연스레 흘러가는 철이에요.',
    '결이 맞아떨어져, 내딛는 걸음마다 길이 열려요.',
    '햇볕이 고르게 드는 철이라, 뿌린 것이 어렵잖게 자라요.',
    '인연과 도움이 곁에 모여, 일이 한결 수월해지는 때예요.',
    '때가 받쳐주어, 작은 시도도 곧잘 열매로 맺혀요.',
    '막힘이 적어, 품은 뜻을 멀리 밀고 가기 좋은 흐름이에요.',
  ],
  hard: [
    '바람을 안고 오르는 구간이라, 한 걸음마다 무게가 실려요.',
    '뜻대로 풀리지 않는 일이 늘어, 견디는 힘이 필요한 철이에요.',
    '깎이고 부딪히는 만큼, 안의 심지가 굵어지는 시기예요.',
    '길이 좁아지는 철이라, 서두르기보다 때를 고르는 게 나아요.',
    '맞바람이 잦지만, 그 저항이 끝내 뿌리를 깊게 해요.',
    '쉽지 않은 고비를 지나며, 단단해지는 법을 배우는 때예요.',
    '물때가 빠진 구간이라, 무리해 나아가기보다 채비할 때예요.',
  ],
  mid: [
    '큰 굽이 없이, 잔잔하게 자기 몫을 다져가는 흐름이에요.',
    '드라마틱한 사건보다, 쌓이는 시간이 의미를 갖는 철이에요.',
    '평지를 고르게 걷듯, 제 보폭을 지키며 걷기 좋은 시기예요.',
    '큰 사건보다, 하루하루 포개지는 결이 힘이 되는 철이에요.',
    '기복이 적어, 꾸준함이 가장 큰 힘이 되는 때예요.',
    '무리하지 않고 보폭을 지키면, 무던하게 흘러가는 흐름이에요.',
    '눈에 띄는 변화보다, 고요 속에서 정돈하기 좋은 시기예요.',
  ],
}

export const TONE_VARIANTS_EN: Record<'good' | 'hard' | 'mid', readonly string[]> = {
  good: [
    'The wind is at your back; effort carries you farther than usual.',
    'The channel is open, and what you set in motion tends to flow of its own accord.',
    'Things line up, and a path opens with each step you take.',
    'The light falls evenly this season, so what you plant grows with ease.',
    'People and help gather close, and the work goes lighter.',
    'The timing holds you up — even small attempts ripen into fruit.',
    'Few obstacles; a good current for carrying what you set your heart on.',
  ],
  hard: [
    'You climb into a headwind, and each step carries weight.',
    'More things resist your plans; this is a stretch that asks for endurance.',
    'What wears you down on the outside also hardens you at the core.',
    'The road narrows this season — better to pick your moment than to rush.',
    'Headwinds are frequent, but that resistance deepens your roots.',
    'You pass through a hard crossing and learn how to grow solid.',
    'The tide is out — a time to prepare rather than force your way forward.',
  ],
  mid: [
    'No great bends — a quiet current where you settle into what is yours.',
    'Less about dramatic events, more about the meaning that builds over time.',
    'Like walking even ground, the work here is keeping your footing.',
    'Day after day adds up to more than any single event right now.',
    'Few swings; steadiness is your strongest asset in this stretch.',
    'Hold your stride without overreaching, and things keep flowing, untroubled.',
    'Less visible change — a good season to set things in order, in calm.',
  ],
}

// EN sign names ARE identity (Aries → Aries) but a lookup keeps signature
// parity with SIGN_KO so the rest of the code can swap by lang uniformly.
export const SIGN_EN: Record<string, string> = {
  Aries: 'Aries',
  Taurus: 'Taurus',
  Gemini: 'Gemini',
  Cancer: 'Cancer',
  Leo: 'Leo',
  Virgo: 'Virgo',
  Libra: 'Libra',
  Scorpio: 'Scorpio',
  Sagittarius: 'Sagittarius',
  Capricorn: 'Capricorn',
  Aquarius: 'Aquarius',
  Pisces: 'Pisces',
}

// 외행성 마디 kind → 짧은 한국어 라벨 (각 단계 카드에 짧게 박는 용도).
// astroLifecycle.ts 의 labelKo 는 "첫 토성 회귀 — 진짜 어른됨의 통과의례" 처럼
// 한 문장이라 너무 길어서, phase 텍스트엔 함축형만 쓴다.
export const MILESTONE_SHORT_KO: Record<string, string> = {
  jupiter_return_1: '첫 목성 회귀',
  jupiter_return_2: '두 번째 목성 회귀',
  jupiter_return_3: '세 번째 목성 회귀',
  jupiter_return_5: '다섯 번째 목성 회귀',
  saturn_return_1: '첫 토성 회귀',
  saturn_return_2: '두 번째 토성 회귀',
  pluto_square_pluto: '명왕성 사각',
  uranus_opposition: '천왕성 대립',
  neptune_square: '해왕성 사각',
  chiron_return: '카이런 회귀',
  uranus_return: '천왕성 회귀',
  progressed_lunar_1: '감정 사이클 매듭',
}

export const MILESTONE_SHORT_EN: Record<string, string> = {
  jupiter_return_1: 'First Jupiter return',
  jupiter_return_2: 'Second Jupiter return',
  jupiter_return_3: 'Third Jupiter return',
  jupiter_return_5: 'Fifth Jupiter return',
  saturn_return_1: 'First Saturn return',
  saturn_return_2: 'Second Saturn return',
  pluto_square_pluto: 'Pluto square Pluto',
  uranus_opposition: 'Uranus opposition',
  neptune_square: 'Neptune square',
  chiron_return: 'Chiron return',
  uranus_return: 'Uranus return',
  progressed_lunar_1: 'Progressed lunar return',
}

export const BANDS: Array<[number, number, string]> = [
  [0, 19, '초년기'],
  [20, 39, '청년기'],
  [40, 59, '중년기'],
  [60, 84, '장년기'],
]

// ─────────────────────────────────────────────────────────────
// 지지 충/육합 — 본명 ↔ 대운 지지 관계. 6+6 pair 만 다루고 형/해/파
// 같은 더 미묘한 관계는 단계 카드에 욱여넣기 비좁아 생략 (DailyFlowCard 가
// 풀세트를 보여준다).
// ─────────────────────────────────────────────────────────────
export const BRANCH_CHUNG: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}

export const BRANCH_YUKHAP: Record<string, string> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
}

// ─────────────────────────────────────────────────────────────
// 신살 한 줄 함축 (bilingual). natalShinsal[].kind 의 한국어 이름을 받아
// "이 단계에 대운 지지가 본명 anchor 와 일치 → 신살 활성" 줄을 만든다.
// kind 가 매핑 테이블에 없으면 "${kind} 발현" / "${kind} activated" 로 폴백.
// ─────────────────────────────────────────────────────────────
export const SHINSAL_SHORT_KO: Record<string, string> = {
  천을귀인: '도움·우호적 지원 시기',
  천덕귀인: '하늘의 보호',
  월덕귀인: '달의 가호',
  문창귀인: '학문·표현 활성',
  문창: '학문·표현 활성',
  학당귀인: '지혜·학습 시기',
  금여: '행운·인연 풍성',
  금여성: '행운·인연 풍성',
  도화: '관계·매력 활성, 감정 변동',
  역마: '이동·변동 잦은 시기',
  역마살: '이동·변동 잦은 시기',
  양인: '강한 추진력 — 균형이 중요한 시기',
  백호: '예상 밖 변수에 유연하게',
  망신: '체면·신용을 다지는 흐름',
  망신살: '체면·신용을 다지는 흐름',
  겁살: '재물·신뢰를 점검하는 흐름',
  공망: '비움·내면을 응시하는 시기',
  // 12신살 시리즈 (역마 외 11종) — 출력에서 "${kind} 발현" 폴백으로 떨어지던
  // 회귀(2026-06 사용자 지적) 해결. 모두 같은 12신살 계열이라 톤은 비슷하지만
  // 각자 맥락이 다름.
  지살: '자기 시작·이동의 신호',
  년살: '도화의 분파 — 감정·관계 자극',
  월살: '발목 잡는 작은 장애 — 변화 직전 정체',
  // (망신 / 망신살 위에 이미 등록 — 12신살 시리즈에서 중복 회피)
  반안: '겉은 화려, 속은 단단해지는 — 자존심 자극',
  반안살: '겉은 화려, 속은 단단해지는 — 자존심 자극',
  장성: '리더십·권위 자극',
  장성살: '리더십·권위 자극',
  화개: '내면·예술·정신성 활성',
  화개살: '내면·예술·정신성 활성',
  재살: '재물·신뢰를 점검하는 흐름',
  천살: '권위·부모 주제를 마주하는 흐름',
  육해: '관계 마찰·은근한 방해',
  육해살: '관계 마찰·은근한 방해',
}

export const SHINSAL_SHORT_EN: Record<string, { name: string; short: string }> = {
  천을귀인: { name: 'Cheoneul Gwiin (Nobleman)', short: 'supportive helpers, lucky breaks' },
  천덕귀인: { name: 'Cheondeok Gwiin (Heavenly Virtue)', short: 'celestial protection' },
  월덕귀인: { name: 'Woldeok Gwiin (Lunar Virtue)', short: 'lunar grace' },
  문창귀인: { name: 'Munchang Gwiin (Scholar)', short: 'scholarship & expression thrive' },
  문창: { name: 'Munchang (Scholar)', short: 'scholarship & expression thrive' },
  학당귀인: { name: 'Hakdang Gwiin (Academy)', short: 'wisdom & learning' },
  금여: { name: 'Geumyeo (Golden Carriage)', short: 'fortune and connections abundant' },
  금여성: { name: 'Geumyeoseong (Golden Carriage)', short: 'fortune and connections abundant' },
  도화: { name: 'Dohwa (Peach Blossom)', short: 'charm & relationships active, emotional swings' },
  역마: { name: 'Yeokma (Travel Horse)', short: 'movement, travel, frequent shifts' },
  역마살: { name: 'Yeokmasal (Travel Horse)', short: 'movement, travel, frequent shifts' },
  양인: { name: 'Yangin (Yang Blade)', short: 'razor-sharp drive — balance matters' },
  백호: { name: 'Baekho (White Tiger)', short: 'stay flexible with the unexpected' },
  망신: { name: 'Mangsin (Loss of Face)', short: 'a season to firm up reputation & trust' },
  망신살: { name: 'Mangsinsal (Loss of Face)', short: 'a season to firm up reputation & trust' },
  겁살: { name: 'Geopsal (Robbery)', short: 'a season to mind wealth & trust' },
  공망: { name: 'Gongmang (Void)', short: 'spaciousness, deep introspection' },
  지살: { name: 'Jisal (Self-Start)', short: 'self-initiated moves, departures' },
  년살: { name: 'Nyeonsal (Year Spike)', short: 'a Dohwa offshoot — feelings stirred' },
  월살: { name: 'Wolsal (Snag)', short: 'small obstacles stall the cusp of change' },
  반안: { name: 'Banan (Saddle)', short: 'shiny outside, firming up inside' },
  반안살: { name: 'Banansal (Saddle)', short: 'shiny outside, firming up inside' },
  장성: { name: 'Jangseong (General)', short: 'leadership and authority stirred' },
  장성살: { name: 'Jangseongsal (General)', short: 'leadership and authority stirred' },
  화개: { name: 'Hwagae (Canopy)', short: 'inwardness, art, spirituality activated' },
  화개살: { name: 'Hwagaesal (Canopy)', short: 'inwardness, art, spirituality activated' },
  재살: { name: 'Jaesal (Wealth Trial)', short: 'a season to mind wealth & trust' },
  천살: { name: 'Cheonsal (Heaven Trial)', short: 'facing authority & parent themes' },
  육해: { name: 'Yukhae (Friction)', short: 'relational friction, quiet interference' },
  육해살: { name: 'Yukhaesal (Friction)', short: 'relational friction, quiet interference' },
}

// 본명 4지지 위치명 → 한국어/영문 표기 (단계 카드 줄에 쓰는 짧은 라벨).
export const PILLAR_POS_KO: Record<string, string> = {
  year: '연지',
  month: '월지',
  day: '일지',
  time: '시지',
}

export const PILLAR_POS_EN: Record<string, string> = {
  year: 'year branch',
  month: 'month branch',
  day: 'day branch',
  time: 'hour branch',
}

export const PILLAR_STEM_POS_KO: Record<string, string> = {
  year: '연간',
  month: '월간',
  day: '일간',
  time: '시간',
}

export const PILLAR_STEM_POS_EN: Record<string, string> = {
  year: 'year stem',
  month: 'month stem',
  day: 'day stem',
  time: 'hour stem',
}

// ─────────────────────────────────────────────────────────────
// 격국 KO/EN — advancedAnalysis.geokguk.primary (한국어 명) 를 받아
// EN 표시명과 한 줄 함축 설명을 만든다. description 은 advancedAnalysis 가
// 한국어로만 주므로 KO 는 그대로, EN 은 여기 매핑 테이블에서 가져온다.
// ─────────────────────────────────────────────────────────────
export const GEOKGUK_EN: Record<string, { name: string; short: string }> = {
  식신격: { name: 'Eating-god (Siksin) pattern', short: 'creativity feeds wealth' },
  상관격: { name: 'Hurting-officer (Sanggwan) pattern', short: 'free, original, talent-driven' },
  편재격: { name: 'Indirect-wealth (Pyeonjae) pattern', short: 'enterprising, dynamic with money' },
  정재격: { name: 'Direct-wealth (Jeongjae) pattern', short: 'steady, faithful accumulation' },
  편관격: { name: 'Indirect-officer (Pyeongwan) pattern', short: 'decisive, willing to push hard' },
  정관격: {
    name: 'Direct-officer (Jeonggwan) pattern',
    short: 'orderly, principled responsibility',
  },
  편인격: {
    name: 'Indirect-resource (Pyeonin) pattern',
    short: 'unconventional thinker, lone-wolf learner',
  },
  정인격: {
    name: 'Direct-resource (Jeongin) pattern',
    short: 'studious, dignified, well-supported',
  },
  종왕격: { name: 'Following-prosperity (Jongwang) pattern', short: 'rides one dominant force' },
  종강격: {
    name: 'Following-strength (Jonggang) pattern',
    short: 'leans on support that overwhelms the chart',
  },
  종아격: {
    name: 'Following-output (Jong‑a) pattern',
    short: 'goes all-in on expression and output',
  },
  종재격: {
    name: 'Following-wealth (Jongjae) pattern',
    short: 'follows the dominant wealth force',
  },
  종살격: {
    name: 'Following-officer (Jongsal) pattern',
    short: 'follows overpowering authority/pressure',
  },
  건록격: { name: 'Established-rank (Geollok) pattern', short: 'born standing on your own feet' },
  양인격: { name: 'Yang-blade (Yangin) pattern', short: 'sharp, intense, high-stakes drive' },
  월겁격: { name: 'Month-rob (Wolgeop) pattern', short: 'strong peers, competition shapes you' },
  잡기격: { name: 'Mixed (Japgi) pattern', short: 'mixed signals — multi-track development' },
  곡직격: { name: 'Curving-straight (Gokjik) pattern', short: 'all-Wood — growth and uprightness' },
  염상격: { name: 'Blazing-up (Yeomsang) pattern', short: 'all-Fire — bright, radiant force' },
  가색격: { name: 'Sowing-reaping (Gasaek) pattern', short: 'all-Earth — fertile, gathering' },
  종혁격: {
    name: 'Following-reform (Jonghyeok) pattern',
    short: 'all-Metal — sharp, refining force',
  },
  윤하격: { name: 'Flowing-down (Yunha) pattern', short: 'all-Water — fluid, deep, adaptive' },
  갑기화토격: { name: 'Gap-gi Earth transformation pattern', short: 'two stems fuse into Earth' },
  을경화금격: {
    name: 'Eul-gyeong Metal transformation pattern',
    short: 'two stems fuse into Metal',
  },
  병신화수격: {
    name: 'Byeong-sin Water transformation pattern',
    short: 'two stems fuse into Water',
  },
  정임화목격: { name: 'Jeong-im Wood transformation pattern', short: 'two stems fuse into Wood' },
  무계화화격: { name: 'Mu-gye Fire transformation pattern', short: 'two stems fuse into Fire' },
  미정: { name: 'Undetermined pattern', short: 'no clean pattern lock' },
}

// 한국어 1줄 함축 — geokguk.ts 의 description 은 본문에 가까운 한 문장이라
// intro 한 줄에 박기엔 살짝 길다. 짧은 핵심만 적는다.
export const GEOKGUK_SHORT_KO: Record<string, string> = {
  식신격: '창의가 곧 재물로 이어지는 스타일',
  상관격: '자유롭고 재능 중심 스타일',
  편재격: '활동적이고 사업 수완이 큰 스타일',
  정재격: '안정적·꾸준한 축적 스타일',
  편관격: '결단력 있고 밀어붙이는 스타일',
  정관격: '원칙·책임 중심 스타일',
  편인격: '독자적 사고·1인 학습형 스타일',
  정인격: '배움·지원이 든든한 스타일',
  종왕격: '하나의 강한 기운에 올라타는 스타일',
  종강격: '지원이 압도하는 스타일',
  종아격: '표현·창작 전부에 던지는 스타일',
  종재격: '재물 흐름에 동승하는 스타일',
  종살격: '강한 압력·권위에 적응하는 스타일',
  건록격: '홀로서기로 출발하는 스타일',
  양인격: '날카롭고 강도 높은 추진력 스타일',
  월겁격: '경쟁이 사람을 키우는 스타일',
  잡기격: '다중 트랙 발달 스타일',
  곡직격: '목 일색 — 성장·곧음 스타일',
  염상격: '화 일색 — 환하고 빛나는 스타일',
  가색격: '토 일색 — 너른 토양 스타일',
  종혁격: '금 일색 — 날카로운 정련 스타일',
  윤하격: '수 일색 — 유연하고 깊은 스타일',
  갑기화토격: '두 천간이 토로 화하는 스타일',
  을경화금격: '두 천간이 금으로 화하는 스타일',
  병신화수격: '두 천간이 수로 화하는 스타일',
  정임화목격: '두 천간이 목으로 화하는 스타일',
  무계화화격: '두 천간이 화로 화하는 스타일',
  미정: '뚜렷한 격이 잡히지 않는 스타일',
}
