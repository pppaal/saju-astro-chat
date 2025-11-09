export type Gender = "male" | "female";
export type CalendarType = "solar" | "lunar";

export type DestinyInput = {
  name?: string;
  birthDate: string;      // "YYYY-MM-DD" (기본 양력)
  birthTime: string;      // "HH:mm" or "HH:mm:ss"
  city?: string;
  latitude: number;
  longitude: number;
  timeZone: string;       // IANA TZ
  gender: Gender;
  calendarType?: CalendarType;
};

export type WesternChart = import("../astrology/astrologyService").NatalChartData;
export type SajuChart = Awaited<ReturnType<typeof import("../Saju/saju").calculateSajuData>>;

export type DestinyAggregate = {
  input: DestinyInput;
  western: WesternChart;
  saju: SajuChart;
};

// 통합 운세의 표준 스키마(원하는 만큼 확장 가능)
export type DestinySynthesis = {
  highlights: string[];              // 한 줄 요약 포인트
  personality: {                     // 성향 통합
    keywords: string[];
    notes: string;
  };
  timing: {                          // 타이밍/운세 흐름
    currentYearLuck?: string;
    currentMonthLuck?: string;
    daeWoon?: {
      startAge: number;
      isForward: boolean;
      current?: string;
    };
    transits?: string[];             // 서양 트랜싯 요약(옵션)
  };
  elementsBalance: {                 // 오행/원소 통합 뷰
    fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number; };
    classicalElements?: { fire: number; earth: number; air: number; water: number; }; // 있으면
  };
  cautions?: string[];               // 유의점
};