"use client";

// src/contexts/CalendarContext.tsx
import React, { createContext, useContext, useReducer, useCallback, PropsWithChildren } from 'react';
import {
  calendarReducer,
  initialCalendarState,
  CalendarState,
  CalendarAction,
} from '@/reducers/calendarReducer';

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
  birthPlace: string;
  gender: 'Male' | 'Female';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface CalendarContextValue extends CalendarState {
  dispatch: React.Dispatch<CalendarAction>;

  // Helper methods
  setSelectedDate: (date: ImportantDate | null) => void;
  setSelectedDay: (day: Date | null) => void;
  setActiveCategory: (category: EventCategory | "all") => void;
  setBirthInfo: (info: BirthInfo) => void;
  setHasBirthInfo: (has: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setTimeUnknown: (unknown: boolean) => void;
  toggleTheme: () => void;

  loadCalendarStart: () => void;
  loadCalendarSuccess: (data: CalendarData, cached: boolean) => void;
  loadCalendarError: (error: string) => void;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(calendarReducer, initialCalendarState);

  // Helper methods
  const setSelectedDate = useCallback((date: ImportantDate | null) => {
    dispatch({ type: 'SELECT_DATE', payload: date });
  }, []);

  const setSelectedDay = useCallback((day: Date | null) => {
    dispatch({ type: 'SELECT_DAY', payload: day });
  }, []);

  const setActiveCategory = useCallback((category: EventCategory | "all") => {
    dispatch({ type: 'SET_CATEGORY', payload: category });
  }, []);

  const setBirthInfo = useCallback((info: BirthInfo) => {
    dispatch({ type: 'SET_BIRTH_INFO', payload: info });
  }, []);

  const setHasBirthInfo = useCallback((has: boolean) => {
    dispatch({ type: 'SET_HAS_BIRTH_INFO', payload: has });
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', payload: submitting });
  }, []);

  const setTimeUnknown = useCallback((unknown: boolean) => {
    dispatch({ type: 'SET_TIME_UNKNOWN', payload: unknown });
  }, []);

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, []);

  const loadCalendarStart = useCallback(() => {
    dispatch({ type: 'LOAD_START' });
  }, []);

  const loadCalendarSuccess = useCallback((data: CalendarData, cached: boolean) => {
    dispatch({ type: 'LOAD_SUCCESS', payload: { data, cached } });
  }, []);

  const loadCalendarError = useCallback((error: string) => {
    dispatch({ type: 'LOAD_ERROR', payload: error });
  }, []);

  const value: CalendarContextValue = {
    ...state,
    dispatch,
    setSelectedDate,
    setSelectedDay,
    setActiveCategory,
    setBirthInfo,
    setHasBirthInfo,
    setSubmitting,
    setTimeUnknown,
    toggleTheme,
    loadCalendarStart,
    loadCalendarSuccess,
    loadCalendarError,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within CalendarProvider');
  }
  return context;
}
