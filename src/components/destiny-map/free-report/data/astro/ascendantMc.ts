/**
 * Ascendant(ASC, 상승점) / Midheaven(MC, 천정) 해석.
 *
 * /lib/astrology/foundation 의 `Chart.ascendant` / `Chart.mc` 출력.
 * ASC = 외적 이미지·페르소나·인생 무대,
 * MC = 사회적 명예·커리어·아버지·세상에 보여지는 모습.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export interface AscMcEntry {
  short: BilingualText;
  detail: BilingualText;
  practical: BilingualText;
}

export const ASCENDANT_DETAILED: Record<ZodiacSign, AscMcEntry> = {
  aries: {
    short: { ko: '강하고 직선적인 첫인상.', en: 'Strong, direct first impression.' },
    detail: { ko: '먼저 움직이고 먼저 말하는 사람으로 보여요.', en: 'Seen as the one who moves and speaks first.' },
    practical: { ko: '첫 만남에서 리더처럼 보이도록 자세를 가다듬으세요.', en: 'Carry yourself as a leader on first meetings.' },
  },
  taurus: {
    short: { ko: '안정적이고 차분한 첫인상.', en: 'Stable, calm first impression.' },
    detail: { ko: '신뢰감과 품격이 자연스럽게 흘러나와요.', en: 'Trust and dignity flow naturally.' },
    practical: { ko: '서두르지 않는 페이스가 곧 매력이에요.', en: 'Unhurried pace is itself charm.' },
  },
  gemini: {
    short: { ko: '재치 있고 호기심 많은 첫인상.', en: 'Witty, curious first impression.' },
    detail: { ko: '말 잘하고 사교적이며 자유로워 보여요.', en: 'Articulate, social, looks free.' },
    practical: { ko: '여러 주제를 가볍게 다룰 수 있는 자기 라이브러리를 키우세요.', en: 'Build a personal library that handles many topics lightly.' },
  },
  cancer: {
    short: { ko: '따뜻하고 보호적인 첫인상.', en: 'Warm, protective first impression.' },
    detail: { ko: '편안하고 가까이 다가가기 쉬운 사람으로 보여요.', en: 'Seen as comfortable and approachable.' },
    practical: { ko: '돌봐주는 사람이라는 인상을 자기 자원으로 쓰세요.', en: 'Use your caretaker image as a resource.' },
  },
  leo: {
    short: { ko: '화려하고 자신감 있는 첫인상.', en: 'Glamorous, confident first impression.' },
    detail: { ko: '존재감이 크고 시선을 끄는 사람으로 보여요.', en: 'Big presence — draws gazes.' },
    practical: { ko: '주목받는 자리에 자기를 두는 것을 두려워하지 마세요.', en: 'Do not fear stepping into the spotlight.' },
  },
  virgo: {
    short: { ko: '깔끔하고 분석적인 첫인상.', en: 'Neat, analytical first impression.' },
    detail: { ko: '신중하고 도움 되는 사람으로 보여요.', en: 'Seen as careful and helpful.' },
    practical: { ko: '디테일과 정돈을 자기 브랜드로 가다듬으세요.', en: 'Polish detail and tidiness as your brand.' },
  },
  libra: {
    short: { ko: '우아하고 친절한 첫인상.', en: 'Elegant, kind first impression.' },
    detail: { ko: '예쁘게 말하고 균형 잡힌 사람으로 보여요.', en: 'Seen as speaking beautifully and balanced.' },
    practical: { ko: '아름다움과 외교 감각을 자기 자산으로 활용하세요.', en: 'Use beauty and diplomatic sense as assets.' },
  },
  scorpio: {
    short: { ko: '강렬하고 신비로운 첫인상.', en: 'Intense, mysterious first impression.' },
    detail: { ko: '깊이가 있고 함부로 다가가기 어려운 사람으로 보여요.', en: 'Seen as deep — not easily approached.' },
    practical: { ko: '신비로움을 일부러 풀지 마세요 — 그 자체가 힘이에요.', en: 'Do not unwrap the mystery on purpose — it is its own power.' },
  },
  sagittarius: {
    short: { ko: '자유롭고 낙천적인 첫인상.', en: 'Free, optimistic first impression.' },
    detail: { ko: '활달하고 시야가 넓은 사람으로 보여요.', en: 'Seen as lively with a wide view.' },
    practical: { ko: '의미와 비전을 말로 자주 표현하세요.', en: 'Voice meaning and vision often.' },
  },
  capricorn: {
    short: { ko: '진지하고 책임감 있는 첫인상.', en: 'Serious, responsible first impression.' },
    detail: { ko: '믿음직하고 성숙해 보이는 사람이에요.', en: 'Reliable and mature-looking.' },
    practical: { ko: '진지함을 자기 격으로 만들고 농담은 의도적으로 섞으세요.', en: 'Make seriousness your standing — add humor intentionally.' },
  },
  aquarius: {
    short: { ko: '독특하고 진보적인 첫인상.', en: 'Unique, progressive first impression.' },
    detail: { ko: '남들과 다른 색을 가진 사람으로 보여요.', en: 'Seen as having a color different from others.' },
    practical: { ko: '다름을 숨기지 말고 자기 브랜드로 가다듬으세요.', en: 'Do not hide your difference — refine it into a brand.' },
  },
  pisces: {
    short: { ko: '부드럽고 감성적인 첫인상.', en: 'Soft, emotional first impression.' },
    detail: { ko: '따뜻하고 예술적인 사람으로 보여요.', en: 'Seen as warm and artistic.' },
    practical: { ko: '경계가 흐려지지 않게 자기 스케줄을 명확히 두세요.', en: 'Keep clear personal schedule so boundaries do not blur.' },
  },
};

export const MIDHEAVEN_DETAILED: Record<ZodiacSign, AscMcEntry> = {
  aries: {
    short: { ko: '커리어가 개척과 리더십.', en: 'Career is pioneering and leadership.' },
    detail: { ko: '새 분야의 1번 주자가 되는 흐름이에요.', en: 'You become the #1 runner in a new field.' },
    practical: { ko: '제일 먼저 손드는 사람으로 자기를 위치시키세요.', en: 'Position yourself as the first to raise a hand.' },
  },
  taurus: {
    short: { ko: '커리어가 안정·자산·감각 중심.', en: 'Career centers on stability, assets, senses.' },
    detail: { ko: '쌓아가는 부와 품격이 사회적 자산이 돼요.', en: 'Built-up wealth and dignity become social assets.' },
    practical: { ko: '한 우물을 깊게 파는 전략을 유지하세요.', en: 'Stick to a single deep-well strategy.' },
  },
  gemini: {
    short: { ko: '커리어가 소통·미디어·이동 중심.', en: 'Career centers on communication, media, movement.' },
    detail: { ko: '글·말·다양한 일이 명함이 돼요.', en: 'Writing, speaking, varied work become your card.' },
    practical: { ko: '여러 채널에 자기 이름을 노출시키세요.', en: 'Expose your name across multiple channels.' },
  },
  cancer: {
    short: { ko: '커리어가 돌봄·가족·식·뿌리 중심.', en: 'Career centers on caring, family, food, roots.' },
    detail: { ko: '사람을 돌보는 일이 명성이 돼요.', en: 'Caring for people becomes your renown.' },
    practical: { ko: '돌봄의 기술을 전문성으로 다듬으세요.', en: 'Polish caregiving into expertise.' },
  },
  leo: {
    short: { ko: '커리어가 무대·표현·창작 중심.', en: 'Career centers on stage, expression, creation.' },
    detail: { ko: '존재 자체가 브랜드가 되는 흐름이에요.', en: 'Your presence itself becomes the brand.' },
    practical: { ko: '자기 이름·얼굴을 작품으로 다듬으세요.', en: 'Polish your name and face into the work.' },
  },
  virgo: {
    short: { ko: '커리어가 전문성·시스템·헬스케어 중심.', en: 'Career centers on expertise, systems, healthcare.' },
    detail: { ko: '정밀하게 다듬은 결과물이 명함이 돼요.', en: 'Finely refined output becomes your card.' },
    practical: { ko: '체크리스트와 시스템을 자기 무기로 만드세요.', en: 'Make checklists and systems your weapons.' },
  },
  libra: {
    short: { ko: '커리어가 관계·외교·미·법 중심.', en: 'Career centers on relations, diplomacy, beauty, law.' },
    detail: { ko: '연결과 조율이 자기 사회적 자산이 돼요.', en: 'Connection and orchestration become your social asset.' },
    practical: { ko: '협상력과 미적 감각을 동시에 키우세요.', en: 'Grow negotiation skill and aesthetic sense together.' },
  },
  scorpio: {
    short: { ko: '커리어가 심리·금융·변환·금기 중심.', en: 'Career centers on psyche, finance, transformation, taboos.' },
    detail: { ko: '깊이와 비밀을 다루는 일에 천직이 있어요.', en: 'Calling in work that handles depth and secrets.' },
    practical: { ko: '겉으로 드러나지 않는 깊은 전문성을 쌓으세요.', en: 'Build deep expertise that is not externally visible.' },
  },
  sagittarius: {
    short: { ko: '커리어가 교육·해외·신념·법 중심.', en: 'Career centers on education, abroad, belief, law.' },
    detail: { ko: '큰 그림을 전파하는 자리가 천직이에요.', en: 'A calling in roles broadcasting the big picture.' },
    practical: { ko: '국경을 넘는 시야를 자기 자산으로 키우세요.', en: 'Grow a border-crossing vision as your asset.' },
  },
  capricorn: {
    short: { ko: '커리어가 권위·전통·정상 중심.', en: 'Career centers on authority, tradition, summit.' },
    detail: { ko: '꾸준히 올라 정상에 자기 자리를 만들어요.', en: 'Steadily climbs and carves a seat at the summit.' },
    practical: { ko: '5년·10년 단위 로드맵을 끊임없이 갱신하세요.', en: 'Constantly update 5- and 10-year roadmaps.' },
  },
  aquarius: {
    short: { ko: '커리어가 혁신·기술·공동체 중심.', en: 'Career centers on innovation, tech, community.' },
    detail: { ko: '미래를 먼저 보는 자리에 천직이 있어요.', en: 'Calling: roles that see the future first.' },
    practical: { ko: '다름과 혁신을 자기 명함으로 만드세요.', en: 'Make difference and innovation your card.' },
  },
  pisces: {
    short: { ko: '커리어가 예술·치유·영성 중심.', en: 'Career centers on art, healing, spirituality.' },
    detail: { ko: '경계 너머의 것을 다루는 일이 천직이에요.', en: 'Calling: work that handles what is beyond boundaries.' },
    practical: { ko: '영감을 작업으로 묶는 루틴을 만들어두세요.', en: 'Build a routine that binds inspiration into work.' },
  },
};
