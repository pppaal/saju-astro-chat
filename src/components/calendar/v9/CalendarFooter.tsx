/**
 * 운세 달력 푸터 — v9 공용 푸터(V9Footer)에 화면 고유 한 문장. 날 문구는 결정론 엔진 템플릿이라
 * AI 라벨을 달지 않고(FIX9b E8), 출처 줄('Math: our engine · Words in the counselor: AI')은 공용
 * 푸터가 모든 화면에 같은 말로 싣는다. 서버·클라이언트 공용.
 */

import V9Footer from '@/components/v9/V9Footer'
import { pick, type Lang } from '@/components/v9/v9Copy'
import { CAL_COPY } from './calendarCopy'

export default function CalendarFooter({
  locale,
  className,
}: {
  locale: Lang
  className?: string
}) {
  return <V9Footer locale={locale} line={pick(CAL_COPY.footerLine, locale)} className={className} />
}
