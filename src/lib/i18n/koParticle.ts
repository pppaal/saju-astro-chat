/**
 * 한국어 조사 자동 선택 유틸 — 변수 치환 시 마지막 한글 문자의 종성 유무에 따라
 * 알맞은 조사를 선택합니다.
 *
 * 사용 예:
 *   `${name}${iga(name)} 들어왔다`  // 받침 있으면 '이', 없으면 '가'
 *   `${name}${eulReul(name)} 만났다` // 받침 있으면 '을', 없으면 '를'
 *   `${name}${eunNeun(name)} 부드럽다` // 받침 있으면 '은', 없으면 '는'
 *   `${name}${waGwa(name)} 함께`     // 받침 있으면 '과', 없으면 '와'
 *   `${name}${euroRo(name)} 향해`    // 받침 있으면 '으로', 없으면 '로' (단, ㄹ 받침은 '로')
 *
 * 마지막 문자가 한글이 아닌 경우(영문/숫자/괄호/특수문자) — 한글 어말로 간주하지
 * 않으므로 '가/를/는/와/로'를 반환. 만약 단어가 `천간합(甲己)` 처럼 괄호 detail이
 * 붙어 있는데 조사를 단어 자체 기준으로 결정하고 싶다면 호출 측에서 detail을 떼고
 * 핵심 단어만 넘기세요.
 */

function hasJongsung(word: string): boolean {
  if (!word) return false
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return false
  return (last - 0xac00) % 28 !== 0
}

export function iga(word: string): '이' | '가' {
  return hasJongsung(word) ? '이' : '가'
}

export function eulReul(word: string): '을' | '를' {
  return hasJongsung(word) ? '을' : '를'
}

export function eunNeun(word: string): '은' | '는' {
  return hasJongsung(word) ? '은' : '는'
}

export function waGwa(word: string): '와' | '과' {
  return hasJongsung(word) ? '과' : '와'
}

/**
 * '으로' / '로' — ㄹ 받침은 예외로 '로'를 반환.
 */
function euroRo(word: string): '으로' | '로' {
  if (!word) return '로'
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '로'
  const j = (last - 0xac00) % 28
  if (j === 0) return '로'   // 받침 없음
  if (j === 8) return '로'   // ㄹ 받침
  return '으로'
}

/**
 * 서술격 종결 '이에요' / '예요' — 받침 있으면 '이에요', 없으면 '예요'.
 *   `${el}${iyeyo(el)}`  // 금이에요 / 화예요
 */
export function iyeyo(word: string): '이에요' | '예요' {
  return hasJongsung(word) ? '이에요' : '예요'
}
