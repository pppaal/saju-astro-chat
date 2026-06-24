/**
 * 무료 궁합 리포트 — 초보자용 용어 풀이.
 *
 * 통합 리포트의 reportGlossary 와 같은 결: "그 용어 자체가 무엇인가"를 한 줄로.
 * 궁합(두 사람 교차)에 특화된 항목만 추린다 — 일간/오행 같은 기본은 짧게,
 * 시너스트리/배우자성/하우스 오버레이 같은 *관계* 용어를 중심으로.
 */

import type { Bi } from './types'

export interface GlossaryDef {
  term: Bi
  body: Bi
}

export const COMPAT_GLOSSARY: GlossaryDef[] = [
  {
    term: { ko: '궁합(시너스트리)이 뭐가요?', en: 'What is synastry (gunghap)?' },
    body: {
      ko: '두 사람의 사주·별자리를 겹쳠 놓고 "둘이 만나면 어떤 결이 생기나"를 읽는 거예요. 한 사람만 볼 때는 안 보이던, 두 사람 사이에서만 켜지는 신호를 봐요.',
      en: 'Overlaying two people’s charts to read "what grain arises when they meet." It surfaces signals that only switch on between the two of you, invisible in either chart alone.',
    },
  },
  {
    term: { ko: '일간(나 자신)', en: 'Day master (you)' },
    body: {
      ko: '사주 여덟 글자 중 "태어난 날"의 윗글자가 곳 나 자신이에요. 궁합에서는 두 사람의 일간끼리 어떤 오행으로 만나는지가 관계의 기본 결이 돼요.',
      en: 'The top symbol of your birth-day pillar is "you." In a match, how two day masters meet by element sets the baseline grain of the relationship.',
    },
  },
  {
    term: { ko: '오행 (목·화·토·금·수)', en: 'Five elements' },
    body: {
      ko: '세상 기운을 나무·불·흙·금속·물 다섯으로 나눈 거예요. 서로 살려주거나(상생) 누르는(상극) 관계가 있어, 두 사람 기운이 보완되는지 부딪히는지를 봐요.',
      en: 'The world’s energy split into Wood, Fire, Earth, Metal, Water. They nourish (generate) or curb (control) one another — so we read whether your energies complement or clash.',
    },
  },
  {
    term: { ko: '천간·지지 (윗글자·아랫글자)', en: 'Stems & branches (upper/lower)' },
    body: {
      ko: '사주 각 기둥은 윗글자(천간)와 아랫글자(지지) 두 칸이에요. 천간은 격으로 드러나는 결, 지지는 속에 깔린 결을 봐요. 궁합은 이 글자들끼리의 합·충을 읽어요.',
      en: 'Each Saju pillar has a top symbol (stem) and a bottom one (branch). Stems show the visible grain, branches the underlying one. A match reads union and clash between these.',
    },
  },
  {
    term: { ko: '합·충·형·해·파', en: 'Union · clash · punishment · harm · break' },
    body: {
      ko: '사주 글자끼리의 상호작용이에요. 합은 끌어당겨 묶이고, 충은 정면으로 부딪히고, 형·해·파는 갈거나 어긋나는 미모한 마찰이에요. 어디가 묶이고 흔들리는지 보여줘요.',
      en: 'Interactions between Saju characters. Union pulls together; clash collides head-on; punishment/harm/break are subtler grinds and misfits. They show which spots bond and which get shaken.',
    },
  },
  {
    term: { ko: '배우자성 (짝으로 보이는 결)', en: 'Spouse-star' },
    body: {
      ko: '내 사주를 기준으로 상대가 "짝·배우자"의 역할로 잡히는 글자예요(정재·편재=처성, 정관·편관=부성). 특히 일지(일 기둥 아랫글자=배우자 자리)에 걸리면 가장 강한 인연 신호예요.',
      en: 'A character where the other reads as your "partner/spouse" role (Direct/Indirect Wealth = wife-star, Direct/Indirect Officer = husband-star). Strongest when it lands on the day-branch — the spouse seat.',
    },
  },
  {
    term: { ko: '십성 (관계의 역할 이름)', en: 'Ten Gods' },
    body: {
      ko: '나(일간)를 기준으로 상대 글자가 어떤 역할인지 붙인 이름이에요. 이름이 무서게 들려도(편관=칠살 등) 좋고 나쁜이 아니라 "어떤 결로 다가오나"의 종류일 뿐이에요.',
      en: 'Labels for what role another character plays relative to you. Some names sound scary (e.g. "Seven Killings") but they mark a *type of grain*, not good or bad.',
    },
  },
  {
    term: { ko: '도화·홍염 (매력 신호)', en: 'Peach Blossom · Hongyeom (charm stars)' },
    body: {
      ko: '특정 글자 조합에서 나오는 매력·끌림의 신호예요. 도화는 자석 같은 인기·매력, 홍염은 색기·연애 강도를 더해요. 끌림에 색을 입히는 참고 신호일 뿐이에요.',
      en: 'Charm-and-attraction signals from certain character combos. Peach Blossom is magnetic appeal; Hongyeom adds sensual, romantic intensity. A coloring hint to the pull, not a verdict.',
    },
  },
  {
    term: { ko: '천궁도·행성 (별자리 지도)', en: 'Natal chart & planets' },
    body: {
      ko: '태어난 순간 하늘에서 해·달·행성이 어디 있었는지 그린 지도예요. 각 행성은 마음의 한 기능을 맡아요 — 해=자아, 달=감정, 금성=사랑, 화성=욕망처럼요.',
      en: 'A map of where the Sun, Moon, and planets sat at your birth. Each governs one function — Sun = self, Moon = feelings, Venus = love, Mars = desire.',
    },
  },
  {
    term: { ko: '어스펙트 (행성 사이 각도)', en: 'Aspects (angles between planets)' },
    body: {
      ko: '두 사람의 행성이 서로 이루는 각도예요. 부드럽게 흐르거나(조화: 삼각·육각·겹침), 부딪히거나(긴장: 사각·맞섬), 미모하게 엇갈려요(엇박). 각이 딱 맞을수록 더 강하게 작용해요.',
      en: 'The angles your planets make to each other — flowing (harmony: trine, sextile, conjunction), clashing (tension: square, opposition), or off-key (subtle misfit). The tighter the angle, the stronger it works.',
    },
  },
  {
    term: { ko: '하우스 오버레이 (삶의 무대)', en: 'House overlay (life stage)' },
    body: {
      ko: '한 사람의 행성이 상대의 어느 삶의 영역(하우스)에 떨어지는지예요. 1~12하우스가 자아·재물·연애·결혼·일 같은 무대를 나눠요. 7하우스(동반자·결혼)에 들어오면 특히 강한 짝 신호예요.',
      en: "Which area of life (house) one person's planet lands in for the other. Houses 1–12 split the stage — self, money, romance, marriage, work… A planet in the 7th (partnership) is an especially strong pairing signal.",
    },
  },
  {
    term: { ko: '대운·세운 (시기의 흐름)', en: 'Daeun · Sewoon (life & yearly cycles)' },
    body: {
      ko: '대운은 10년 단위로 바뀌는 큰 흐름, 세운은 그해 한 해의 흐름이에요. 두 사람의 시기가 같은 결로 만나는지를 보면 "지금 우리 시기가 어떤가"를 가늘해요. (구체적 시기 풀이는 상담사 몫이에요.)',
      en: 'Daeun is your 10-year tide; Sewoon is the given year’s flow. Whether two people’s cycles meet in the same grain hints at "how our timing runs now." (Detailed timing is for the counselor.)',
    },
  },
  {
    term: { ko: '동·서 교차란?', en: 'What is the East–West cross-read?' },
    body: {
      ko: '같은 두 사람을 동양 사주와 서양 별자리로 따로 본 뒤 겹쳠 보는 거예요. 둘이 같은 말을 하는 지점일수록 그만큼 또렷하고 단단한 특징이라고 봐요.',
      en: 'Reading the same two people with both Eastern Saju and Western astrology, then overlaying. Where both say the same thing, that trait is especially clear and solid.',
    },
  },
]
