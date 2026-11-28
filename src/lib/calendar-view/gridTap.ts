/**
 * 그리드 재탭 규칙 — 이미 고른 날을 다시 누르면 그날로 들어가고(dive), 다른 날은 고르기(select).
 * 잎 모듈: 클라이언트(MonthView)가 값으로 쓰므로 뷰모델 모듈(천체력 캐시·절기표를 끌고 옴)과
 * 떼어 둔다. monthViewModel 이 같은 함수를 다시 내보낸다.
 */
export function gridTapIntent(selectedDay: number, tappedDay: number): 'dive' | 'select' {
  return selectedDay === tappedDay ? 'dive' : 'select'
}
