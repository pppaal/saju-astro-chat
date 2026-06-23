/**
 * 초보자용 용어 풀이 — 사주·점성을 모르는 사람이 각 섹션의 용어를 한 줄로
 * 이해하도록 "쉽게 풀이" 더보기에 노출. 사전(chart-dictionary)의 개인별 해석과
 * 달리, 여기 내용은 "그 용어 자체가 무엇인가"를 설명하는 고정 글로서리다.
 * IntegratedReport 의 각 섹션 헤더 아래에 <Explain> 으로 렌더된다. ko/en 짝.
 */
import type { BiLabel } from './reportTypes'

export interface GlossaryEntry {
  term: BiLabel
  body: BiLabel
}

export type GlossarySection = 'intro' | 's01' | 's02' | 's03' | 's04' | 's05'

export const GLOSSARY: Record<GlossarySection, GlossaryEntry[]> = {
  intro: [
    {
      term: { ko: '사주팔자가 뭔가요?', en: 'What is Saju (Four Pillars)?' },
      body: {
        ko: '태어난 연·월·일·시를 옛 동양식 부호(천간·지지)로 바꾼 여덟 글자예요. 그 조합으로 타고난 기질과 삶의 흐름을 읽어요.',
        en: 'Your birth year, month, day, and hour written as eight East-Asian symbols (stems and branches). Their combination describes your inborn temperament and life flow.',
      },
    },
    {
      term: { ko: '천궁도(점성)는 뭔가요?', en: 'What is the natal chart (astrology)?' },
      body: {
        ko: '태어난 순간 하늘에서 해·달·행성이 어느 별자리·위치에 있었는지 그린 지도예요. 서양 점성술의 기본 그림이에요.',
        en: 'A map of where the Sun, Moon, and planets sat in the sky at your birth — the core chart of Western astrology.',
      },
    },
    {
      term: { ko: '이 리포트는 어떻게 읽나요?', en: 'How do I read this report?' },
      body: {
        ko: '같은 사람을 동양 사주와 서양 점성으로 각각 본 뒤 겹쳐 봐요. 둘이 같은 얘길 하면 그만큼 또렷하고 단단한 특징이에요.',
        en: 'It reads the same person with both Eastern Saju and Western astrology, then overlays them. When both point the same way, that trait is especially strong.',
      },
    },
  ],
  s01: [
    {
      term: { ko: '사주 명식(4기둥)', en: 'Four Pillars chart' },
      body: {
        ko: '여덟 글자를 연·월·일·시 네 기둥으로 세운 표예요. 각 기둥은 위(천간)·아래(지지) 두 글자로 되어 있어요.',
        en: 'The eight characters arranged into four pillars (year, month, day, hour). Each pillar has a top symbol (stem) and a bottom symbol (branch).',
      },
    },
    {
      term: { ko: '천간·지지 (갑을병정 / 자축인묘)', en: 'Stems & branches' },
      body: {
        ko: '천간은 갑·을·병·정… 10개, 지지는 자·축·인·묘… 12개의 부호예요. 각각 다섯 기운(나무·불·흙·금속·물)과 음(陰)·양(陽), 즉 차분한 결과 활발한 결을 담고 있어요.',
        en: 'Stems are 10 symbols (Gap, Eul, Byeong…); branches are 12 (Ja, Chuk, In…). Each carries one of five energies (Wood/Fire/Earth/Metal/Water) and a calm-vs-active flavor (yin and yang).',
      },
    },
    {
      term: { ko: '일간(나) · 예: 경금이 뭔가요?', en: 'Day Master (you) · e.g. "Gyeong Metal"' },
      body: {
        ko: '네 기둥 중 "태어난 날"의 위 글자가 곧 나 자신이에요. 예를 들어 경금(庚)이면 활발한 결의 금속 기운 — 단단하고 결단력 있는 나를 뜻해요.',
        en: 'The top symbol of your birth-day pillar is "you." For example Gyeong (庚) is active-flavored Metal — a firm, decisive self.',
      },
    },
    {
      term: { ko: '십신 (정관·식신·재성 등)', en: 'Ten Gods' },
      body: {
        ko: '나(일간)를 기준으로 다른 글자가 어떤 관계인지 붙인 이름이에요. 일·돈·관계처럼 삶의 역할을 나타내요.',
        en: 'Labels for how each other character relates to you (Direct Officer, Eating God, Wealth…). They map to life roles like work, money, and relationships.',
      },
    },
    {
      term: { ko: '십신 10가지 이름 (비견~정인)', en: 'The ten Ten-God names' },
      body: {
        ko: '비견(나와 같은 편·동료), 겁재(경쟁·승부 기운), 식신(편안한 표현·솜씨), 상관(톡톡 튀는 재주·말솜씨), 편재(크게 굴리는 돈·기회), 정재(꾸준히 모으는 돈), 편관(밀어붙이는 압박·도전), 정관(질서·책임·자리), 편인(독특한 배움·직관), 정인(꾸준한 배움·보살핌)을 뜻해요.',
        en: 'Companion (peers, your own kind), Rob Wealth (rivalry, competitive drive), Eating God (easy self-expression, craft), Hurting Officer (sharp talent, way with words), Indirect Wealth (big-swing money, opportunity), Direct Wealth (steady, saved-up money), Seven Killings (pressure, challenge), Direct Officer (order, responsibility, status), Indirect Resource (unusual learning, intuition), Direct Resource (steady learning, nurture).',
      },
    },
    {
      term: { ko: '지장간 (글자 속 숨은 기운)', en: 'Hidden stems (energy inside a branch)' },
      body: {
        ko: '지지(아래 글자) 속에 숨어 있는 천간이에요. 겉으로 안 보여도 속에서 작용하는 기운을 보여줘요.',
        en: 'Stems tucked inside each branch — energies that work beneath the surface even when not visible.',
      },
    },
    {
      term: { ko: '12운성 (장생·제왕·쇠 등)', en: 'Twelve life stages' },
      body: {
        ko: '기운이 태어나→자라→전성기→쇠퇴하는 12단계 중 어디인지 표시해요. 그 글자의 힘의 세기를 가늠해요.',
        en: 'A 12-stage cycle (birth → growth → peak → decline) showing how strong each character’s energy is.',
      },
    },
    {
      term: { ko: '신살 (역마살·도화살 등)', en: 'Symbolic stars (sinsal)' },
      body: {
        ko: '특정 글자 조합에서 나오는 별칭 같은 기운이에요(역마살=이동·여행, 도화살=매력·인기 같은 식). 재능이나 주의할 점에 색을 더해 주는 참고 신호일 뿐, 이것만으로 단정하지는 않아요.',
        en: 'Nicknamed energies from certain character combos (Traveling Horse = travel/change, Peach Blossom = charm/appeal…). They add color to your talents or things to watch for — a hint, not a verdict on their own.',
      },
    },
    {
      term: { ko: '합충형파', en: 'Interactions (harmony/clash)' },
      body: {
        ko: '글자들끼리 끌어당기거나(합) 부딪히는(충) 상호작용이에요. 어떤 기운이 묶이거나 흔들리는지 보여줘요.',
        en: 'Interactions between characters — combining (harmony) or clashing — showing which energies bond or get shaken.',
      },
    },
  ],
  s02: [
    {
      term: { ko: '오행 (목·화·토·금·수)', en: 'Five elements' },
      body: {
        ko: '세상의 기운을 나무·불·흙·금속·물 다섯으로 나눈 거예요. 사주에 어느 기운이 많고 적은지 봐요.',
        en: 'The world’s energy split into Wood, Fire, Earth, Metal, Water. We look at which you have a lot or a little of.',
      },
    },
    {
      term: { ko: '신강 · 신약', en: 'Strong · weak day master' },
      body: {
        ko: '나(일간)의 힘이 센지(신강) 약한지(신약)예요. 균형이면 중화라고 해요. 무엇을 보완할지의 기준이 돼요.',
        en: 'Whether "you" (the day master) are strong or weak (balanced = neutral). It guides what to support.',
      },
    },
    {
      term: { ko: '격국 (사주의 큰 틀)', en: 'Chart structure (geokguk)' },
      body: {
        ko: '사주 전체의 유형(타입)이에요. 그 사람의 큰 성향과 어울리는 길을 한마디로 요약해줘요.',
        en: 'The overall "type" of your chart — a one-line summary of your broad disposition and fitting path.',
      },
    },
    {
      term: { ko: '용신 · 희신 · 기신', en: 'Useful · Helpful · Adverse god' },
      body: {
        ko: '나에게 가장 필요한 기운이 용신, 도와주는 게 희신, 부담되는 게 기신이에요. 색·방향·활동으로 보완할 수 있어요.',
        en: 'Your most-needed element is the Useful god, the helper is Helpful, the burden is Adverse. You can support it via color, direction, and activity.',
      },
    },
    {
      term: { ko: '통근 · 공망 · 조후', en: 'Rooting · Void · Climate' },
      body: {
        ko: '세 가지 보조 점검이에요. 통근=내 글자가 아래 자리에 같은 기운을 받아 든든히 버티고 있는지, 공망=그 자리가 비어서 힘이 잘 안 실리는 곳, 조후=태어난 계절이 너무 덥거나 추워서 따뜻함·시원함으로 균형을 맞춰야 하는지를 봐요.',
        en: 'Three secondary checks. Rooting: whether your character has matching support beneath it so it stands firm. Void: a spot that sits empty, so energy does not land there well. Climate: whether your birth season runs too hot or too cold and needs warmth or cooling to balance.',
      },
    },
  ],
  s03: [
    {
      term: { ko: '천궁도 (태어난 순간 하늘 지도)', en: 'Natal wheel (your birth sky map)' },
      body: {
        ko: '태어난 순간 하늘을 둥글게 그린 지도예요. 둘레의 12별자리 위에 행성들이 놓여 있어요.',
        en: 'A round map of the sky at your birth, with planets placed on the 12 zodiac signs around the rim.',
      },
    },
    {
      term: { ko: '행성', en: 'Planets' },
      body: {
        ko: '해·달·수성·금성·화성… 각 행성은 마음의 한 기능을 맡아요(예: 달=감정, 금성=사랑·취향).',
        en: 'Sun, Moon, Mercury, Venus, Mars… each planet governs one function of the psyche (Moon = emotions, Venus = love/taste).',
      },
    },
    {
      term: { ko: '별자리', en: 'Zodiac signs' },
      body: {
        ko: '행성이 어떤 색깔(스타일)로 작동하는지예요. 양자리=과감, 게자리=다정 같은 식이에요.',
        en: 'The "flavor" a planet acts in — Aries = bold, Cancer = caring, and so on.',
      },
    },
    {
      term: { ko: '하우스', en: 'Houses' },
      body: {
        ko: '그 기운이 삶의 어느 무대에서 펼쳐지는지예요. 1~12하우스가 자아·돈·관계·일 같은 영역을 나눠요.',
        en: 'The life "stage" where an energy plays out. Houses 1–12 cover areas like self, money, relationships, and work.',
      },
    },
    {
      term: { ko: '상승점 · 중천', en: 'ASC (rising) · MC (midheaven)' },
      body: {
        ko: '상승점은 남에게 보이는 첫인상·겉모습, 중천은 사회적 위치·커리어 방향을 뜻해요.',
        en: 'ASC is your outward first impression; MC is your social standing and career direction.',
      },
    },
    {
      term: { ko: '주간 · 야간', en: 'Sect (day · night)' },
      body: {
        ko: '해가 지평선 위에 있을 때(낮) 태어났는지, 아래에 있을 때(밤) 태어났는지로 차트를 주간·야간으로 나눠요. 낮 차트면 해 쪽 행성이, 밤 차트면 달 쪽 행성이 더 편하게 힘을 내요.',
        en: 'Whether you were born with the Sun above the horizon (day) or below it (night) sorts the chart into day or night. In a day chart the Sun-side planets work more comfortably; in a night chart the Moon-side ones do.',
      },
    },
  ],
  s04: [
    {
      term: { ko: '어스펙트 (행성 각도)', en: 'Aspects' },
      body: {
        ko: '행성들 사이의 각도 관계예요. 잘 흐르거나(조화), 부딪히거나(긴장), 함께 뭉치며(합) 서로 영향을 줘요.',
        en: 'Angle relationships between planets — flowing (harmony), clashing (tension), or merging (conjunction).',
      },
    },
    {
      term: { ko: '오차각 (각이 딱 맞은 정도)', en: 'Orb (how exact the angle is)' },
      body: {
        ko: '두 행성의 각도가 딱 떨어지는 값(예: 90°)에서 얼마나 벗어났는지 그 여유 폭이에요. 0°에 가까울수록 정확히 맞은 각이라 그만큼 더 강하게 작용해요.',
        en: 'How far two planets sit from an exact angle (e.g. 90°) — the allowed wiggle room. The closer to 0°, the more exact the angle, and the stronger it works.',
      },
    },
    {
      term: { ko: '역행 (뒤로 가는 것처럼 보일 때)', en: 'Retrograde (appears to move backward)' },
      body: {
        ko: '하늘에서 행성이 잠시 뒤로 가는 것처럼 보이는 때예요. 그 행성의 기운이 밖으로 뻗기보다 안으로 향하고 곱씹는 식으로 작동한다고 봐요.',
        en: 'A time when a planet appears to move backward in the sky. Its energy is read as turning inward and reflective rather than reaching outward.',
      },
    },
    {
      term: { ko: '디그니티 (위계)', en: 'Dignities' },
      body: {
        ko: '행성이 자기 집처럼 편한 자리인지, 기죽는 자리인지 보는 점수 같은 거예요. 그 행성의 힘이 얼마나 잘 나오는지 알려줘요.',
        en: 'Whether a planet sits in a comfortable "home" or a weak seat — like a score for how well its power comes through.',
      },
    },
    {
      term: {
        ko: '본궁·고양·손상·쇠퇴 (디그니티 등급)',
        en: 'Domicile · Exaltation · Detriment · Fall',
      },
      body: {
        ko: '디그니티의 네 단계예요. 본궁=자기 집처럼 가장 편하고 힘이 잘 나오는 자리, 고양=손님으로 환대받아 빛나는 자리, 손상=가장 불편해 결대로 잘 안 풀리는 자리, 쇠퇴=기운이 약하게 가라앉는 자리예요.',
        en: 'The four levels of dignity. Domicile: its own home, most at ease and full-strength. Exaltation: an honored-guest seat where it shines. Detriment: its least comfortable seat, where it works against its grain. Fall: a seat where its energy sinks and weakens.',
      },
    },
  ],
  s05: [
    {
      term: { ko: '통합 교차란?', en: 'What is the cross-reading?' },
      body: {
        ko: '같은 주제(자아·돈·관계 등)를 사주와 점성이 각각 뭐라 하는지 나란히 놓고, 둘이 같은지 다른지 표시해요. 둘 다 같으면 가장 단단한 특징이에요.',
        en: 'For each theme (self, money, relationships…) it places what Saju and astrology each say side by side and marks agreement or difference. When both agree, that’s your most solid trait.',
      },
    },
  ],
}
