// src/reducers/calendarReducer.ts
type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";
type ImportanceGrade = 0 | 1 | 2 | 3 | 4;

interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
  summary?: string;
  bestTimes?: string[];
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
  ganzhi?: string;
  transitSunSign?: string;
  crossVerified?: boolean;
}

interface CalendarData {
  success: boolean;
  year: number;
  summary?: {
    total: number;
    grade0: number;
    grade1: number;
    grade2: number;
    grade3: number;
    grade4: number;
  };
  topDates?: ImportantDate[];
  goodDates?: ImportantDate[];
  cautionDates?: ImportantDate[];
  allDates?: ImportantDate[];
  error?: string;
}

interface BirthInfo {
  birthDate: string;
  birthTime: string;
  birthPlace?: string;
  gender?: 'Male' | 'Female';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

type ThemeMode = "light" | "dark";
type SlideDirection = "left" | "right" | null;

export interface CalendarState {
  // Calendar data
  data: CalendarData | null;
  loading: boolean;
  error: string | null;
  cacheHit: boolean;

  // Selection state
  selectedDate: ImportantDate | null;
  selectedDay: Date | null;
  activeCategory: EventCategory | "all";

  // Birth info
  birthInfo: BirthInfo;
  hasBirthInfo: boolean;
  submitting: boolean;
  timeUnknown: boolean;

  // UI state
  savedDates: Set<string>;
  slideDirection: SlideDirection;
  theme: ThemeMode;
  isDarkTheme: boolean;
}

export type CalendarAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: { data: CalendarData; cached: boolean } | CalendarData; cached?: boolean }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'SELECT_DATE'; payload: ImportantDate | null }
  | { type: 'SELECT_DAY'; payload: Date | null }
  | { type: 'SET_CATEGORY'; payload: EventCategory | "all" }
  | { type: 'SET_BIRTH_INFO'; payload: BirthInfo }
  | { type: 'SET_HAS_BIRTH_INFO'; payload: boolean }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_TIME_UNKNOWN'; payload: boolean }
  | { type: 'SET_SLIDE_DIRECTION'; payload: SlideDirection }
  | { type: 'ADD_SAVED_DATE'; payload: string }
  | { type: 'REMOVE_SAVED_DATE'; payload: string }
  | { type: 'TOGGLE_THEME' };

export const initialCalendarState: CalendarState = {
  data: null,
  loading: false,
  error: null,
  cacheHit: false,
  selectedDate: null,
  selectedDay: null,
  activeCategory: "all",
  birthInfo: {
    birthDate: '',
    birthTime: '12:00',
    birthPlace: '',
    gender: 'Male',
  },
  hasBirthInfo: false,
  submitting: false,
  timeUnknown: false,
  savedDates: new Set(),
  slideDirection: null,
  theme: "dark",
  isDarkTheme: true,
};

export function calendarReducer(
  state: CalendarState,
  action: CalendarAction
): CalendarState {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        loading: true,
        error: null,
        cacheHit: false,
      };

    case 'LOAD_SUCCESS': {
      const wrapped = typeof action.payload === "object" && action.payload !== null && "data" in action.payload;
      const data = wrapped
        ? (action.payload as { data: CalendarData; cached: boolean }).data
        : (action.payload as CalendarData);
      const cached =
        typeof action.cached === "boolean"
          ? action.cached
          : wrapped
            ? (action.payload as { data: CalendarData; cached: boolean }).cached
            : false;
      return {
        ...state,
        loading: false,
        data,
        cacheHit: cached,
        error: null,
      };
    }

    case 'LOAD_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
        data: null,
      };

    case 'SELECT_DATE':
      return {
        ...state,
        selectedDate: action.payload,
        selectedDay: action.payload ? new Date(action.payload.date) : null,
      };

    case 'SELECT_DAY':
      return {
        ...state,
        selectedDay: action.payload,
      };

    case 'SET_CATEGORY':
      return {
        ...state,
        activeCategory: action.payload,
      };

    case 'SET_BIRTH_INFO':
      return {
        ...state,
        birthInfo: action.payload,
        hasBirthInfo: Boolean(action.payload?.birthDate),
      };

    case 'SET_HAS_BIRTH_INFO':
      return {
        ...state,
        hasBirthInfo: action.payload,
      };

    case 'SET_SUBMITTING':
      return {
        ...state,
        submitting: action.payload,
      };

    case 'SET_TIME_UNKNOWN':
      return {
        ...state,
        timeUnknown: action.payload,
      };

    case 'SET_SLIDE_DIRECTION':
      return {
        ...state,
        slideDirection: action.payload,
      };

    case 'ADD_SAVED_DATE': {
      const savedDates = new Set(state.savedDates);
      savedDates.add(action.payload);
      return {
        ...state,
        savedDates,
      };
    }

    case 'REMOVE_SAVED_DATE': {
      const savedDates = new Set(state.savedDates);
      savedDates.delete(action.payload);
      return {
        ...state,
        savedDates,
      };
    }

    case 'TOGGLE_THEME': {
      const nextTheme: ThemeMode = state.theme === "dark" ? "light" : "dark";
      return {
        ...state,
        theme: nextTheme,
        isDarkTheme: nextTheme === "dark",
      };
    }

    default:
      return state;
  }
}
