/**
 * calendar-view — 캘린더 엔진 결과(CalendarCell·NatalContext) → 화면용 뷰모델 adapter 모음(barrel).
 *
 * 순수 함수만 둔다(React·'use client'·I/O 없음). 서버 어셈블러(app/calendar/assemble*)와
 * lib(push/keyDay)가 함께 쓰므로 components 가 아닌 lib 에 산다 — components/app import 금지.
 * 신규 adapter 가 추가되면 이 파일에 export 한 줄 더하면 됨.
 */

export { toUser } from './toUser'

export { toLifetime } from './toLifetime'

export { toMonth, bandMarkForScore } from './toMonth'

export { toDay } from './toDay'
