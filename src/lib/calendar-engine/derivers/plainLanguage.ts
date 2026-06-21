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

/** 12운성 → 기세 단계 쉬운 한 줄. */
const TWELVE_STAGE_PLAIN: Record<string, string> = {
  장생: '새싹처럼 막 시작하는 기세',
  목욕: '다듬어지며 흔들리는 기세',
  관대: '막 자리를 잡아가는 기세',
  건록: '제 힘으로 단단히 서는 기세',
  임관: '제 힘으로 단단히 서는 기세',
  제왕: '기세가 절정에 오른 때',
  왕지: '기세가 절정에 오른 때',
  쇠: '정점을 지나 누그러지는 때',
  병: '힘이 빠지며 쉬어가는 때',
  사: '한 막이 닫히는 때',
  묘: '갈무리하고 묻어두는 때',
  절: '끊기고 비워지는 때',
  태: '새로 잉태되는 때',
  양: '조용히 길러지는 때',
}

/** 관계(합충형파) → 쉬운 한 줄. */
const RELATION_PLAIN: Record<string, string> = {
  육합: '서로 잘 맞물려요',
  삼합: '여럿이 한 방향으로 뭉쳐요',
  방합: '같은 계절끼리 모여요',
  충: '부딪혀 흔들려요',
  형: '갈등·조정이 생겨요',
  파: '깨지거나 어긋나요',
  해: '자잘하게 거슬려요',
  원진: '은근히 안 맞아요',
  공망: '비어서 힘이 덜 실려요',
}

/** 시간 축 용어 → 쉬운 정의 (툴팁용). */
export const SCALE_TERM_PLAIN: Record<string, string> = {
  대운: '10년 단위로 바뀌는 큰 흐름',
  세운: '그 해의 운',
  월운: '그 달의 운',
  일진: '그날의 기운',
  프로펙션: '해마다 한 영역씩 켜지는 점성 주기',
  ZR: '인생을 장(章)으로 나누는 점성 흐름',
  격국: '타고난 기본 성향·구조',
  용신: '나에게 보약이 되는 기운',
  기신: '나에게 부담이 되는 기운',
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

/** 행성명(영문 'Venus' 또는 한글 '금성') → 쉬운 별 별명. 못 찾으면 원어. */
export function planetPlain(name: string | undefined, ko: boolean): string {
  if (!name) return ''
  const key = PLANET_PLAIN[name] ? name : (KO_PLANET_TO_EN[name] ?? name)
  const entry = PLANET_PLAIN[key]
  return entry ? (ko ? entry.ko : entry.en) : name
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

/** 관계명(…육합/충 등)에서 종류를 뽑아 쉬운 한 줄. */
export function relationPlain(label: string | undefined): string {
  if (!label) return ''
  for (const key of Object.keys(RELATION_PLAIN)) {
    if (label.includes(key)) return RELATION_PLAIN[key]
  }
  return ''
}
