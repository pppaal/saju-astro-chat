/**
 * 사주 한자 / 십성 / 격국 / 오행 의미 — 한 줄 해석 라이브러리.
 *
 * 차트 모달의 long-press tooltip, 십성 칩, persona 카드 등이 공통으로 사용.
 * 비전공자가 한자 / 약어 보고 즉시 의미 파악할 수 있게 1~2줄 plain 한국어.
 *
 * 출처: 정통 명리학 텍스트 (자평진전, 적천수) + 현대 사주 입문서 요약.
 */

// 10 천간 — 음양 + 오행 + 자연 image + 성격 키워드
export const HEAVENLY_STEMS: Record<
  string,
  { ko: string; yinYang: '양' | '음'; element: string; image: string; meaning: string }
> = {
  甲: { ko: '갑', yinYang: '양', element: '목', image: '큰 나무', meaning: '곧고 진취적, 리더십' },
  乙: { ko: '을', yinYang: '음', element: '목', image: '풀·덩굴', meaning: '유연하고 적응력 강함' },
  丙: { ko: '병', yinYang: '양', element: '화', image: '태양', meaning: '밝고 외향적, 열정' },
  丁: { ko: '정', yinYang: '음', element: '화', image: '촛불·등불', meaning: '섬세하고 따뜻, 집중력' },
  戊: { ko: '무', yinYang: '양', element: '토', image: '큰 산', meaning: '듬직하고 신뢰, 포용' },
  己: { ko: '기', yinYang: '음', element: '토', image: '논밭', meaning: '실용적이고 부드러움' },
  庚: { ko: '경', yinYang: '양', element: '금', image: '큰 쇠', meaning: '결단력·의리, 강함' },
  辛: { ko: '신', yinYang: '음', element: '금', image: '보석·날카로움', meaning: '예리하고 자존심 강함' },
  壬: { ko: '임', yinYang: '양', element: '수', image: '큰 강·바다', meaning: '지혜·포용, 유유함' },
  癸: { ko: '계', yinYang: '음', element: '수', image: '비·이슬', meaning: '섬세하고 직관적, 흐름' },
}

// 12 지지 — 동물 + 오행 + 의미
export const EARTHLY_BRANCHES: Record<
  string,
  { ko: string; animal: string; element: string; meaning: string }
> = {
  子: { ko: '자', animal: '쥐', element: '수', meaning: '시작·번식·지혜·차가운 물' },
  丑: { ko: '축', animal: '소', element: '토', meaning: '인내·축적·차가운 흙' },
  寅: { ko: '인', animal: '호랑이', element: '목', meaning: '새출발·추진·따뜻한 나무' },
  卯: { ko: '묘', animal: '토끼', element: '목', meaning: '성장·예술·부드러운 풀' },
  辰: { ko: '진', animal: '용', element: '토', meaning: '변화·잠재력·축축한 흙' },
  巳: { ko: '사', animal: '뱀', element: '화', meaning: '지혜·정열·밝은 불' },
  午: { ko: '오', animal: '말', element: '화', meaning: '활동·표현·뜨거운 불' },
  未: { ko: '미', animal: '양', element: '토', meaning: '온화·돌봄·메마른 흙' },
  申: { ko: '신', animal: '원숭이', element: '금', meaning: '기민·창의·단단한 쇠' },
  酉: { ko: '유', animal: '닭', element: '금', meaning: '정밀·완성·예리한 쇠' },
  戌: { ko: '술', animal: '개', element: '토', meaning: '충성·수호·따뜻한 흙' },
  亥: { ko: '해', animal: '돼지', element: '수', meaning: '풍요·여유·깊은 물' },
}

// 십성 (10 神) — 일간 기준 다른 천간/지지와의 관계
export const SIBSIN: Record<
  string,
  { category: 'bigeop' | 'sikSang' | 'jaeSeong' | 'gwanSeong' | 'inSeong'; meaning: string }
> = {
  비견: { category: 'bigeop', meaning: '자기·형제·동료 — 독립·경쟁' },
  겁재: { category: 'bigeop', meaning: '경쟁자·라이벌 — 분탈·욕망' },
  식신: { category: 'sikSang', meaning: '표현·창의·즐거움 — 부드러운 결' },
  상관: { category: 'sikSang', meaning: '재능·개성·반항 — 날카로운 결' },
  편재: { category: 'jaeSeong', meaning: '활동적 재물·기회·도전' },
  정재: { category: 'jaeSeong', meaning: '안정적 재물·꾸준한 노력' },
  편관: { category: 'gwanSeong', meaning: '큰 권력·압박·도전 — 칠살' },
  정관: { category: 'gwanSeong', meaning: '명예·규율·정통 권위' },
  편인: { category: 'inSeong', meaning: '특이한 지식·직관·종교성' },
  정인: { category: 'inSeong', meaning: '학문·보호·전통 지원' },
}

// 십성 카테고리별 색 — 차트 전체에서 통일
export const SIBSIN_COLOR: Record<
  'bigeop' | 'sikSang' | 'jaeSeong' | 'gwanSeong' | 'inSeong',
  { bg: string; text: string; ring: string; label: string }
> = {
  bigeop: { bg: 'bg-sky-500/15', text: 'text-sky-200', ring: 'ring-sky-500/30', label: '비겁' },
  sikSang: { bg: 'bg-emerald-500/15', text: 'text-emerald-200', ring: 'ring-emerald-500/30', label: '식상' },
  jaeSeong: { bg: 'bg-amber-500/15', text: 'text-amber-200', ring: 'ring-amber-500/30', label: '재성' },
  gwanSeong: { bg: 'bg-rose-500/15', text: 'text-rose-200', ring: 'ring-rose-500/30', label: '관성' },
  inSeong: { bg: 'bg-purple-500/15', text: 'text-purple-200', ring: 'ring-purple-500/30', label: '인성' },
}

// 격국 — 13 가지 정격 + 외격 (일반화 라벨 + 한 줄)
export const GEOKGUK: Record<string, string> = {
  정인격: '학문·보호·전통 — 학자 / 분석가 형',
  편인격: '특이한 지식·직관 — 연구·종교·예술가 형',
  정관격: '명예·정통 권위 — 공직·관리자 형',
  편관격: '큰 권력·도전 — 군인·경영자·CEO 형',
  정재격: '안정적 재물·실용 — 사업·관리 형',
  편재격: '활동적 재물·기회 — 영업·투자·중개 형',
  식신격: '표현·즐거움·창의 — 예술·교육·요리 형',
  상관격: '재능·반항·개성 — 예능·디자인·자유직 형',
  비견격: '독립·자기 사업 — 자영업·동업 형',
  겁재격: '경쟁·욕망 — 강한 추진력 형',
  종강격: '신강 극대 — 강한 결단·외골수 형',
  종재격: '재성에 종속 — 큰 재물의 길',
  종관격: '관성에 종속 — 권력·명예의 길',
}

// 신강·신약 + 용신 한 줄
export const STRENGTH_MEANING: Record<'strong' | 'medium' | 'weak', string> = {
  strong: '의지·추진력 강함. 인성/비겁 너무 많으면 고집',
  medium: '균형 좋음. 외부 환경 따라 변화',
  weak: '주변 도움 / 운에 따라 잘 풀림. 무리한 추진 X',
}

// 오행 부족 시 처방 (Fire / Wood 같은 가벼운 색·방향 권장)
export const ELEMENT_REMEDY: Record<
  string,
  { color: string; direction: string; activity: string }
> = {
  목: { color: '초록·청록', direction: '동쪽', activity: '식물·산책·창작' },
  화: { color: '빨강·주황', direction: '남쪽', activity: '운동·발표·논쟁' },
  토: { color: '노랑·갈색', direction: '중앙', activity: '실용·신뢰·돌봄' },
  금: { color: '흰색·은색', direction: '서쪽', activity: '정리·체계·단단함' },
  수: { color: '검정·파랑', direction: '북쪽', activity: '학습·명상·여행' },
}

// 헬퍼: 한자 → image
export function imageOf(stemOrBranch: string | undefined): string | undefined {
  if (!stemOrBranch) return undefined
  return HEAVENLY_STEMS[stemOrBranch]?.image ?? EARTHLY_BRANCHES[stemOrBranch]?.meaning?.split('·')[0]
}

// 헬퍼: 한자 → 1줄 의미 (long-press tooltip 용)
export function meaningOf(stemOrBranch: string | undefined): string | undefined {
  if (!stemOrBranch) return undefined
  const stem = HEAVENLY_STEMS[stemOrBranch]
  if (stem) return `${stem.image} — ${stem.meaning}`
  const branch = EARTHLY_BRANCHES[stemOrBranch]
  if (branch) return `${branch.animal} — ${branch.meaning}`
  return undefined
}

// 헬퍼: 십성 → 색 + meaning
export function sibsinInfo(sibsin: string | undefined) {
  if (!sibsin) return null
  const meta = SIBSIN[sibsin]
  if (!meta) return null
  const color = SIBSIN_COLOR[meta.category]
  return { ...meta, color }
}
