/**
 * 일간(10) × 서양 황도 원소(4: fire/earth/air/water) 교차해석.
 *
 * 동서양 두 시스템이 같은 한 사람의 다른 측면을 본다는 전제 위에서,
 * 일간(나의 본성)과 태양 별자리 원소(외적 표현)가 만났을 때의 시너지/긴장을 짚는다.
 *
 * 키 형식: `${dayMaster}-${zodiacElement}` — 예: '갑-fire'.
 */

import type { BilingualText, HeavenlyStem } from '../../types/core';

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';

export interface CrossEntry {
  synergy: BilingualText;
  tension: BilingualText;
  advice: BilingualText;
}

type CrossMap = Record<HeavenlyStem, Record<ZodiacElement, CrossEntry>>;

export const DAYMASTER_ZODIAC_CROSS: CrossMap = {
  갑: {
    fire: {
      synergy: { ko: '큰 나무가 햇빛을 받아 더 크게 자라요 — 카리스마 폭발.', en: 'Great tree under the sun — charisma erupts.' },
      tension: { ko: '확장 속도가 빨라 뿌리 약화에 주의해요.', en: 'Fast expansion may weaken roots.' },
      advice: { ko: '큰 비전을 쪼개 단계별로 가세요.', en: 'Slice the grand vision into stages.' },
    },
    earth: {
      synergy: { ko: '땅 위의 큰 나무 — 안정적인 성장이 가능해요.', en: 'Great tree on solid earth — steady growth.' },
      tension: { ko: '안정에 갇혀 도전을 놓칠 수 있어요.', en: 'Stability can trap you out of challenge.' },
      advice: { ko: '안정의 6, 도전의 4를 유지하세요.', en: 'Keep 6 parts stability, 4 parts challenge.' },
    },
    air: {
      synergy: { ko: '바람 받은 큰 나무 — 사상이 멀리 퍼져요.', en: 'Wind-caught tree — ideas travel far.' },
      tension: { ko: '말이 행동을 앞서기 쉬워요.', en: 'Words easily race ahead of action.' },
      advice: { ko: '발표 전에 시제품을 만드세요.', en: 'Build a prototype before announcing.' },
    },
    water: {
      synergy: { ko: '물을 충분히 받은 큰 나무 — 지혜로운 성장.', en: 'Well-watered tree — wise growth.' },
      tension: { ko: '감정 과잉이 추진력을 약화시킬 수 있어요.', en: 'Emotional flood may dilute drive.' },
      advice: { ko: '감정을 글로 정리하고 행동으로 옮기세요.', en: 'Process feeling in writing, then act.' },
    },
  },
  을: {
    fire: {
      synergy: { ko: '꽃이 햇빛에 활짝 — 표현력 폭발.', en: 'Flower in the sun — expression bursts.' },
      tension: { ko: '쉽게 시들 수 있어 휴식이 필수.', en: 'Wilts easily — rest is essential.' },
      advice: { ko: '주 1회 완전 휴식의 날을 두세요.', en: 'Keep one full rest day a week.' },
    },
    earth: {
      synergy: { ko: '비옥한 땅의 꽃 — 단단히 뿌리내려요.', en: 'Flower in fertile soil — roots deep.' },
      tension: { ko: '한곳에 너무 오래 머무를 수 있어요.', en: 'May stay in one place too long.' },
      advice: { ko: '1년에 한 번 환경을 의도적으로 바꾸세요.', en: 'Intentionally change environment once a year.' },
    },
    air: {
      synergy: { ko: '바람결의 덩굴 — 적응력이 자기 자산.', en: 'Vine on the wind — adaptability is asset.' },
      tension: { ko: '뿌리가 얕아 쉽게 흔들려요.', en: 'Shallow roots — easily shaken.' },
      advice: { ko: '핵심 신념 한 가지를 고정하세요.', en: 'Anchor one core belief.' },
    },
    water: {
      synergy: { ko: '시냇가의 꽃 — 감수성과 매력이 풍부해요.', en: 'Flower by the stream — rich sensitivity and charm.' },
      tension: { ko: '감정에 잠겨 결정이 늦어요.', en: 'Drowns in feeling — decisions delay.' },
      advice: { ko: '결정 기한을 미리 종이에 적어두세요.', en: 'Write decision deadlines on paper in advance.' },
    },
  },
  병: {
    fire: {
      synergy: { ko: '태양에 태양 — 카리스마 최대치.', en: 'Sun upon sun — peak charisma.' },
      tension: { ko: '번아웃 위험이 가장 큰 조합.', en: 'Highest burnout risk combo.' },
      advice: { ko: '에너지 관리가 인생 핵심 기술.', en: 'Energy management is your core life skill.' },
    },
    earth: {
      synergy: { ko: '대지를 비추는 태양 — 영향력의 안정화.', en: 'Sun warming the earth — influence stabilized.' },
      tension: { ko: '느린 성과에 답답함을 느낄 수 있어요.', en: 'May feel impatient with slow results.' },
      advice: { ko: '결과보다 과정을 즐기는 연습.', en: 'Practice enjoying the process over the result.' },
    },
    air: {
      synergy: { ko: '바람 받은 햇빛 — 영향력이 멀리 퍼져요.', en: 'Sun-on-wind — influence travels far.' },
      tension: { ko: '말이 너무 많아질 수 있어요.', en: 'May talk too much.' },
      advice: { ko: '듣는 시간을 두 배로 늘리세요.', en: 'Double your listening time.' },
    },
    water: {
      synergy: { ko: '바다 위의 태양 — 신비롭고 풍요로워요.', en: 'Sun on the sea — mysterious and rich.' },
      tension: { ko: '열정과 우울이 반복돼요.', en: 'Passion and depression alternate.' },
      advice: { ko: '감정 기록 루틴을 만드세요.', en: 'Build an emotion-journaling routine.' },
    },
  },
  정: {
    fire: {
      synergy: { ko: '햇빛 아래 촛불 — 따뜻한 영혼.', en: 'Candle in sunlight — warm soul.' },
      tension: { ko: '존재감이 과부하될 수 있어요.', en: 'Presence may overload.' },
      advice: { ko: '내향과 외향 시간을 명확히 분리하세요.', en: 'Clearly separate intro/extro times.' },
    },
    earth: {
      synergy: { ko: '벽난로의 불 — 가정적 안정.', en: 'Hearth fire — domestic stability.' },
      tension: { ko: '안전권에 갇히기 쉬워요.', en: 'Easily trapped in comfort zone.' },
      advice: { ko: '매년 새로운 도전 한 가지를 정하세요.', en: 'Pick one new challenge each year.' },
    },
    air: {
      synergy: { ko: '바람 받은 촛불 — 영감이 늘어나요.', en: 'Candle in the breeze — inspiration grows.' },
      tension: { ko: '쉽게 꺼질 수 있어 보호가 필요해요.', en: 'Easily extinguished — needs protection.' },
      advice: { ko: '에너지 보호용 의식(루틴)을 만드세요.', en: 'Create rituals to protect your energy.' },
    },
    water: {
      synergy: { ko: '물 옆 촛불 — 감성적이고 예술적.', en: 'Candle by water — emotional and artistic.' },
      tension: { ko: '눈물이 잦고 회복이 늦어요.', en: 'Frequent tears, slow recovery.' },
      advice: { ko: '예술 활동을 정기적으로 두세요.', en: 'Keep regular artistic activity.' },
    },
  },
  무: {
    fire: {
      synergy: { ko: '햇빛 받은 산 — 권위가 자라요.', en: 'Sunlit mountain — authority grows.' },
      tension: { ko: '권위적 자세가 너무 강해질 수 있어요.', en: 'Authoritative stance may grow too strong.' },
      advice: { ko: '귀를 여는 시간을 의도적으로 두세요.', en: 'Intentionally make time to listen.' },
    },
    earth: {
      synergy: { ko: '산에 산 — 절대적 안정.', en: 'Mountain upon mountain — absolute stability.' },
      tension: { ko: '변화에 저항하는 굳어짐 위험.', en: 'Risk of rigidity against change.' },
      advice: { ko: '의도적으로 새 사람·새 책을 만나세요.', en: 'Intentionally meet new people and books.' },
    },
    air: {
      synergy: { ko: '바람이 부는 산 — 사상이 자라요.', en: 'Wind on the mountain — ideas grow.' },
      tension: { ko: '말과 행동이 어긋날 수 있어요.', en: 'Words and action may diverge.' },
      advice: { ko: '말한 것을 기록하고 한 달 후 점검하세요.', en: 'Record promises, audit them after a month.' },
    },
    water: {
      synergy: { ko: '강을 품은 산 — 깊이와 무게가 함께.', en: 'Mountain holding a river — depth and weight together.' },
      tension: { ko: '감정이 누적되면 폭발 가능.', en: 'Bottled emotion may erupt.' },
      advice: { ko: '소소한 감정을 그때그때 흘려보내세요.', en: 'Release small emotions as they come.' },
    },
  },
  기: {
    fire: {
      synergy: { ko: '해 받은 평야 — 작물이 풍성하게 자라요.', en: 'Sunlit plain — crops grow abundant.' },
      tension: { ko: '뜨거움에 마를 위험.', en: 'Risk of drying from too much heat.' },
      advice: { ko: '냉정함을 의도적으로 챙기세요.', en: 'Intentionally keep your cool.' },
    },
    earth: {
      synergy: { ko: '평야에 평야 — 모두를 품는 자비.', en: 'Plain upon plain — embraces all.' },
      tension: { ko: '너무 많은 짐을 진 채 무거워져요.', en: 'May get heavy carrying too many loads.' },
      advice: { ko: '거절 연습을 평생 과제로 두세요.', en: 'Practice saying no as a lifelong task.' },
    },
    air: {
      synergy: { ko: '바람 받은 평야 — 정보의 통로.', en: 'Wind-swept plain — channel of information.' },
      tension: { ko: '소문에 휘둘리기 쉬워요.', en: 'Easily swayed by rumors.' },
      advice: { ko: '1차 정보만 신뢰하는 습관을 들이세요.', en: 'Habit of trusting only first-hand info.' },
    },
    water: {
      synergy: { ko: '강이 흐르는 평야 — 풍요의 땅.', en: 'Plain with a flowing river — abundant land.' },
      tension: { ko: '진흙처럼 정체될 수 있어요.', en: 'May stagnate like mud.' },
      advice: { ko: '결단을 흘려보내는 루틴을 만드세요.', en: 'Make a routine that flushes decisions through.' },
    },
  },
  경: {
    fire: {
      synergy: { ko: '불에 단련된 강철 — 결단의 칼.', en: 'Steel tempered by fire — blade of decision.' },
      tension: { ko: '쉽게 폭발하고 외상 위험.', en: 'Easily explodes — injury risk.' },
      advice: { ko: '결정 후 24시간 유예를 두는 습관.', en: 'Habit: 24-hour grace after a decision.' },
    },
    earth: {
      synergy: { ko: '광산의 광물 — 단단하고 정직.', en: 'Mineral in the mine — solid and honest.' },
      tension: { ko: '너무 굳어 융통성 잃을 수 있어요.', en: 'May harden, losing flexibility.' },
      advice: { ko: '농담과 여백을 의도적으로 챙기세요.', en: 'Make room for jokes and slack.' },
    },
    air: {
      synergy: { ko: '바람 받은 검 — 결단이 멀리 퍼져요.', en: 'Sword in the wind — decisions travel far.' },
      tension: { ko: '말이 칼처럼 사람을 베요.', en: 'Words can cut like a sword.' },
      advice: { ko: '비판은 문서, 칭찬은 입으로.', en: 'Critique in writing, praise out loud.' },
    },
    water: {
      synergy: { ko: '물에 씻긴 검 — 정의와 자비의 균형.', en: 'Sword washed in water — balance of justice and mercy.' },
      tension: { ko: '냉정함이 너무 강해질 수 있어요.', en: 'May become too cold.' },
      advice: { ko: '주 1회 누군가에게 따뜻함을 표현하세요.', en: 'Express warmth to someone once a week.' },
    },
  },
  신: {
    fire: {
      synergy: { ko: '불에 정련된 보석 — 가장 빛나는 결과물.', en: 'Gem refined by fire — most brilliant output.' },
      tension: { ko: '과열로 까다로워질 수 있어요.', en: 'May get pickier under heat.' },
      advice: { ko: '완벽 대신 80% 완성을 받아들이세요.', en: 'Accept 80% over perfection.' },
    },
    earth: {
      synergy: { ko: '광맥의 보석 — 차곡차곡 빛나는 부.', en: 'Gem in the vein — wealth that shines steadily.' },
      tension: { ko: '드러나지 않아 인정받기 늦어요.', en: 'Hidden away — recognition arrives late.' },
      advice: { ko: '자기 작품을 사람들에게 보여주는 자리를 만드세요.', en: 'Create occasions to show your work.' },
    },
    air: {
      synergy: { ko: '바람 받은 보석 — 자기 빛을 멀리 퍼뜨려요.', en: 'Gem in the wind — radiance carries far.' },
      tension: { ko: '비판이 신랄해질 수 있어요.', en: 'Critique may turn cutting.' },
      advice: { ko: '비판 앞에 칭찬을 두 가지 두세요.', en: 'Front any critique with two compliments.' },
    },
    water: {
      synergy: { ko: '물에 씻긴 보석 — 깨끗한 매력.', en: 'Gem washed in water — pure charm.' },
      tension: { ko: '예민함이 일상 피로를 키워요.', en: 'Sensitivity builds daily fatigue.' },
      advice: { ko: '에너지 회복 루틴 두 가지를 정해두세요.', en: 'Lock in two energy-recovery routines.' },
    },
  },
  임: {
    fire: {
      synergy: { ko: '햇빛 받은 바다 — 활기와 깊이.', en: 'Sunlit ocean — vitality and depth.' },
      tension: { ko: '감정 기복이 클 수 있어요.', en: 'Mood swings may amplify.' },
      advice: { ko: '하루 한 번 호흡 명상.', en: 'One breath-meditation per day.' },
    },
    earth: {
      synergy: { ko: '둑이 있는 바다 — 깊이가 통제돼요.', en: 'Sea with a dam — depth under control.' },
      tension: { ko: '관성에 묶일 수 있어요.', en: 'May be bound by inertia.' },
      advice: { ko: '연 1회 큰 이동·여행을 두세요.', en: 'One big move/travel per year.' },
    },
    air: {
      synergy: { ko: '바람 부는 바다 — 사상이 거대 파도가 돼요.', en: 'Sea in the wind — ideas become great waves.' },
      tension: { ko: '큰 그림에 빠져 디테일을 놓쳐요.', en: 'Lost in big picture — missing detail.' },
      advice: { ko: '체크리스트를 가까이 두세요.', en: 'Keep a checklist close.' },
    },
    water: {
      synergy: { ko: '바다에 바다 — 직관과 지혜의 정수.', en: 'Sea upon sea — essence of intuition and wisdom.' },
      tension: { ko: '우울 깊이가 위험할 수 있어요.', en: 'Depth of melancholy may be dangerous.' },
      advice: { ko: '햇빛과 사람과의 접촉을 의도적으로 챙기세요.', en: 'Intentionally seek sun and people.' },
    },
  },
  계: {
    fire: {
      synergy: { ko: '햇빛 받은 빗방울 — 무지개처럼 다채로워요.', en: 'Raindrop in sunlight — rainbow-colored.' },
      tension: { ko: '쉽게 증발해 사라질 수 있어요.', en: 'Easily evaporates — disappears.' },
      advice: { ko: '에너지 보호용 루틴을 두 가지 두세요.', en: 'Keep two energy-protection routines.' },
    },
    earth: {
      synergy: { ko: '대지 위의 비 — 부드럽게 적셔주는 사람.', en: 'Rain on the earth — gently moistens others.' },
      tension: { ko: '너무 헌신해서 자기를 잃을 수 있어요.', en: 'May lose self in devotion.' },
      advice: { ko: '내 시간 30%를 무조건 자기에게 쓰세요.', en: 'Use 30% of your time strictly for yourself.' },
    },
    air: {
      synergy: { ko: '바람 부는 안개 — 신비롭게 흩어져요.', en: 'Mist in the wind — scatters mysteriously.' },
      tension: { ko: '말이 모호해질 수 있어요.', en: 'Speech may grow vague.' },
      advice: { ko: '결론을 먼저 말하는 화법을 익히세요.', en: 'Learn to lead speech with the conclusion.' },
    },
    water: {
      synergy: { ko: '물에 물 — 최고의 직관과 영성.', en: 'Water upon water — peak intuition and spirit.' },
      tension: { ko: '경계가 사라지기 쉬워요.', en: 'Boundaries easily disappear.' },
      advice: { ko: '하루 시작 시 자기 의도를 종이에 적으세요.', en: 'Write daily intentions on paper each morning.' },
    },
  },
};
