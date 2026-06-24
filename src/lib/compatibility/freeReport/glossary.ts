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
    term: { ko: '궁합(시너스트리)이 뭔가요?', en: 'What is synastry (gunghap)?' },
    body: {
      ko: '두 사람의 사주랑 별자리를 겹쳐 놓고, 둘이 만나면 어떤 사이가 생기는지 읽는 거예요. 혼자 볼 땐 안 보이던 신호가, 둘 사이에서만 켜지거든요.',
      en: 'We overlay your two charts and read what kind of connection comes alive when you meet. Some signals stay dark in either chart alone. They only switch on between the two of you.',
    },
  },
  {
    term: { ko: '일간(나 자신)', en: 'Day master (you)' },
    body: {
      ko: "사주 여덟 글자 중 '태어난 날'의 윗글자가 곧 나 자신이에요. 궁합에서는 두 사람의 이 글자(일간)가 어떤 오행으로 만나는지가 관계의 바탕이 돼요.",
      en: 'The top symbol of your birth-day pillar is you. In a match, how your two day masters meet by element sets the baseline of the relationship.',
    },
  },
  {
    term: { ko: '오행 (목·화·토·금·수)', en: 'Five elements (Wood, Fire, Earth, Metal, Water)' },
    body: {
      ko: '세상의 기운을 나무·불·흙·금속·물 다섯으로 나눈 거예요. 이 다섯은 서로 살려주기도 하고(상생) 누르기도 해요(상극). 그래서 두 사람의 기운이 서로 채워주는지 부딪히는지를 봐요.',
      en: "The world's energy split into Wood, Fire, Earth, Metal, and Water. These five nourish each other (generate) or curb each other (control). So we read whether your energies fill each other in or clash.",
    },
  },
  {
    term: { ko: '천간·지지 (윗글자·아랫글자)', en: 'Stems & branches (upper/lower)' },
    body: {
      ko: '사주 기둥 하나는 윗글자(천간)랑 아랫글자(지지), 이렇게 두 칸이에요. 윗글자는 겉으로 드러나는 자리, 아랫글자는 속에 깔린 자리를 봐요. 궁합은 이 글자들끼리 어떻게 맞고(합) 부딪치는지(충)를 읽어요.',
      en: "One Saju pillar has two slots: a top symbol (stem) and a bottom one (branch). The top shows what's visible, the bottom what runs underneath. A match reads how these symbols fit together (union) and collide (clash).",
    },
  },
  {
    term: { ko: '합·충·형·해·파', en: 'Union · clash · friction · strain · rupture' },
    body: {
      ko: '사주 글자끼리 주고받는 작용이에요. 합은 서로 끌어당겨 묶이고, 충은 정면으로 부딪혀요. 형·해·파는 갈거나 어긋나는 더 미묘한 마찰이죠. 어디가 묶이고 어디가 흔들리는지 둘은 이걸로 알 수 있어요.',
      en: 'This is how Saju characters act on each other. Union pulls together and binds; clash collides head-on. Punishment, harm, and break are subtler grinds and misfits. They show you which spots bond and which ones get shaken.',
    },
  },
  {
    term: {
      ko: '배우자성 (짝으로 보이는 결)',
      en: 'Spouse-star (the thread that reads as your partner)',
    },
    body: {
      ko: "내 사주를 기준으로 상대가 '짝·배우자' 자리로 잡히는 글자예요(정재·편재=처성, 정관·편관=부성). 특히 일지(일 기둥 아랫글자=배우자 자리)에 걸리면 가장 강한 인연 신호죠.",
      en: "A character where the other reads as your 'partner/spouse' role (Direct/Indirect Wealth = wife-star, Direct/Indirect Officer = husband-star). It's strongest when it lands on the day-branch, the spouse seat.",
    },
  },
  {
    term: { ko: '십성 (관계의 역할 이름)', en: 'Ten Gods (the names of your relational roles)' },
    body: {
      ko: "나(일간)를 기준으로 상대 글자가 어떤 역할을 하는지 붙인 이름이에요. 이름이 좀 무섭게 들려도(편관=칠살 같은 거요) 좋고 나쁨이 아니에요. 그냥 '나한테 어떤 식으로 다가오나'를 나눠 부르는 거죠.",
      en: 'These are names for the role another character plays relative to you (your Day Master). Some sound scary (like "Seven Killings") but they aren\'t good or bad. They just mark what kind of way that character comes at you.',
    },
  },
  {
    term: { ko: '도화·홍염 (매력 신호)', en: 'Peach Blossom · Crimson Glow (charm signals)' },
    body: {
      ko: '특정 글자가 만났을 때 켜지는 매력·끌림 신호예요. 도화는 자석처럼 끌어당기는 인기와 매력을, 홍염은 색기와 연애의 강도를 더해 줘요. 끌림에 색을 입히는 참고 신호일 뿐이죠.',
      en: 'Charm-and-pull signals that switch on when certain characters meet. Peach Blossom is magnetic appeal; Hongyeom adds sensual, romantic intensity. This is a coloring hint to the attraction, not a verdict.',
    },
  },
  {
    term: { ko: '천궁도·행성 (별자리 지도)', en: 'Natal chart & planets' },
    body: {
      ko: '태어난 순간 하늘에서 해·달·행성이 어디 있었는지 그린 지도예요. 행성 하나하나가 마음의 한 가지 일을 맡아요. 해는 나 자신, 달은 감정, 금성은 사랑, 화성은 욕망, 이런 식이에요.',
      en: 'A map of where the Sun, Moon, and planets sat when you were born. Each one handles a single part of your inner life. Sun is your sense of self, Moon your feelings, Venus love, Mars desire.',
    },
  },
  {
    term: { ko: '어스펙트 (행성 사이 각도)', en: 'Aspects (angles between planets)' },
    body: {
      ko: '두 사람의 행성이 서로 이루는 각도예요. 부드럽게 흐르거나(조화: 삼각·육각·겹침), 부딪히거나(긴장: 사각·맞섬), 미묘하게 엇갈리죠(엇박). 각이 딱 맞을수록 더 세게 작용해요.',
      en: 'The angle your planets make to each other. It flows smoothly (harmony: trine, sextile, conjunction), clashes (tension: square, opposition), or sits slightly off-key (a subtle misfit). The tighter the angle, the stronger it works.',
    },
  },
  {
    term: { ko: '하우스 오버레이 (삶의 무대)', en: 'House overlay (life stage)' },
    body: {
      ko: '한 사람의 행성이 상대의 어느 삶의 영역(하우스)에 떨어지는지를 봐요. 1~12하우스가 자아·재물·연애·결혼·일 같은 무대를 나눠 맡죠. 누군가의 행성이 상대의 7하우스(동반자·결혼)에 들어오면 특히 강한 짝 신호예요.',
      en: "It's about which area of life (house) one person's planet lands in for the other. Houses 1 through 12 split the stage — self, money, romance, marriage, work. A planet landing in someone's 7th (partnership) is an especially strong pairing signal.",
    },
  },
  {
    term: { ko: '대운·세운 (시기의 흐름)', en: 'Daeun · Sewoon (life & yearly cycles)' },
    body: {
      ko: "대운은 10년 단위로 바뀌는 큰 흐름이고, 세운은 그해 한 해의 흐름이에요. 두 사람의 시기가 같은 방향으로 맞물리는지를 보면 '지금 우리 때가 어떤가'를 가늠해요. 구체적인 시기 풀이는 상담사 몫이에요.",
      en: "Daeun is your 10-year tide; Sewoon is how a single year flows. When you look at whether two people's cycles line up the same way, you get a sense of 'how our timing runs right now.' The detailed timing read is for the counselor.",
    },
  },
  {
    term: { ko: '동·서 교차란?', en: 'What is the East–West cross-read?' },
    body: {
      ko: '같은 두 사람을 동양 사주로 한 번, 서양 별자리로 또 한 번 따로 읽고서 둘을 겹쳐 봐요. 두 쪽이 똑같은 얘길 하는 자리일수록 그 특징이 더 또렷하고 단단하다고 봐요.',
      en: 'We read the same two people twice — once through Eastern Saju, once through Western astrology — then lay the two side by side. Where both say the same thing, that trait shows up clearer and more solid.',
    },
  },
]
