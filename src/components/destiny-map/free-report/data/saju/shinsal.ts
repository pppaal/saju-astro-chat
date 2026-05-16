/**
 * 신살(神煞) 해석 — 사주 8자에서 발현되는 길흉 표식.
 *
 * /lib/saju/shinsal.ts 의 출력은 `ShinsalHit[]` (이름 + 종류 + 위치).
 * 가장 자주 노출되는 상위 신살 약 30종에 대한 짧은 해석을 모은다.
 */

import type { BilingualText } from '../../types/core';

export interface ShinsalEntry {
  hanja: string;
  category: '길신' | '흉신' | '도화/연애' | '역마/이동' | '재물' | '귀인' | '학업';
  shortMeaning: BilingualText;
  effect: BilingualText;
  advice: BilingualText;
}

export const SHINSAL_INTERPRETATIONS: Record<string, ShinsalEntry> = {
  천을귀인: {
    hanja: '天乙貴人',
    category: '귀인',
    shortMeaning: { ko: '하늘이 보낸 귀인 — 최고의 길신', en: 'Heaven-sent benefactor — supreme auspicious star' },
    effect: {
      ko: '위기 때마다 도와주는 사람이 나타나고, 인덕이 평생 따라요.',
      en: 'A helper appears in every crisis — lifelong people-luck follows.',
    },
    advice: {
      ko: '받은 도움은 다른 이에게 흘려보내야 운이 이어져요.',
      en: 'Pass on the help you receive to keep the luck flowing.',
    },
  },
  태극귀인: {
    hanja: '太極貴人',
    category: '귀인',
    shortMeaning: { ko: '학문과 예술의 신성한 귀인', en: 'Sacred patron of scholarship and art' },
    effect: { ko: '지혜·학업·예술적 재능에 큰 도움을 받아요.', en: 'Great support in wisdom, study, and artistic talent.' },
    advice: { ko: '배움의 길을 끝까지 가세요.', en: 'Walk the path of learning to the end.' },
  },
  문창귀인: {
    hanja: '文昌貴人',
    category: '학업',
    shortMeaning: { ko: '학문·시험·글재주의 길신', en: 'Patron of scholarship, exams, and writing' },
    effect: { ko: '시험·자격증·글쓰기에서 두각을 보여요.', en: 'Stands out in exams, certifications, and writing.' },
    advice: { ko: '글로 자기를 표현하는 일을 늘려보세요.', en: 'Expand work that expresses you through writing.' },
  },
  학당귀인: {
    hanja: '學堂貴人',
    category: '학업',
    shortMeaning: { ko: '학문의 자리에 앉는 귀인', en: 'Patron of seats in scholarship' },
    effect: { ko: '교육·연구·전문 자격 분야에서 빛나요.', en: 'Shines in education, research, professional credentialing.' },
    advice: { ko: '평생 학습을 직업과 연결하세요.', en: 'Link lifelong learning to your career.' },
  },
  도화: {
    hanja: '桃花',
    category: '도화/연애',
    shortMeaning: { ko: '복숭아꽃 — 매력·연애·인기의 신살', en: 'Peach Blossom — charm, romance, popularity' },
    effect: { ko: '대인 매력이 강하고 이성에게 끌림을 받아요.', en: 'Strong interpersonal charm — draws romantic attention.' },
    advice: { ko: '매력을 무엇에 쓸지 명확히 선택하세요.', en: 'Decide clearly where to use your charm.' },
  },
  홍염살: {
    hanja: '紅艶煞',
    category: '도화/연애',
    shortMeaning: { ko: '강렬한 매력 — 짙은 도화', en: 'Intense charm — deep peach-blossom variant' },
    effect: { ko: '관능적 매력이 강하고 인기가 많지만 구설수도 따라요.', en: 'Sensual magnetism and popularity — also brings gossip.' },
    advice: { ko: '관계의 경계를 분명히 정하세요.', en: 'Set clear boundaries in relationships.' },
  },
  역마: {
    hanja: '驛馬',
    category: '역마/이동',
    shortMeaning: { ko: '말의 신살 — 이동·여행·전직', en: 'Horse Star — movement, travel, career change' },
    effect: { ko: '한 곳에 머물기 어렵고, 잦은 이동·해외·이직 운이 강해요.', en: 'Hard to stay in one place — frequent moves, overseas, job changes.' },
    advice: { ko: '움직임을 막지 말고 흐름에 직업을 맞추세요.', en: 'Do not block movement — fit your career to the flow.' },
  },
  지살: {
    hanja: '地煞',
    category: '역마/이동',
    shortMeaning: { ko: '땅을 옮기는 신살', en: 'Land-moving star' },
    effect: { ko: '이사·부동산·환경 변화의 운이 따라요.', en: 'Luck in moving, real estate, environmental change.' },
    advice: { ko: '환경을 바꾸는 결단을 두려워하지 마세요.', en: 'Do not fear decisions that change your environment.' },
  },
  화개: {
    hanja: '華蓋',
    category: '길신',
    shortMeaning: { ko: '예술·종교·신비의 신살', en: 'Art, religion, mysticism star' },
    effect: { ko: '깊이와 영성, 고독한 창조성을 가져요.', en: 'Depth, spirituality, solitary creativity.' },
    advice: { ko: '혼자 있는 시간을 죄책감 없이 가지세요.', en: 'Spend alone time without guilt.' },
  },
  공망: {
    hanja: '空亡',
    category: '흉신',
    shortMeaning: { ko: '비어 있음 — 부재·정신적 공허', en: 'Emptiness — absence, mental void' },
    effect: { ko: '결과보다 과정에서 보람을 찾는 영적 성향이 있어요.', en: 'Spiritual tilt — finds meaning in process over outcome.' },
    advice: { ko: '눈에 보이는 성취만으로 자기를 평가하지 마세요.', en: 'Do not judge yourself by visible achievements alone.' },
  },
  백호: {
    hanja: '白虎',
    category: '흉신',
    shortMeaning: { ko: '백호 살 — 강한 흉살, 사고·다툼', en: 'White Tiger — strong inauspicious; accidents, conflicts' },
    effect: { ko: '강한 추진력과 사고 위험이 함께 따라와요.', en: 'Strong drive paired with accident risk.' },
    advice: { ko: '운전·운동·날카로운 도구 사용 시 더 신중히.', en: 'Be extra careful driving, exercising, using sharp tools.' },
  },
  괴강: {
    hanja: '魁罡',
    category: '흉신',
    shortMeaning: { ko: '카리스마와 극단을 함께 가진 강살', en: 'Strong star — charisma paired with extremes' },
    effect: { ko: '리더십이 강하지만 극단적 성향과 결혼 늦음 가능.', en: 'Strong leadership; extremes and late marriage possible.' },
    advice: { ko: '큰 힘을 행사할 때 늘 책임을 함께 보세요.', en: 'Whenever you use big power, see the responsibility with it.' },
  },
  양인: {
    hanja: '羊刃',
    category: '흉신',
    shortMeaning: { ko: '양날의 칼 — 결단력과 사고 위험', en: 'Sheep blade — decisiveness with accident risk' },
    effect: { ko: '결단력 최고 — 다만 폭주·외상 주의.', en: 'Top decisiveness — beware reckless surge and injury.' },
    advice: { ko: '결정 직후 잠깐 멈춰 호흡하세요.', en: 'Pause to breathe right after a decision.' },
  },
  겁살: {
    hanja: '劫煞',
    category: '흉신',
    shortMeaning: { ko: '빼앗기는 살 — 도난·손재', en: 'Plunder Star — theft, loss' },
    effect: { ko: '재물 손실·사기·신뢰 깨짐 가능성이 있어요.', en: 'Risk of wealth loss, fraud, broken trust.' },
    advice: { ko: '큰 계약은 반드시 서류와 사람을 두 번 확인.', en: 'Double-check papers AND people on big contracts.' },
  },
  망신: {
    hanja: '亡神',
    category: '흉신',
    shortMeaning: { ko: '체면 손상의 살', en: 'Disgrace Star' },
    effect: { ko: '구설·실수·체면 손상에 노출되기 쉬워요.', en: 'Exposed to rumors, mistakes, loss of face.' },
    advice: { ko: '말과 SNS를 가장 신중하게 다루세요.', en: 'Handle speech and SNS most carefully.' },
  },
  재살: {
    hanja: '災煞',
    category: '흉신',
    shortMeaning: { ko: '재앙의 살', en: 'Calamity Star' },
    effect: { ko: '예기치 않은 사건·사고에 노출 가능.', en: 'Exposed to sudden incidents and accidents.' },
    advice: { ko: '보험·예방·안전 점검을 일상화하세요.', en: 'Normalize insurance, prevention, safety checks.' },
  },
  육해: {
    hanja: '六害',
    category: '흉신',
    shortMeaning: { ko: '여섯 해로움 — 인간관계 마찰', en: 'Six Harms — interpersonal friction' },
    effect: { ko: '가까운 사람들과의 갈등이 운에 영향을 미쳐요.', en: 'Conflicts with close people influence your fortune.' },
    advice: { ko: '가까운 관계일수록 경계와 합의를 분명히.', en: 'The closer the bond, the clearer the boundaries and agreements.' },
  },
  천덕귀인: {
    hanja: '天德貴人',
    category: '귀인',
    shortMeaning: { ko: '하늘의 덕이 깃든 길신', en: 'Star carrying heaven\'s virtue' },
    effect: { ko: '평생 곳곳에서 보이지 않는 보호를 받아요.', en: 'Receives unseen protection throughout life.' },
    advice: { ko: '받은 덕을 사회에 환원하세요.', en: 'Give back the virtue you receive to society.' },
  },
  월덕귀인: {
    hanja: '月德貴人',
    category: '귀인',
    shortMeaning: { ko: '달의 덕이 깃든 길신', en: 'Star carrying moon\'s virtue' },
    effect: { ko: '정서적 안정과 인덕이 평생 따라와요.', en: 'Emotional stability and people-luck follow throughout life.' },
    advice: { ko: '내면의 평화를 가장 큰 자산으로 삼으세요.', en: 'Treat inner peace as your greatest asset.' },
  },
  삼합: {
    hanja: '三合',
    category: '길신',
    shortMeaning: { ko: '세 글자가 모이는 강한 합', en: 'Three-character harmony — strong alliance' },
    effect: { ko: '협력·동맹·집단 작업에서 큰 시너지가 나요.', en: 'Major synergy in cooperation, alliance, group work.' },
    advice: { ko: '팀을 만들 때 인재 셋의 조합을 의식하세요.', en: 'When building a team, mind the triad combination.' },
  },
  육합: {
    hanja: '六合',
    category: '길신',
    shortMeaning: { ko: '두 글자가 짝이 되는 합', en: 'Two-character pair harmony' },
    effect: { ko: '파트너십·연애·동업에서 좋은 짝을 만나요.', en: 'Meets a good partner in partnerships, love, joint ventures.' },
    advice: { ko: '함께 갈 한 사람을 신중히 고르세요.', en: 'Choose your one travel partner carefully.' },
  },
  복성귀인: {
    hanja: '福星貴人',
    category: '귀인',
    shortMeaning: { ko: '복을 부르는 길신', en: 'Fortune-calling auspicious star' },
    effect: { ko: '풍요·즐거움·인복이 자연스럽게 따라와요.', en: 'Abundance, joy, people-luck come naturally.' },
    advice: { ko: '받은 복을 나누는 통로를 만들어두세요.', en: 'Build a channel to share the fortune you receive.' },
  },
  금여: {
    hanja: '金輿',
    category: '재물',
    shortMeaning: { ko: '금수레 — 결혼·재물의 길신', en: 'Golden Carriage — auspicious for marriage and wealth' },
    effect: { ko: '좋은 인연과 풍요로운 가정 운이 따라요.', en: 'Good bonds and abundant family fortune.' },
    advice: { ko: '관계와 자산을 동시에 다룰 줄 알아야 해요.', en: 'Learn to handle relationships and assets at once.' },
  },
  암록: {
    hanja: '暗祿',
    category: '재물',
    shortMeaning: { ko: '숨겨진 녹봉 — 보이지 않는 재물 운', en: 'Hidden stipend — unseen wealth luck' },
    effect: { ko: '예상치 못한 곳에서 수입이 들어와요.', en: 'Income arrives from unexpected places.' },
    advice: { ko: '본업 외의 가능성에도 마음을 열어두세요.', en: 'Stay open to opportunities outside your main work.' },
  },
  천의성: {
    hanja: '天醫星',
    category: '길신',
    shortMeaning: { ko: '하늘의 의사 — 치유·돌봄의 별', en: 'Heaven Doctor — healing and care star' },
    effect: { ko: '의료·치유·상담·교육 분야에서 사명을 잘 발휘해요.', en: 'Excels in mission in medicine, healing, counseling, education.' },
    advice: { ko: '사람을 살리는 일을 직업에 녹여보세요.', en: 'Weave life-saving work into your career.' },
  },
};
