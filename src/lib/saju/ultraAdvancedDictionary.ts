/**
 * Ultra-Advanced Saju Narrative Dictionary
 *
 * 사주 명리학의 특수 격국(從格 / 化格 / 三奇)과 공망(空亡) 패턴에 대한
 * LifeReport 6차 자연화 톤(전문용어 0)을 유지하는 한국어 / 영어 narrative DB.
 *
 * - 종격 (從格) 8 종류 — 한 오행/십신에 압도적으로 치우친 결
 * - 화격 (化格) 10 종류 — 천간 합화 5쌍 × 진화격(眞)·가화격(假)
 * - 삼기 (三奇) 3 종류 — 천간 3개의 특정 조합
 * - 공망 (空亡) 패턴 4 종류 — 어느 기둥에 공망이 오는지에 따른 결
 *
 * 정통 해석 (자평진전·적천수·명리정종)을 LifeReport 자연화 톤으로 옮겼다.
 * 한자는 `hanja` 필드에만 두며 narrative 본문에는 노출하지 않는다.
 * 단정 표현 대신 경향형(~결/~사람이에요/~흐름)으로 서술한다.
 */

export type UltraAdvancedKind = '종격' | '화격' | '삼기' | '공망_pattern'

export interface UltraAdvancedEntry {
  /** 분류 — 종격 / 화격 / 삼기 / 공망 패턴 */
  kind: UltraAdvancedKind
  /** 한글 이름 (예: '종왕격') */
  name: string
  /** 한자 (예: '從旺格') */
  hanja: string
  /** 세부 타입 — '진화격' | '가화격' | 공망 위치 등 (옵션) */
  subType?: string
  /** 한국어 narrative — 2~3 문장, 자연화 톤 */
  ko: string
  /** English narrative — same content, 2~3 natural sentences */
  en: string
  /** 한 줄 요약 — 한국어 */
  meaning_ko: string
  /** Short summary — English */
  meaning_en: string
  /** 한국어 특성 키워드 (3개) */
  traits_ko: [string, string, string]
  /** English trait keywords (3) */
  traits_en: [string, string, string]
  /** 어울리는 직업 결 — 한국어 한 문장 (옵션) */
  career_ko?: string
  /** Career fit — one English sentence (optional) */
  career_en?: string
  /** 주의점 — 한국어 한 문장 (옵션) */
  warning_ko?: string
  /** Warning — one English sentence (optional) */
  warning_en?: string
}

export const ULTRA_ADVANCED_DICTIONARY: UltraAdvancedEntry[] = [
  // ──────────────────────────────────────────────
  // 1. 종격 (從格) — 8 entries
  // ──────────────────────────────────────────────
  {
    kind: '종격',
    name: '종왕격',
    hanja: '從旺格',
    ko: '자기 힘이 너무 강해서 그 강한 흐름을 그대로 따라가는 느낌이에요. 같은 결의 사람들과 모여 큰 힘을 만들 때 가장 또렷해지고, 작은 자리에 갇히면 답답함을 느끼는 흐름이에요.',
    en: 'A line so strong in itself that you simply ride your own current. You sharpen most when you gather with kindred people to make large force, and you feel cramped in small seats.',
    meaning_ko: '자기 힘의 큰 흐름을 그대로 따라가는 느낌',
    meaning_en: 'Following your own strong current as it is',
    traits_ko: ['강한 자기 느낌', '동료와의 큰 힘', '독립적 추진력'],
    traits_en: ['strong self-line', 'great force with peers', 'independent drive'],
    career_ko: '리더, 창업가, 운동선수, 단체장처럼 자기 식으로 사람을 모으는 자리가 잘 맞아요.',
    career_en: 'Leader, founder, athlete, association head — seats where you gather people by your own line — suit you.',
    warning_ko: '자기 힘에만 의지하면 외로워질 수 있으니 다른 결도 받아들이는 여유를 가져 보세요.',
    warning_en: 'Relying only on your own force can grow lonely — make room to accept other lines too.',
  },
  {
    kind: '종격',
    name: '종강격',
    hanja: '從強格',
    ko: '뒷받침해 주는 기운과 자기 기운이 함께 매우 강한 스타일이에요. 학문·정신·전통의 큰 줄기에서 자기 자리를 찾고, 깊이 쌓는 일에서 가장 빛나는 흐름이에요.',
    en: 'A line where both your supporting current and your own current run very strong together. You find your place on the great trunk of learning, spirit, and tradition — and shine most in deep accumulation.',
    meaning_ko: '학문과 정신의 큰 줄기를 따라가는 느낌',
    meaning_en: 'Following the great trunk of learning and spirit',
    traits_ko: ['깊은 학문성', '정신적 무게', '전통의 줄기'],
    traits_en: ['deep scholarliness', 'spiritual weight', 'trunk of tradition'],
    career_ko: '학자, 연구자, 종교인, 교수처럼 깊이를 쌓는 자리가 잘 어울려요.',
    career_en: 'Scholar, researcher, clergy, professor — seats that build depth — fit you.',
    warning_ko: '너무 안으로만 향하면 현실에서 멀어질 수 있으니 가끔은 바깥의 활기도 챙기세요.',
    warning_en: 'Turning inward too much can pull you from reality — make time for outward vitality.',
  },
  {
    kind: '종격',
    name: '종아격',
    hanja: '從兒格',
    ko: '자기가 만들어 내는 결과·표현·작품의 흐름을 따라가는 모습이에요. 자신을 비워 가며 무언가를 길러 내는 사람이라, 만들고 가르치는 자리에서 가장 또렷해져요.',
    en: 'A line that follows what you create, express, and bring forth. You empty yourself to grow something — you become clearest in seats of making and teaching.',
    meaning_ko: '내가 길러 내는 것의 흐름을 따라가는 느낌',
    meaning_en: 'Following what you nurture into being',
    traits_ko: ['표현의 느낌', '길러 내는 힘', '창작의 흐름'],
    traits_en: ['line of expression', 'nurturing power', 'creative flow'],
    career_ko: '작가, 예술가, 교사, 콘텐츠 제작자처럼 표현과 양육이 같이 가는 자리가 잘 맞아요.',
    career_en: 'Writer, artist, teacher, content creator — where expression and nurturing travel together — suit you.',
    warning_ko: '자기 결과물에 너무 매이면 비교에 흔들릴 수 있으니 만드는 과정 자체를 아껴 주세요.',
    warning_en: 'Clinging to outcomes can shake you by comparison — treasure the act of making itself.',
  },
  {
    kind: '종격',
    name: '종재격',
    hanja: '從財格',
    ko: '재물과 활동의 큰 흐름을 따라가는 느낌이에요. 자기 힘은 약하지만 바깥의 자원이 압도적으로 강해, 그 흐름을 자기 길로 삼아 움직일 때 가장 또렷해져요.',
    en: 'A life-pattern that follows the strong current of wealth and outer activity. Your own force is light, but outer resources run overwhelming — you make that current your road.',
    meaning_ko: '재물의 흐름을 따라가는 큰 느낌',
    meaning_en: 'Following the strong current of wealth',
    traits_ko: ['외부 활동성', '재물 감각', '큰 흐름의 느낌'],
    traits_en: ['outward energy', 'wealth sense', 'big-current flow'],
    career_ko: '사업, 영업, 금융, 무역처럼 자원 흐름이 크고 빠른 분야가 잘 어울려요.',
    career_en: 'Business, sales, finance, trade — fields where resource flow is large and swift — suit you.',
    warning_ko: '재물의 흐름이 끊기면 큰 어려움이 올 수 있으니 흐름이 살아있는 자리에 자기를 두세요.',
    warning_en: 'A break in the wealth current can hit hard — keep yourself in seats where the flow is alive.',
  },
  {
    kind: '종격',
    name: '종살격',
    hanja: '從殺格',
    ko: '강한 압력과 책임의 흐름을 정면으로 따라가는 스타일이에요. 자기 힘은 가볍지만 외부의 거센 면을 받아들여 그 안에서 자리를 잡는, 위기에서 오히려 또렷해지는 사람이에요.',
    en: 'A line that meets and follows heavy pressure and responsibility head-on. Your own force is light, yet you accept the fierce outer current and find your seat within it — you sharpen under crisis.',
    meaning_ko: '강한 압력의 면을 정면으로 따라가는 흐름',
    meaning_en: 'Following heavy pressure as a current',
    traits_ko: ['압력 수용력', '위기의 또렷함', '책임의 느낌'],
    traits_en: ['pressure capacity', 'clarity in crisis', 'line of responsibility'],
    career_ko: '군경, 외과, 위기관리, 고책임 임원처럼 거센 면을 받아내는 자리가 잘 맞아요.',
    career_en: 'Military, police, surgery, crisis management, high-responsibility executive — seats that take the fierce current — fit you.',
    warning_ko: '쉼 없이 압력만 받으면 몸이 먼저 무너지니 회복의 면을 일상에 꼭 끼워 두세요.',
    warning_en: 'Endless pressure breaks the body first — fold a recovery line into daily life.',
  },
  {
    kind: '종격',
    name: '종세격',
    hanja: '從勢格',
    ko: '자기 면이 약해서, 가장 크게 흐르는 외부의 큰 면을 따라가는 사람이에요. 시대의 큰 흐름과 자기를 맞춰 갈 때 가장 또렷해지고, 거슬러 가면 힘을 잃는 모습이에요.',
    en: 'Your own line runs light, so you follow the largest current flowing around you. You sharpen most when you align with the great tide of the times, and you lose force going against it.',
    meaning_ko: '시대의 큰 면을 따라가는 흐름',
    meaning_en: 'Following the great tide of the times',
    traits_ko: ['시대 감각', '큰 면 적응', '유연한 따라감'],
    traits_en: ['sense of the times', 'adapting to big currents', 'flexible following'],
    career_ko: '트렌드 분야, 미디어, 컨설팅처럼 큰 흐름을 빠르게 읽는 자리가 잘 어울려요.',
    career_en: 'Trend industries, media, consulting — seats that read big currents fast — suit you.',
    warning_ko: '흐름에 너무 맞추다 보면 자기 면이 옅어질 수 있으니 안의 중심도 같이 챙겨 주세요.',
    warning_en: 'Aligning too much can thin your own line — keep an inner center alongside.',
  },
  {
    kind: '종격',
    name: '종관격',
    hanja: '從官格',
    ko: '안정된 권위와 정해진 자리의 흐름을 따라가는 느낌이에요. 자기 힘은 약하지만 정통의 큰 줄기를 따라 움직일 때 가장 또렷해지는 사람이에요.',
    en: 'A line that follows the current of settled authority and established place. Your own force is light, yet you sharpen most when you move along the main trunk of orthodoxy.',
    meaning_ko: '정통의 큰 줄기를 따라가는 느낌',
    meaning_en: 'Following the main trunk of orthodoxy',
    traits_ko: ['정통의 느낌', '안정된 자리', '권위 적응'],
    traits_en: ['line of orthodoxy', 'settled seat', 'adapting to authority'],
    career_ko: '공직, 대기업, 법무, 공공기관처럼 정해진 줄기가 또렷한 자리가 잘 맞아요.',
    career_en: 'Public service, large organizations, law, public institutions — seats with a clear trunk — fit you.',
    warning_ko: '틀이 흔들리는 자리에선 길을 잃기 쉬우니 자기 결의 단단한 골격을 미리 다져 두세요.',
    warning_en: 'You can lose footing when the frame shakes — build a sturdy inner frame in advance.',
  },
  {
    kind: '종격',
    name: '종인격',
    hanja: '從印格',
    ko: '뒷받침해 주는 기운의 큰 흐름을 따라가는 스타일이에요. 학문·문서·정신적 자산이 곧 자기 길이라, 깊이 배우고 천천히 쌓는 자리에서 가장 빛나요.',
    en: 'A line that follows the great current of nurturing support. Learning, documents, and inner assets are themselves your road — you shine in deep study and slow accumulation.',
    meaning_ko: '뒷받침하는 결의 큰 흐름을 따라가는 길',
    meaning_en: 'Following the great current of nurturing support',
    traits_ko: ['깊은 흡수력', '문서의 느낌', '정신 자산'],
    traits_en: ['deep absorption', 'line of documents', 'inner assets'],
    career_ko: '학자, 교육자, 작가, 출판처럼 지식과 정신을 다루는 자리가 잘 어울려요.',
    career_en: 'Scholar, educator, writer, publishing — seats that handle knowledge and spirit — suit you.',
    warning_ko: '받아들이기만 하면 정작 자기 면이 옅어질 수 있으니 표현하고 내보내는 시간을 따로 가지세요.',
    warning_en: 'Only receiving can thin your own line — keep separate time to express and send out.',
  },

  // ──────────────────────────────────────────────
  // 2. 화격 (化格) — 5쌍 × 진/가 = 10 entries
  // ──────────────────────────────────────────────
  {
    kind: '화격',
    name: '갑기합화토격',
    hanja: '甲己合化土格',
    subType: '진화격',
    ko: '두 면이 만나 단단하고 너른 식으로 새로 태어난 흐름이에요. 변화가 완성된 진짜 합화의 면이라, 사람과 사람을 잇고 큰 자리에서 중심을 잡는 사람이에요.',
    en: 'Two lines meet and are reborn as a sturdy, broad single current. This is a true completed transformation — you connect people to people and hold the center in large seats.',
    meaning_ko: '합이 완성되어 너른 중심의 식으로 다시 태어난 흐름',
    meaning_en: 'A true completed union, reborn as a broad center',
    traits_ko: ['연결의 중심', '단단한 너름', '큰 자리 감각'],
    traits_en: ['center that connects', 'sturdy breadth', 'sense of large seats'],
    career_ko: '중재자, 조직 리더, 부동산, 공공 영역처럼 너른 자리가 잘 맞아요.',
    career_en: 'Mediator, organizational leader, real estate, public sphere — broad seats — fit you.',
  },
  {
    kind: '화격',
    name: '갑기합화토격',
    hanja: '甲己合化土格',
    subType: '가화격',
    ko: '두 면이 만나려 했지만 완전한 변화에는 닿지 못한 흐름이에요. 너름과 중심을 향하면서도 가끔 자기 본래 식으로 돌아가는 사람이라, 두 면을 오가는 매력이 있어요.',
    en: 'Two lines tried to meet but the full transformation never quite landed. You move toward breadth and center yet sometimes return to your original line — a charm of moving between two lines.',
    meaning_ko: '합이 완성에 닿지 못한 두 결의 흐름',
    meaning_en: 'Two lines whose union did not fully complete',
    traits_ko: ['두 면을 오감', '부분적 너름', '본래 결의 회귀'],
    traits_en: ['moving between two lines', 'partial breadth', 'return to original line'],
    warning_ko: '한쪽으로만 치우치기 어려운 면이니 두 결의 균형 자체를 자기 강점으로 삼아 보세요.',
    warning_en: 'It is hard to lean only one way — make the balance itself your strength.',
  },
  {
    kind: '화격',
    name: '을경합화금격',
    hanja: '乙庚合化金格',
    subType: '진화격',
    ko: '부드러움과 날카로움이 만나 또렷한 결단의 식으로 다시 태어난 흐름이에요. 정교한 판단과 깨끗한 마무리가 자기다움인, 날을 세울 때 가장 빛나는 사람이에요.',
    en: 'Softness and sharpness meet and are reborn as a clear line of decision. Precise judgment and clean finish are your way of being — you shine most when you set an edge.',
    meaning_ko: '부드러움이 날카로움으로 정련된 느낌',
    meaning_en: 'Softness refined into sharpness',
    traits_ko: ['정교한 판단', '깨끗한 마무리', '단단한 결단'],
    traits_en: ['refined judgment', 'clean finish', 'firm decision'],
    career_ko: '법무, 금융, 외과, 정밀 기술처럼 날과 정확함을 다루는 자리가 잘 어울려요.',
    career_en: 'Law, finance, surgery, precision tech — seats handling edge and accuracy — suit you.',
  },
  {
    kind: '화격',
    name: '을경합화금격',
    hanja: '乙庚合化金格',
    subType: '가화격',
    ko: '날을 세우려 했지만 완전히 단단해지지 못한 모습이에요. 정확함을 추구하면서도 가끔은 부드러운 본래 식으로 돌아가는, 그 사이의 면을 가진 사람이에요.',
    en: 'You tried to set an edge but did not fully harden. You pursue accuracy yet sometimes return to a softer original line — your gift sits between the two.',
    meaning_ko: '정련이 완성에 닿지 못한 결의 흐름',
    meaning_en: 'A refinement that did not fully complete',
    traits_ko: ['부드러움과 날의 공존', '두 결의 흔들림', '유연한 판단'],
    traits_en: ['softness and edge coexisting', 'sway between lines', 'flexible judgment'],
    warning_ko: '결단이 흔들릴 수 있으니 큰 판단은 충분히 자고 깬 뒤 한 번 더 보는 면을 가지세요.',
    warning_en: 'Decisions can waver — keep a habit of revisiting big calls after a full sleep.',
  },
  {
    kind: '화격',
    name: '병신합화수격',
    hanja: '丙辛合化水格',
    subType: '진화격',
    ko: '빛과 보석이 만나 깊은 물의 식으로 다시 태어난 흐름이에요. 겉의 화려함이 안의 지혜로 모이는, 조용히 깊어지는 사람이에요.',
    en: 'Light and gem meet and are reborn as deep water. Outer brilliance gathers into inner wisdom — you are someone who deepens quietly.',
    meaning_ko: '빛이 깊은 지혜로 모이는 느낌',
    meaning_en: 'Brilliance gathered into deep wisdom',
    traits_ko: ['깊은 지혜', '조용한 빛', '내면의 모음'],
    traits_en: ['deep wisdom', 'quiet light', 'inward gathering'],
    career_ko: '연구, 상담, 깊이 있는 분석, 영성 분야가 잘 어울려요.',
    career_en: 'Research, counseling, deep analysis, spiritual fields — fit you well.',
  },
  {
    kind: '화격',
    name: '병신합화수격',
    hanja: '丙辛合化水格',
    subType: '가화격',
    ko: '깊이로 모이려 했지만 완전한 변화에는 닿지 못한 느낌이에요. 빛과 깊이가 같이 살아 있는 두 결의 사람이라, 양쪽 자리에서 각기 다른 매력을 보여요.',
    en: 'You moved toward depth but the change did not fully complete. Both brightness and depth live in you — you show different charms in different seats.',
    meaning_ko: '빛과 깊이가 같이 흐르는 미완의 느낌',
    meaning_en: 'Brightness and depth flowing together, unfinished',
    traits_ko: ['양면의 매력', '겉과 안의 다름', '두 결의 공존'],
    traits_en: ['two-sided charm', 'outer and inner difference', 'two lines coexisting'],
    warning_ko: '겉과 안의 면이 다를 수 있으니 안의 면을 누군가에게 정직하게 풀어내는 자리를 가지세요.',
    warning_en: 'Outer and inner lines can differ — keep a place to honestly release the inner one.',
  },
  {
    kind: '화격',
    name: '정임합화목격',
    hanja: '丁壬合化木格',
    subType: '진화격',
    ko: '불빛과 큰 물이 만나 곧게 자라는 나무의 식으로 다시 태어난 흐름이에요. 따뜻함과 생명력이 함께 자라는, 사람을 살리는 면을 가진 사람이에요.',
    en: 'Lamp-light and great water meet and are reborn as straight-growing wood. Warmth and life grow together in you — a line that brings people back to life.',
    meaning_ko: '따뜻함과 생명력이 함께 자라는 느낌',
    meaning_en: 'Warmth and vitality growing together',
    traits_ko: ['살리는 느낌', '곧게 자람', '따뜻한 성장'],
    traits_en: ['life-giving line', 'straight growth', 'warm rise'],
    career_ko: '교육, 의료, 양육, 코칭처럼 사람을 살리고 자라게 하는 자리가 잘 어울려요.',
    career_en: 'Education, medicine, nurturing, coaching — seats that bring people up — suit you.',
  },
  {
    kind: '화격',
    name: '정임합화목격',
    hanja: '丁壬合化木格',
    subType: '가화격',
    ko: '곧게 자라려 했지만 완전한 합화에는 닿지 못한 스타일이에요. 따뜻함과 큰 물이 따로 흐르는 시간도 있어, 그때그때 다른 식으로 자신을 보여줄 수 있는 사람이에요.',
    en: 'You moved toward straight growth, but full union did not land. Warmth and great water sometimes flow apart — you can show different lines for different moments.',
    meaning_ko: '따뜻함과 큰 물이 따로 흐르기도 하는 느낌',
    meaning_en: 'Warmth and great water sometimes flowing apart',
    traits_ko: ['두 결의 공존', '상황별 변신', '유연한 살림'],
    traits_en: ['two lines coexisting', 'shifting per situation', 'flexible care'],
    warning_ko: '면이 흔들릴 수 있으니 자기를 살리는 사람과 자리도 같이 챙겨 두세요.',
    warning_en: 'Your line can waver — keep people and seats that bring you back to life.',
  },
  {
    kind: '화격',
    name: '무계합화화격',
    hanja: '戊癸合化火格',
    subType: '진화격',
    ko: '단단한 흙과 맑은 물이 만나 환한 불의 식으로 다시 태어난 흐름이에요. 무거움과 차가움을 환함으로 바꾸는, 자리를 밝히는 사람이에요.',
    en: 'Firm earth and clear water meet and are reborn as bright fire. You turn heaviness and chill into brightness — you light up the seat you are in.',
    meaning_ko: '무거움이 환함으로 바뀐 느낌',
    meaning_en: 'Heaviness turned into brightness',
    traits_ko: ['밝히는 느낌', '온기의 변화', '환한 중심'],
    traits_en: ['illuminating line', 'shift to warmth', 'bright center'],
    career_ko: '방송, 강연, 예술, 무대처럼 사람 앞에서 빛을 만드는 자리가 잘 맞아요.',
    career_en: 'Broadcasting, lecturing, arts, stage — seats that make light before people — fit you.',
  },
  {
    kind: '화격',
    name: '무계합화화격',
    hanja: '戊癸合化火格',
    subType: '가화격',
    ko: '환함으로 바뀌려 했지만 완전한 합화에는 닿지 못한 모습이에요. 밝은 자리와 차분한 본래 면을 오가는, 두 면을 다 가진 사람이에요.',
    en: 'You moved toward brightness, but full union did not complete. You move between a bright seat and a calmer original line — you carry both.',
    meaning_ko: '밝음과 차분함이 같이 흐르는 미완의 느낌',
    meaning_en: 'Brightness and calm flowing together, unfinished',
    traits_ko: ['두 결의 오감', '환함과 차분함', '상황별 표정'],
    traits_en: ['moving between two lines', 'bright and calm', 'situational expression'],
    warning_ko: '늘 환해야 한다는 부담은 내려놓아도 돼요. 차분한 결도 자기다움의 한 부분이에요.',
    warning_en: 'You can put down the burden of always being bright — calm is also part of you.',
  },

  // ──────────────────────────────────────────────
  // 3. 삼기 (三奇) — 3 entries
  // ──────────────────────────────────────────────
  {
    kind: '삼기',
    name: '천상삼기',
    hanja: '天上三奇',
    ko: '하늘의 큰 면 셋이 한 사주에 모인 흐름이에요. 거시적인 시야와 큰 자리에서 일을 보는 감각이 있어, 큰 그림을 그리는 자리에서 가장 또렷해지는 사람이에요.',
    en: 'Three great currents of the sky gather in one chart. You have a wide-angle view and a feel for seeing affairs from large seats — you sharpen most where the big picture is drawn.',
    meaning_ko: '하늘의 큰 면 셋이 모인 느낌',
    meaning_en: 'Three great sky-currents gathered',
    traits_ko: ['넓은 시야', '큰 그림 감각', '하늘의 느낌'],
    traits_en: ['wide view', 'big-picture sense', 'line of the sky'],
    career_ko: '전략, 정책, 큰 조직의 기획, 학문의 정상부 같은 큰 자리가 잘 어울려요.',
    career_en: 'Strategy, policy, planning at the top of large organizations, the heights of scholarship — fit you.',
    warning_ko: '큰 자리만 보다 보면 발 밑이 흐려지니 작은 일상도 같이 챙겨 보세요.',
    warning_en: 'Always looking at heights can blur the ground — tend the small daily things too.',
  },
  {
    kind: '삼기',
    name: '인중삼기',
    hanja: '人中三奇',
    ko: '사람의 큰 면 셋이 한 사주에 모인 흐름이에요. 사람을 다루고 마음을 읽는 감각이 깊어서, 관계의 큰 흐름에서 또렷해지는 사람이에요.',
    en: 'Three great currents of the human realm gather in one chart. Your feel for people and reading hearts runs deep — you sharpen in the great current of relationships.',
    meaning_ko: '사람의 큰 면 셋이 모인 느낌',
    meaning_en: 'Three great human-currents gathered',
    traits_ko: ['관계 감각', '마음 읽기', '사람의 느낌'],
    traits_en: ['relational sense', 'reading hearts', 'line of people'],
    career_ko: '상담, 협상, 외교, 인사처럼 사람을 다루는 깊이 있는 자리가 잘 맞아요.',
    career_en: 'Counseling, negotiation, diplomacy, HR — deep seats that handle people — fit you.',
    warning_ko: '사람을 너무 깊이 읽다 보면 자기 면이 흐려지니 혼자 충전하는 시간도 잊지 마세요.',
    warning_en: 'Reading people too deeply can blur your own line — keep solo recharge time.',
  },
  {
    kind: '삼기',
    name: '지하삼기',
    hanja: '地下三奇',
    ko: '땅의 큰 면 셋이 한 사주에 모인 흐름이에요. 현장과 실물에 강한 감각이 있어, 직접 만들고 다루는 자리에서 가장 또렷해지는 사람이에요.',
    en: 'Three great currents of the earth realm gather in one chart. You have a strong feel for the field and physical things — you sharpen most in seats where you make and handle.',
    meaning_ko: '땅의 큰 면 셋이 모인 느낌',
    meaning_en: 'Three great earth-currents gathered',
    traits_ko: ['현장 감각', '실물 다룸', '땅의 느낌'],
    traits_en: ['field sense', 'handling material', 'line of earth'],
    career_ko: '제조, 건축, 농업, 기술 현장처럼 실물의 면이 살아있는 자리가 잘 어울려요.',
    career_en: 'Manufacturing, construction, agriculture, technical fields — where the material line is alive — fit you.',
    warning_ko: '눈앞만 보면 큰 면을 놓칠 수 있으니 가끔은 한 발 물러서서 전체를 보세요.',
    warning_en: 'Staring at what is near can miss the larger line — step back to see the whole now and then.',
  },

  // ──────────────────────────────────────────────
  // 4. 공망 (空亡) 패턴 — 4 entries
  // ──────────────────────────────────────────────
  {
    kind: '공망_pattern',
    name: '연주공망',
    hanja: '年柱空亡',
    subType: '조상·사회',
    ko: '뿌리의 자리에 빈 면이 들어와 있는 흐름이에요. 가문이나 사회적 배경에 기대기보다 자기 손으로 길을 내는 사람이라, 작게 시작해 크게 만드는 면이 잘 어울려요.',
    en: 'An empty line sits at the root seat. Rather than leaning on family or social backing, you cut your own road by hand — a line of starting small and building large suits you.',
    meaning_ko: '뿌리 자리에 빈 면이 든 흐름',
    meaning_en: 'An empty line at the root seat',
    traits_ko: ['스스로 길 냄', '뿌리의 가벼움', '자수의 느낌'],
    traits_en: ['self-made path', 'lightness at the root', 'line of building alone'],
    warning_ko: '기대 자리가 적은 만큼 자기를 받쳐줄 작은 공동체 하나는 꼭 만들어 두세요.',
    warning_en: 'With little to lean on, build one small community that holds you up.',
  },
  {
    kind: '공망_pattern',
    name: '월주공망',
    hanja: '月柱空亡',
    subType: '부모·직업',
    ko: '부모와 직업의 자리에 빈 면이 들어온 흐름이에요. 정해진 길보다 자기 식으로 직업을 새로 빚어 가는 사람이라, 전형적인 경로 밖에서 더 또렷해질 수 있어요.',
    en: 'An empty line sits at the seat of parents and work. Rather than walking a set road, you shape your own job by your own line — you can sharpen outside the typical track.',
    meaning_ko: '직업 자리에 빈 면이 든 흐름',
    meaning_en: 'An empty line at the work seat',
    traits_ko: ['비전형 경로', '자기 길 빚기', '직업의 새로움'],
    traits_en: ['atypical path', 'shaping own road', 'newness in work'],
    warning_ko: '익숙한 직장에서 답답함이 일찍 올 수 있으니 자기 결과 맞는 길을 천천히 그려 가세요.',
    warning_en: 'Stuffiness in familiar jobs can come early — sketch a road that matches your line, slowly.',
  },
  {
    kind: '공망_pattern',
    name: '일주공망',
    hanja: '日柱空亡',
    subType: '배우자·자신',
    ko: '자기 자리에 빈 면이 들어온 흐름이에요. 세속의 채움보다 안의 비움에서 더 또렷해지는, 영적이고 자유로운 면을 가진 사람이에요.',
    en: 'An empty line sits at your own seat. You sharpen more through inner emptiness than through worldly filling — a spiritual, free line.',
    meaning_ko: '자기 자리에 빈 면이 든 흐름',
    meaning_en: 'An empty line at your own seat',
    traits_ko: ['초월적 시선', '비움의 자유', '내면의 느낌'],
    traits_en: ['transcendent gaze', 'freedom of emptiness', 'inner line'],
    career_ko: '명상, 상담, 예술, 종교처럼 비움의 면이 살아 있는 자리가 잘 어울려요.',
    career_en: 'Meditation, counseling, arts, religion — seats where the line of emptiness is alive — fit you.',
    warning_ko: '관계의 외로움이 깊어질 수 있으니 자기 면을 알아주는 한두 사람을 가까이 두세요.',
    warning_en: 'Relational loneliness can deepen — keep one or two who recognize your line close by.',
  },
  {
    kind: '공망_pattern',
    name: '시주공망',
    hanja: '時柱空亡',
    subType: '자녀·말년',
    ko: '자녀와 말년의 자리에 빈 면이 들어온 흐름이에요. 결과나 후계에 집착하기보다 과정 자체를 깊이 음미하는 사람이라, 말년의 면이 오히려 자유로워지는 흐름이에요.',
    en: 'An empty line sits at the seat of children and later years. Rather than clinging to outcomes or successors, you savor the process itself deeply — your later line can grow more free.',
    meaning_ko: '말년 자리에 빈 면이 든 흐름',
    meaning_en: 'An empty line at the later-years seat',
    traits_ko: ['과정의 깊이', '말년의 자유', '결과 비집착'],
    traits_en: ['depth in process', 'freedom in later years', 'non-clinging to outcomes'],
    warning_ko: '말년의 그림이 흐릴 수 있으니 지금부터 작은 즐거움 한두 가지를 길게 가져가 보세요.',
    warning_en: 'The later picture can blur — carry one or two small joys long from now on.',
  },
]

/**
 * 종류와 이름으로 entry를 찾는다.
 * `name`은 한글(예: '종왕격') 또는 한자(예: '從旺格') 모두 허용.
 * 같은 이름의 진/가 두 entry가 있을 경우 첫 번째 매치를 반환한다 —
 * 정확한 매치가 필요하면 `findUltraAdvancedEntryWithSubType` 사용.
 */
export function findUltraAdvancedEntry(
  kind: UltraAdvancedKind,
  name: string
): UltraAdvancedEntry | null {
  const key = String(name || '').trim()
  if (!key) {
    return null
  }
  for (const entry of ULTRA_ADVANCED_DICTIONARY) {
    if (entry.kind !== kind) {
      continue
    }
    if (entry.name === key || entry.hanja === key) {
      return entry
    }
  }
  return null
}

/**
 * 종류 + 이름 + subType(진/가 등)으로 정확하게 entry를 찾는다.
 */
export function findUltraAdvancedEntryWithSubType(
  kind: UltraAdvancedKind,
  name: string,
  subType: string
): UltraAdvancedEntry | null {
  const key = String(name || '').trim()
  const subKey = String(subType || '').trim()
  if (!key) {
    return null
  }
  for (const entry of ULTRA_ADVANCED_DICTIONARY) {
    if (entry.kind !== kind) {
      continue
    }
    if ((entry.name === key || entry.hanja === key) && entry.subType === subKey) {
      return entry
    }
  }
  return null
}

/** 종류별 entry 목록을 반환 */
export function listUltraAdvancedByKind(kind: UltraAdvancedKind): UltraAdvancedEntry[] {
  return ULTRA_ADVANCED_DICTIONARY.filter((entry) => entry.kind === kind)
}
