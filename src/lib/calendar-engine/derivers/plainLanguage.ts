/**
 * 쉬운말 레이어 — 명리/점성 용어를 일상어로 옮긴다.
 *
 * 정책(2026-06): 화면은 "결론 일상어 먼저, 전문용어는 괄호/툴팁". 구조·데이터는
 * 그대로 두고 이 사전만 입혀 캘린더/리포트 전반을 이해하기 쉽게 만든다.
 *
 * 순수 데이터 + 작은 헬퍼. LLM 0번.
 */

/** 십신 → 생활영역(한 단어) + 영문 생활영역 + 한 줄 뜻. */
const SIBSIN_DOMAIN: Record<string, { area: string; areaEn: string; gloss: string }> = {
  비견: { area: '사람·자립', areaEn: 'self & peers', gloss: '내 편·동료, 홀로서기' },
  겁재: { area: '경쟁·사람', areaEn: 'rivalry & drive', gloss: '경쟁과 협력이 같이 오는 인간관계' },
  식신: { area: '표현·재능', areaEn: 'expression', gloss: '꾸준히 만들고 표현하는 힘' },
  상관: { area: '재능·자유', areaEn: 'talent & edge', gloss: '톡톡 튀는 표현·재능' },
  편재: { area: '돈·현실', areaEn: 'opportunity & money', gloss: '활동적인 돈·사업 감각' },
  정재: { area: '돈·안정', areaEn: 'steady wealth', gloss: '꾸준히 모으는 안정 재물' },
  편관: { area: '일·도전', areaEn: 'challenge & pressure', gloss: '강하게 밀어붙이는 책임·압박' },
  정관: { area: '일·책임', areaEn: 'duty & standing', gloss: '원칙·자리·사회적 책임' },
  편인: { area: '공부·사유', areaEn: 'study & depth', gloss: '독자적 배움·생각' },
  정인: { area: '공부·지원', areaEn: 'learning & support', gloss: '배움과 받쳐주는 도움' },
  // 묶음 별
  비겁: { area: '사람·경쟁', areaEn: 'self & peers', gloss: '내 편·경쟁' },
  식상: { area: '표현·재능', areaEn: 'expression', gloss: '표현·재능' },
  재성: { area: '돈·현실', areaEn: 'money & results', gloss: '돈·현실 성취' },
  관성: { area: '일·책임', areaEn: 'duty & work', gloss: '일·책임·자리' },
  인성: { area: '공부·지원', areaEn: 'learning', gloss: '배움·지원' },
  // 신살 (교차 카드 라벨용) — 십신과 같은 area 한 단어 규칙으로.
  도화: { area: '매력·인기', areaEn: 'charm & appeal', gloss: '끌림·사교' },
  도화살: { area: '매력·인기', areaEn: 'charm & appeal', gloss: '끌림·사교' },
  역마: { area: '이동·변화', areaEn: 'movement', gloss: '이동·출장·변화' },
  역마살: { area: '이동·변화', areaEn: 'movement', gloss: '이동·출장·변화' },
  양인: { area: '과열·날카로움', areaEn: 'sharp & intense', gloss: '날카롭고 과열되는 힘' },
  건록: { area: '실력·자리', areaEn: 'skill & standing', gloss: '제 실력으로 선 자리' },
}

/** 행성 → 쉬운 한 줄(일상 개념어). '하늘/별' 같은 표현은 쓰지 않는다. */
const PLANET_PLAIN: Record<string, { ko: string; en: string }> = {
  Sun: { ko: '나·활력', en: 'self & energy' },
  Moon: { ko: '감정·기분', en: 'mood & feelings' },
  Mercury: { ko: '말·소통', en: 'talk & ideas' },
  Venus: { ko: '사랑·돈', en: 'love & money' },
  Mars: { ko: '추진·마찰', en: 'drive & friction' },
  Jupiter: { ko: '기회·확장', en: 'luck & growth' },
  Saturn: { ko: '책임·인내', en: 'duty & limits' },
  Uranus: { ko: '변화·돌발', en: 'sudden change' },
  Neptune: { ko: '꿈·영성', en: 'dreams & spirit' },
  Pluto: { ko: '변형·권력', en: 'power & change' },
}

/** 한글 행성명 → 영문 키 (교차 카드는 KO 행성명을 들고 옴). */
const KO_PLANET_TO_EN: Record<string, string> = {
  태양: 'Sun',
  달: 'Moon',
  수성: 'Mercury',
  금성: 'Venus',
  화성: 'Mars',
  목성: 'Jupiter',
  토성: 'Saturn',
  천왕성: 'Uranus',
  해왕성: 'Neptune',
  명왕성: 'Pluto',
}

/** 12운성 → 기세 단계 쉬운 한 줄.
 *  시적 은유("새싹처럼") 대신 생활 프레임(벌이기/확정/본업/정리)으로 —
 *  단계 의미(왕상휴수)는 보존하고 표현만 행동 지향으로(2026-07 생활어 정비). */
const TWELVE_STAGE_PLAIN: Record<string, string> = {
  장생: '새 일 벌이기 좋은 시작 기세',
  목욕: '아직 다듬는 중 — 확정은 이르게',
  관대: '이름 내걸고 나서기 시작하는 기세',
  건록: '본업 실력으로 버는 단단한 기세',
  임관: '본업 실력으로 버는 단단한 기세',
  제왕: '기세 절정 — 밀어붙임이 통함',
  왕지: '기세 절정 — 밀어붙임이 통함',
  쇠: '정점 지난 뒤 — 지키는 게 이득',
  병: '배터리 낮음 — 몸부터 챙길 때',
  사: '끝난 일은 접는 마무리 기세',
  묘: '넓히기보단 정리·저장할 때',
  절: '비우고 다시 시작하는 전환점',
  태: '아이디어가 조용히 잉태되는 때',
  양: '조용히 힘을 기르는 준비 기세',
}

/** 십신명 → 생활영역 단어. 못 찾으면 원어. */
export function sibsinArea(name: string | undefined): string {
  if (!name) return ''
  return SIBSIN_DOMAIN[name]?.area ?? name
}

/** 십신명 → 영문 생활영역 단어. 못 찾으면 원어. */
export function sibsinAreaEn(name?: string): string {
  return SIBSIN_DOMAIN[name ?? '']?.areaEn ?? name ?? ''
}

/** 12운성명 → 쉬운 한 줄. 못 찾으면 원어. */
export function twelveStagePlain(stage: string | undefined): string {
  if (!stage) return ''
  return TWELVE_STAGE_PLAIN[stage] ?? stage
}

/**
 * 격국 성패(status) → 생활어 한 줄 (ko/en).
 * '성격/파격/반성반파'는 화면 최심부 폴드에서 그대로 노출되던 마지막 용어투
 * (감사 갭 #3). 원 status 라벨은 옆 서브 줄로 유지 — 결론 일상어 먼저 원칙.
 */
const GEOKGUK_STATUS_PLAIN: Record<string, { ko: string; en: string }> = {
  성격: {
    ko: '타고난 판이 제대로 선 날 — 내 강점이 그대로 통해요',
    en: 'your natal setup stands firm — your strengths carry as-is',
  },
  파격: {
    ko: '타고난 판이 흔들리는 날 — 기본기와 루틴으로 버티세요',
    en: 'your natal setup wobbles — lean on basics and routine',
  },
  반성반파: {
    ko: '서는 쪽과 흔들리는 쪽이 반반 — 되는 일에 힘을 실으세요',
    en: 'half steady, half shaky — back what already works',
  },
}

export function geokgukStatusPlain(status: string | undefined, lang: 'ko' | 'en' = 'ko'): string {
  if (!status) return ''
  return GEOKGUK_STATUS_PLAIN[status]?.[lang] ?? ''
}

/**
 * 신살 → 생활 장면 한 줄 (ko/en).
 *
 * 감사(2026-07): 추출기가 방출하는 신살 ~33종 중 4종만 생활어가 있어, 화면
 * (깊이 읽기 "오늘 함께하는 기운")에 백호·괴강 같은 원어가 그대로 떴다.
 * 전 어휘를 구체 장면(칼·차·지갑·카톡·회식)으로 매핑 — 카피 원칙은
 * toneMeaning 과 동일: 단정 + 생활 명사 + 처방, 공포·숙명론 금지.
 * 키는 saju-shinsal 추출기의 SHINSAL_POLARITY 어휘와 1:1(별칭 포함 조회).
 */
const SHINSAL_SCENE: Record<string, { ko: string; en: string }> = {
  // ── 12신살 ──
  장성: { ko: '앞에 나설수록 서는 힘', en: 'stepping forward gives you standing' },
  반안: { ko: '한 계단 올라서는 안정운', en: 'a steady one-step climb' },
  역마: {
    ko: '움직일수록 풀리는 날 — 이동·출장·외근',
    en: 'movement unlocks it — trips, errands, field work',
  },
  육해: { ko: '잔병·잔사고 조심 — 컨디션부터', en: 'minor aches and slips — mind your condition' },
  화개: { ko: '혼자 몰입이 되는 날 — 공부·창작', en: 'solo focus flows — study and making' },
  겁살: {
    ko: '뺏기기 쉬운 날 — 지갑·폰·데이터 단속',
    en: 'easy to lose things — guard wallet, phone, files',
  },
  재살: {
    ko: '구설·다툼에 얽히기 쉬움 — 한 발 빼기',
    en: 'easy to get dragged into disputes — step back',
  },
  천살: {
    ko: '위에서 내려오는 변수 — 윗사람·기관 일 조심',
    en: 'variables from above — bosses and offices',
  },
  월살: {
    ko: '기운이 새는 날 — 무리한 약속은 접기',
    en: 'energy leaks today — skip the stretch commitments',
  },
  망신: {
    ko: '체면 깎일 일 조심 — 말과 옷차림 단정하게',
    en: 'guard your face — mind words and appearance',
  },
  지살: { ko: '가까운 이동·자리 이동이 생기는 기운', en: 'short moves and seat changes stir' },
  년살: { ko: '시선이 모이는 날 — 꾸민 만큼 통함', en: 'eyes gather on you — grooming pays' },
  // ── 길성 (귀인·문창류) ──
  천을귀인: { ko: '막힐 때 도와줄 사람이 나타나는 날', en: 'when stuck, a helper shows up' },
  태극귀인: { ko: '큰 판에서 끌어주는 힘이 붙는 날', en: 'a pull upward on the big board' },
  천덕귀인: { ko: '넘어가도 봐주는 무사통과 운', en: 'a pass-through day — slips get pardoned' },
  월덕귀인: { ko: '주변이 감싸주는 부드러운 운', en: 'people around you cushion the day' },
  천주귀인: { ko: '먹을 복 — 식사 자리·대접이 이로움', en: 'luck at the table — meals open doors' },
  암록: { ko: '보이지 않는 뒷배·숨은 도움', en: 'quiet backing works for you unseen' },
  금여성: { ko: '품위 있는 인연이 닿는 기운', en: 'refined connections come near' },
  천의성: {
    ko: '치료·회복에 좋은 날 — 병원 갈 일 미루지 말기',
    en: 'good for healing — keep that appointment',
  },
  천문성: {
    ko: '직감이 날카로운 날 — 첫 느낌을 믿기',
    en: 'sharp intuition — trust the first read',
  },
  문창: { ko: '글·문서·시험에 강한 날', en: 'strong for writing, papers, exams' },
  문곡: { ko: '배움이 잘 붙는 날 — 강의·독서', en: 'learning sticks — lectures and reading' },
  학당귀인: { ko: '공부·자격에 유리한 기운', en: 'favorable for study and credentials' },
  건록: {
    ko: '제 실력으로 버는 힘 — 본업이 답',
    en: 'earn on your own skill — the day job delivers',
  },
  제왕: { ko: '기세 최고조 — 단, 독주는 조심', en: 'peak momentum — just don’t go solo blind' },
  // ── 흉신·살 ──
  도화: {
    ko: '눈에 띄는 매력 — 소개·미팅이 통하는 날',
    en: 'magnetic today — intros and meetings land',
  },
  홍염살: {
    ko: '치명적 매력 — 선 넘는 유혹은 거르기',
    en: 'dangerous charm — filter the line-crossing pull',
  },
  현침: {
    ko: '말이 바늘이 되기 쉬움 — 톡 쏘는 말 조심',
    en: 'words turn needle-sharp — soften the jab',
  },
  고신: {
    ko: '혼자가 편한 날 — 외로움에 무게 두지 않기',
    en: 'solitude suits today — don’t over-read the quiet',
  },
  과숙: {
    ko: '겉도는 기분 — 관계에 억지 부리지 않기',
    en: 'feeling adrift — don’t force closeness',
  },
  괴강: {
    ko: '극단으로 세게 가는 기운 — 승부수는 신중히',
    en: 'all-or-nothing energy — place bets carefully',
  },
  양인: { ko: '날붙이·차·과속 조심', en: 'mind blades, cars, and speed' },
  백호: {
    ko: '몸 다치기 쉬운 날 — 칼·차·격한 운동 주의',
    en: 'injury-prone — careful with knives, cars, hard workouts',
  },
  공망: {
    ko: '애써도 헛도는 느낌 — 결과에 집착하지 않기',
    en: 'effort spins in place — loosen the grip on outcomes',
  },
  귀문관: {
    ko: '신경이 예민해지는 날 — 새벽 카톡은 금물',
    en: 'nerves run fine-tuned — no 2am texts',
  },
  원진: {
    ko: '말이 안 통하는 상대와 부딪히는 날',
    en: 'friction with someone you just can’t reach',
  },
  천라지망: {
    ko: '그물에 걸린 듯 더딤 — 서류·절차 재확인',
    en: 'caught-in-a-net slowness — recheck papers and steps',
  },
  삼재: { ko: '큰 모험은 미루는 구간', en: 'a stretch to postpone big gambles' },
}

/**
 * 신살명 → 생활 장면 한 줄. '역마살' 같은 -살 별칭도 조회. 못 찾으면 ''
 * (호출부가 원어 병기 여부를 정한다 — 억지 폴백 문장 금지, drop-on-doubt).
 */
export function shinsalScene(name: string | undefined, lang: 'ko' | 'en' = 'ko'): string {
  if (!name) return ''
  const entry =
    SHINSAL_SCENE[name] ?? SHINSAL_SCENE[name.replace(/살$/, '')] ?? SHINSAL_SCENE[`${name}살`]
  return entry ? entry[lang] : ''
}

/** 행성명(영문 'Venus' 또는 한글 '금성') → 쉬운 별 별명. 못 찾으면 원어. */
export function planetPlain(name: string | undefined, ko: boolean): string {
  if (!name) return ''
  const key = PLANET_PLAIN[name] ? name : (KO_PLANET_TO_EN[name] ?? name)
  const entry = PLANET_PLAIN[key]
  return entry ? (ko ? entry.ko : entry.en) : name
}

/**
 * "편관 × 화성" 같은 교차 페어 이름을 토큰 분해 → { saju, astro }.
 * '×' 가 정확히 하나가 아니면(= 페어가 아니면) null.
 */
export function splitPairName(name: string | undefined): { saju: string; astro: string } | null {
  if (!name || !name.includes('×')) return null
  const parts = name.split('×')
  if (parts.length !== 2) return null
  const saju = parts[0].trim()
  const astro = parts[1].trim()
  if (!saju || !astro) return null
  return { saju, astro }
}

/**
 * 교차 페어 이름을 *쉬운말*로 — "편관 × 화성" → "일·도전 × 추진·마찰"
 * / "challenge & pressure × drive & friction". 십신·신살은 생활영역(sibsinArea),
 * 행성은 일상 개념어(planetPlain)로. 페어가 아니면(분해 실패) 원문 그대로.
 */
export function plainPairName(name: string | undefined, ko: boolean): string {
  const sp = splitPairName(name)
  if (!sp) return name ?? ''
  const left = (ko ? sibsinArea(sp.saju) : sibsinAreaEn(sp.saju)) || sp.saju
  const right = planetPlain(sp.astro, ko) || sp.astro
  return `${left} × ${right}`
}

/** 한자 지지 → 한글 (사유 문자열의 '午月' 같은 한자月 표기 풀이용). */
const BRANCH_HANJA_TO_KO: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}

/**
 * 사유(topReasons/cautions) 문자열을 화면용 plain 으로 정리.
 * formatReason 이 `${화살표} [레이어] ${korean}` 형태로 만들고 korean 에 전문용어·
 * 괄호 글로스·한자月 표기가 섞여 들어온다. 총평·근거 리스트가 공통으로 쓴다.
 *  - 선행 화살표/마크, `[이달]` 등 레이어 대괄호, 괄호 글로스 제거.
 *  - (ko) '午月' 같은 한자月 → '오월' 로 풀어 읽기.
 */
export function plainReason(text: string | undefined, ko: boolean): string {
  let t = (text ?? '')
    .replace(/^[↑↓·\s]+/, '')
    .replace(/\[[^\]]*\]\s*/g, '')
    .replace(/\s*[(（][^)）]*[)）]/g, '')
  if (ko) {
    t = t.replace(/([子丑寅卯辰巳午未申酉戌亥])月/g, (_, b: string) => `${BRANCH_HANJA_TO_KO[b]}월`)
  }
  return t.replace(/\s{2,}/g, ' ').trim()
}

// 사주·점성 전문용어 토큰 — 이게 들어있으면 novice 표면(일 '지금 일어나는 일'
// 리스트)에 부적합. 사유는 *drop-on-doubt*: plain 으로 못 바꾸면 차라리 뺀다
// (교차 meaning 등 이미 쉬운 사유가 남으므로 리스트가 비지 않는다).
const REASON_JARGON =
  /오행|통근|암합|암충|공망|득령|득세|조후|격국|용신|월령|월지|지장간|일간|일주|천간|지지|신약|신강|삼합|육합|형충|상관견관|식신제살|관인상생|재생관|관살혼잡|비겁탈재|효식|견관|제살|상생|편관|정관|편재|정재|편인|정인|비견|겁재|식신|상관|재성|관성|인성|비겁|이탈·결여|허·이탈/

function hasHanjaCodepoint(s: string): boolean {
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0
    if (
      (c >= 0x3400 && c <= 0x4dbf) ||
      (c >= 0x4e00 && c <= 0x9fff) ||
      (c >= 0xf900 && c <= 0xfaff)
    )
      return true
  }
  return false
}

/**
 * novice 표면에 내보내기 안전한(쉬운말) 사유인가 — raw 한자도, 사주/점성 전문어도
 * 없어야 true. 일 카드 '지금 일어나는 일'·'조심할 것' 리스트가 이걸로 거른다.
 */
export function isPlainReason(text: string | undefined): boolean {
  const t = (text ?? '').trim()
  if (!t) return false
  if (hasHanjaCodepoint(t)) return false
  if (REASON_JARGON.test(t)) return false
  return true
}
