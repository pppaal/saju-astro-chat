/**
 * KO 구조 라벨 한글화 — 한국어 LLM 컨텍스트(운명·궁합)에 남는 영어 구조
 * 태그/전문용어를 한글로 치환하는 출력 후처리기.
 *
 * 배경: 데이터 생성기들은 LLM 파싱 앵커로 영어 태그([CRITICAL]/cross/Composite
 * 등)를 써왔다. 한국어 사용자에겐 한국어 데이터만 가도록(영어 한 글자도 안
 * 남게) 최종 KO 컨텍스트에 이 후처리를 한 번 돌린다. EN 경로엔 적용하지 않아
 * 영어 출력은 그대로다.
 *
 * 유지(치환 안 함): 인물 라벨 A/B, 기둥 위치 코드 Y/M/D/H, 단문자 코드
 * (C/R/t/X 등 — 수학 변수 성격), 한자 간지(甲乙子丑 — 사주 표기 그 자체),
 * 숫자. 프롬프트(compatibilityCounselorPrompt/destinyCounselorPrompt)는 이
 * 매핑과 동일한 한글 라벨을 직접 참조하도록 맞춰 둔다 — 한쪽만 바뀌면 LLM 이
 * 데이터의 태그를 못 찾으니 둘을 한 쌍으로 유지할 것.
 */

// 치환 표 — 단어 경계(\b) 기준. 긴 토큰이 짧은 토큰의 부분일 때를 대비해
// 순서는 영향 없게 서로 겹치지 않는 토큰만 둔다. 모두 whole-word.
const WORD_MAP: ReadonlyArray<readonly [RegExp, string]> = [
  // 중요도 티어 (핵심 > 중요 > 참고)
  [/\bCRITICAL\b/g, '핵심'],
  [/\bIMPORTANT\b/g, '중요'],
  [/\bNOTE\b/g, '참고'],
  // 공통 구조어
  [/\bcross\b/g, '교차'],
  [/\bComposite\b/g, '합성차트'],
  [/\bentity\b/g, '관계체'],
  [/\boverlay\b/g, '중첩'],
  [/\bmidpoint\b/g, '중점'],
  // 점성 전문용어
  [/\bLord\b/g, '주성'],
  [/\bSR\b/g, '솔라리턴'],
  [/\bdetriment\b/g, '손상'],
  [/\bdomicile\b/g, '본궁'],
  [/\borb\b/g, '오차'],
  [/\bcycle\b/g, '주기'],
  [/\banchor\b/g, '기준'],
  [/\bHouse\b/g, '하우스'],
  [/\bhouse\b/g, '하우스'],
  [/\bSun\b/g, '태양'],
  [/\bMoon\b/g, '달'],
  [/\bsquare\b/g, '긴장'],
  [/\btrine\b/g, '조화'],
  [/\bopposition\b/g, '대립'],
  [/\bconjunction\b/g, '결합'],
  // 메타/플래그
  [/\bMeta\b/g, '메타'],
  [/\btimeUnknown\b/g, '시간미상'],
  [/\bcityUnknown\b/g, '도시미상'],
  [/\bbirthTimeUnknown\b/g, '출생시간미상'],
  [/\bbirthCityUnknown\b/g, '출생도시미상'],
  [/\bself\b/g, '본인'],
  // 플래그 부울값 — KO 컨텍스트엔 메타 플래그 외에 영어 true/false 가 안 나온다.
  [/\btrue\b/g, '참'],
  [/\bfalse\b/g, '거짓'],
]

// 특정 태그/마커 (단어 경계로 못 잡는 것).
const RAW_MAP: ReadonlyArray<readonly [RegExp, string]> = [
  [/\[C\]/g, '[합성]'], // 합성차트 내부 어스펙트 prefix
  [/\(t\)/g, '(현재)'], // 현재 트랜짓 마커
]

/**
 * KO LLM 컨텍스트 문자열의 구조 영어 라벨을 한글로 치환. KO 출력에만 사용할 것
 * (EN 출력엔 절대 적용 금지 — 영어를 깨뜨린다).
 */
export function koStructuralLabels(text: string): string {
  let out = text
  for (const [re, ko] of RAW_MAP) out = out.replace(re, ko)
  for (const [re, ko] of WORD_MAP) out = out.replace(re, ko)
  return out
}
