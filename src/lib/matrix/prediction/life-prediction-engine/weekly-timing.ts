// src/lib/prediction/life-prediction-engine/weekly-timing.ts
// Weekly Event Timing Analysis Module
// Extracted from lifePredictionEngine.ts

import { scoreToGrade } from '../index';
import { EVENT_FAVORABLE_CONDITIONS } from '../engine/constants';

import {
  analyzeWeekPeriod,
} from '../life-prediction/weekly/analyzer';

import {
  generateWeeklySummary,
} from '../life-prediction/formatters/text-generators';

import type {
  LifePredictionInput,
  EventType,
  WeeklyEventTimingResult,
  WeeklyPeriod,
} from '../life-prediction-types';

/**
 * Find Weekly Optimal Timing
 * Analyzes weekly periods for event timing
 */
export function findWeeklyOptimalTiming(
  input: LifePredictionInput,
  eventType: EventType,
  startDate: Date,
  searchWeeksOrEndDate: number | Date = 4
): WeeklyEventTimingResult {
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  if (!conditions) {
    return {
      eventType,
      searchWeeks: 0,
      searchRange: { startDate, endDate: startDate },
      weeklyPeriods: [],
      bestWeek: null,
      worstWeek: null,
      overallAdvice: `Unknown event type: ${eventType}`,
      summary: `Unknown event type: ${eventType}`,
    };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const searchWeeks = typeof searchWeeksOrEndDate === 'number'
    ? Math.max(1, Math.floor(searchWeeksOrEndDate))
    : Math.max(1, Math.ceil(((searchWeeksOrEndDate as Date).getTime() - startDate.getTime()) / (7 * dayMs)));

  const actualEndDate = searchWeeksOrEndDate instanceof Date
    ? new Date(searchWeeksOrEndDate.getTime())
    : new Date(startDate.getTime() + searchWeeks * 7 * dayMs);

  const weeklyPeriods: WeeklyPeriod[] = [];

  const currentWeekStart = new Date(startDate);
  const dayOfWeek = currentWeekStart.getDay();
  if (dayOfWeek !== 1) {
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + diff);
  }

  let weekNumber = 1;

  while (weekNumber <= searchWeeks) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekAnalysis = analyzeWeekPeriod(input, currentWeekStart, weekEnd, eventType, conditions);
    const bestDay = weekAnalysis.bestDay || weekAnalysis.bestDays?.[0] || new Date(currentWeekStart);
    const bestDayScore = weekAnalysis.bestDayScore ?? weekAnalysis.score;

    weeklyPeriods.push({
      startDate: new Date(currentWeekStart),
      endDate: weekEnd,
      weekNumber,
      averageScore: weekAnalysis.score,
      bestDay,
      bestDayScore,
      grade: scoreToGrade(weekAnalysis.score),
      summary: `${eventType} week ${weekNumber} average ${weekAnalysis.score}`,
      reasons: weekAnalysis.reasons,
      bestDays: weekAnalysis.bestDays,
    });

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNumber++;
  }

  const sortedByScore = [...weeklyPeriods].sort((a, b) => b.averageScore - a.averageScore);
  const bestWeek = sortedByScore[0] || null;
  const worstWeek = sortedByScore[sortedByScore.length - 1] || null;

  const overallAdvice = generateWeeklySummary(eventType, weeklyPeriods, bestWeek);

  return {
    eventType,
    searchWeeks,
    searchRange: { startDate, endDate: actualEndDate },
    weeklyPeriods,
    bestWeek,
    worstWeek,
    overallAdvice,
    summary: overallAdvice,
  };
}
