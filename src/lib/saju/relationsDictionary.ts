/**
 * 합충형해(合冲刑害) 관계 사전 — Relations Narrative Dictionary.
 *
 * 사주의 천간·지지 간 관계(합/충/형/해/파/회) 각 종류별로
 * 자연어 narrative와 키워드를 정적 데이터로 보유한다.
 * LifeReport의 6차 자연화 톤에 맞춰 전문용어는 풀어 쓰고
 * 한자는 보조 표기로만 등장한다.
 *
 * - 천간합 5종 / 천간충 4종
 * - 지지 육합 6 / 삼합 4 / 방합 4
 * - 지지 충 6 / 형 7 / 해 6 / 파 6
 *
 * 출처는 자평진전·적천수·명리정종 등의 통설을 짧은
 * 두세 문장으로 압축. 단정 표현은 피하고 경향형으로 표기.
 */

export type RelationKind =
  | 'cheongan_hap'
  | 'cheongan_chung'
  | 'jiji_yukhap'
  | 'jiji_samhap'
  | 'jiji_banghap'
  | 'jiji_chung'
  | 'jiji_hyeong'
  | 'jiji_hae'
  | 'jiji_pa'

export interface RelationEntry {
  /** 관계 종류 */
  kind: RelationKind
  /** 한자 쌍/조합 식별자 (예: "甲己" or "寅午戌") */
  pair: string
  /** 한글 음 식별자 (예: "갑기" or "인오술") */
  pairKo: string
  /** 한글 이름 (예: "갑기합토", "자오충") */
  name: string
  /** 합/방합/삼합의 변화 결과 오행 (있을 때만) */
  result?: '목' | '화' | '토' | '금' | '수'
  /** 한국어 narrative — 2~3 문장 */
  ko: string
  /** English narrative — 2~3 sentences */
  en: string
  /** 한국어 키워드 (정확히 3개) */
  keywords_ko: [string, string, string]
  /** English keywords (정확히 3개) */
  keywords_en: [string, string, string]
}

export const RELATIONS_DICTIONARY: RelationEntry[] = [
  // ──────────────────────────────────────────────
  // 천간합 (5종)
  // ──────────────────────────────────────────────
  {
    kind: 'cheongan_hap',
    pair: '甲己',
    pairKo: '갑기',
    name: '갑기합토 (甲己合土)',
    result: '토',
    ko: '갑의 추진력과 기의 안정이 만나 흙의 식으로 화합돼요. 굳건한 토대 위에서 빠른 행동이 가능한 면이라, 큰 그림을 단단히 짚고 갈 때 빛납니다.',
    en: "Yang Wood's drive meets Yin Earth's stability and combines into a fertile soil current. Quick action on a solid base — strong whenever you anchor the big picture before moving.",
    keywords_ko: ['중정', '신뢰', '실행'],
    keywords_en: ['centered', 'trust', 'execution'],
  },
  {
    kind: 'cheongan_hap',
    pair: '乙庚',
    pairKo: '을경',
    name: '을경합금 (乙庚合金)',
    result: '금',
    ko: '을의 유연함과 경의 단호함이 만나 쇠의 식으로 모여요. 부드러움이 결단으로 다듬어지는 흐름이라, 의리와 약속을 지키는 자리에서 또렷해집니다.',
    en: "Yin Wood's flexibility meets Yang Metal's resolve and refines into a clear, metal current. Softness gets shaped into decisiveness — promises kept and lines held with clean conviction.",
    keywords_ko: ['의리', '결단', '정련'],
    keywords_en: ['loyalty', 'resolve', 'refinement'],
  },
  {
    kind: 'cheongan_hap',
    pair: '丙辛',
    pairKo: '병신',
    name: '병신합수 (丙辛合水)',
    result: '수',
    ko: '병의 빛과 신의 정련이 만나 의외로 물의 식으로 흘러요. 뜨거운 에너지가 차분히 가라앉아 지혜로 바뀌는 자리라, 위엄과 권위가 자연스레 따라옵니다.',
    en: "Yang Fire's brilliance meets Yin Metal's polish and, surprisingly, settles into a water current. Hot energy cools into wisdom — dignity and quiet authority follow as a matter of course.",
    keywords_ko: ['위엄', '지혜', '냉정'],
    keywords_en: ['dignity', 'wisdom', 'composure'],
  },
  {
    kind: 'cheongan_hap',
    pair: '丁壬',
    pairKo: '정임',
    name: '정임합목 (丁壬合木)',
    result: '목',
    ko: '정의 따뜻한 불빛과 임의 깊은 물이 만나 새 나무의 식으로 자라요. 감정과 직관이 결합해 창작과 인연을 키우는 흐름이라, 다정한 끌림이 강합니다.',
    en: "Yin Fire's warm glow meets Yang Water's depth and grows into fresh wood. Feeling and intuition pair up to nurture creativity and connection — a soft, magnetic pull runs through it.",
    keywords_ko: ['감성', '인연', '창작'],
    keywords_en: ['feeling', 'romance', 'creation'],
  },
  {
    kind: 'cheongan_hap',
    pair: '戊癸',
    pairKo: '무계',
    name: '무계합화 (戊癸合火)',
    result: '화',
    ko: '무의 단단한 산과 계의 가는 물이 만나 의외로 불의 식으로 피어요. 무거운 토대에서 열정이 솟는 자리라, 나이 차·관점 차를 넘어 끌리는 일이 많습니다.',
    en: "Yang Earth's mountain meets Yin Water's stream and, against expectation, sparks into fire. Heavy ground releases passion — attractions that cross generations or worldviews show up here.",
    keywords_ko: ['열정', '의외', '끌림'],
    keywords_en: ['passion', 'surprise', 'attraction'],
  },

  // ──────────────────────────────────────────────
  // 천간충 (4종)
  // ──────────────────────────────────────────────
  {
    kind: 'cheongan_chung',
    pair: '甲庚',
    pairKo: '갑경',
    name: '갑경충 (甲庚冲)',
    ko: '뻗어 오르는 나무와 단단한 쇠가 정면으로 마주서요. 추진과 결단이 부딪히며 가지를 쳐 정리하는 면이라, 변동과 충돌이 잦지만 그만큼 빠르게 다듬어집니다.',
    en: 'Climbing wood and hardened metal face each other head-on. Drive collides with decision and prunes back — frequent shake-ups, but also fast refinement.',
    keywords_ko: ['충돌', '정리', '변동'],
    keywords_en: ['collision', 'pruning', 'change'],
  },
  {
    kind: 'cheongan_chung',
    pair: '乙辛',
    pairKo: '을신',
    name: '을신충 (乙辛冲)',
    ko: '여린 풀과 다듬인 보석칼이 부딪혀요. 섬세한 감수성이 날카로운 비판과 마주서는 자리라, 작은 말에도 베이고 베는 일이 생깁니다.',
    en: 'A soft vine and a polished blade meet edge to edge. Fine sensitivity stands against sharp critique — small words can cut, in both directions.',
    keywords_ko: ['예민', '비판', '상처'],
    keywords_en: ['sensitivity', 'critique', 'wounds'],
  },
  {
    kind: 'cheongan_chung',
    pair: '丙壬',
    pairKo: '병임',
    name: '병임충 (丙壬冲)',
    ko: '한낮의 태양과 깊은 강물이 정면으로 충돌해요. 드러내려는 빛과 감추려는 물이 맞서는 면이라, 명암이 또렷하고 감정의 진폭이 큽니다.',
    en: 'Midday sun and a deep river crash into each other. Light that wants to reveal meets water that wants to conceal — strong contrasts and wide emotional swings.',
    keywords_ko: ['명암', '대비', '감정'],
    keywords_en: ['contrast', 'polarity', 'emotion'],
  },
  {
    kind: 'cheongan_chung',
    pair: '丁癸',
    pairKo: '정계',
    name: '정계충 (丁癸冲)',
    ko: '따뜻한 등불과 차가운 이슬이 마주서요. 작은 불꽃이 가는 물에 꺼지는 면이라, 의지와 의심, 열정과 회의가 안에서 자주 부딪힙니다.',
    en: 'A warm lamp and cold dew confront each other. A small flame quenched by fine water — willpower and doubt, passion and second-thought collide inside.',
    keywords_ko: ['회의', '소진', '불안'],
    keywords_en: ['doubt', 'burnout', 'unease'],
  },

  // ──────────────────────────────────────────────
  // 지지 육합 (6종)
  // ──────────────────────────────────────────────
  {
    kind: 'jiji_yukhap',
    pair: '子丑',
    pairKo: '자축',
    name: '자축합토 (子丑合土)',
    result: '토',
    ko: '한겨울 물과 얼어붙은 흙이 손을 잡아 진득한 토양으로 굳어요. 차분히 머금고 견디는 면이라, 단숨에 풀리진 않아도 오래 가는 약속이 됩니다.',
    en: "Deep-winter water and frozen earth clasp hands and set as dense soil. A patient, holding current — not quick to thaw, but the bonds it makes last.",
    keywords_ko: ['결속', '인내', '응축'],
    keywords_en: ['bond', 'patience', 'condensation'],
  },
  {
    kind: 'jiji_yukhap',
    pair: '寅亥',
    pairKo: '인해',
    name: '인해합목 (寅亥合木)',
    result: '목',
    ko: '봄나무와 큰 물이 만나 새 가지를 틔워요. 호기심과 흐름이 자연스럽게 합쳐지는 자리라, 새로운 시도와 관계가 부드럽게 자랍니다.',
    en: 'A spring tree and a deep stream meet and put out new shoots. Curiosity and current join easily — fresh ventures and relationships grow without friction.',
    keywords_ko: ['성장', '시작', '확장'],
    keywords_en: ['growth', 'beginning', 'expansion'],
  },
  {
    kind: 'jiji_yukhap',
    pair: '卯戌',
    pairKo: '묘술',
    name: '묘술합화 (卯戌合火)',
    result: '화',
    ko: '연한 풀과 마른 흙이 만나 의외로 따뜻한 불을 피워요. 부드러움과 듬직함이 결합해 가정·정서 안에서 온기를 만드는 면이라, 다정한 합으로 통합니다.',
    en: "Soft grass and dry earth touch and, unexpectedly, kindle warmth. Tenderness meets steadiness — a hearth-style bond that brings comfort to home and feeling.",
    keywords_ko: ['온기', '정서', '다정'],
    keywords_en: ['warmth', 'feeling', 'tenderness'],
  },
  {
    kind: 'jiji_yukhap',
    pair: '辰酉',
    pairKo: '진유',
    name: '진유합금 (辰酉合金)',
    result: '금',
    ko: '습한 흙과 다듬인 쇠가 만나 단단한 금속으로 빚어져요. 정리와 마무리에 강한 면이라, 약속·계약·실무가 깔끔하게 떨어집니다.',
    en: 'Moist earth and refined metal meet and cast into a hard alloy. Strong at finishing and tidying — promises, contracts, and execution land clean.',
    keywords_ko: ['마무리', '실무', '단단함'],
    keywords_en: ['closure', 'execution', 'solidity'],
  },
  {
    kind: 'jiji_yukhap',
    pair: '巳申',
    pairKo: '사신',
    name: '사신합수 (巳申合水)',
    result: '수',
    ko: '한낮의 불과 가을 쇠가 만나 의외로 물의 식으로 흘러요. 열정과 분석이 만나 지혜로 식는 자리라, 합 안에 작은 형(刑)의 결도 함께 들어 있습니다.',
    en: 'Midday fire and autumn metal pair up and, surprisingly, run as water. Passion cools through analysis into wisdom — a small bite of friction lives inside the bond.',
    keywords_ko: ['전환', '지혜', '복합'],
    keywords_en: ['turn', 'wisdom', 'complexity'],
  },
  {
    kind: 'jiji_yukhap',
    pair: '午未',
    pairKo: '오미',
    name: '오미합 (午未合, 음양합)',
    ko: '한낮의 불과 한여름의 흙이 손을 잡아 정점의 열기를 함께 머금어요. 별도의 변화 오행 없이 음양의 면이 짝을 이루는 자리라, 친밀과 동행감이 강합니다.',
    en: 'Midday fire and high-summer earth clasp hands at the peak of heat. No transformed element here — just yin and yang stepping into pair, with deep companionship.',
    keywords_ko: ['친밀', '동행', '열기'],
    keywords_en: ['intimacy', 'companionship', 'heat'],
  },

  // ──────────────────────────────────────────────
  // 지지 삼합 (4종)
  // ──────────────────────────────────────────────
  {
    kind: 'jiji_samhap',
    pair: '寅午戌',
    pairKo: '인오술',
    name: '인오술 삼합 (寅午戌, 화국)',
    result: '화',
    ko: '봄의 시작, 한낮의 정점, 가을의 갈무리가 모여 거대한 불의 국을 이뤄요. 시작·확산·정리의 셋이 한 줄로 흐르는 면이라, 열정과 명성이 함께 커집니다.',
    en: "Spring's start, midday peak, and autumn's gather come together as a great fire bureau. Beginning, expansion, and closing flow in one line — passion and visibility grow side by side.",
    keywords_ko: ['열정', '명성', '확산'],
    keywords_en: ['passion', 'visibility', 'spread'],
  },
  {
    kind: 'jiji_samhap',
    pair: '巳酉丑',
    pairKo: '사유축',
    name: '사유축 삼합 (巳酉丑, 금국)',
    result: '금',
    ko: '여름의 시작, 가을의 정점, 겨울의 갈무리가 모여 단단한 쇠의 국을 이뤄요. 의리·결단·정리가 한 흐름이 되는 면이라, 약속과 실무가 깔끔하게 풀립니다.',
    en: "Early summer, deep autumn, and early winter assemble as a metal bureau. Loyalty, decision, and closure run as one current — promises and execution land cleanly.",
    keywords_ko: ['의리', '결단', '체계'],
    keywords_en: ['loyalty', 'decision', 'structure'],
  },
  {
    kind: 'jiji_samhap',
    pair: '申子辰',
    pairKo: '신자진',
    name: '신자진 삼합 (申子辰, 수국)',
    result: '수',
    ko: '가을 쇠, 한겨울 물, 봄의 진흙이 모여 큰 물의 국을 이뤄요. 정보·인연·흐름이 한 줄로 모이는 면이라, 지혜와 사교가 동시에 깊어집니다.',
    en: "Autumn metal, deep-winter water, and spring's silt gather as a great water bureau. Information, relationship, and flow line up — wisdom and social reach deepen together.",
    keywords_ko: ['지혜', '사교', '흐름'],
    keywords_en: ['wisdom', 'social', 'flow'],
  },
  {
    kind: 'jiji_samhap',
    pair: '亥卯未',
    pairKo: '해묘미',
    name: '해묘미 삼합 (亥卯未, 목국)',
    result: '목',
    ko: '겨울 끝 물, 봄 한가운데 나무, 여름의 흙이 모여 큰 나무의 국을 이뤄요. 호기심·성장·인연이 함께 자라는 면이라, 새 시도와 사람의 연이 동시에 풍성해집니다.',
    en: "Late-winter water, mid-spring wood, and summer earth gather as a wood bureau. Curiosity, growth, and connection rise together — fresh ventures and human ties both bloom.",
    keywords_ko: ['성장', '호기심', '인연'],
    keywords_en: ['growth', 'curiosity', 'connection'],
  },

  // ──────────────────────────────────────────────
  // 지지 방합 (4종) — 계절합
  // ──────────────────────────────────────────────
  {
    kind: 'jiji_banghap',
    pair: '寅卯辰',
    pairKo: '인묘진',
    name: '인묘진 방합 (寅卯辰, 목국·봄)',
    result: '목',
    ko: '입춘·춘분·곡우의 세 자리가 한 계절을 이뤄 봄의 식으로 흐릅니다. 시작의 에너지가 한 방향으로 모이는 면이라, 새로 펴는 일·새 인연이 한꺼번에 일어요.',
    en: "Early, mid, and late spring assemble into one season's wood current. Start-energy concentrates in one direction — new ventures and new ties open at once.",
    keywords_ko: ['봄', '시작', '확장'],
    keywords_en: ['spring', 'start', 'expansion'],
  },
  {
    kind: 'jiji_banghap',
    pair: '巳午未',
    pairKo: '사오미',
    name: '사오미 방합 (巳午未, 화국·여름)',
    result: '화',
    ko: '입하·하지·대서의 세 자리가 한 계절을 이뤄 여름의 식으로 흐릅니다. 열기·표현·외향이 한꺼번에 부풀어 오르는 면이라, 사람 앞에 서는 일이 많아져요.',
    en: "Early, mid, and late summer assemble into one season's fire current. Heat, expression, and outreach swell together — more moments stepping out in front of people.",
    keywords_ko: ['여름', '표현', '열기'],
    keywords_en: ['summer', 'expression', 'heat'],
  },
  {
    kind: 'jiji_banghap',
    pair: '申酉戌',
    pairKo: '신유술',
    name: '신유술 방합 (申酉戌, 금국·가을)',
    result: '금',
    ko: '입추·추분·상강의 세 자리가 한 계절을 이뤄 가을의 식으로 흐릅니다. 정리·수확·결단이 한 방향으로 모이는 면이라, 약속과 마무리가 단호해집니다.',
    en: "Early, mid, and late autumn assemble into one season's metal current. Tidying, harvest, and decision converge — promises and closings turn firm.",
    keywords_ko: ['가을', '수확', '결단'],
    keywords_en: ['autumn', 'harvest', 'decision'],
  },
  {
    kind: 'jiji_banghap',
    pair: '亥子丑',
    pairKo: '해자축',
    name: '해자축 방합 (亥子丑, 수국·겨울)',
    result: '수',
    ko: '입동·동지·대한의 세 자리가 한 계절을 이뤄 겨울의 식으로 흐릅니다. 갈무리·사유·기다림이 한 흐름이 되는 면이라, 안으로 깊어지는 시기가 옵니다.',
    en: "Early, mid, and late winter assemble into one season's water current. Storing, reflection, and waiting line up — a season that deepens inward.",
    keywords_ko: ['겨울', '사유', '기다림'],
    keywords_en: ['winter', 'reflection', 'waiting'],
  },

  // ──────────────────────────────────────────────
  // 지지충 (6종) — 정충
  // ──────────────────────────────────────────────
  {
    kind: 'jiji_chung',
    pair: '子午',
    pairKo: '자오',
    name: '자오충 (子午冲)',
    ko: '한밤의 물과 한낮의 불이 정반대로 마주서요. 감정과 열기, 안과 밖이 가장 큰 폭으로 부딪히는 면이라, 변화·이동·관계의 진폭이 커집니다.',
    en: 'Midnight water and midday fire stand at opposite poles. Feeling and heat, inside and outside swing at full width — change, movement, and relationships all amplify.',
    keywords_ko: ['진폭', '이동', '변화'],
    keywords_en: ['amplitude', 'move', 'change'],
  },
  {
    kind: 'jiji_chung',
    pair: '丑未',
    pairKo: '축미',
    name: '축미충 (丑未冲)',
    ko: '겨울 흙과 여름 흙이 같은 토끼리 마주서요. 보존과 발산, 옛것과 새것이 같은 자리에서 맞붙는 면이라, 가족·재물 안에서 작은 갈등이 자주 일어요.',
    en: 'Winter soil and summer soil — earth confronting earth — meet head-on. Keeping and releasing, the old and the new tangle on the same ground; small frictions show up around family and finances.',
    keywords_ko: ['갈등', '재물', '가족'],
    keywords_en: ['friction', 'money', 'family'],
  },
  {
    kind: 'jiji_chung',
    pair: '寅申',
    pairKo: '인신',
    name: '인신충 (寅申冲)',
    ko: '봄나무와 가을 쇠가 정면으로 마주서요. 시작과 정리, 진취와 결단이 부딪히는 면이라, 이동·여행·자리바꿈이 잦아집니다.',
    en: 'Spring wood and autumn metal face off. Beginning and closing, drive and decision collide — frequent travel, relocation, and role changes.',
    keywords_ko: ['이동', '전직', '진취'],
    keywords_en: ['travel', 'switch', 'drive'],
  },
  {
    kind: 'jiji_chung',
    pair: '卯酉',
    pairKo: '묘유',
    name: '묘유충 (卯酉冲)',
    ko: '연한 풀과 다듬인 보석칼이 마주서요. 섬세함과 단호함이 부딪히는 면이라, 인연의 흔들림과 작은 결별이 동반될 수 있어요.',
    en: 'A soft vine and a polished blade come edge to edge. Tenderness meets resolve — relationships may shift, and small partings can follow.',
    keywords_ko: ['인연', '결별', '동요'],
    keywords_en: ['ties', 'parting', 'shift'],
  },
  {
    kind: 'jiji_chung',
    pair: '辰戌',
    pairKo: '진술',
    name: '진술충 (辰戌冲)',
    ko: '습한 봄 흙과 마른 가을 흙이 같은 토끼리 마주서요. 보관과 정리, 깊은 곳과 마른 곳이 부딪히는 면이라, 묵은 일이 한꺼번에 드러납니다.',
    en: 'Damp spring earth and dry autumn earth — earth against earth — confront each other. Keeping versus clearing, the buried versus the dried-out; old matters surface all at once.',
    keywords_ko: ['묵은일', '정리', '드러남'],
    keywords_en: ['old issues', 'clearing', 'surfacing'],
  },
  {
    kind: 'jiji_chung',
    pair: '巳亥',
    pairKo: '사해',
    name: '사해충 (巳亥冲)',
    ko: '한낮의 불과 깊은 밤 물이 마주서요. 빛과 어둠, 양과 음이 정면으로 맞서는 면이라, 신념·종교·해외 같은 큰 주제의 변동이 따라옵니다.',
    en: 'Midday fire and deep-night water meet head-on. Light against dark, yang against yin — beliefs, religion, and overseas matters tend to shift here.',
    keywords_ko: ['신념', '해외', '변동'],
    keywords_en: ['belief', 'overseas', 'shift'],
  },

  // ──────────────────────────────────────────────
  // 지지형 (7종) — 삼형 2 + 상형 1 + 자형 4
  // ──────────────────────────────────────────────
  {
    kind: 'jiji_hyeong',
    pair: '寅巳申',
    pairKo: '인사신',
    name: '인사신 삼형 (寅巳申, 무은지형)',
    ko: '봄나무·여름불·가을쇠 셋이 한자리에 모여 서로 어긋나요. 의지·열정·결단이 한 줄이 되지 못하는 면이라, 의리·은혜를 둘러싼 복잡한 일이 따라옵니다.',
    en: 'Spring wood, summer fire, and autumn metal gather and miscue against one another. Will, heat, and decision fail to line up — tangled matters around loyalty and gratitude can follow.',
    keywords_ko: ['어긋남', '복잡', '의리'],
    keywords_en: ['miscue', 'tangle', 'loyalty'],
  },
  {
    kind: 'jiji_hyeong',
    pair: '丑戌未',
    pairKo: '축술미',
    name: '축술미 삼형 (丑戌未, 지세지형)',
    ko: '겨울·가을·여름의 세 흙이 한자리에 모여 서로 밀어내요. 같은 토끼리 자리를 다투는 면이라, 권력·재물·문서 안에서 마찰이 일기 쉬워요.',
    en: 'Three earths — winter, autumn, summer — gather and push against each other. Same-element rivalry over territory; friction tends to gather around power, money, and documents.',
    keywords_ko: ['권력', '문서', '경쟁'],
    keywords_en: ['power', 'documents', 'rivalry'],
  },
  {
    kind: 'jiji_hyeong',
    pair: '子卯',
    pairKo: '자묘',
    name: '자묘 상형 (子卯, 무례지형)',
    ko: '한겨울 물과 봄 한가운데 풀이 어긋나게 만나요. 흐름과 새 가지가 서로의 예의를 깨는 면이라, 가까운 사이에서 작은 무례와 오해가 생기기 쉬워요.',
    en: 'Deep-winter water and mid-spring grass meet on a wrong note. Current and new shoot break each other’s courtesy — small rudeness and misunderstanding crop up among close ones.',
    keywords_ko: ['오해', '무례', '거리감'],
    keywords_en: ['misunderstand', 'rudeness', 'distance'],
  },
  {
    kind: 'jiji_hyeong',
    pair: '辰辰',
    pairKo: '진진',
    name: '진진 자형 (辰辰, 자형)',
    ko: '같은 봄 흙이 둘 모이는 자형이에요. 같은 결끼리 자기 안에서 부딪히는 자리라, 묵은 감정과 미루던 일이 스스로 떠올라 정리를 요구합니다.',
    en: 'Same spring earth doubles up as a self-punishment. Same current jostling within itself — old feelings and postponed tasks surface and ask to be cleared.',
    keywords_ko: ['묵은감정', '자기점검', '정리'],
    keywords_en: ['old feelings', 'self-check', 'clearing'],
  },
  {
    kind: 'jiji_hyeong',
    pair: '午午',
    pairKo: '오오',
    name: '오오 자형 (午午, 자형)',
    ko: '같은 여름 불이 둘 모이는 자형이에요. 열기가 자기끼리 다투는 면이라, 한꺼번에 타올랐다가 소진되기 쉬워 속도 조절이 핵심입니다.',
    en: 'Same summer fire doubles up as a self-punishment. Heat fights itself — quick flare-ups followed by burnout, so pacing is the lever.',
    keywords_ko: ['소진', '과열', '조절'],
    keywords_en: ['burnout', 'overheat', 'pacing'],
  },
  {
    kind: 'jiji_hyeong',
    pair: '酉酉',
    pairKo: '유유',
    name: '유유 자형 (酉酉, 자형)',
    ko: '같은 가을 쇠가 둘 모이는 자형이에요. 날 선 결끼리 부딪히는 자리라, 자기 비판이 강해지고 작은 흠을 크게 보기 쉬워요.',
    en: 'Same autumn metal doubles up as a self-punishment. Two edges sharpening on each other — self-criticism intensifies and small flaws look large.',
    keywords_ko: ['자기비판', '예민', '결벽'],
    keywords_en: ['self-critique', 'edginess', 'perfectionism'],
  },
  {
    kind: 'jiji_hyeong',
    pair: '亥亥',
    pairKo: '해해',
    name: '해해 자형 (亥亥, 자형)',
    ko: '같은 한밤 물이 둘 모이는 자형이에요. 깊은 결끼리 서로를 끌어내려가는 자리라, 생각과 감정이 지나치게 가라앉지 않도록 흐름을 만들어 주세요.',
    en: 'Same deep-night water doubles up as a self-punishment. Two depths drawing each other downward — keep some flow going so thought and mood don’t over-sink.',
    keywords_ko: ['침잠', '과잉사색', '흐름'],
    keywords_en: ['sinking', 'over-thinking', 'flow'],
  },

  // ──────────────────────────────────────────────
  // 지지해 (6종) — 은근한 어긋남
  // ──────────────────────────────────────────────
  {
    kind: 'jiji_hae',
    pair: '子未',
    pairKo: '자미',
    name: '자미해 (子未害)',
    ko: '한겨울 물과 한여름 흙이 비스듬히 어긋나요. 큰 충은 아니지만 잘 안 보이는 결에서 막힘이 생기는 자리라, 사소한 오해가 길게 남기 쉬워요.',
    en: 'Deep-winter water and high-summer earth misalign at an angle. Not a full clash, but a quiet snag in places you can’t see — small misunderstandings can linger.',
    keywords_ko: ['은근한갈등', '오해', '지연'],
    keywords_en: ['quiet friction', 'misread', 'delay'],
  },
  {
    kind: 'jiji_hae',
    pair: '丑午',
    pairKo: '축오',
    name: '축오해 (丑午害)',
    ko: '겨울 흙과 한낮 불이 어긋나게 만나요. 따뜻해지려는 면이 자꾸 식는 자리라, 감정과 인정 사이에서 작은 서운함이 쌓이기 쉬워요.',
    en: 'Winter earth and midday fire cross off-axis. Warmth keeps cooling down — small letdowns can pile up between feeling and acknowledgment.',
    keywords_ko: ['서운함', '식음', '인정욕'],
    keywords_en: ['letdown', 'cooling', 'recognition'],
  },
  {
    kind: 'jiji_hae',
    pair: '寅巳',
    pairKo: '인사',
    name: '인사해 (寅巳害)',
    ko: '봄나무와 여름불이 합인 듯 어긋나요. 같이 가는 듯하면서 작은 형의 면이 섞여 있는 자리라, 동행 안에서도 미세한 마찰이 따라옵니다.',
    en: 'Spring wood and summer fire look bonded but slip off-key. Walking together while a small bite of friction lives inside — micro-tension travels along the partnership.',
    keywords_ko: ['미세마찰', '동행', '복합'],
    keywords_en: ['micro-friction', 'partnership', 'complex'],
  },
  {
    kind: 'jiji_hae',
    pair: '卯辰',
    pairKo: '묘진',
    name: '묘진해 (卯辰害)',
    ko: '봄 한가운데 풀과 봄 끝 흙이 이웃으로 어긋나요. 가까운 결끼리 묘하게 안 맞는 자리라, 가까운 가족·동료 사이에서 자잘한 부딪힘이 생기기 쉬워요.',
    en: 'Mid-spring grass and late-spring earth misalign as neighbors. Close currents that don’t quite fit — little bumps among family and close coworkers.',
    keywords_ko: ['이웃갈등', '가족', '잔마찰'],
    keywords_en: ['neighbor friction', 'family', 'small bumps'],
  },
  {
    kind: 'jiji_hae',
    pair: '申亥',
    pairKo: '신해',
    name: '신해해 (申亥害)',
    ko: '가을 쇠와 한밤 물이 비스듬히 어긋나요. 사고와 정서가 같은 방향이 아닌 자리라, 결정 뒤에도 마음이 늦게 따라오는 일이 잦아요.',
    en: 'Autumn metal and deep-night water cross off-axis. Thinking and feeling don’t face the same way — decisions made first, the heart catching up later.',
    keywords_ko: ['머뭇거림', '시차', '내적갈등'],
    keywords_en: ['hesitation', 'lag', 'inner gap'],
  },
  {
    kind: 'jiji_hae',
    pair: '酉戌',
    pairKo: '유술',
    name: '유술해 (酉戌害)',
    ko: '가을 쇠와 가을 끝 흙이 이웃으로 어긋나요. 같은 계절 안에서 비좁게 부딪히는 자리라, 가까운 사이의 비판과 자존심이 자주 충돌해요.',
    en: 'Autumn metal and late-autumn earth misalign as neighbors. Tight bumping inside one season — critique and pride collide most often among the closest.',
    keywords_ko: ['비판', '자존심', '근거리'],
    keywords_en: ['critique', 'pride', 'close-range'],
  },

  // ──────────────────────────────────────────────
  // 지지파 (6종) — 깨짐·균열
  // ──────────────────────────────────────────────
  {
    kind: 'jiji_pa',
    pair: '子酉',
    pairKo: '자유',
    name: '자유파 (子酉破)',
    ko: '한밤 물과 가을 쇠가 서로의 면을 깎아요. 흐름이 차갑게 굳고 깎이는 자리라, 정리가 빨리 끝나지만 인연이 식을 수 있어요.',
    en: 'Deep-night water and autumn metal scrape at each other. Flow cools and gets chipped down — fast closure, but ties may cool too.',
    keywords_ko: ['깎임', '냉각', '정리'],
    keywords_en: ['scrape', 'cooling', 'closure'],
  },
  {
    kind: 'jiji_pa',
    pair: '卯午',
    pairKo: '묘오',
    name: '묘오파 (卯午破)',
    ko: '봄 풀과 한낮 불이 서로 태우며 깨져요. 자라려는 가지가 너무 빨리 마르는 자리라, 의욕이 일었다 식는 일이 반복되기 쉬워요.',
    en: 'Spring grass and midday fire burn each other and crack apart. New shoots dry out too fast — drive that rises and quickly fades, on repeat.',
    keywords_ko: ['소진', '식음', '반복'],
    keywords_en: ['burnout', 'cooling', 'cycling'],
  },
  {
    kind: 'jiji_pa',
    pair: '巳申',
    pairKo: '사신',
    name: '사신파 (巳申破)',
    ko: '한낮 불과 가을 쇠가 합인 듯 깨져요. 합·형·파가 함께 들어 있는 자리라, 인연과 일이 한꺼번에 만들어졌다 부서졌다 합니다.',
    en: 'Midday fire and autumn metal look bonded yet crack apart. Combination, friction, and break all live here — ties and projects form and shatter on the same beat.',
    keywords_ko: ['양면', '변동', '재구성'],
    keywords_en: ['double-edge', 'shift', 'reset'],
  },
  {
    kind: 'jiji_pa',
    pair: '寅亥',
    pairKo: '인해',
    name: '인해파 (寅亥破)',
    ko: '봄나무와 큰 물이 합인 듯 깨져요. 부드럽게 자라는 면 안에 작은 균열이 함께 들어 있는 자리라, 시작한 일이 막바지에서 한번 흔들립니다.',
    en: 'Spring wood and a great stream look bonded but carry a quiet break inside. Growth flows softly with a small crack baked in — new ventures wobble once near the finish.',
    keywords_ko: ['균열', '막판동요', '점검'],
    keywords_en: ['hairline', 'late wobble', 'check'],
  },
  {
    kind: 'jiji_pa',
    pair: '辰丑',
    pairKo: '진축',
    name: '진축파 (辰丑破)',
    ko: '봄 끝 흙과 겨울 흙이 같은 토끼리 깨져요. 비슷한 결끼리 서로의 자리를 깎아내는 자리라, 가까운 합의·계약에서 균열이 생기기 쉬워요.',
    en: 'Late-spring earth and winter earth — same element — crack against each other. Similar currents chipping at each other’s ground — close agreements and contracts can fissure.',
    keywords_ko: ['계약균열', '합의', '가까움'],
    keywords_en: ['contract crack', 'agreement', 'close ties'],
  },
  {
    kind: 'jiji_pa',
    pair: '戌未',
    pairKo: '술미',
    name: '술미파 (戌未破)',
    ko: '가을 끝 흙과 여름 흙이 같은 토끼리 깨져요. 비슷한 결끼리 자리를 다투며 균열이 깊어지는 자리라, 가족·재산 주제에서 묵은 일이 드러납니다.',
    en: 'Late-autumn earth and summer earth — same element — split against each other. A widening fissure between like currents — long-held issues around family and assets come up.',
    keywords_ko: ['가족', '재산', '묵은일'],
    keywords_en: ['family', 'assets', 'old issues'],
  },
]

/**
 * 종류와 식별 키(한자 또는 한글)로 entry를 찾는다.
 * pair는 한자(예: "甲己") 또는 한글(예: "갑기") 모두 허용.
 */
export function findRelationEntry(kind: RelationKind, pair: string): RelationEntry | null {
  const key = String(pair || '').trim()
  if (!key) {
    return null
  }
  for (const entry of RELATIONS_DICTIONARY) {
    if (entry.kind !== kind) {
      continue
    }
    if (entry.pair === key || entry.pairKo === key) {
      return entry
    }
  }
  return null
}

/** 종류별로 entry 목록을 반환 */
export function listRelationsByKind(kind: RelationKind): RelationEntry[] {
  return RELATIONS_DICTIONARY.filter((entry) => entry.kind === kind)
}
