/**
 * Combined Narratives for Past Life Analysis
 * 격국 + 노스노드 + 토성 + 일간 조합으로 개인화된 전생 스토리 생성
 * 무료 버전용 - 최소 20줄 이상의 상세한 전생 이야기 제공
 */

import type { GeokgukType, HouseNumber, HeavenlyStem } from './types';

// 격국별 전생 직업/역할 상세 변형 (노스노드 하우스에 따른 변형)
export const GEOKGUK_ROLE_VARIATIONS: Record<GeokgukType, Record<number, { ko: string; en: string }>> = {
  siksin: {
    1: { ko: "자신만의 독특한 예술 세계를 구축한 고독한 천재 화가", en: "solitary genius painter who built a unique artistic world" },
    2: { ko: "왕실의 후원을 받아 부를 축적한 궁중 공예가", en: "royal craftsman who accumulated wealth through court patronage" },
    3: { ko: "마을마다 이야기를 전하며 다닌 방랑 음유시인", en: "wandering bard who traveled village to village sharing stories" },
    4: { ko: "가문의 전통 요리법을 지킨 대가족의 요리사", en: "family chef who preserved ancestral culinary traditions" },
    5: { ko: "무대 위에서 관객을 매료시킨 전설적인 배우", en: "legendary actor who captivated audiences on stage" },
    6: { ko: "수도원에서 성가를 작곡한 헌신적인 수도승", en: "devoted monk who composed sacred music in the monastery" },
    7: { ko: "파트너와 함께 예술 운동을 이끈 혁신적 화가", en: "innovative painter who led art movements with a partner" },
    8: { ko: "죽음과 재생의 신비를 표현한 상징주의 조각가", en: "symbolist sculptor who expressed mysteries of death and rebirth" },
    9: { ko: "세계를 여행하며 다양한 문화를 그림에 담은 탐험 화가", en: "explorer painter who captured diverse cultures while traveling the world" },
    10: { ko: "황제의 초상화를 그린 최고 권위의 궁정 화가", en: "supreme court painter who painted imperial portraits" },
    11: { ko: "예술가 길드를 이끌며 후진을 양성한 마스터", en: "master who led the artists' guild and trained future generations" },
    12: { ko: "은둔하며 영적 세계를 캔버스에 담은 신비주의 화가", en: "reclusive mystic painter who captured spiritual realms on canvas" },
  },
  sanggwan: {
    1: { ko: "혼자서 새로운 사상을 전파한 선구적 사상가", en: "pioneering thinker who spread new ideas alone" },
    2: { ko: "웅변으로 재산을 모은 전설적인 변호사", en: "legendary lawyer who amassed wealth through eloquence" },
    3: { ko: "책을 쓰고 강연하며 지식을 전파한 계몽 철학자", en: "enlightenment philosopher who wrote books and lectured" },
    4: { ko: "가문의 명예를 위해 싸운 열정적인 변론가", en: "passionate advocate who fought for family honor" },
    5: { ko: "무대 위에서 수천 명을 사로잡은 카리스마 연설가", en: "charismatic orator who captivated thousands on stage" },
    6: { ko: "노동자의 권리를 위해 헌신한 사회 개혁가", en: "social reformer devoted to workers' rights" },
    7: { ko: "외교 협상에서 빛난 뛰어난 협상가", en: "brilliant negotiator who shone in diplomatic negotiations" },
    8: { ko: "금기를 깨뜨리고 진실을 폭로한 급진적 언론인", en: "radical journalist who broke taboos and exposed truths" },
    9: { ko: "세계를 돌며 새로운 사상을 전파한 순회 강연자", en: "itinerant lecturer who spread new ideas around the world" },
    10: { ko: "정치 무대에서 국가의 방향을 바꾼 혁명 지도자", en: "revolutionary leader who changed the nation's course" },
    11: { ko: "미래 비전을 제시하며 대중을 이끈 사회운동가", en: "social activist who led the masses with future visions" },
    12: { ko: "감옥에서도 글을 써 사람들에게 희망을 준 저항 작가", en: "resistance writer who gave hope through writings even from prison" },
  },
  jeonggwan: {
    1: { ko: "스스로 법을 만들고 집행한 독립적인 통치자", en: "independent ruler who created and enforced laws" },
    2: { ko: "국고를 관리하며 왕국의 부를 키운 재무장관", en: "finance minister who managed treasury and grew the kingdom's wealth" },
    3: { ko: "법전을 편찬하고 기록한 학자 관료", en: "scholar-official who compiled and recorded law codes" },
    4: { ko: "영지를 다스리며 백성을 보살핀 지방 영주", en: "local lord who governed the domain and cared for subjects" },
    5: { ko: "축제와 행사를 관장한 왕실 의전관", en: "royal master of ceremonies who oversaw festivals and events" },
    6: { ko: "백성의 건강과 복지를 책임진 지방 관리", en: "local administrator responsible for people's health and welfare" },
    7: { ko: "국가 간 조약을 체결한 외교 대신", en: "diplomatic minister who concluded treaties between nations" },
    8: { ko: "반역자를 심판하고 국가 기밀을 다룬 비밀 재판관", en: "secret judge who tried traitors and handled state secrets" },
    9: { ko: "외국을 시찰하고 제도를 도입한 개혁 관료", en: "reform official who inspected foreign countries and introduced systems" },
    10: { ko: "왕을 보좌하며 국정을 총괄한 최고 재상", en: "supreme chancellor who assisted the king and oversaw state affairs" },
    11: { ko: "의회를 이끌며 입법을 주도한 원로원 의장", en: "senate president who led parliament and spearheaded legislation" },
    12: { ko: "은밀히 국가를 수호한 정보기관의 수장", en: "head of intelligence agency who secretly protected the nation" },
  },
  pyeongwan: {
    1: { ko: "홀로 전장을 누빈 전설적인 용병", en: "legendary mercenary who roamed battlefields alone" },
    2: { ko: "전리품으로 부를 축적한 노련한 장군", en: "seasoned general who accumulated wealth through war spoils" },
    3: { ko: "전술 교본을 쓴 군사 이론가", en: "military theorist who wrote tactical manuals" },
    4: { ko: "고향을 지킨 용맹한 의병장", en: "brave resistance leader who protected the homeland" },
    5: { ko: "검술 대회에서 명성을 얻은 검객", en: "swordsman who gained fame in martial tournaments" },
    6: { ko: "부상병을 돌보며 싸운 군의관", en: "military doctor who fought while caring for wounded" },
    7: { ko: "적과 협상하여 평화를 이끈 협상 장군", en: "negotiating general who achieved peace through enemy talks" },
    8: { ko: "적진에 잠입하여 정보를 수집한 첩보 요원", en: "spy who infiltrated enemy lines to gather intelligence" },
    9: { ko: "먼 땅을 정복하고 영토를 넓힌 원정 장군", en: "expedition general who conquered distant lands" },
    10: { ko: "군대를 총괄하며 전쟁을 지휘한 대원수", en: "supreme commander who oversaw armies and directed wars" },
    11: { ko: "병사들의 권익을 위해 싸운 개혁 장교", en: "reform officer who fought for soldiers' rights" },
    12: { ko: "은밀히 작전을 수행한 그림자 부대의 대장", en: "captain of shadow forces who conducted covert operations" },
  },
  jeongjae: {
    1: { ko: "자수성가하여 부를 일군 독립적인 사업가", en: "independent entrepreneur who built wealth from scratch" },
    2: { ko: "땅과 자산을 불려 대부호가 된 투자가", en: "investor who became a tycoon by growing land and assets" },
    3: { ko: "상업 기록을 남기고 후진을 양성한 상인 학자", en: "merchant scholar who kept trade records and trained successors" },
    4: { ko: "가문의 사업을 이어받아 확장한 가업 계승자", en: "family business heir who expanded ancestral enterprise" },
    5: { ko: "화려한 축제를 후원한 예술 후원자 상인", en: "merchant patron who sponsored grand festivals" },
    6: { ko: "직원 복지에 힘쓴 양심적인 고용주", en: "conscientious employer who devoted to worker welfare" },
    7: { ko: "동업자와 함께 무역망을 구축한 공동 창업자", en: "co-founder who built trade networks with partners" },
    8: { ko: "위기를 기회로 바꿔 재산을 불린 위기 투자가", en: "crisis investor who turned disasters into opportunities" },
    9: { ko: "해외 무역로를 개척한 개척자 상인", en: "pioneer merchant who established overseas trade routes" },
    10: { ko: "왕실에 물자를 납품한 어용 상인", en: "royal purveyor who supplied goods to the court" },
    11: { ko: "상인 길드를 조직하고 이끈 조합장", en: "guild master who organized and led merchant associations" },
    12: { ko: "익명으로 자선을 베푼 비밀 기부자", en: "anonymous benefactor who gave charity in secret" },
  },
  pyeonjae: {
    1: { ko: "혼자 미지의 땅을 탐험한 독립 탐험가", en: "independent explorer who ventured into unknown lands alone" },
    2: { ko: "모험으로 보물을 찾아 부자가 된 보물 사냥꾼", en: "treasure hunter who became rich through adventurous finds" },
    3: { ko: "여행기를 써서 세계를 알린 여행 작가", en: "travel writer who introduced the world through travelogues" },
    4: { ko: "고향을 떠나 새 땅에 정착한 개척 이민자", en: "pioneer immigrant who left home to settle new lands" },
    5: { ko: "위험한 공연으로 관객을 놀라게 한 곡예사", en: "acrobat who amazed audiences with dangerous performances" },
    6: { ko: "오지에서 봉사하며 살았던 선교 탐험가", en: "missionary explorer who served in remote regions" },
    7: { ko: "각국을 연결하는 국제 무역상", en: "international trader connecting nations" },
    8: { ko: "밀수와 모험으로 부를 축적한 해적 상인", en: "pirate merchant who accumulated wealth through smuggling" },
    9: { ko: "세계 일주를 완수한 전설적인 항해사", en: "legendary navigator who completed circumnavigation" },
    10: { ko: "식민지를 개척하고 다스린 총독", en: "governor who pioneered and ruled colonies" },
    11: { ko: "탐험가 협회를 설립하고 후원한 모험 후원자", en: "adventure patron who founded and sponsored explorer societies" },
    12: { ko: "은밀히 움직이며 비밀 루트를 개척한 밀사", en: "secret envoy who moved covertly and pioneered hidden routes" },
  },
  jeongin: {
    1: { ko: "독자적인 학문 체계를 만든 독립 학자", en: "independent scholar who created unique academic systems" },
    2: { ko: "서원을 세우고 후학을 양성한 부유한 교육자", en: "wealthy educator who built academies and trained students" },
    3: { ko: "수많은 책을 쓰고 번역한 다작 학자", en: "prolific scholar who wrote and translated numerous books" },
    4: { ko: "가문의 학문을 전승한 가학 계승자", en: "family learning heir who transmitted ancestral scholarship" },
    5: { ko: "강연으로 대중을 사로잡은 스타 교수", en: "star professor who captivated masses through lectures" },
    6: { ko: "제자들의 삶을 헌신적으로 돌본 스승", en: "mentor who devotedly cared for students' lives" },
    7: { ko: "학자들과 토론하며 진리를 찾은 대화 철학자", en: "dialogue philosopher who found truth through scholar debates" },
    8: { ko: "금지된 지식을 탐구한 비밀 연구자", en: "secret researcher who explored forbidden knowledge" },
    9: { ko: "세계를 여행하며 지식을 모은 백과사전 편찬자", en: "encyclopedia compiler who gathered knowledge traveling the world" },
    10: { ko: "왕의 스승으로서 국정에 영향을 미친 제왕학 교사", en: "royal tutor who influenced state affairs as king's teacher" },
    11: { ko: "학문 아카데미를 설립하고 이끈 학회 회장", en: "academy president who founded and led scholarly societies" },
    12: { ko: "명상과 관조를 통해 깨달음을 얻은 은둔 현자", en: "reclusive sage who gained enlightenment through meditation" },
  },
  pyeongin: {
    1: { ko: "혼자 수행하며 초자연적 능력을 얻은 독행 수행자", en: "solitary practitioner who gained supernatural powers" },
    2: { ko: "신탁으로 부를 축적한 신전의 대신관", en: "high priest who accumulated wealth through oracles" },
    3: { ko: "예언서를 기록한 신비주의 작가", en: "mystical writer who recorded prophecies" },
    4: { ko: "가문 대대로 이어온 영매 가계의 계승자", en: "heir to generations of family mediums" },
    5: { ko: "의식과 제례로 사람들을 이끈 카리스마 사제", en: "charismatic priest who led people through rituals" },
    6: { ko: "아픈 이들을 치유한 마을의 치유사", en: "village healer who cured the sick" },
    7: { ko: "영혼과 인간 사이를 중재한 영매", en: "medium who mediated between spirits and humans" },
    8: { ko: "죽음의 비밀을 탐구한 강령술사", en: "necromancer who explored death's secrets" },
    9: { ko: "성지를 순례하며 깨달음을 얻은 구도자", en: "seeker who gained enlightenment through pilgrimage" },
    10: { ko: "왕에게 조언한 최고의 점술사", en: "supreme diviner who advised the king" },
    11: { ko: "신비주의 교단을 설립한 종교 창시자", en: "religious founder who established mystical orders" },
    12: { ko: "은밀히 수행하며 우주의 비밀에 다가간 연금술사", en: "alchemist who secretly approached cosmic secrets" },
  },
};

// 토성 하우스별 전생 시련과 극복 이야기 (상세 버전)
export const SATURN_TRIAL_NARRATIVES: Record<number, { ko: string; en: string }> = {
  1: {
    ko: `그 삶에서 당신은 자신을 표현하는 데 큰 시련을 겪었습니다. 어린 시절부터 자신이 누구인지 말하는 것조차 허락되지 않았고, 다른 사람이 정해준 정체성으로 살아야 했습니다. 당신의 외모, 행동, 심지어 꿈까지도 누군가에 의해 통제되었죠. 거울을 볼 때마다 비친 모습이 진짜 당신인지 의문이 들었고, 가면을 쓰고 살아가는 것에 지쳐갔습니다. 하지만 그 억압 속에서 당신은 진정한 자아의 소중함을 깨달았고, 이번 생에서 그것을 당당히 표현하는 법을 배우게 됩니다.`,
    en: `In that life, you faced great trials in expressing yourself. From childhood, you weren't even allowed to say who you were, having to live with an identity others defined. Your appearance, behavior, even your dreams were controlled by someone. Every time you looked in the mirror, you wondered if that reflection was really you, growing exhausted from living behind a mask. But through that suppression, you realized the preciousness of true self, and in this life you learn to express it confidently.`
  },
  2: {
    ko: `전생에서 당신은 물질적 결핍과 싸워야 했습니다. 재능이 있어도 그것으로 돈을 벌 수 없었고, 늘 경제적 불안에 시달렸습니다. 먹을 것을 걱정하며 잠들었고, 내일의 생계를 위해 자존심을 꺾어야 할 때도 많았습니다. 가족을 부양하기 위해 하고 싶은 일을 포기해야 했고, 돈이 없어서 놓친 기회들이 가슴에 한으로 남았습니다. 그 경험은 당신에게 진정한 가치가 무엇인지, 스스로 부를 창출하는 것이 얼마나 중요한지를 가르쳤습니다.`,
    en: `In your past life, you had to fight material scarcity. Though talented, you couldn't make money from it, always suffering economic anxiety. You fell asleep worrying about food, often had to swallow your pride for tomorrow's livelihood. You had to give up what you wanted to do to support family, and missed opportunities due to lack of money left lasting regret. That experience taught you what true value is and how important it is to create wealth yourself.`
  },
  3: {
    ko: `그 삶에서 당신의 목소리는 억눌려 있었습니다. 말하고 싶어도 말할 수 없었고, 배우고 싶어도 배울 기회가 없었습니다. 글을 읽지 못해 중요한 정보에서 소외되었고, 생각을 제대로 전달하지 못해 오해를 받기 일쑤였습니다. 형제자매나 가까운 이들과의 소통도 순탄치 않아, 마음을 나눌 사람 없이 외로웠습니다. 당신의 아이디어는 묻혔고, 진실은 전해지지 못했죠. 이번 생에서 당신은 그 침묵을 깨고 자유롭게 표현하는 법을 배웁니다.`,
    en: `In that life, your voice was suppressed. You couldn't speak even when you wanted to, had no opportunity to learn though you wished to. Unable to read, you were excluded from important information, and unable to properly convey thoughts, you were often misunderstood. Communication with siblings and close ones wasn't smooth either, leaving you lonely with no one to share your heart. Your ideas were buried, truths couldn't be conveyed. In this life, you learn to break that silence and express freely.`
  },
  4: {
    ko: `전생에서 당신은 안정된 가정을 갖지 못했습니다. 전쟁이나 이주로 뿌리를 내리지 못했거나, 가족 내 갈등으로 평화로운 집을 경험하지 못했습니다. 어머니의 품을 느끼지 못했거나, 아버지의 보호를 받지 못했을 수도 있습니다. 집에 돌아가도 편히 쉴 수 없었고, 어디로 가든 나그네 같은 느낌이 들었습니다. 뿌리 없는 나무처럼 바람에 흔들리며 살았죠. 그 결핍이 이번 생에서 진정한 보금자리와 내면의 평화를 만드는 동력이 됩니다.`,
    en: `In your past life, you couldn't have a stable home. Whether through war or migration you couldn't put down roots, or couldn't experience a peaceful home due to family conflicts. You may not have felt a mother's embrace or a father's protection. Even returning home, you couldn't rest easy, feeling like a wanderer wherever you went. You lived swaying in the wind like a rootless tree. That lack becomes the drive to create a true haven and inner peace in this life.`
  },
  5: {
    ko: `그 삶에서 당신의 창의성과 기쁨은 금지되었습니다. 예술을 하고 싶어도 허락되지 않았고, 즐거움을 느끼는 것조차 죄처럼 여겨졌습니다. 노래를 부르면 혼났고, 춤을 추면 경멸받았습니다. 사랑하는 사람과의 관계도 쉽지 않아, 마음을 주어도 받아들여지지 않거나, 신분 차이로 이루어질 수 없는 사랑을 했습니다. 아이를 갖는 것도 허락되지 않았을 수 있습니다. 이번 생에서 당신은 죄책감 없이 창조하고 사랑하는 법을 배웁니다.`,
    en: `In that life, your creativity and joy were forbidden. Art wasn't permitted even when desired, and feeling pleasure was considered sinful. You were scolded for singing, scorned for dancing. Relationships with loved ones weren't easy either—your heart wasn't accepted, or you loved across class barriers that couldn't be crossed. Having children may not have been permitted. In this life, you learn to create and love without guilt.`
  },
  6: {
    ko: `전생에서 당신은 몸이 약했거나 과로에 시달렸습니다. 건강을 돌볼 여유가 없었고, 끝없이 일하다 쓰러졌습니다. 해가 뜨기 전에 일어나 해가 진 뒤에야 쉬었으며, 제대로 된 식사 한 번 하지 못한 채 일에 시달렸습니다. 다른 사람을 돌보느라 자신은 돌보지 못했고, 병이 들어도 누워 있을 수 없었습니다. 당신의 몸은 도구처럼 사용되고 버려졌죠. 이번 생에서 당신은 건강과 균형의 중요성을 깊이 이해하게 됩니다.`,
    en: `In your past life, you were physically weak or overworked. You had no time to care for health, collapsing from endless work. Rising before sunrise and resting only after sunset, you toiled without a proper meal. You cared for others but not yourself, unable to lie down even when ill. Your body was used like a tool and discarded. In this life, you deeply understand the importance of health and balance.`
  },
  7: {
    ko: `그 삶에서 당신은 관계에서 큰 상처를 받았습니다. 배신당하거나 불공정한 대우를 받았고, 진정한 파트너십을 경험하지 못했습니다. 사랑한다고 믿은 사람에게 뒤통수를 맞았거나, 약속은 깨지고 신뢰는 무너졌습니다. 계약은 일방적으로 파기되었고, 정의는 당신 편이 아니었습니다. 혼자서 모든 것을 해결해야 했고, 누군가와 함께한다는 것이 어떤 의미인지 알지 못했습니다. 이번 생에서 당신은 건강한 관계와 협력의 의미를 배웁니다.`,
    en: `In that life, you were deeply hurt in relationships. Betrayed or treated unfairly, you never experienced true partnership. You were backstabbed by someone you believed loved you, promises were broken and trust shattered. Contracts were unilaterally cancelled, justice wasn't on your side. You had to solve everything alone, not knowing what it meant to be with someone. In this life, you learn the meaning of healthy relationships and cooperation.`
  },
  8: {
    ko: `전생에서 당신은 상실과 변화의 공포에 시달렸습니다. 소중한 것을 잃었거나, 통제력을 완전히 상실하는 경험을 했습니다. 사랑하는 사람의 죽음, 재산의 몰수, 권력의 상실 같은 극적인 변화를 겪었습니다. 모든 것이 무너지는 순간을 경험했고, 바닥까지 떨어져 보았습니다. 다른 사람을 믿기 어려웠고, 깊은 친밀감이 두려웠습니다. 이번 생에서 당신은 변화를 받아들이고 진정으로 연결되는 법을 배웁니다.`,
    en: `In your past life, you suffered fear of loss and change. You lost precious things or experienced complete loss of control. You went through dramatic changes like death of loved ones, confiscation of property, loss of power. You experienced moments when everything collapsed, fell to the very bottom. Trusting others was hard, and deep intimacy was frightening. In this life, you learn to accept change and truly connect.`
  },
  9: {
    ko: `그 삶에서 당신의 믿음은 시험받았습니다. 진리를 추구했지만 좌절했거나, 편협한 신념에 갇혀 고통받았습니다. 진실이라고 믿은 것이 거짓으로 드러났을 때의 충격, 종교나 사상에 속아 인생을 낭비했다는 자각, 또는 반대로 닫힌 세계에서 벗어나지 못해 더 넓은 진리를 보지 못한 한이 있습니다. 넓은 세상을 보지 못하고 좁은 세계에 갇혀 있었죠. 이번 생에서 당신은 열린 마음으로 진정한 지혜를 찾는 법을 배웁니다.`,
    en: `In that life, your faith was tested. You pursued truth but were frustrated, or suffered trapped in narrow beliefs. The shock when what you believed was truth was revealed as lies, the realization you wasted life deceived by religion or ideology, or conversely the regret of not escaping a closed world to see wider truths. You couldn't see the wide world, confined to a small one. In this life, you learn to find true wisdom with an open mind.`
  },
  10: {
    ko: `전생에서 당신은 사회적으로 인정받지 못했습니다. 노력해도 성과를 인정받지 못했고, 권위자들에게 억압당했습니다. 아무리 뛰어나도 신분이나 배경 때문에 높은 자리에 오르는 것이 막혀 있었습니다. 당신의 공은 다른 사람에게 돌아갔고, 정당한 보상은 주어지지 않았습니다. 세상은 불공평했고, 능력만으로는 아무것도 되지 않는다는 것을 뼈저리게 느꼈습니다. 이번 생에서 당신은 진정한 성취와 권위를 얻는 법을 배웁니다.`,
    en: `In your past life, you weren't socially recognized. Despite effort, achievements went unacknowledged, suppressed by authorities. No matter how excellent, rising to high positions was blocked by status or background. Your achievements went to others, just rewards weren't given. The world was unfair, and you painfully learned that ability alone amounts to nothing. In this life, you learn to gain true achievement and authority.`
  },
  11: {
    ko: `그 삶에서 당신은 어디에도 소속되지 못했습니다. 집단에서 배척당하거나, 비전을 가져도 동료를 찾지 못했습니다. 당신의 생각은 시대를 앞서갔지만, 그것을 이해하는 사람은 없었습니다. 친구라고 생각한 사람들에게 버림받거나, 집단의 희생양이 되었을 수도 있습니다. 외로운 이단자로 살며, 함께하는 기쁨을 알지 못했습니다. 이번 생에서 당신은 진정한 소속감과 함께하는 기쁨을 배웁니다.`,
    en: `In that life, you belonged nowhere. Ostracized from groups, or having visions but finding no companions. Your ideas were ahead of their time, but no one understood. You may have been abandoned by those you thought were friends, or became a group's scapegoat. You lived as a lonely outcast, not knowing the joy of togetherness. In this life, you learn true belonging and the joy of togetherness.`
  },
  12: {
    ko: `전생에서 당신은 보이지 않는 적들과 싸워야 했습니다. 자기 파괴적인 패턴에 빠지거나, 감옥이나 수도원 같은 격리된 곳에서 시간을 보냈습니다. 누군가의 음모에 휘말려 억울하게 갇혔거나, 스스로를 세상에서 숨겼을 수도 있습니다. 악몽에 시달리고, 원인 모를 두려움에 사로잡혔습니다. 세상과 단절된 채 내면의 어둠과 마주했죠. 이번 생에서 당신은 그 그림자를 통합하고 초월하는 법을 배웁니다.`,
    en: `In your past life, you had to fight invisible enemies. You fell into self-destructive patterns or spent time in isolated places like prisons or monasteries. You may have been unjustly imprisoned by someone's conspiracy, or hid yourself from the world. Plagued by nightmares, gripped by inexplicable fears. Disconnected from the world, you faced inner darkness. In this life, you learn to integrate and transcend those shadows.`
  },
};

// 일간별 전생에서 가져온 영혼의 특성과 이번 생 연결 스토리 (상세 버전)
export const DAY_MASTER_SOUL_LINK: Record<HeavenlyStem, { ko: string; en: string }> = {
  '갑': {
    ko: `당신 영혼의 가장 깊은 곳에는 개척자의 에너지가 흐릅니다. 전생에서 당신은 항상 앞장서서 새로운 길을 열었고, 그 용기와 추진력이 이번 생에도 이어집니다. 아무도 가지 않은 숲을 헤치고, 남들이 불가능하다고 한 일을 해냈습니다. 실패를 두려워하지 않았고, 넘어져도 다시 일어나 앞으로 나아갔습니다. 거대한 나무처럼 하늘을 향해 뻗어나가는 성장의 본능이 당신 안에 있습니다. 새로운 프로젝트, 새로운 시작, 새로운 도전 앞에서 당신의 심장은 뜁니다. 주저하지 말고 시작하세요. 당신이 개척한 길을 따라 많은 이들이 올 것입니다. 당신은 태어난 리더이고, 시작을 두려워하지 않는 용감한 영혼입니다.`,
    en: `At the deepest part of your soul flows pioneer energy. In past lives, you always led the way opening new paths, and that courage and drive continues into this life. You pushed through forests no one had entered, accomplished what others called impossible. You didn't fear failure, and when you fell, you rose again and moved forward. The instinct for growth, stretching toward the sky like a great tree, is within you. Your heart races before new projects, new beginnings, new challenges. Don't hesitate to start. Many will follow the path you pioneer. You are a born leader, a brave soul unafraid of beginnings.`
  },
  '을': {
    ko: `당신의 영혼에는 유연한 생명력이 깃들어 있습니다. 전생에서 당신은 어떤 환경에서도 적응하고 살아남았으며, 부드러움 속에 숨겨진 강인함으로 역경을 이겨냈습니다. 폭풍이 몰아쳐도 부러지지 않고 휘어졌다가 다시 일어섰습니다. 강한 것은 꺾이지만, 유연한 것은 살아남는다는 진리를 당신은 체득하고 있습니다. 덩굴이 바위틈에서도 꽃을 피우듯, 당신도 어디서든 아름다움을 만들어낼 수 있습니다. 사람들 사이를 부드럽게 연결하고, 갈등을 조화로 바꾸는 것이 당신의 재능입니다. 강하게 밀어붙이기보다 자연스럽게 스며드세요. 물이 바위를 뚫는 것처럼, 당신의 부드러운 지속성이 결국 모든 것을 이룹니다.`,
    en: `In your soul dwells flexible vitality. In past lives, you adapted and survived in any environment, overcoming adversity with strength hidden in gentleness. When storms raged, you didn't break but bent and rose again. You've embodied the truth that the strong break while the flexible survive. Like vines blooming even in rock crevices, you too can create beauty anywhere. Your talent is connecting people gently, turning conflict into harmony. Rather than pushing hard, seep in naturally. Like water piercing rock, your gentle persistence eventually achieves everything.`
  },
  '병': {
    ko: `당신의 영혼은 태양의 에너지를 품고 있습니다. 전생에서 당신은 빛과 열정으로 주변을 밝히며 살았고, 그 따뜻함이 많은 이들에게 희망이 되었습니다. 당신이 있는 곳에는 생기가 돌았고, 당신의 웃음소리는 사람들의 마음을 녹였습니다. 추운 겨울에도 당신은 온기를 나누었고, 어두운 시간에도 희망을 잃지 않았습니다. 때로는 너무 뜨거워 자신도 타버릴 것 같았지만, 그 열정이야말로 당신의 본질입니다. 이번 생에서도 당신의 존재 자체가 에너지입니다. 숨거나 작아지려 하지 마세요. 태양은 스스로 빛나며 모든 것을 비춥니다. 당신이 빛나면, 당신 주변의 모든 것도 함께 빛납니다.`,
    en: `Your soul holds the sun's energy. In past lives, you lived lighting up surroundings with light and passion, your warmth becoming hope for many. Where you were, vitality flowed, and your laughter melted people's hearts. Even in cold winter you shared warmth, even in dark times you didn't lose hope. Sometimes you burned so hot you might consume yourself, but that passion is your essence. In this life too, your very existence is energy. Don't try to hide or shrink. The sun shines by itself and illuminates everything. When you shine, everything around you shines together.`
  },
  '정': {
    ko: `당신의 영혼에는 촛불의 따뜻함이 있습니다. 전생에서 당신은 화려하지 않지만 꼭 필요한 곳에 빛을 비추며 살았습니다. 어둠 속에서 길을 찾는 이들에게 등불이 되었고, 외로운 밤을 보내는 이들에게 위로가 되었습니다. 당신은 집중적으로 빛을 비추어, 한 사람 한 사람을 섬세하게 돌보았습니다. 거대한 태양처럼 세상 전체를 비추지는 못해도, 당신이 비추는 곳은 특별히 따뜻했습니다. 이번 생에서도 가까운 이들을 섬세하게 돌보는 것이 당신의 사명입니다. 작은 불꽃도 어둠을 밝힐 수 있습니다. 당신의 따스한 마음이 누군가의 인생을 밝히고 있습니다.`,
    en: `In your soul is candle warmth. In past lives, you lived shining light where needed though not glamorously. You became a lamp for those finding their way in darkness, comfort for those spending lonely nights. You shone light with focus, caring for each person with delicacy. Though you couldn't light the whole world like the great sun, where you shone was especially warm. In this life too, delicately caring for close ones is your mission. Even a small flame can light the darkness. Your warm heart is lighting someone's life.`
  },
  '무': {
    ko: `당신의 영혼은 산처럼 든든합니다. 전생에서 당신은 흔들리지 않는 안정감으로 많은 이들에게 기댈 곳을 제공했습니다. 모든 것이 변해도 당신만은 변하지 않았고, 그 신뢰성이 당신의 가장 큰 힘이었습니다. 위기의 순간에도 당신은 침착했고, 혼란 속에서도 중심을 잃지 않았습니다. 사람들은 당신을 바위처럼 여겼고, 당신 곁에서 안정감을 느꼈습니다. 이번 생에서도 당신은 모든 것을 품고 지지하는 대지의 역할을 합니다. 당신 위에 무엇이든 세워질 수 있고, 당신이 있기에 다른 것들이 자랄 수 있습니다. 묵묵히 제자리를 지키는 것, 그것이 당신의 위대함입니다.`,
    en: `Your soul is solid like a mountain. In past lives, you provided a place to lean on with unshakeable stability for many. Even when everything changed, you alone didn't, and that reliability was your greatest strength. In crisis you stayed calm, in chaos you didn't lose center. People saw you as rock, felt stability beside you. In this life too, you play the role of earth that embraces and supports all. Anything can be built upon you, because of you other things can grow. Quietly staying in place—that is your greatness.`
  },
  '기': {
    ko: `당신의 영혼에는 기름진 땅의 풍요가 있습니다. 전생에서 당신은 다른 것들이 자랄 수 있도록 양분을 제공하며 살았습니다. 드러나지 않지만 가장 중요한 역할을 했죠. 씨앗이 뿌려지면 당신은 그것을 품어 싹을 틔웠고, 작은 것들이 크게 자라도록 돌보았습니다. 당신 덕분에 꽃이 피고 열매가 맺었지만, 사람들은 꽃과 열매만 보고 당신은 보지 못했습니다. 하지만 당신 없이는 아무것도 자랄 수 없었습니다. 이번 생에서도 당신은 보살피고 키우는 것에서 깊은 보람을 느낍니다. 당신 덕분에 많은 것들이 열매를 맺습니다. 드러나지 않아도 당신은 가장 소중한 존재입니다.`,
    en: `In your soul is the abundance of fertile soil. In past lives, you lived providing nourishment for others to grow. You played the most important role while not being visible. When seeds were sown, you embraced them to sprout, cared for small things to grow big. Because of you flowers bloomed and fruit bore, but people saw only flowers and fruit, not you. But without you, nothing could grow. In this life too, you find deep fulfillment in nurturing and growing. Because of you, many things bear fruit. Even unseen, you are most precious.`
  },
  '경': {
    ko: `당신의 영혼에는 정의의 칼날이 있습니다. 전생에서 당신은 옳고 그름을 분명히 하며, 불의에 맞서 싸웠습니다. 원칙을 굽히지 않았고, 그 단호함이 세상을 바로잡는 힘이 되었습니다. 칼이 날카로워야 쓸모가 있듯, 당신의 분명함이 혼란을 정리했습니다. 결단력 있게 행동했고, 우유부단함을 경멸했습니다. 때로는 그 날카로움이 다른 이들을 다치게 하기도 했지만, 당신의 의도는 언제나 정의였습니다. 이번 생에서도 당신은 명확한 기준으로 판단하고 행동합니다. 칼이 휘어지면 쓸모가 없어지듯, 당신의 가치도 원칙에 있습니다. 날을 세우되, 그것으로 보호하는 법을 배우세요.`,
    en: `In your soul is a blade of justice. In past lives, you clearly distinguished right from wrong and fought against injustice. You didn't bend principles, and that firmness became the power to correct the world. Like a sword must be sharp to be useful, your clarity sorted through chaos. You acted decisively, despised indecisiveness. Sometimes that sharpness hurt others, but your intention was always justice. In this life too, you judge and act with clear standards. Like a bent sword becomes useless, your value lies in principles. Sharpen your blade, but learn to protect with it.`
  },
  '신': {
    ko: `당신의 영혼에는 보석의 섬세함이 있습니다. 전생에서 당신은 거친 것을 다듬어 빛나게 만들었고, 다른 이들이 보지 못하는 아름다움을 발견했습니다. 완벽을 추구하는 날카로운 눈이 당신의 특별한 재능입니다. 작은 결함도 놓치지 않았고, 디테일에 생명을 불어넣었습니다. 다이아몬드가 커팅되어 빛나듯, 당신은 원석에서 보석을 만들어냈습니다. 예리한 감각으로 진짜와 가짜를 구별했고, 가치 있는 것을 알아보았습니다. 이번 생에서도 당신은 세상에 아름다움과 가치를 더합니다. 날카로움을 잃지 않되, 그것으로 자신을 자르지는 마세요.`,
    en: `In your soul is gem-like delicacy. In past lives, you polished rough things to make them shine and discovered beauty others couldn't see. The sharp eye pursuing perfection is your special talent. You caught the smallest flaws, breathed life into details. Like diamonds cut to shine, you made gems from raw stones. With keen senses you distinguished real from fake, recognized what has value. In this life too, you add beauty and value to the world. Keep your sharpness, but don't cut yourself with it.`
  },
  '임': {
    ko: `당신의 영혼은 바다처럼 깊고 넓습니다. 전생에서 당신은 모든 것을 품고 이해하며 살았고, 판단하기보다 수용했습니다. 모든 강물이 바다로 흘러가듯, 모든 이야기가 당신에게 모여들었습니다. 당신은 들었고, 이해했고, 안아주었습니다. 그 깊이와 지혜가 많은 이들에게 위안이 되었죠. 표면은 잔잔해 보여도, 그 아래에는 깊은 지혜와 힘이 있었습니다. 이번 생에서도 당신은 모든 강물을 받아들이는 바다처럼 포용하며 삽니다. 너무 많이 품어 자신을 잃지 않도록, 때로는 파도가 되어 당신의 존재를 알려도 됩니다.`,
    en: `Your soul is deep and wide like the ocean. In past lives, you lived embracing and understanding everything, accepting rather than judging. Like all rivers flow to the sea, all stories gathered to you. You listened, understood, embraced. That depth and wisdom comforted many. Though the surface seemed calm, beneath was deep wisdom and power. In this life too, you live embracing like the ocean that accepts all rivers. So you don't lose yourself holding too much, sometimes become a wave and make your presence known.`
  },
  '계': {
    ko: `당신의 영혼에는 이슬의 순수함이 있습니다. 전생에서 당신은 눈에 띄지 않게 필요한 곳을 적시며 생명을 살렸습니다. 화려하지 않지만 없어서는 안 될 존재였죠. 새벽녘 꽃잎 위에 맺힌 이슬처럼, 당신의 존재는 조용하지만 생명을 유지하는 데 필수적이었습니다. 당신은 치유하고 돌보았으며, 상처받은 것들을 살렸습니다. 큰 강물처럼 세상을 바꾸지는 못해도, 작은 이슬로 필요한 곳에 생명을 주었습니다. 이번 생에서도 당신은 조용히 스며들어 치유하고 돌보는 역할을 합니다. 아침 이슬 한 방울이 꽃을 피우듯, 당신의 작은 친절이 생명을 살립니다. 작다고 무시하지 마세요. 이슬이 없으면 꽃도 피지 못합니다.`,
    en: `In your soul is the purity of dew. In past lives, you gave life by moistening where needed without being noticed. Not glamorous but essential. Like dew gathered on petals at dawn, your existence was quiet but essential for sustaining life. You healed and cared, revived wounded things. Though you couldn't change the world like a great river, you gave life where needed as small dew. In this life too, you quietly seep in to heal and care. Like one drop of morning dew makes flowers bloom, your small kindness gives life. Don't dismiss yourself as small. Without dew, flowers cannot bloom.`
  },
};

// 전생 시대/장소 변형 (노스노드 + 토성 조합)
export const ERA_LOCATION_VARIATIONS: Record<string, { ko: string; en: string }> = {
  // 노스노드 1-6 + 토성 1-6 조합 예시 (총 144개 중 일부)
  '1-1': { ko: "고대 그리스의 작은 도시국가", en: "small city-state in ancient Greece" },
  '1-2': { ko: "르네상스 시대 피렌체의 공방", en: "Renaissance era workshop in Florence" },
  '1-3': { ko: "조선 초기 한양의 서당", en: "early Joseon era village school in Hanyang" },
  '1-4': { ko: "빅토리아 시대 영국의 저택", en: "Victorian era manor in England" },
  '1-5': { ko: "로마 제국의 원형극장", en: "Roman Empire amphitheater" },
  '1-6': { ko: "중세 유럽의 수도원", en: "medieval European monastery" },
  '2-1': { ko: "대항해 시대 포르투갈 항구", en: "Age of Exploration Portuguese port" },
  '2-2': { ko: "실크로드의 오아시스 도시", en: "oasis city on the Silk Road" },
  '2-3': { ko: "당나라 장안의 국제 시장", en: "international market in Tang Dynasty Chang'an" },
  '2-4': { ko: "에도 시대 오사카의 상가", en: "Edo period merchant house in Osaka" },
  '2-5': { ko: "고대 이집트 나일강 유역", en: "Nile River region in ancient Egypt" },
  '2-6': { ko: "중세 베네치아 무역 길드", en: "medieval Venice trade guild" },
  '3-1': { ko: "계몽주의 시대 파리 살롱", en: "Enlightenment era Paris salon" },
  '3-2': { ko: "고려시대 개경의 저택", en: "Goryeo Dynasty mansion in Gaegyeong" },
  '3-3': { ko: "고대 알렉산드리아 도서관", en: "ancient Library of Alexandria" },
  '3-4': { ko: "명나라 베이징의 학당", en: "Ming Dynasty academy in Beijing" },
  '3-5': { ko: "고대 아테네의 아고라", en: "Agora in ancient Athens" },
  '3-6': { ko: "티베트 고원의 사원", en: "temple on the Tibetan plateau" },
  // 더 많은 조합...
  '4-1': { ko: "바이킹 시대 스칸디나비아", en: "Scandinavia during the Viking Age" },
  '4-2': { ko: "무굴 제국의 궁전", en: "palace of the Mughal Empire" },
  '4-3': { ko: "백제 시대 부여의 마을", en: "village in Buyeo during Baekje period" },
  '4-4': { ko: "아즈텍 문명의 테노치티틀란", en: "Tenochtitlan of the Aztec civilization" },
  '4-5': { ko: "헬레니즘 시대 안티오키아", en: "Antioch during the Hellenistic period" },
  '4-6': { ko: "인도 마우리아 왕조의 사원", en: "temple of India's Maurya Dynasty" },
  '5-1': { ko: "황금시대 네덜란드 암스테르담", en: "Golden Age Amsterdam, Netherlands" },
  '5-2': { ko: "고대 바빌로니아", en: "ancient Babylonia" },
  '5-3': { ko: "통일신라 경주", en: "Unified Silla Gyeongju" },
  '5-4': { ko: "오스만 제국 이스탄불", en: "Istanbul of the Ottoman Empire" },
  '5-5': { ko: "고대 로마의 콜로세움", en: "Colosseum in ancient Rome" },
  '5-6': { ko: "불교 전래 시기 인도", en: "India during Buddhism's spread" },
  '6-1': { ko: "산업혁명 시대 맨체스터", en: "Manchester during the Industrial Revolution" },
  '6-2': { ko: "페르시아 제국의 페르세폴리스", en: "Persepolis of the Persian Empire" },
  '6-3': { ko: "고구려 평양성", en: "Pyongyang Fortress of Goguryeo" },
  '6-4': { ko: "송나라 카이펑", en: "Kaifeng of Song Dynasty" },
  '6-5': { ko: "르네상스 시대 로마", en: "Rome during the Renaissance" },
  '6-6': { ko: "초기 기독교 시대 예루살렘", en: "Jerusalem during early Christianity" },
};

/**
 * 조합 기반 전생 스토리 생성 함수 (상세 버전)
 */
export function generateCombinedPastLifeNarrative(
  geokgukType: GeokgukType | null,
  northNodeHouse: HouseNumber | null,
  saturnHouse: HouseNumber | null,
  dayMasterChar: HeavenlyStem | null,
  isKo: boolean
): string {
  const lines: string[] = [];

  // 1. 도입부 - 영혼의 여정 시작 (확장)
  if (isKo) {
    lines.push("당신의 영혼은 수많은 생을 거쳐 이 자리에 왔습니다. 수백 번, 어쩌면 수천 번의 삶을 살며, 각각의 시대와 장소에서 다양한 역할을 경험했습니다. 때로는 왕이었고, 때로는 거지였습니다. 때로는 가해자였고, 때로는 피해자였습니다. 모든 경험은 영혼을 성장시키기 위한 것이었고, 각각의 삶에서 배운 교훈들이 축적되어 지금의 당신을 만들었습니다.\n");
  } else {
    lines.push("Your soul has come to this place through countless lives. Living hundreds, perhaps thousands of lives, you experienced various roles in different eras and places. Sometimes you were a king, sometimes a beggar. Sometimes a perpetrator, sometimes a victim. Every experience was for soul growth, and lessons learned in each life accumulated to make you who you are now.\n");
  }

  // 2. 격국 기반 전생 역할 (노스노드로 변형)
  if (geokgukType && northNodeHouse) {
    const roleVariation = GEOKGUK_ROLE_VARIATIONS[geokgukType]?.[northNodeHouse];
    if (roleVariation) {
      if (isKo) {
        lines.push(`수많은 전생 중 가장 영향력 있었던 삶에서, 당신은 ${roleVariation.ko}였습니다. 그 삶의 기억은 지금도 당신 영혼 깊은 곳에 새겨져 있으며, 설명할 수 없는 끌림이나 두려움, 타고난 재능의 형태로 이번 생에 나타나고 있습니다.\n`);
      } else {
        lines.push(`In the most influential of your countless past lives, you were a ${roleVariation.en}. Memories of that life are still engraved deep in your soul, appearing in this life as inexplicable attractions or fears, innate talents.\n`);
      }
    }
  }

  // 3. 시대와 장소 (노스노드 + 토성 조합)
  const eraKey = `${northNodeHouse || 1}-${saturnHouse || 1}`;
  const eraLocation = ERA_LOCATION_VARIATIONS[eraKey] || ERA_LOCATION_VARIATIONS['1-1'];
  if (isKo) {
    lines.push(`그 시절 당신이 살았던 곳은 ${eraLocation.ko}였습니다. 그곳의 공기, 문화, 사람들이 당신의 영혼에 깊은 인상을 남겼고, 지금도 특정 음악, 향기, 풍경에서 설명할 수 없는 향수를 느끼는 것은 그 기억 때문입니다.\n`);
  } else {
    lines.push(`The place you lived in that era was ${eraLocation.en}. The air, culture, and people of that place left deep impressions on your soul, and the inexplicable nostalgia you feel from certain music, scents, or landscapes is because of those memories.\n`);
  }

  // 4. 토성 시련 이야기
  if (saturnHouse) {
    const saturnTrial = SATURN_TRIAL_NARRATIVES[saturnHouse];
    if (saturnTrial) {
      lines.push(isKo ? saturnTrial.ko : saturnTrial.en);
      lines.push("\n");
    }
  }

  // 5. 일간 영혼 연결
  if (dayMasterChar) {
    const soulLink = DAY_MASTER_SOUL_LINK[dayMasterChar];
    if (soulLink) {
      lines.push(isKo ? soulLink.ko : soulLink.en);
      lines.push("\n");
    }
  }

  // 6. 격국별 핵심 전생 테마 추가 (기존 데이터 활용)
  if (geokgukType) {
    const themeAdditions = getGeokgukThemeAddition(geokgukType, isKo);
    lines.push(themeAdditions);
    lines.push("\n");
  }

  // 7. 노스노드 기반 영혼 여정 방향
  if (northNodeHouse) {
    const journeyDirection = getNodeJourneyDirection(northNodeHouse, isKo);
    lines.push(journeyDirection);
    lines.push("\n");
  }

  // 8. 카르마 연결 문단 추가
  if (isKo) {
    lines.push("전생에서 갚지 못한 빚, 이루지 못한 약속, 해결하지 못한 감정들이 카르마가 되어 이번 생에서 특정 패턴으로 나타납니다. 반복되는 문제, 설명할 수 없는 두려움, 특정 유형의 사람에게 끌리는 것 모두 전생의 미완성된 이야기입니다. 하지만 이것은 저주가 아니라 기회입니다. 이번 생에서 그것을 인식하고 치유할 기회가 주어진 것입니다.\n");
  } else {
    lines.push("Debts unpaid in past lives, promises unfulfilled, emotions unresolved become karma appearing as specific patterns in this life. Recurring problems, inexplicable fears, being drawn to certain types of people—all are unfinished stories from past lives. But this is not a curse but an opportunity. You're given the chance to recognize and heal them in this life.\n");
  }

  // 9. 마무리 - 이번 생의 의미 (확장)
  if (isKo) {
    lines.push("이 모든 경험들이 축적되어 지금의 당신을 만들었습니다. 전생의 재능은 당신 안에 잠들어 있어, 필요한 순간에 깨어납니다. 전생의 상처는 이번 생에서 치유할 기회가 주어지며, 같은 실수를 반복하지 않을 지혜도 함께 가져왔습니다. 과거를 이해하면 현재가 명확해지고, 미래로 나아갈 방향이 보입니다.\n");
    lines.push("당신은 우연히 이 시대, 이 장소, 이 가족에 태어난 것이 아닙니다. 모든 것은 영혼의 계획 속에 있었고, 지금 당신이 겪는 모든 경험은 영혼의 성장을 위해 필요한 것입니다.\n");
    lines.push("당신의 영혼은 이미 많은 것을 알고 있습니다. 막연한 직감, 꿈속의 메시지, 갑자기 떠오르는 통찰—그것들은 전생에서 쌓은 지혜가 발현되는 것입니다. 그 내면의 목소리를 믿고 따르세요. 당신은 혼자가 아니며, 수많은 전생에서 축적한 힘이 당신을 지지하고 있습니다.");
  } else {
    lines.push("All these experiences have accumulated to make you who you are now. Past life talents sleep within you, awakening when needed. Past life wounds are given the chance to heal in this life, and you've also brought wisdom to not repeat the same mistakes. Understanding the past clarifies the present and reveals the direction forward.\n");
    lines.push("You weren't born by accident in this era, this place, this family. Everything was within your soul's plan, and every experience you go through now is necessary for soul growth.\n");
    lines.push("Your soul already knows much. Vague intuitions, messages in dreams, sudden insights—these are wisdom accumulated in past lives manifesting. Trust and follow that inner voice. You are not alone, and power accumulated from countless past lives supports you.");
  }

  return lines.join("\n");
}

// 격국별 테마 추가 문장 (상세 버전)
function getGeokgukThemeAddition(geokgukType: GeokgukType, isKo: boolean): string {
  const additions: Record<GeokgukType, { ko: string; en: string }> = {
    siksin: {
      ko: "당신의 손에서 창조된 것들은 단순한 작품이 아니라, 영혼을 담은 메시지였습니다. 사람들은 당신의 창작물을 보며 울고 웃었고, 그 감동은 시간을 초월해 전해졌습니다. 밤새 작업에 몰두하며 완성의 순간을 기다렸던 기억, 처음으로 대중 앞에 작품을 선보였던 떨림, 비평과 찬사 사이에서 흔들렸던 순간들이 당신 영혼에 남아 있습니다. 창조의 고통과 환희를 모두 알기에, 이번 생에서 당신은 더 성숙한 예술가로 태어났습니다. 그 창조의 기쁨이 이번 생에서도 당신을 이끕니다. 무엇이든 만들어내고 싶은 충동, 아름다움을 향한 갈망이 당신 안에 있습니다.",
      en: "What you created was not mere work, but messages carrying soul. People laughed and cried seeing your creations, and that emotion transcended time. Memories of working through the night waiting for completion, the trembling when first showing work to the public, moments of wavering between criticism and praise remain in your soul. Knowing both the pain and ecstasy of creation, you were born a more mature artist in this life. That joy of creation guides you in this life too. The urge to create anything, the longing for beauty, is within you."
    },
    sanggwan: {
      ko: "당신의 말 한마디는 수천 명의 마음을 움직이는 힘이 있었습니다. 광장에서든 무대에서든, 당신이 입을 열면 사람들은 숨을 죽이고 귀를 기울였죠. 말로 세상을 바꾸겠다는 신념이 있었고, 때로는 금지된 진실을 말해 위험에 처하기도 했습니다. 박해받으면서도 입을 다물지 않았고, 감옥에서도 글을 썼습니다. 당신의 말은 혁명의 불씨가 되었고, 세대를 넘어 인용되었습니다. 그 영향력의 무게와 책임을 이번 생에서 더 깊이 이해하게 됩니다. 말의 힘을 알기에, 더 신중하게 그리고 더 효과적으로 사용하는 법을 배웁니다.",
      en: "Your single word had the power to move thousands of hearts. Whether in the square or on stage, when you opened your mouth, people held their breath and listened. You believed words could change the world, sometimes endangered for speaking forbidden truths. Persecuted yet you wouldn't close your mouth, wrote even from prison. Your words became sparks of revolution, quoted across generations. You come to understand the weight and responsibility of that influence more deeply in this life. Knowing the power of words, you learn to use them more carefully and effectively."
    },
    jeonggwan: {
      ko: "당신이 세운 법과 제도는 수많은 사람들의 삶을 좌우했습니다. 공정함과 질서를 지키기 위해 때로는 냉정한 결정도 해야 했고, 그 무거운 책임감은 당신 영혼에 깊이 새겨져 있습니다. 법정에 앉아 판결을 내릴 때의 긴장감, 정책을 결정할 때의 고뇌, 부당한 명령에 맞서야 할 때의 딜레마를 겪었습니다. 권력의 유혹과 싸우며 청렴을 지켰거나, 혹은 그 유혹에 굴복해 후회를 남겼을 수도 있습니다. 정의로운 통치가 얼마나 어려운지 알기에, 이번 생에서는 더 지혜롭게 그 역할을 감당합니다.",
      en: "The laws and systems you established determined countless lives. You sometimes had to make cold decisions to maintain fairness and order, and that heavy responsibility is deeply engraved in your soul. You experienced the tension sitting in judgment, the anguish of deciding policy, the dilemma of standing against unjust orders. You either fought power's temptation to stay clean, or perhaps surrendered to that temptation and left regrets. Knowing how difficult righteous governance is, you bear that role more wisely in this life."
    },
    pyeongwan: {
      ko: "전장의 먼지와 피, 그리고 승리의 함성을 당신은 잊지 못합니다. 동료를 지키기 위해 목숨을 걸었고, 그 용기와 충성심은 당신 영혼의 핵심입니다. 새벽녘 적진을 향해 돌격하던 순간, 부상당한 전우를 업고 후퇴하던 기억, 전쟁이 끝난 후 찾아온 공허함도 알고 있습니다. 폭력의 허망함을 깨달았거나, 지켜야 할 것을 지키지 못한 한이 있을 수도 있습니다. 이번 생에서는 그 힘을 보호와 평화를 위해 사용합니다. 싸우는 법을 알지만, 언제 싸우지 말아야 하는지도 알게 됩니다.",
      en: "You cannot forget the dust and blood of battlefields, and the shouts of victory. You risked your life to protect comrades, and that courage and loyalty are the core of your soul. You know the moment charging toward enemy lines at dawn, memories of carrying wounded comrades in retreat, the emptiness after war ended. You may have realized the futility of violence, or have regrets of failing to protect what should have been protected. In this life, you use that power for protection and peace. You know how to fight, but also learn when not to."
    },
    jeongjae: {
      ko: "금화의 무게와 거래의 긴장감을 당신은 생생히 기억합니다. 한 푼의 손실도 없이 부를 불리는 것이 당신의 자부심이었고, 그 안정을 바탕으로 가족과 공동체를 지켰습니다. 장부를 정리하던 밤, 큰 거래를 성사시킨 순간의 쾌감, 경제 위기 속에서도 가산을 지켜낸 자부심이 있습니다. 동시에 돈에 대한 집착이 관계를 해치거나, 인색하다는 비난을 받았을 수도 있습니다. 부의 진정한 가치는 쌓는 것이 아니라 나누는 것임을 이번 생에서 배웁니다. 물질적 안정과 정신적 풍요의 균형을 찾아갑니다.",
      en: "You vividly remember the weight of gold coins and the tension of deals. Growing wealth without losing a penny was your pride, and on that stability you protected family and community. You have nights balancing ledgers, the thrill of closing big deals, the pride of preserving assets through economic crises. At the same time, obsession with money may have damaged relationships, or you were criticized for stinginess. In this life you learn that wealth's true value is not accumulating but sharing. You find balance between material stability and spiritual abundance."
    },
    pyeonjae: {
      ko: "낯선 땅의 향기, 새로운 언어의 소리, 미지의 보물을 향한 설렘을 당신은 잊지 못합니다. 안전한 곳에 머무르기보다 위험을 감수하고 새로운 가능성을 찾았던 것이 당신의 삶이었습니다. 배를 타고 폭풍을 뚫고 항해하던 기억, 사막을 건너 오아시스를 발견했던 환희, 위험한 협상을 성공시킨 스릴이 있습니다. 도박과 모험 사이를 위태롭게 걸었고, 모든 것을 잃었다가 다시 시작한 경험도 있을 것입니다. 이번 생에서는 그 모험심을 지키되, 무모함과 용기의 차이를 배웁니다.",
      en: "You cannot forget the scent of foreign lands, the sound of new languages, the excitement for unknown treasures. Rather than staying safe, taking risks to find new possibilities was your life. You have memories of sailing through storms, the joy of discovering oasis crossing deserts, the thrill of pulling off dangerous negotiations. You walked precariously between gambling and adventure, may have lost everything and started again. In this life, you keep that adventurous spirit while learning the difference between recklessness and courage."
    },
    jeongin: {
      ko: "촛불 아래 책을 읽던 밤, 제자들과 진리를 토론하던 시간, 깨달음의 순간에 느꼈던 경이로움이 당신 영혼에 새겨져 있습니다. 지식을 쌓고 전하는 것이 당신 존재의 이유였습니다. 도서관에서 잊힌 고서를 발견했을 때의 흥분, 복잡한 개념을 마침내 이해했을 때의 유레카, 제자가 스승을 넘어서는 것을 보는 기쁨을 알고 있습니다. 지식에 갇혀 삶을 놓쳤거나, 상아탑에 갇혀 세상과 단절됐을 수도 있습니다. 이번 생에서는 배움과 삶의 조화를 찾습니다. 머리로 아는 것을 마음으로도 느끼는 법을 배웁니다.",
      en: "Nights reading by candlelight, hours debating truth with disciples, the wonder felt in moments of enlightenment are engraved in your soul. Accumulating and passing on knowledge was your reason for existence. You know the excitement of discovering forgotten ancient texts in libraries, the eureka of finally understanding complex concepts, the joy of seeing students surpass teachers. You may have missed life trapped in knowledge, or disconnected from the world in ivory towers. In this life you find harmony between learning and living. You learn to feel in heart what you know in head."
    },
    pyeongin: {
      ko: "눈에 보이지 않는 세계의 속삭임, 예언의 순간에 느꼈던 전율, 치유의 손길이 전한 따뜻함을 당신은 기억합니다. 물질 너머의 진실을 보는 눈이 당신에게는 있었습니다. 꿈속에서 미래를 보았고, 손을 대면 아픔이 사라졌습니다. 사람들은 당신을 신성하게 여기거나 두려워했고, 특별한 능력은 축복이자 저주였습니다. 오해받고 박해받기도 했으며, 그 능력을 숨기고 살아야 했을 수도 있습니다. 이번 생에서는 그 직관과 영적 민감성을 현실과 조화시키는 법을 배웁니다. 보이지 않는 것과 보이는 것 사이의 다리가 됩니다.",
      en: "You remember whispers from the invisible world, the thrill in moments of prophecy, the warmth your healing hands conveyed. You had eyes to see truth beyond the material. You saw the future in dreams, pain disappeared at your touch. People revered you as holy or feared you, special abilities were blessing and curse. You were misunderstood and persecuted, may have had to hide those abilities. In this life you learn to harmonize that intuition and spiritual sensitivity with reality. You become a bridge between the unseen and seen."
    },
  };

  return additions[geokgukType]?.[isKo ? 'ko' : 'en'] || '';
}

// 노스노드 기반 여정 방향 문장 (상세 버전)
function getNodeJourneyDirection(house: HouseNumber, isKo: boolean): string {
  const directions: Record<HouseNumber, { ko: string; en: string }> = {
    1: {
      ko: "전생에서 당신은 늘 다른 사람을 위해 살았습니다. 관계 속에서 자신을 잃어버렸고, 상대방의 기대에 맞추느라 진짜 원하는 것이 무엇인지 잊어버렸습니다. 이번 생에서는 진정한 자아를 발견하고 당당히 표현하는 것이 영혼의 성장 방향입니다. '나'라는 존재가 무엇을 원하는지, 무엇이 나를 행복하게 하는지 탐구하세요. 이기적이 되라는 것이 아니라, 자신을 먼저 알아야 진정으로 타인도 사랑할 수 있다는 진리를 깨닫는 것입니다.",
      en: "In past lives, you always lived for others. You lost yourself in relationships, forgot what you truly wanted while meeting others' expectations. In this life, discovering your true self and expressing it confidently is your soul's growth direction. Explore what 'you' want, what makes you happy. It's not about being selfish, but realizing the truth that you must know yourself first to truly love others."
    },
    2: {
      ko: "전생에서 당신은 타인의 자원에 의존했습니다. 유산, 배우자의 돈, 권력자의 후원 등 남의 것으로 살았고, 스스로 가치를 만들어내는 경험이 부족했습니다. 이번 생에서는 스스로 가치를 창출하고 물질적 독립을 이루는 것이 과제입니다. 당신만의 재능으로 돈을 벌고, 자신의 두 발로 서는 경험이 필요합니다. 물질적 안정은 외부에서 오는 것이 아니라, 당신 내면의 자원에서 나온다는 것을 배웁니다.",
      en: "In past lives, you depended on others' resources. You lived on others' things—inheritance, spouse's money, patrons' support—lacking experience creating value yourself. In this life, creating value yourself and achieving material independence is your task. You need the experience of earning money with your own talents, standing on your own two feet. You learn that material stability doesn't come from outside but from your inner resources."
    },
    3: {
      ko: "전생에서 당신은 큰 진리만 추구했습니다. 철학, 종교, 이념 같은 거대한 것들에 몰두해 일상의 소소한 것들은 하찮게 여겼습니다. 높은 곳만 바라보느라 발밑을 보지 못했고, 가까운 사람들과의 관계도 소홀했습니다. 이번 생에서는 일상의 소통과 가까운 관계의 소중함을 배우는 것이 여정입니다. 형제자매, 이웃, 동료와의 관계에서 배울 것이 있고, 사소한 대화 속에도 진리가 있음을 발견하게 됩니다.",
      en: "In past lives, you pursued only great truths. Absorbed in grand things like philosophy, religion, ideology, you dismissed daily small things. Looking only up, you didn't see your feet, neglected relationships with those near. In this life, learning the value of daily communication and close relationships is your journey. There's learning in relationships with siblings, neighbors, colleagues, and you'll discover truth in trivial conversations too."
    },
    4: {
      ko: "전생에서 당신은 사회적 성공에 모든 것을 걸었습니다. 명예, 지위, 커리어를 위해 가정을 희생했고, 권력의 정점에 올랐지만 마음속은 텅 비어 있었습니다. 공적인 얼굴 뒤에 숨은 외로움을 아무도 몰랐죠. 이번 생에서는 가정과 내면의 평화를 찾는 것이 진정한 성취입니다. 편히 쉴 수 있는 집, 마음을 나눌 가족, 감정적 안정이 세상의 어떤 성공보다 중요하다는 것을 배웁니다.",
      en: "In past lives, you staked everything on social success. You sacrificed home for honor, status, career, reached the peak of power but your heart was empty. No one knew the loneliness hidden behind your public face. In this life, finding home and inner peace is true achievement. You learn that a home where you can rest easy, family to share hearts with, emotional stability matters more than any worldly success."
    },
    5: {
      ko: "전생에서 당신은 집단의 일원으로만 살았습니다. 팀, 조직, 커뮤니티를 위해 개인을 희생했고, 자신만의 창작물이나 표현은 억눌렀습니다. 전체를 위해 개인은 중요하지 않다고 배웠습니다. 이번 생에서는 개인으로서 창조하고 표현하며 기쁨을 느끼는 것이 사명입니다. 당신만의 예술, 당신만의 이야기, 당신만의 사랑을 펼치세요. 개인의 빛남이 결국 집단도 빛나게 한다는 것을 깨닫게 됩니다.",
      en: "In past lives, you lived only as part of groups. You sacrificed the individual for team, organization, community, suppressed your own creations and expressions. You learned individuals don't matter for the whole. In this life, creating, expressing, and feeling joy as an individual is your mission. Unfold your own art, your own story, your own love. You'll realize that individual radiance ultimately makes the group shine too."
    },
    6: {
      ko: "전생에서 당신은 환상과 영적 세계에 빠져 살았습니다. 현실을 도피하고 다른 차원에 몰두해, 일상의 삶은 무의미하게 느껴졌습니다. 몸을 돌보지 않았고, 실용적인 일들은 하찮게 여겼습니다. 이번 생에서는 일상의 루틴과 실용적 삶 속에서 의미를 찾는 것이 과제입니다. 건강 관리, 일의 효율성, 다른 사람들을 돕는 서비스 속에 영성이 있음을 발견합니다. 땅에 발을 딛고 현실을 살아가는 것도 수행입니다.",
      en: "In past lives, you lived absorbed in fantasy and spiritual realms. Escaping reality, immersed in other dimensions, daily life felt meaningless. You didn't care for your body, dismissed practical matters. In this life, finding meaning in daily routines and practical living is your task. You discover spirituality in health management, work efficiency, service helping others. Walking with feet on ground, living in reality is also practice."
    },
    7: {
      ko: "전생에서 당신은 혼자서 모든 것을 해결했습니다. 누구에게도 기대지 않았고, 모든 결정을 홀로 내렸습니다. 독립심은 강했지만, 진정한 연결과 협력은 경험하지 못했습니다. 외로움을 강함으로 착각했죠. 이번 생에서는 진정한 파트너십과 협력의 힘을 배우는 것이 성장입니다. 누군가와 대등하게 만나, 함께 만들어가고, 서로에게 기대는 관계를 경험하세요. 둘이 하나보다 강하다는 것을 깨닫게 됩니다.",
      en: "In past lives, you solved everything alone. You didn't lean on anyone, made all decisions alone. Independence was strong, but you didn't experience true connection and cooperation. You mistook loneliness for strength. In this life, learning the power of true partnership and cooperation is growth. Meet someone as an equal, create together, experience relationships of mutual support. You'll realize two are stronger than one."
    },
    8: {
      ko: "전생에서 당신은 안전과 소유에 집착했습니다. 잃어버릴까 두려워 움켜쥐었고, 변화를 거부하며 익숙한 것에 머물렀습니다. 안정적이었지만 정체되어 있었고, 깊은 친밀감은 위험해서 피했습니다. 이번 생에서는 변화를 받아들이고 깊은 친밀감을 경험하는 것이 도전입니다. 무언가를 놓아야 새로운 것이 온다는 것, 자신을 열어야 진정한 연결이 가능하다는 것을 배웁니다. 죽음과 재생의 순환을 이해하게 됩니다.",
      en: "In past lives, you were obsessed with safety and possession. You clung tight fearing loss, rejected change and stayed with the familiar. You were stable but stagnant, avoided deep intimacy as dangerous. In this life, accepting change and experiencing deep intimacy is your challenge. You learn that letting go brings new things, opening yourself enables true connection. You come to understand the cycle of death and rebirth."
    },
    9: {
      ko: "전생에서 당신은 좁은 세계에 갇혀 있었습니다. 동네를 벗어나지 않았고, 하나의 생각에만 갇혀 다른 관점을 보지 못했습니다. 정보를 모으기만 하고 의미를 찾지 못했으며, 디테일에 파묻혀 큰 그림을 놓쳤습니다. 이번 생에서는 넓은 세계를 탐험하고 삶의 의미를 찾는 것이 여정입니다. 여행, 학문, 철학, 영성을 통해 시야를 넓히고, 삶이 왜 의미 있는지에 대한 당신만의 답을 찾으세요.",
      en: "In past lives, you were confined to a narrow world. You didn't leave your neighborhood, trapped in one idea unable to see other perspectives. You only gathered information without finding meaning, missed the big picture buried in details. In this life, exploring the wide world and finding life's meaning is your journey. Broaden your view through travel, learning, philosophy, spirituality, and find your own answer to why life is meaningful."
    },
    10: {
      ko: "전생에서 당신은 가정에만 갇혀 살았습니다. 가족을 돌보느라 세상에 나가지 못했고, 당신의 재능과 야망은 집 안에서 시들었습니다. 안전했지만, 당신이 세상에 기여할 수 있는 것을 보여주지 못했습니다. 이번 생에서는 세상에 나가 사회적 역할을 맡고 성취를 이루는 것이 과제입니다. 당신의 능력을 세상이 알게 하고, 공적인 영역에서 인정받는 경험이 필요합니다. 가정과 커리어의 균형을 찾아갑니다.",
      en: "In past lives, you lived confined to home. Caring for family, you couldn't go out into the world, your talents and ambitions withered inside the house. You were safe, but didn't show what you could contribute to the world. In this life, going out into the world, taking on social roles, and achieving is your task. You need the experience of making the world know your abilities, being recognized in the public sphere. You find balance between home and career."
    },
    11: {
      ko: "전생에서 당신은 개인적 영광만 추구했습니다. 자신의 창조물, 자신의 사랑, 자신의 드라마에만 몰두해 더 큰 세상은 보지 못했습니다. 주인공이 되고 싶었고, 스포트라이트를 독차지했습니다. 이번 생에서는 공동체와 더 큰 비전을 위해 헌신하는 것이 성장입니다. 개인의 영광보다 팀의 승리를, 나만의 작품보다 함께 만드는 프로젝트를 배웁니다. 더 큰 것을 위해 자아를 내려놓을 때 역설적으로 더 빛납니다.",
      en: "In past lives, you pursued only personal glory. Absorbed only in your creations, your love, your drama, you didn't see the bigger world. You wanted to be the protagonist, monopolized the spotlight. In this life, dedicating yourself to community and greater vision is growth. You learn team victory over personal glory, projects created together over your solo works. Paradoxically, you shine brighter when you let go of ego for something greater."
    },
    12: {
      ko: "전생에서 당신은 물질과 일에만 집착했습니다. 효율성, 완벽함, 생산성을 추구하며 영혼의 목소리는 무시했습니다. 현실적이었지만 영적으로 메말랐고, 눈에 보이는 것만 믿었습니다. 이번 생에서는 영성과 초월, 내면의 평화를 찾는 것이 최종 여정입니다. 명상, 예술, 자연 속에서 보이지 않는 세계와 연결되세요. 모든 것을 내려놓고 우주와 하나가 되는 경험, 그것이 당신 영혼의 궁극적 목적지입니다.",
      en: "In past lives, you were obsessed only with material and work. Pursuing efficiency, perfection, productivity, you ignored your soul's voice. You were practical but spiritually dry, believed only what you could see. In this life, finding spirituality, transcendence, and inner peace is your final journey. Connect with the invisible world through meditation, art, nature. The experience of letting everything go and becoming one with the universe—that is your soul's ultimate destination."
    },
  };

  return directions[house]?.[isKo ? 'ko' : 'en'] || '';
}
