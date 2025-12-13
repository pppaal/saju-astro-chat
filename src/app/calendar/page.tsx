import { Metadata } from "next";
import DestinyCalendar from "@/components/calendar/DestinyCalendar";

export const metadata: Metadata = {
  title: "운명 캘린더 | MyJourney",
  description: "사주와 점성술을 교차 분석하여 중요한 날짜를 알려드립니다.",
};

export default function CalendarPage() {
  return <DestinyCalendar />;
}
