/**
 * 격국(格局) Narrative Dictionary — Saju life-pattern archetypes.
 *
 * 정통 명리학에서 격국은 사주의 골격이자 인생의 큰 결을 가리킨다.
 * 본 사전은 8 정격(正格)과 9 외격(外格)에 대해 LifeReport의
 * 6차 자연화 톤(전문용어 0)을 유지하는 한국어 / 영어 narrative,
 * 강점·약점 키워드, 어울리는 직업 결, 일상 가이드를 정적으로 보유한다.
 *
 * - 한자는 별도 필드(`hanja`)에만 두고 narrative 본문에는 노출하지 않는다.
 * - 단정 표현 대신 경향형(~결/~사람이에요/~흐름)으로 서술한다.
 * - 정통 해석은 자평진전·적천수·명리정종·한국 명리 통설을 기반으로 한다.
 */

export interface GeokgukEntry {
  /** 격국 분류 — 정통 8 정격 또는 외격(특수격) */
  type: '정격' | '외격'
  /** 한글 이름 (예: '정관격') */
  name: string
  /** 한자 (예: '正官格') */
  hanja: string
  /** 한국어 narrative — 2~3 문장, 자연화 톤 */
  ko: string
  /** English narrative — same content, 2~3 natural sentences */
  en: string
  /** 한국어 강점 키워드 (3개) */
  strengths_ko: [string, string, string]
  /** English strength keywords (3) */
  strengths_en: [string, string, string]
  /** 한국어 약점 키워드 (3개) */
  weaknesses_ko: [string, string, string]
  /** English weakness keywords (3) */
  weaknesses_en: [string, string, string]
  /** 어울리는 직업 결 — 한국어 한 문장 */
  career_ko: string
  /** Career fit — one English sentence */
  career_en: string
  /** 일상 가이드 — 한국어 한 문장 */
  advice_ko: string
  /** Daily guidance — one English sentence */
  advice_en: string
}

export const GEOKGUK_DICTIONARY: GeokgukEntry[] = [
  // ──────────────────────────────────────────────
  // 8 정격 (正格)
  // ──────────────────────────────────────────────
  {
    type: '정격',
    name: '정관격',
    hanja: '正官格',
    ko: '안정과 책임을 인생의 큰 축으로 가져가는 결이에요. 정해진 자리, 정통적인 길에서 가장 빛나고, 신뢰와 약속을 지키는 것이 자기다움의 표현이에요.',
    en: 'A life-pattern that carries stability and responsibility as its main axis. You shine in established roles and well-trodden paths — keeping promises and trust is your way of being yourself.',
    strengths_ko: ['신뢰 가능한 책임감', '정통적 권위', '꾸준한 성취'],
    strengths_en: ['reliable responsibility', 'established authority', 'steady achievement'],
    weaknesses_ko: ['형식에 갇히는 경향', '변화 앞의 망설임', '체면을 너무 챙김'],
    weaknesses_en: ['tendency to get stuck in form', 'hesitation in the face of change', 'over-protecting face'],
    career_ko: '공직, 대기업, 법무, 행정처럼 규칙과 절차가 살아있는 자리에서 가장 또렷해져요.',
    career_en: 'Public service, large organizations, law, and administration — places where rules and procedure are alive — bring out your best.',
    advice_ko: '원칙을 지키되 가끔은 작은 일탈을 허락해 보세요. 그 틈에서 진짜 여유가 생겨요.',
    advice_en: 'Hold to your principles, but allow small departures now and then — that gap is where real ease comes from.',
  },
  {
    type: '정격',
    name: '편관격',
    hanja: '偏官格',
    ko: '도전과 압박을 자기 연료로 바꾸는 강인한 결이에요. 정해진 길보다는 직접 길을 뚫고 가는 사람이라, 위기에서 오히려 또렷해지는 흐름이 있어요.',
    en: 'A pattern that turns challenge and pressure into its own fuel — a tough, resilient line. Rather than following set roads, you carve your own, and you actually sharpen under crisis.',
    strengths_ko: ['강한 추진력', '위기 돌파력', '결단의 속도'],
    strengths_en: ['strong drive', 'crisis-breaking power', 'speed of decision'],
    weaknesses_ko: ['지나친 강압', '쉽게 타오르는 화', '쉼을 잊는 습관'],
    weaknesses_en: ['excess force', 'quick-flaring anger', 'forgetting to rest'],
    career_ko: '군경, 외과, 경영 일선, 스포츠, 위기관리처럼 강한 책임이 따르는 자리가 잘 맞아요.',
    career_en: 'Roles with heavy responsibility — military, police, surgery, frontline management, sports, crisis response — sit naturally with you.',
    advice_ko: '센 자신을 다스리는 작은 식어감의 시간을 매일 한 번씩 가져 보세요.',
    advice_en: 'Build a small cool-down moment into each day to manage the intensity you carry.',
  },
  {
    type: '정격',
    name: '정재격',
    hanja: '正財格',
    ko: '꾸준한 노력으로 안정된 자산을 쌓는 결이에요. 큰 한 방보다 매일의 한 걸음으로 멀리 가는 사람이라, 시간이 갈수록 더 단단해져요.',
    en: 'A pattern that builds stable assets through steady effort. You go far by daily steps rather than one big swing — time itself makes you sturdier.',
    strengths_ko: ['성실함', '계획성', '신용 관리'],
    strengths_en: ['diligence', 'planning', 'managing credit'],
    weaknesses_ko: ['지나친 신중', '변화 회피', '인색해질 수 있음'],
    weaknesses_en: ['over-caution', 'avoiding change', 'becoming tight-fisted'],
    career_ko: '회계, 금융, 자영업, 부동산, 안정형 사업처럼 숫자와 신뢰가 같이 가는 자리가 좋아요.',
    career_en: 'Accounting, finance, small business, real estate, steady-growth ventures — places where numbers and trust travel together — suit you.',
    advice_ko: '아끼는 것만큼 가끔은 자신과 사람에게 흔쾌히 베푸는 결도 잊지 마세요.',
    advice_en: 'Match your saving with a willingness to give freely to yourself and to others now and then.',
  },
  {
    type: '정격',
    name: '편재격',
    hanja: '偏財格',
    ko: '변동과 흐름 속에서 재물을 만들어 가는 활동적인 결이에요. 사람과 기회를 잘 엮어내는 감각이 있어, 큰 그림을 그리고 움직일 때 가장 빛나요.',
    en: 'An active pattern that builds wealth through movement and flow. You have a feel for weaving people and opportunities together, and you shine most when you move on a big picture.',
    strengths_ko: ['사업 감각', '인맥 활용', '기회 포착'],
    strengths_en: ['business instinct', 'using networks', 'catching opportunity'],
    weaknesses_ko: ['집중력 분산', '소비 습관', '한곳에 머물기 어려움'],
    weaknesses_en: ['scattered focus', 'spending habits', 'hard to settle in one place'],
    career_ko: '사업, 무역, 영업, 투자, 글로벌 비즈니스처럼 움직임이 큰 자리가 잘 맞아요.',
    career_en: 'Business, trade, sales, investment, and global work — fields with big movement — fit you well.',
    advice_ko: '벌어들이는 흐름만큼 지키는 시스템도 한 자리 만들어 두세요. 그 균형이 멀리 가는 비결이에요.',
    advice_en: 'Match your earning flow with one solid system for keeping — that balance is what carries you far.',
  },
  {
    type: '정격',
    name: '정인격',
    hanja: '正印格',
    ko: '학문과 정통적 지혜로 자기 자리를 만들어 가는 결이에요. 받아들이고 가르치는 흐름이 강해서, 배움이 곧 자기다움이 되는 사람이에요.',
    en: 'A pattern that builds its place through learning and orthodox wisdom. The flow of receiving and teaching runs strong — study itself becomes your way of being yourself.',
    strengths_ko: ['깊이 있는 사고', '품격', '꾸준한 학습'],
    strengths_en: ['depth of thought', 'dignity', 'steady learning'],
    weaknesses_ko: ['실행 지연', '의존성', '현실 감각 부족'],
    weaknesses_en: ['delayed action', 'leaning on others', 'gap with practical reality'],
    career_ko: '교육, 연구, 문화, 출판, 의료, 공공기관처럼 깊이 있는 지식이 살아있는 자리가 잘 맞아요.',
    career_en: 'Education, research, culture, publishing, medicine, and public institutions — fields where deep knowledge is alive — fit you well.',
    advice_ko: '머리로 충분히 알았으면, 작더라도 손으로 한 가지를 옮겨 보세요. 그 한 걸음이 인생을 바꿔요.',
    advice_en: 'Once your mind has understood enough, move one small thing with your hands — that single step changes a life.',
  },
  {
    type: '정격',
    name: '편인격',
    hanja: '偏印格',
    ko: '독특한 시선과 직관으로 자기만의 답을 찾는 결이에요. 정통적인 길보다 옆길에서 핵심을 보는 감각이 있어, 남다른 분야에서 빛나요.',
    en: 'A pattern that finds its own answers through a different angle and sharp intuition. You catch the core from a side path rather than the main road — you shine in fields that are not for everyone.',
    strengths_ko: ['독창적 통찰', '직관', '전문성'],
    strengths_en: ['original insight', 'intuition', 'specialist depth'],
    weaknesses_ko: ['고립감', '변덕', '시작과 끝의 간격'],
    weaknesses_en: ['feeling isolated', 'changeability', 'gap between starting and finishing'],
    career_ko: '연구, 상담, 종교, 예술, 출판, 한 분야 전문직처럼 깊고 좁게 가는 자리가 잘 맞아요.',
    career_en: 'Research, counseling, religion, art, publishing, and niche specialties — paths that go deep and narrow — suit you.',
    advice_ko: '직관을 믿되 한 사람과 꾸준히 나누는 자리를 두세요. 외로움은 가장 큰 비용이에요.',
    advice_en: 'Trust your intuition, but keep one steady person to share it with — loneliness is the largest hidden cost.',
  },
  {
    type: '정격',
    name: '식신격',
    hanja: '食神格',
    ko: '여유롭게 표현하고 풍요롭게 나누는 결이에요. 자기 안의 것을 부드럽게 꺼내 놓는 흐름이라, 의식주와 인복이 자연스럽게 따라와요.',
    en: 'A pattern of expressing with ease and sharing with abundance. You bring out what is inside you gently — comfort, food, and the goodwill of people tend to follow naturally.',
    strengths_ko: ['편안한 표현력', '풍요로움', '사람을 끌어들이는 결'],
    strengths_en: ['easy expression', 'abundance', 'a draw that pulls people in'],
    weaknesses_ko: ['느슨함', '소비 편향', '결정의 미룸'],
    weaknesses_en: ['slackness', 'leaning toward consumption', 'putting off decisions'],
    career_ko: '요리, 글, 교육, 콘텐츠, 서비스업처럼 자기 것을 풀어내는 자리가 잘 맞아요.',
    career_en: 'Cooking, writing, teaching, content, service work — fields where you unfold what is yours — suit you well.',
    advice_ko: '풍요로운 만큼 한 가지에 깊이 머무는 시간도 챙기세요. 그 깊이가 진짜 풍요로 돌아와요.',
    advice_en: 'For all your abundance, keep time to dwell deeply in one thing — that depth returns as real plenty.',
  },
  {
    type: '정격',
    name: '상관격',
    hanja: '傷官格',
    ko: '재능과 창의를 활발하게 발산하는 결이에요. 자기 표현이 또렷하고 감각이 뛰어나서, 정해진 틀보다 자유로운 자리에서 빛나는 사람이에요.',
    en: 'A pattern of releasing talent and creativity in lively bursts. Your expression is sharp and your senses keen — you shine in free spaces more than fixed frames.',
    strengths_ko: ['뛰어난 표현력', '창의적 감각', '날카로운 안목'],
    strengths_en: ['outstanding expression', 'creative sense', 'sharp eye'],
    weaknesses_ko: ['윗사람과의 마찰', '말의 날카로움', '감정의 기복'],
    weaknesses_en: ['friction with authority', 'sharp speech', 'emotional swings'],
    career_ko: '예술, 방송, 디자인, 작가, 강연, 1인 기업처럼 자기 색이 무기가 되는 자리가 잘 맞아요.',
    career_en: 'Art, broadcasting, design, writing, speaking, and solo ventures — places where your colour is the weapon — fit you best.',
    advice_ko: '날카로움이 무기인 만큼 그 날의 방향을 한 번씩 점검해 보세요. 사람을 살리는 쪽으로 쓰일 때 가장 강해져요.',
    advice_en: 'Your edge is a weapon, so check its direction now and then — it is strongest when pointed toward lifting people up.',
  },

  // ──────────────────────────────────────────────
  // 9 외격 (外格) / 특수격
  // ──────────────────────────────────────────────
  {
    type: '외격',
    name: '종왕격',
    hanja: '從旺格',
    ko: '자기 색이 매우 또렷하고 강한 결이에요. 흐름을 거스르기보다 자기 본성을 끝까지 밀고 갈 때 길이 열리는 사람이라, 독립과 자기 주도가 핵심이에요.',
    en: 'A pattern where your own colour runs very clear and strong. The road opens when you push your nature all the way through rather than fighting the current — independence and self-direction are the core.',
    strengths_ko: ['강한 자기 중심', '독립심', '한 우물 깊이'],
    strengths_en: ['strong self-center', 'independence', 'depth in one path'],
    weaknesses_ko: ['타협의 어려움', '독선', '주변과의 거리감'],
    weaknesses_en: ['hard to compromise', 'self-righteousness', 'distance from people'],
    career_ko: '창업, 1인 전문가, 자유 직업처럼 자기 색을 그대로 펼치는 자리가 가장 잘 맞아요.',
    career_en: 'Founding ventures, solo expert roles, free-lance paths — places where your colour is shown as-is — fit you most.',
    advice_ko: '자기 길을 가는 만큼 한 명의 동료에게 진심을 열어 두세요. 외로움이 길을 짧게 만들어요.',
    advice_en: 'For all your own road, open your heart honestly to one companion — loneliness shortens the road.',
  },
  {
    type: '외격',
    name: '종강격',
    hanja: '從強格',
    ko: '받아들이고 채우는 흐름이 매우 강한 결이에요. 학문과 지혜가 자기 자산이 되는 사람이라, 안에 쌓인 것이 깊어질수록 멀리 가요.',
    en: 'A pattern with a very strong flow of receiving and being filled. Learning and wisdom become your assets — the deeper what is stored inside, the farther you travel.',
    strengths_ko: ['깊은 학문 흡수력', '안정된 사고', '품격 있는 분위기'],
    strengths_en: ['deep absorption of learning', 'steady thinking', 'a presence of quiet dignity'],
    weaknesses_ko: ['실행으로 옮기는 데 시간', '주변 의존', '현실 감각의 늦음'],
    weaknesses_en: ['slow to move into action', 'leaning on surroundings', 'late grip on practical reality'],
    career_ko: '학자, 연구원, 교수, 자문가, 종교인처럼 안의 깊이로 일하는 자리가 잘 맞아요.',
    career_en: 'Scholars, researchers, professors, advisors, religious roles — work driven by inner depth — fit you well.',
    advice_ko: '쌓은 만큼 흘려보내는 자리를 만드세요. 가르치고 나눌수록 안의 그릇이 더 커져요.',
    advice_en: 'Make a place where what you have stored can flow out — teaching and sharing make the inner vessel grow bigger.',
  },
  {
    type: '외격',
    name: '종세격',
    hanja: '從勢格',
    ko: '주변의 큰 흐름을 따라 자기 자리를 만드는 결이에요. 혼자 버티기보다 시대와 사람의 결을 읽고 그 위에 올라탈 때 가장 멀리 가요.',
    en: 'A pattern that builds its place by following the larger current around you. Rather than holding alone, you go farthest by reading the flow of the times and the people, and riding on top of it.',
    strengths_ko: ['시대 감각', '유연함', '협업 능력'],
    strengths_en: ['sense of the times', 'flexibility', 'teamwork'],
    weaknesses_ko: ['자기 색의 옅음', '주변에 휘둘림', '결정의 늦음'],
    weaknesses_en: ['thin self-colour', 'being swayed by surroundings', 'slow decisions'],
    career_ko: '기획, 마케팅, 트렌드 분석, 컨설팅처럼 흐름을 읽어 올라타는 자리가 잘 맞아요.',
    career_en: 'Planning, marketing, trend work, consulting — roles that read a flow and climb onto it — suit you.',
    advice_ko: '잘 따라가는 만큼 자기만의 작은 기둥 하나를 세우세요. 그 기둥이 흐름 속에서도 자기를 지켜 줘요.',
    advice_en: 'For all your good following, plant one small pillar of your own — that pillar holds you steady inside the current.',
  },
  {
    type: '외격',
    name: '종아격',
    hanja: '從兒格',
    ko: '자기 안의 것을 끝까지 풀어내는 흐름을 따르는 결이에요. 표현과 창작, 가르침으로 세상에 자기를 옮겨 놓는 사람이라, 결과가 곧 자기 분신이 돼요.',
    en: 'A pattern that follows the flow of releasing what is inside all the way through. You move yourself into the world via expression, creation, and teaching — the results become a kind of self-portrait.',
    strengths_ko: ['뛰어난 표현', '창의력', '아이를 키우는 결'],
    strengths_en: ['strong expression', 'creativity', 'a nurturing line'],
    weaknesses_ko: ['소진', '인정 욕구', '몸의 피로'],
    weaknesses_en: ['burnout', 'craving recognition', 'physical fatigue'],
    career_ko: '교육, 창작, 예술, 콘텐츠, 어린이 관련 일처럼 자기를 풀어 세상에 두는 자리가 잘 맞아요.',
    career_en: 'Education, creative work, art, content, work with children — fields where you place yourself into the world — fit you well.',
    advice_ko: '풀어낸 만큼 안으로 채우는 시간을 챙기세요. 채움이 다음 표현의 깊이가 돼요.',
    advice_en: 'For all you release, keep time to refill inwardly — that refilling becomes the depth of your next expression.',
  },
  {
    type: '외격',
    name: '종재격',
    hanja: '從財格',
    ko: '재물과 활동의 큰 흐름을 따라 사는 결이에요. 자기를 고집하기보다 큰 판의 흐름에 올라탈 때 부와 성취가 자연스럽게 따라와요.',
    en: 'A pattern that lives by following the larger current of wealth and activity. Wealth and achievement arrive naturally when you ride the big board rather than insisting on yourself.',
    strengths_ko: ['큰 그림 감각', '재물 흐름의 감', '실질적 성취'],
    strengths_en: ['feel for the big picture', 'sense of money flow', 'real-world achievement'],
    weaknesses_ko: ['소진 위험', '자기 돌봄 부족', '관계의 거래화'],
    weaknesses_en: ['risk of burnout', 'low self-care', 'turning relationships transactional'],
    career_ko: '사업, 투자, 무역, 부동산, 대규모 운영처럼 큰 흐름을 다루는 자리가 잘 맞아요.',
    career_en: 'Business, investing, trade, real estate, large-scale operations — fields that handle big currents — suit you most.',
    advice_ko: '벌어들이는 결이 강한 만큼 자기 몸과 사람을 돈처럼 보지 않는 선을 지키세요.',
    advice_en: 'Since your earning line is strong, hold the line of not seeing your own body or your people as money.',
  },
  {
    type: '외격',
    name: '종살격',
    hanja: '從殺格',
    ko: '큰 압박과 책임의 흐름을 그대로 따라가는 강한 결이에요. 무거운 자리를 피하지 않고 받아들일 때 오히려 자기 자리가 또렷해지는 사람이에요.',
    en: 'A strong pattern that follows the flow of heavy pressure and responsibility as it is. Your place becomes clearer precisely when you do not dodge weighty roles but take them on.',
    strengths_ko: ['큰 책임 감내', '권위 친화', '위기에서의 또렷함'],
    strengths_en: ['carrying heavy responsibility', 'comfort with authority', 'clarity under crisis'],
    weaknesses_ko: ['과부하', '쉼의 부재', '몸의 신호 무시'],
    weaknesses_en: ['overload', 'absence of rest', 'ignoring body signals'],
    career_ko: '군경, 법조, 의료, 위기관리, 대형 조직 임원처럼 무게가 있는 자리가 잘 맞아요.',
    career_en: 'Military, police, law, medicine, crisis response, senior roles in large organizations — weighty seats — fit you.',
    advice_ko: '무거운 자리를 잘 지는 만큼 내려놓는 의식 하나를 정해 두세요. 내려놓는 힘이 곧 다시 드는 힘이에요.',
    advice_en: 'For all the weight you carry well, set one ritual of putting it down — the power to set down is the power to lift again.',
  },
  {
    type: '외격',
    name: '건록격',
    hanja: '建祿格',
    ko: '자기 힘으로 자리를 만들어 가는 자수성가형 결이에요. 누구에게 기대기보다 자기 두 발로 서는 흐름이 강해서, 독립의 자리가 가장 자기다워요.',
    en: 'A self-made pattern that builds its own place by its own strength. The flow of standing on your own two feet runs strong — independence is where you are most yourself.',
    strengths_ko: ['독립심', '자기 책임', '꾸준한 추진'],
    strengths_en: ['independence', 'self-responsibility', 'steady drive'],
    weaknesses_ko: ['고집', '도움 청하기 어려움', '혼자 짊어짐'],
    weaknesses_en: ['stubbornness', 'difficulty asking for help', 'carrying alone'],
    career_ko: '창업, 1인 사업, 전문직, 프리랜서처럼 자기 이름으로 가는 자리가 잘 맞아요.',
    career_en: 'Founding, solo business, specialist work, freelance paths — places where you go under your own name — fit you well.',
    advice_ko: '혼자 다 할 수 있다는 힘만큼 같이 가는 사람을 한 명 두는 지혜도 가져 보세요.',
    advice_en: 'Match the strength of "I can do it all alone" with the wisdom of keeping one person to walk alongside you.',
  },
  {
    type: '외격',
    name: '양인격',
    hanja: '羊刃格',
    ko: '결단력과 추진력이 매우 강한 결이에요. 한번 마음먹은 일은 끝까지 밀어붙이는 흐름이라, 승부의 자리에서 가장 또렷해지는 사람이에요.',
    en: 'A pattern with very strong decision and drive. Once you set your mind, you push to the end — you become most clear in the seat of contest.',
    strengths_ko: ['결단의 속도', '승부근성', '강한 의지'],
    strengths_en: ['speed of decision', 'competitive grit', 'strong will'],
    weaknesses_ko: ['지나친 강함', '갈등 유발', '쉽게 무너지지 않으려는 긴장'],
    weaknesses_en: ['excess force', 'inviting conflict', 'tension from refusing to fold'],
    career_ko: '운동, 군경, 경영 일선, 외과, 스타트업 리더처럼 승부 결이 살아있는 자리가 잘 맞아요.',
    career_en: 'Athletics, military, frontline management, surgery, startup leadership — seats where the competitive line is alive — suit you.',
    advice_ko: '센 결을 부드러움으로 한 번씩 풀어 주세요. 부드러움이 진짜 결단의 힘을 깊게 만들어요.',
    advice_en: 'Loosen your sharp edge with softness from time to time — softness is what makes real decision deep.',
  },
  {
    type: '외격',
    name: '잡기격',
    hanja: '雜氣格',
    ko: '여러 기운이 한 자리에 섞여 있는 다재다능한 결이에요. 한 가지에만 머물기보다 여러 가능성을 같이 안고 가는 사람이라, 핵심을 정하는 일이 인생의 키예요.',
    en: 'A versatile pattern where several currents mix in one seat. Rather than staying in one thing, you carry several possibilities together — choosing your core becomes the key of life.',
    strengths_ko: ['다재다능', '적응력', '여러 자원 활용'],
    strengths_en: ['many talents', 'adaptability', 'using varied resources'],
    weaknesses_ko: ['집중 분산', '핵심 모호', '결정의 미룸'],
    weaknesses_en: ['scattered focus', 'unclear core', 'putting off decisions'],
    career_ko: '복합 사업, 다영역 전문가, 통역, 프로듀서처럼 여러 분야를 엮는 자리가 잘 맞아요.',
    career_en: 'Hybrid ventures, multi-domain experts, interpretation, producing — roles that weave several fields — fit you well.',
    advice_ko: '가능성이 많은 만큼 올해의 핵심 한 가지를 정해 두세요. 핵심이 나머지를 정리해 줘요.',
    advice_en: 'For all your many possibilities, set one core for the year — the core organizes the rest.',
  },
]

/**
 * 격국 이름으로 entry를 찾는다.
 * `name`은 한글(예: '정관격') 또는 한자(예: '正官格') 모두 허용.
 */
export function findGeokgukEntry(name: string): GeokgukEntry | null {
  const key = String(name || '').trim()
  if (!key) {
    return null
  }
  for (const entry of GEOKGUK_DICTIONARY) {
    if (entry.name === key || entry.hanja === key) {
      return entry
    }
  }
  return null
}

/** 분류('정격' / '외격')별로 entry 목록을 반환 */
export function listGeokgukByType(type: '정격' | '외격'): GeokgukEntry[] {
  return GEOKGUK_DICTIONARY.filter((entry) => entry.type === type)
}
