// src/lib/fusion/lifeReport/pools/planetHousePool.ts
//
// Planet × House domain-agnostic narrative.
//
// Inner 5 + outer 5 행성 × 12궁 cross. ASC 는 정의상 1궁에 위치하므로
// sign 만 다루면 충분.
//
// 출처: 점성 정통 (Robert Hand "Horoscope Symbols" + Stephen Forrest
// "Inner Sky" + Liz Greene outer planet works). 각 행성의 핵심 voice
// (Sun = 자아 표현, Moon = 정서 안전, Mercury = 사고, Venus = 끌림·
// 미감, Mars = 행동·욕망, Jupiter = 확장·기회, Saturn = 구조·책임,
// Uranus = 혁신·자유, Neptune = 영감·해체, Pluto = 변혁·심층) 가
// 해당 house 의 무대에서 어떻게 펼쳐지는지 한 줄로 압축.
//
// 12 houses × 10 planets × 2 languages = 240 entries.
// 도메인-agnostic — career/love/money/health 어떤 챕터에서든 자연
// 합성. 챕터별 도메인 flavor 는 호출 측에서 둘러쌈.

type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

const SUN_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '있는 그대로의 자신을 보여주는 게 당신의 핵심이에요. 무대에 서는 일이 잘 맞아요',
  2: '자기 가치와 자원이 자아 표현의 통로예요. 손에 잡히는 결과로 자기를 드러내요',
  3: '말과 학습, 짧은 거리의 소통에서 당신의 색이 살아나요. 호기심을 따라가는 결이에요',
  4: '뿌리와 가정 안에서 자기 정체성이 단단해져요. 보이지 않는 자리에서 빛나는 스타일이에요',
  5: '창조·연애·놀이의 자리에서 가장 당신답게 빛나요. 표현이 곧 정체성이에요',
  6: '일상의 노동과 봉사에서 자기를 풀어내요. 디테일을 다듬는 스타일이에요',
  7: '관계와 파트너십이 정체성의 거울이 돼요. 일대일 만남에서 자기 결이 또렷해져요',
  8: '깊은 변화와 공유 자원의 자리에서 자아가 새겨져요. 변혁을 거치는 결이에요',
  9: '확장·믿음·먼 여행에서 자기를 발견해요. 큰 그림이 곧 정체성이에요',
  10: '사회 무대와 직업이 자아의 정점이에요. 공적인 자리에서 당신의 모습이 가장 또렷해져요',
  11: '커뮤니티와 미래 비전 안에서 자기를 풀어내요. 친구와 큰 그룹이 정체성의 거울이에요',
  12: '내면·은둔·영성의 자리에서 자아가 흐려졌다가 깊어져요. 보이지 않는 자리에서 빛나는 결이에요',
}

const MOON_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '감정이 표면에 그대로 드러나요. 본인의 기분이 곧 첫인상이 돼요',
  2: '자원과 소유 안에서 정서적 안전을 찾아요. 손에 잡히는 것이 마음을 채워줘요',
  3: '대화와 학습이 정서의 안식처예요. 말로 마음을 풀어내는 스타일이에요',
  4: '뿌리와 가정이 정서의 토대예요. 집과 가족 안에서 마음이 안전해져요',
  5: '창조와 놀이로 감정이 풀려요. 표현이 곧 정서 회복이에요',
  6: '일상의 루틴과 돌봄에서 마음의 안정을 찾아요. 작은 일상을 챙기는 스타일이에요',
  7: '관계 안에서 정서가 비춰져요. 파트너를 통해 자기 마음을 알게 돼요',
  8: '강렬한 변화·심층 결합에서 정서가 깊어져요. 위기를 통해 마음이 단단해져요',
  9: '신념과 큰 그림이 정서의 안식처예요. 여행과 배움에서 마음이 자유로워져요',
  10: '사회적 성취와 인정이 정서와 연결돼요. 평판이 마음을 흔들어요',
  11: '친구와 커뮤니티가 정서의 안전망이에요. 무리 속에서 마음이 채워져요',
  12: '고독과 영성에서 정서의 본질을 만나요. 보이지 않는 자리에서 깊어지는 스타일이에요',
}

const SUN_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Self-expression is most authentic when you put your whole self on display.',
  2: 'Personal resources and tangible values are the channel for self-expression.',
  3: 'You shine through language, learning, and short-distance communication.',
  4: 'Identity hardens inside roots and home, often away from the public eye.',
  5: 'Creativity, romance, and play are where your selfhood radiates most.',
  6: 'You express selfhood through service, daily work, and refining details.',
  7: 'Partnership mirrors identity — selfhood sharpens in one-on-one encounters.',
  8: 'Selfhood is forged in deep transformations and shared resources.',
  9: 'You find yourself through expansion, belief, and long-distance journeys.',
  10: 'The public stage is where your identity peaks — you shine through career and reputation.',
  11: 'Community and future-vision become the canvas for your selfhood.',
  12: 'Selfhood dissolves and deepens in solitude, retreat, and spirit.',
}

const MOON_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Your emotions sit on the surface — feelings become your first impression.',
  2: 'Tangible resources and possessions are how you feel emotionally safe.',
  3: 'Conversation and learning are the safe-house for your feelings.',
  4: 'Home and roots are the bedrock of emotional safety.',
  5: 'You discharge emotion through creativity and play — expression is restoration.',
  6: 'Daily routine and care-taking ground your feelings.',
  7: 'Emotion mirrors through relationships — you discover yourself in a partner.',
  8: 'Intense change and deep merging deepen the texture of your feelings.',
  9: 'Belief and long horizons are emotional refuge — travel and study set you free.',
  10: 'Public achievement and reputation are emotionally entangled.',
  11: 'Friends and community are your emotional safety net.',
  12: 'Solitude and spirit are where your emotional essence lives.',
}

// Mercury × house — 사고·말이 어디 무대에서 펼쳐지는지
const MERCURY_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '말과 사고가 정체성 자체로 드러나는 스타일이에요',
  2: '실용적 사고가 자원의 흐름을 만드는 스타일이에요',
  3: '소통과 짧은 학습이 본인의 핵심이에요',
  4: '가정·뿌리 안에서 사고가 차분히 다듬어지는 스타일이에요',
  5: '창의적 표현과 즐거운 학습이 사고이에요',
  6: '일상의 분석·관리에서 명민함이 빛나는 스타일이에요',
  7: '대화와 협력 안에서 사고가 정리되는 스타일이에요',
  8: '심층 연구·심리·재무 분석이 당신의 결이에요',
  9: '큰 그림·철학·국제 시야가 사고이에요',
  10: '공적 자리에서 말과 사고가 평판이 되는 스타일이에요',
  11: '네트워크와 미래 비전 안에서 아이디어가 풀리는 스타일이에요',
  12: '내면 사유와 명상에서 깊은 통찰이 열리는 스타일이에요',
}

const MERCURY_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Speech and thinking are part of your identity itself.',
  2: 'Practical thinking shapes how resources flow.',
  3: 'Communication and short-form learning are core to you.',
  4: 'Inside home and roots, thinking quietly refines itself.',
  5: 'Creative expression and joyful learning carry your thought.',
  6: 'Sharp analysis shines in daily management and service.',
  7: 'Thinking organises itself through dialogue and partnership.',
  8: 'Depth research, psychology and finance are most authentic for your mind.',
  9: 'Big picture, philosophy, and international scope drive your thinking.',
  10: 'On the public stage, your speech and thought become reputation.',
  11: 'Networks and future-vision unlock your ideas.',
  12: 'Inner reflection and meditation open the deepest insight.',
}

// Venus × house — 끌림·미감이 어디 무대에서 펼쳐지는지
const VENUS_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '매력이 첫인상으로 그대로 드러나는 스타일이에요',
  2: '소유와 감각이 미감의 토대이에요',
  3: '대화와 학습 안에서 끌림이 시작되는 스타일이에요',
  4: '가정·뿌리가 미감과 안식의 자리이에요',
  5: '창조와 연애가 미감의 정점이에요',
  6: '일상 챙김과 작은 봉사 안에서 사랑이 풀리는 스타일이에요',
  7: '관계와 파트너십이 정체성의 거울이에요',
  8: '깊은 결합과 공유 자원에서 가치가 만들어지는 스타일이에요',
  9: '먼 곳·다른 문화 안에서 사랑이 깨어나는 스타일이에요',
  10: '공적 자리에서 매력과 미감이 자산이 되는 스타일이에요',
  11: '커뮤니티와 친구가 사랑의 통로이에요',
  12: '내면·은둔 안에서 깊은 사랑이 자라는 스타일이에요',
}

const VENUS_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Magnetism radiates through first impression itself.',
  2: 'Possessions and the senses are the bedrock of beauty.',
  3: 'Attraction begins through dialogue and learning.',
  4: 'Home and roots are the chamber of beauty and rest.',
  5: 'Creation and romance are where beauty peaks.',
  6: 'Love unfolds through daily care and small service.',
  7: 'Partnership mirrors identity — love is the central relationship.',
  8: 'Deep merging and shared resources are where value is forged.',
  9: 'Love awakens in distant places and other cultures.',
  10: 'In public, charm and beauty become an asset.',
  11: 'Community and friends are the channel of love.',
  12: 'Inside solitude and retreat, the deepest love grows.',
}

// Mars × house — 행동·욕망이 어디 무대에서 펼쳐지는지
const MARS_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '자기 자신을 던지는 것이 행동의 핵심이에요',
  2: '자원·소유를 쌓는 행동에서 욕망이 풀리는 스타일이에요',
  3: '말과 학습을 추진하는 자리에서 자기 결이 살아나는 스타일이에요',
  4: '가정·뿌리를 지키는 행동이 욕망이에요',
  5: '창조·연애의 자리에서 욕망이 폭발하는 스타일이에요',
  6: '일상 노동·운동·반복 작업에서 추진력이 풀리는 스타일이에요',
  7: '관계와 파트너십 안에서 욕망이 비춰지는 스타일이에요',
  8: '심층 변화·공유 자원·위기에서 추진력이 풀리는 스타일이에요',
  9: '여행·확장·학문 추진에서 자기 결이 살아나는 스타일이에요',
  10: '공적 자리·커리어 추진에서 욕망이 가장 또렷해져요',
  11: '커뮤니티·미래 비전을 위한 행동이 본인이에요',
  12: '뒤에서·내면에서 조용히 행동하, 보이지 않는 추진',
}

const MARS_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'You act by throwing your whole self in.',
  2: 'Desire unfolds through building resources and possessions.',
  3: 'You shine when pushing speech and learning forward.',
  4: 'Protecting home and roots is the grain of desire.',
  5: 'Creation and romance are where desire bursts open.',
  6: 'Drive unfolds in daily work, exercise, and repetition.',
  7: 'Desire mirrors in partnership and one-on-one engagement.',
  8: 'Drive activates in deep change, shared resources, and crisis.',
  9: 'Travel, expansion, and study are where authenticity comes alive.',
  10: 'On the public stage, desire becomes most distinct.',
  11: 'Action toward community and future-vision is your grain.',
  12: 'You act quietly from behind — an unseen drive.',
}

// Jupiter × house — 확장·기회·신앙이 어디 무대에서 펼쳐지는지
const JUPITER_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '자기 자신·정체성에 풍요와 자신감이 깃드는 자리, 본인이 곧 기회의 통로이에요',
  2: '자원·소유·수입의 길이 넉넉히 열리, 가치가 풍성하게 쌓이는 자리',
  3: '학습·소통·이웃과의 교류에서 기회가 트이, 말과 글이 자산이 되는 자리',
  4: '가정·뿌리·부동산이 풍요의 무대이고, 안에서부터 크게 자라는 자리',
  5: '창작·연애·자녀의 자리에서 행운이 가장 또렷해져요, 표현이 풍요로 이어지는 자리',
  6: '일상의 노동·건강 관리에서 의미가 커지, 작은 봉사가 큰 자산이 되는 자리',
  7: '관계·파트너십이 확장의 통로이고, 사람을 통해 세계가 넓어지는 자리',
  8: '심층 변화·공유 자원에서 큰 기회가 열리, 위기 뒤에 풍요가 따라오는 자리',
  9: '먼 곳·학문·믿음에서 자기 결이 가장 크게 펼쳐지, 확장이 곧 정체성인 자리',
  10: '사회 무대·커리어가 풍요의 정점이고, 공적 성취가 그대로 자산이 되는 자리',
  11: '커뮤니티·미래 비전이 기회의 통로이고, 친구와 그룹에서 풍요가 들어오는 자리',
  12: '내면·영성·은둔에서 큰 의미가 자라, 보이지 않는 곳에서 풍요가 익는 자리',
}

const JUPITER_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Abundance and confidence sit in your identity — you are the channel for opportunity.',
  2: 'Resources, possessions, and income open up generously.',
  3: 'Opportunity opens through learning, speech, and local exchange — words become an asset.',
  4: 'Home, roots, and real estate are the stage for abundance — you grow from within.',
  5: 'Luck shines brightest in creativity, romance, and play — expression turns into plenty.',
  6: 'Meaning grows in daily work and health care — small service becomes a large asset.',
  7: 'Partnership is the channel of expansion — your world widens through people.',
  8: 'Big opportunity opens through deep change and shared resources — abundance follows the crisis.',
  9: 'You unfold most fully in distant places, study, and belief — expansion is identity itself.',
  10: 'Public stage and career are the peak of abundance — achievement becomes the asset.',
  11: 'Community and future-vision are the channel — friends and groups bring the windfall.',
  12: 'Large meaning matures in solitude and spirit — abundance ripens unseen.',
}

// Saturn × house — 구조·책임·시간이 어디 무대에서 펼쳐지는지
const SATURN_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '자기 자신·정체성에 무게가 실리고, 일찍부터 어른의 옷을 입는 자리',
  2: '자원·소유·가치 위에 책임이 얹히, 천천히 단단해지는 자리',
  3: '소통·학습이 단련을 거치, 말과 사고에 신중함이 자리잡는 스타일이에요',
  4: '가정·뿌리에 무게와 책임이 깔리, 안에서부터 단단해져야 하는 자리',
  5: '창작·연애·자녀의 자리에서 시험이 따라오, 표현이 책임으로 다듬어지는 자리',
  6: '일상·노동·건강의 자리에서 꾸준함이 빛나, 루틴이 곧 구조인 자리',
  7: '관계 안에서 책임과 시간이 시험대이고, 오래 견디는 만남이 본인을 빚는 자리',
  8: '심층 변화·공유 자원에서 깊은 책임이 쌓이, 위기와 마주해 단단해지는 자리',
  9: '신념·학문·먼 곳에서 단련이 따라오, 천천히 익히는 진리의 자리',
  10: '커리어·사회 무대가 본인의 정점이자 시험대이고, 평판이 곧 구조인 자리',
  11: '커뮤니티·미래 비전에 책임이 따라오, 그룹 안에서 어른 역할이 자리잡는 스타일이에요',
  12: '내면의 그림자·고독에서 깊은 단련이 일어나, 보이지 않는 무게를 짊어지는 자리',
}

const SATURN_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Weight sits on identity itself — you wear adult clothes early.',
  2: 'Responsibility lies on resources and value — strength accumulates slowly.',
  3: 'Speech and learning pass through discipline — thought grows careful.',
  4: 'Home and roots carry weight and duty — strength must build from within.',
  5: 'Tests follow creativity, romance, and children — expression is refined by duty.',
  6: 'Steadiness shines in daily work and health — routine is the very structure.',
  7: 'Responsibility and time are the test inside relationship — long endurance shapes you.',
  8: 'Deep duty accumulates around shared resources — strength forges through crisis.',
  9: 'Discipline follows belief, study, and distance — truth ripens slowly.',
  10: 'Career and public stage are both peak and trial — reputation is the very structure.',
  11: 'Duty follows community and vision — the adult role settles inside the group.',
  12: 'Deep discipline unfolds in inner shadow and solitude — you carry unseen weight.',
}

// Uranus × house — 혁신·자유·돌발이 어디 무대에서 펼쳐지는지
const URANUS_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '자기 자신을 끊임없이 새로 정의하, 정체성이 곧 파격인 자리',
  2: '자원·가치에 파격이 따라오, 새로운 방식으로 손에 잡는 자리',
  3: '사고·소통에 돌발과 영감이 깃드, 한 박자 빠른 통찰의 자리',
  4: '가정·뿌리가 보통과 달라요, 떠나고 다시 만드는 자리',
  5: '창작·연애의 자리에서 자유가 가장 또렷해져요, 틀을 벗는 표현의 자리',
  6: '일상·노동의 자리에서 혁신이 풀리, 새로운 방식의 작업이 본인이에요',
  7: '관계가 보통과 달라요, 자유와 평등이 만남의 조건인 자리',
  8: '심층·금기·공유 자원에서 파격이 일어나, 변혁이 본인을 깨우는 자리',
  9: '신념·학문에 혁명이 깃드, 기존 진리를 부수고 새 길을 여는 자리',
  10: '커리어가 보통과 달라요, 새로운 직업·길을 여는 자리',
  11: '커뮤니티·비전 안에서 혁명이 펼쳐지, 미래의 그룹에 본인이 깃드는 자리',
  12: '무의식·은둔에서 돌발적 통찰이 터지, 보이지 않는 자리에서 깨어나는 스타일이에요',
}

const URANUS_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'You reinvent yourself ceaselessly — identity itself is the disruption.',
  2: 'Disruption follows resources and value — you hold things in a new way.',
  3: 'Sudden insight visits thought and speech — a beat-ahead clarity.',
  4: 'Home and roots run unconventionally — you leave and remake them.',
  5: 'Freedom shines brightest in creation and romance — expression shrugs off the frame.',
  6: 'Innovation unfolds in daily work — a new method is your grain.',
  7: 'Relationship runs unconventionally — freedom and equality are the terms.',
  8: 'Disruption strikes deep, taboo, and shared resources — transformation wakes you.',
  9: 'Revolution visits belief and study — you break old truth and open new paths.',
  10: 'Career runs unconventionally — you open a new profession or path.',
  11: 'Revolution unfolds inside community and vision — the future group hosts you.',
  12: 'Sudden insight breaks through unconscious and retreat — awakening from the unseen.',
}

// Neptune × house — 영감·환상·해체가 어디 무대에서 펼쳐지는지
const NEPTUNE_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '자기 자신이 안개·꿈처럼 흐르, 정체성이 유동적인 자리',
  2: '자원·소유의 경계가 흐려지, 가치가 영적인 방향으로 옮겨지는 자리',
  3: '소통·사고가 직관에 잠기, 말이 시처럼 흐르는 자리',
  4: '가정·뿌리에 영적 느낌이 깃들고, 집이 곧 성소가 되는 자리',
  5: '창작·연애의 자리에서 환상이 가장 짙어요, 영감이 표현으로 직접 흐르는 자리',
  6: '일상·건강의 경계가 모호해지, 돌봄이 영적인 일이 되는 자리',
  7: '관계가 환상에 잠기, 상대를 통해 무한을 보는 자리',
  8: '심층·공유 자원이 신비에 잠기, 변혁과 영성이 같은 자리에 모이는 스타일이에요',
  9: '신념·학문이 영성에 녹, 진리가 직관으로 다가오는 자리',
  10: '커리어가 비전·예술에 잠기, 공적 자리에서 환상이 자산이 되는 스타일이에요',
  11: '커뮤니티·미래 비전이 영적이고, 큰 꿈이 그룹과 함께 흐르는 자리',
  12: '내면·은둔·영성이 본인의 본거지예요. 보이지 않는 자리에서 가장 또렷해요',
}

const NEPTUNE_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Self drifts like mist or dream — identity stays fluid.',
  2: 'The edges of resources blur — value shifts toward the spiritual.',
  3: 'Speech and thought soak in intuition — words flow like poetry.',
  4: 'Spiritual grain enters home and roots — the house becomes a sanctuary.',
  5: 'Fantasy runs thickest in creation and romance — inspiration flows straight into expression.',
  6: 'Daily life and health blur at the edges — care becomes a spiritual task.',
  7: 'Relationship steeps in fantasy — you see the infinite through a partner.',
  8: 'Depth and shared resources soak in mystery — transformation and spirit gather in one place.',
  9: 'Belief and study dissolve into spirit — truth arrives through intuition.',
  10: 'Career steeps in vision and art — fantasy itself becomes an asset on the public stage.',
  11: 'Community and future-vision turn spiritual — large dreams flow with the group.',
  12: 'Inner life, retreat, and spirit are your home — sharpest where unseen.',
}

// Pluto × house — 변혁·심층·권력이 어디 무대에서 펼쳐지는지
const PLUTO_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '있는 그대로의 자신을 다시 빚는 스타일, 정체성이 죽고 다시 태어나는 자리',
  2: '자원·소유·가치의 격변을 거치, 가치 체계가 통째로 새로 쓰이는 자리',
  3: '사고·소통이 깊이 변혁되, 말 한 마디에 권력이 실리는 자리',
  4: '가정·뿌리의 격변을 거치, 가족 패턴이 통째로 다시 짜이는 자리',
  5: '창작·연애의 자리에서 강렬함이 가장 또렷해져요, 표현이 곧 변혁인 자리',
  6: '일상·건강이 변혁의 자리이고, 작은 루틴 안에서 깊은 권력이 풀리는 스타일이에요',
  7: '관계의 격변을 통해 본인이 다시 빚어지, 상대가 곧 거울인 자리',
  8: '심층·공유 자원이 본인의 정체성 자체이고, 변혁이 본거지인 자리',
  9: '신념·학문이 변혁의 자리이고, 진리가 죽고 다시 태어나는 자리',
  10: '커리어·권력이 정점에 닿는 자리, 사회 무대에서 있는 그대로 다시 빚어지는 자리',
  11: '커뮤니티·집단의 변혁을 이끄, 그룹의 권력 구조가 본인 손에 흐르는 자리',
  12: '무의식의 변혁이 일어나, 보이지 않는 자리에서 죽고 다시 태어나는 스타일이에요',
}

const PLUTO_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'You reshape selfhood entirely — identity dies and is born again.',
  2: 'Upheaval moves through resources and value — the value system is rewritten.',
  3: 'Thought and speech transform deeply — power rides on a single word.',
  4: 'Upheaval moves through home and roots — family patterns are restitched.',
  5: 'Intensity shines brightest in creation and romance — expression itself is transformation.',
  6: 'Daily life and health are the site of transformation — deep power unfolds inside small routine.',
  7: 'You are remade through upheaval in relationship — the partner is the mirror.',
  8: 'Depth and shared resources are identity itself — transformation is the home stage.',
  9: 'Belief and study are the site of transformation — truth dies and is reborn.',
  10: 'Career and power reach the peak — you are remade entirely on the public stage.',
  11: 'You lead transformation in community — the group power structure flows through you.',
  12: 'Transformation unfolds in the unconscious — death and rebirth happen unseen.',
}

const PLANET_HOUSE_LINES = {
  Sun: { ko: SUN_HOUSE_LINES, en: SUN_HOUSE_LINES_EN },
  Moon: { ko: MOON_HOUSE_LINES, en: MOON_HOUSE_LINES_EN },
  Mercury: { ko: MERCURY_HOUSE_LINES, en: MERCURY_HOUSE_LINES_EN },
  Venus: { ko: VENUS_HOUSE_LINES, en: VENUS_HOUSE_LINES_EN },
  Mars: { ko: MARS_HOUSE_LINES, en: MARS_HOUSE_LINES_EN },
  Jupiter: { ko: JUPITER_HOUSE_LINES, en: JUPITER_HOUSE_LINES_EN },
  Saturn: { ko: SATURN_HOUSE_LINES, en: SATURN_HOUSE_LINES_EN },
  Uranus: { ko: URANUS_HOUSE_LINES, en: URANUS_HOUSE_LINES_EN },
  Neptune: { ko: NEPTUNE_HOUSE_LINES, en: NEPTUNE_HOUSE_LINES_EN },
  Pluto: { ko: PLUTO_HOUSE_LINES, en: PLUTO_HOUSE_LINES_EN },
} as const

export type PlanetHouseKey = keyof typeof PLANET_HOUSE_LINES

/**
 * One-line bilingual narrative for a planet × house. Empty when planet
 * is unsupported or house is out of range. Domain-agnostic — callers
 * compose their own domain flavor around the returned string.
 *
 * 12 houses × 10 planets × 2 languages = 240 distinct lines.
 */
export function planetHouseLine(
  planet: PlanetHouseKey | string,
  house: number | undefined,
  lang: 'ko' | 'en' = 'ko'
): string {
  if (!house || house < 1 || house > 12) return ''
  const planetData = PLANET_HOUSE_LINES[planet as PlanetHouseKey]
  if (!planetData) return ''
  return planetData[lang][house as HouseNumber] ?? ''
}
