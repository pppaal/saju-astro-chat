/**
 * 격국(格局) 해석 — 사주 8자에서 도출되는 19종 인생 구조.
 * /lib/saju/geokguk.ts 가 산출하는 `GeokgukType` 키를 그대로 사용한다.
 */

import type { BilingualText, GeokgukType } from '../../types/core';

export interface GeokgukEntry {
  hanja: string;
  shortName: BilingualText;
  archetype: BilingualText;
  strength: BilingualText;
  shadow: BilingualText;
  career: BilingualText;
  advice: BilingualText;
}

export const GEOKGUK_INTERPRETATIONS: Record<GeokgukType, GeokgukEntry> = {
  jeonggwan: {
    hanja: '正官格',
    shortName: { ko: '정관격', en: 'Proper Officer' },
    archetype: { ko: '규범과 명예 속에서 빛나는 모범생형', en: 'Exemplar shining within norms and honor' },
    strength: { ko: '책임감, 신뢰, 사회적 균형 감각', en: 'Responsibility, trust, social balance' },
    shadow: { ko: '체면에 갇혀 본심을 잃거나 융통성을 잃기 쉬워요.', en: 'Risk: trapped by appearance, losing flexibility.' },
    career: { ko: '공직·법조·관리·교육·기획처럼 정도(正道)가 자산인 분야', en: 'Public service, law, management, education — fields where the right path is the asset' },
    advice: { ko: '원칙은 지키되 자기 본심을 잃지 마세요.', en: 'Keep principles, but never lose your true heart.' },
  },
  pyeongwan: {
    hanja: '偏官格',
    shortName: { ko: '편관격(칠살)', en: 'Seven Killings' },
    archetype: { ko: '압박을 권력으로 바꾸는 야망가형', en: 'Ambitious type who turns pressure into power' },
    strength: { ko: '결단력, 위기 돌파력, 카리스마', en: 'Decisiveness, crisis breakthrough, charisma' },
    shadow: { ko: '과한 통제욕과 폭주가 가장 큰 약점이에요.', en: 'Excess control and runaway energy are the weakness.' },
    career: { ko: '군경·법조·정치·대형 프로젝트 리더', en: 'Military, law, politics, leading big projects' },
    advice: { ko: '힘을 가졌을 때 어디에 쓸지 매일 점검하세요.', en: 'When you have power, audit daily where you use it.' },
  },
  jeongin: {
    hanja: '正印格',
    shortName: { ko: '정인격', en: 'Proper Seal' },
    archetype: { ko: '지식과 어른의 보호 속에서 자라는 학자형', en: 'Scholar nurtured under knowledge and elder protection' },
    strength: { ko: '학습력, 직관, 따뜻한 멘토십', en: 'Learning power, intuition, warm mentorship' },
    shadow: { ko: '의존성·결정 회피·실행 약함을 조심해요.', en: 'Watch for dependency, avoidance, and weak execution.' },
    career: { ko: '교육·연구·의료·상담·문헌', en: 'Education, research, medicine, counseling, literature' },
    advice: { ko: '배운 것은 반드시 행동으로 옮기세요.', en: 'Always translate what you learn into action.' },
  },
  pyeongin: {
    hanja: '偏印格',
    shortName: { ko: '편인격', en: 'Off Seal' },
    archetype: { ko: '비주류 지식과 직관으로 살아가는 신비형', en: 'Mystic living on alt-knowledge and intuition' },
    strength: { ko: '독창성, 영감, 깊이', en: 'Originality, inspiration, depth' },
    shadow: { ko: '고립·우울·현실 도피 경향을 경계해요.', en: 'Beware isolation, depression, and reality avoidance.' },
    career: { ko: '심리·종교·예술·연구·테크 깊은 분야', en: 'Psychology, religion, art, research, deep-tech' },
    advice: { ko: '머릿속 세계를 현실에 풀어내는 다리를 만드세요.', en: 'Build bridges from inner world to outer reality.' },
  },
  siksin: {
    hanja: '食神格',
    shortName: { ko: '식신격', en: 'Eating God' },
    archetype: { ko: '여유와 표현이 자산인 향유·창작형', en: 'Enjoyer-creator whose ease and expression are assets' },
    strength: { ko: '창의성, 따뜻함, 베푸는 마음', en: 'Creativity, warmth, generosity' },
    shadow: { ko: '게으름·과식·자기만족에 빠지지 않게 해요.', en: 'Avoid laziness, overindulgence, complacency.' },
    career: { ko: '요리·콘텐츠·디자인·교육·문화 비즈니스', en: 'Cooking, content, design, education, cultural business' },
    advice: { ko: '재능을 안에 두지 말고 세상으로 흘려보내세요.', en: 'Do not hoard talent — release it to the world.' },
  },
  sanggwan: {
    hanja: '傷官格',
    shortName: { ko: '상관격', en: 'Hurting Officer' },
    archetype: { ko: '비판력과 재능으로 기성을 흔드는 혁신가형', en: 'Innovator who shakes the establishment with critique and talent' },
    strength: { ko: '재기, 표현력, 비판적 사고', en: 'Wit, expression, critical thinking' },
    shadow: { ko: '말로 인한 갈등·구설수가 가장 큰 위험이에요.', en: 'Word-driven conflicts and rumors are the biggest risk.' },
    career: { ko: '예술·언론·기획·연구·법조의 비판적 영역', en: 'Critical arenas in art, journalism, planning, research, law' },
    advice: { ko: '날카로운 입을 가진 만큼 따뜻한 입도 함께 두세요.', en: 'Carry a warm mouth alongside the sharp one.' },
  },
  jeongjae: {
    hanja: '正財格',
    shortName: { ko: '정재격', en: 'Proper Wealth' },
    archetype: { ko: '성실한 노동으로 부를 쌓는 안정형', en: 'Stable type who builds wealth by honest labor' },
    strength: { ko: '근면, 책임, 가정적 안정', en: 'Diligence, responsibility, domestic stability' },
    shadow: { ko: '인색함·시야 좁음·변화 거부를 경계해요.', en: 'Beware stinginess, narrow view, resistance to change.' },
    career: { ko: '금융·관리·전문직·자영업의 정직한 사업', en: 'Finance, management, professions, honest self-employment' },
    advice: { ko: '쌓는 만큼 쓰는 법도 함께 익히세요.', en: 'Learn to spend in proportion to how you save.' },
  },
  pyeonjae: {
    hanja: '偏財格',
    shortName: { ko: '편재격', en: 'Off Wealth' },
    archetype: { ko: '흐름과 기회로 부를 만드는 사업가형', en: 'Entrepreneur shaping wealth through flow and opportunity' },
    strength: { ko: '사교성, 기획력, 큰 그림', en: 'Sociability, planning, big-picture vision' },
    shadow: { ko: '과소비·여러 곳에 한꺼번에 손대는 산만함을 경계해요.', en: 'Beware overspending and chasing too many ventures.' },
    career: { ko: '영업·무역·부동산·투자·서비스', en: 'Sales, trade, real estate, investment, service' },
    advice: { ko: '들어온 돈의 일부는 반드시 묶어두세요.', en: 'Always lock away a portion of incoming cash.' },
  },
  geonrok: {
    hanja: '建祿格',
    shortName: { ko: '건록격', en: 'Established Stipend' },
    archetype: { ko: '실력과 자존감이 단단한 자수성가형', en: 'Self-made type with rock-solid skill and self-worth' },
    strength: { ko: '자립심, 책임감, 강한 실행력', en: 'Self-reliance, responsibility, strong execution' },
    shadow: { ko: '고집과 외고집이 관계를 끊을 수 있어요.', en: 'Stubbornness can cut relationships.' },
    career: { ko: '전문직·자영업·창업·1인 사업', en: 'Professions, self-employment, founding, solo ventures' },
    advice: { ko: '협력자를 두는 연습이 평생 과제예요.', en: 'Lifelong practice: keep collaborators close.' },
  },
  yangin: {
    hanja: '羊刃格',
    shortName: { ko: '양인격', en: 'Yangin (Sheep Blade)' },
    archetype: { ko: '강한 칼처럼 결정적 한 방을 가진 무인형', en: 'Warrior type with a sharp blade — decisive strike' },
    strength: { ko: '담대함, 결단, 위기 정면 돌파', en: 'Boldness, decision, head-on crisis breakthrough' },
    shadow: { ko: '과격함·사고·외상·구설을 조심해요.', en: 'Watch for recklessness, accidents, injury, gossip.' },
    career: { ko: '군경·의료(외과)·스포츠·구조·경비', en: 'Military, surgery, sports, rescue, security' },
    advice: { ko: '날카로운 힘을 모으는 시간을 의식적으로 만드세요.', en: 'Consciously make time to gather your sharpened force.' },
  },
  jonga: {
    hanja: '從兒格',
    shortName: { ko: '종아격', en: 'Following the Child' },
    archetype: { ko: '식상(자식·표현) 기운에 인생을 맡기는 창작자형', en: 'Creator type whose life flows with food-god energy' },
    strength: { ko: '표현력, 양육 본능, 창작 에너지', en: 'Expression, nurturing instinct, creative energy' },
    shadow: { ko: '자기 욕망보다 자식·작품·표현에 함몰될 수 있어요.', en: 'Risk being absorbed in offspring or work over self-desire.' },
    career: { ko: '교육·창작·콘텐츠·자녀 관련 사업', en: 'Education, creation, content, child-related business' },
    advice: { ko: '나를 위한 표현도 잊지 마세요.', en: 'Do not forget expression for yourself.' },
  },
  jongjae: {
    hanja: '從財格',
    shortName: { ko: '종재격', en: 'Following Wealth' },
    archetype: { ko: '재물의 흐름에 인생을 맡기는 사업가형', en: 'Entrepreneur whose life follows wealth flow' },
    strength: { ko: '사업 감각, 돈을 보는 눈', en: 'Business instinct, eye for money' },
    shadow: { ko: '가족·관계가 사업 뒤로 밀릴 수 있어요.', en: 'Family and relationships may slip behind business.' },
    career: { ko: '대규모 사업·투자·무역·금융', en: 'Large-scale business, investment, trade, finance' },
    advice: { ko: '돈 외에 잡아야 할 것을 매년 한 가지씩 정하세요.', en: 'Each year, name one non-money thing you must hold.' },
  },
  jongsal: {
    hanja: '從殺格',
    shortName: { ko: '종살격', en: 'Following Killings' },
    archetype: { ko: '극한 압박을 권력으로 전환하는 무인형', en: 'Warrior type who converts extreme pressure into power' },
    strength: { ko: '극단 환경에서 빛나는 생존력', en: 'Survival force that shines in extreme conditions' },
    shadow: { ko: '평온한 일상이 오히려 권태롭게 느껴져요.', en: 'Calm daily life may feel tedious.' },
    career: { ko: '군경·고위직·재난·위기 관리', en: 'Military, top brass, disaster, crisis management' },
    advice: { ko: '평온한 시기에도 자기를 갈고닦는 루틴을 두세요.', en: 'Even in calm, keep a self-sharpening routine.' },
  },
  jonggang: {
    hanja: '從强格',
    shortName: { ko: '종강격', en: 'Following Strength' },
    archetype: { ko: '비겁(나)의 기운이 절대적인 1인 군주형', en: 'Solo sovereign — Self-energy is absolute' },
    strength: { ko: '독립심, 자존감, 자기 길', en: 'Independence, self-worth, own path' },
    shadow: { ko: '독선과 외고집으로 인간관계가 좁아져요.', en: 'Self-righteousness and stubbornness narrow your circle.' },
    career: { ko: '독립 전문가·1인 창업·예술가', en: 'Independent expert, solo founder, artist' },
    advice: { ko: '함께 가는 사람을 의도적으로 만드세요.', en: 'Intentionally cultivate companions for the road.' },
  },
  gokjik: {
    hanja: '曲直格',
    shortName: { ko: '곡직격', en: 'Curving-Straight (Wood)' },
    archetype: { ko: '목 기운으로 뻗어나가는 성장형', en: 'Growth type extending with wood energy' },
    strength: { ko: '추진력, 성장, 도덕성', en: 'Drive, growth, morality' },
    shadow: { ko: '한 번 정한 방향을 굽히지 않아 부러질 위험이 있어요.', en: 'Risk: refusing to bend may snap you.' },
    career: { ko: '교육·환경·농업·창업 리더', en: 'Education, environment, agriculture, founding leadership' },
    advice: { ko: '굽힐 줄 아는 갈대의 지혜를 배우세요.', en: 'Learn the reed\'s wisdom of bending.' },
  },
  yeomsang: {
    hanja: '炎上格',
    shortName: { ko: '염상격', en: 'Blazing Upward (Fire)' },
    archetype: { ko: '화 기운으로 타오르는 무대형', en: 'Stage type ablaze with fire energy' },
    strength: { ko: '카리스마, 표현, 대중성', en: 'Charisma, expression, popular appeal' },
    shadow: { ko: '과열·번아웃·감정 폭발을 조심해요.', en: 'Watch overheating, burnout, emotional blowouts.' },
    career: { ko: '엔터테인먼트·미디어·교육·영업', en: 'Entertainment, media, education, sales' },
    advice: { ko: '꺼지지 않게 의도적으로 휴식을 설계하세요.', en: 'Design rest intentionally so the flame does not die.' },
  },
  gasaek: {
    hanja: '稼穡格',
    shortName: { ko: '가색격', en: 'Sowing-Reaping (Earth)' },
    archetype: { ko: '토 기운으로 쌓는 농부형', en: 'Farmer type accumulating with earth energy' },
    strength: { ko: '인내, 신뢰, 축적의 힘', en: 'Patience, trust, power of accumulation' },
    shadow: { ko: '변화에 둔감하고 굳어지기 쉬워요.', en: 'Risk: insensitive to change, prone to rigidity.' },
    career: { ko: '부동산·농업·금융·전통 산업', en: 'Real estate, agriculture, finance, traditional industries' },
    advice: { ko: '쌓은 것 위에 새 흐름을 더하는 용기를 가지세요.', en: 'Have the courage to add new flow over what you have built.' },
  },
  jonghyeok: {
    hanja: '從革格',
    shortName: { ko: '종혁격', en: 'Following Reform (Metal)' },
    archetype: { ko: '금 기운으로 정련하는 장인형', en: 'Master refiner type with metal energy' },
    strength: { ko: '정밀함, 결단, 미적 감각', en: 'Precision, decisiveness, aesthetic sense' },
    shadow: { ko: '냉정함과 비판이 관계에 균열을 만들어요.', en: 'Coldness and critique fracture relationships.' },
    career: { ko: '법조·금융·디자인·감정·수술', en: 'Law, finance, design, appraisal, surgery' },
    advice: { ko: '날을 세운 뒤엔 반드시 다시 부드럽게 거두세요.', en: 'After sharpening the blade, sheath it gently.' },
  },
  yunha: {
    hanja: '潤下格',
    shortName: { ko: '윤하격', en: 'Moistening Downward (Water)' },
    archetype: { ko: '수 기운으로 깊이 흐르는 지혜자형', en: 'Wise sage flowing deep with water energy' },
    strength: { ko: '지혜, 적응력, 직관', en: 'Wisdom, adaptability, intuition' },
    shadow: { ko: '우울·고립·결정 회피를 경계해요.', en: 'Beware depression, isolation, indecision.' },
    career: { ko: '연구·금융·IT·예술·치유', en: 'Research, finance, IT, art, healing' },
    advice: { ko: '흐르되 한 번씩 멈춰서 형태를 잡으세요.', en: 'Flow — but pause now and then to take form.' },
  },
};
