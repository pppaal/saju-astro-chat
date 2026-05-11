/**
 * @file Constants for Life Prediction Engine
 */

import type { FiveElement, TwelveStage } from '../advancedTimingEngine';
import type { EventType } from './types';

// Chinese stems and branches
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

// Stem to element mapping
export const STEM_ELEMENT: Record<string, FiveElement> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
};

// Event-specific favorable conditions
export const EVENT_FAVORABLE_CONDITIONS: Record<EventType, {
  favorableSibsin: string[];
  favorableStages: TwelveStage[];
  favorableElements: FiveElement[];
  avoidSibsin: string[];
  avoidStages: TwelveStage[];
}> = {
  marriage: {
    favorableSibsin: ['정관', '정재', '정인', '식신'],
    favorableStages: ['건록', '제왕', '관대', '장생'],
    favorableElements: ['화', '목'],
    avoidSibsin: ['겁재', '상관', '편관'],
    avoidStages: ['사', '묘', '절'],
  },
  career: {
    favorableSibsin: ['정관', '편관', '정인', '식신'],
    favorableStages: ['건록', '제왕', '관대'],
    favorableElements: ['금', '토'],
    avoidSibsin: ['겁재', '상관'],
    avoidStages: ['사', '묘', '병'],
  },
  investment: {
    favorableSibsin: ['정재', '편재', '식신'],
    favorableStages: ['건록', '제왕', '장생', '관대'],
    favorableElements: ['토', '금'],
    avoidSibsin: ['겁재', '상관', '편인'],
    avoidStages: ['사', '묘', '절', '병'],
  },
  move: {
    favorableSibsin: ['편인', '식신', '편재'],
    favorableStages: ['장생', '관대', '목욕'],
    favorableElements: ['목', '수'],
    avoidSibsin: ['정관'],
    avoidStages: ['묘', '사'],
  },
  study: {
    favorableSibsin: ['정인', '편인', '식신'],
    favorableStages: ['장생', '관대', '목욕', '양'],
    favorableElements: ['수', '목'],
    avoidSibsin: ['편재', '겁재'],
    avoidStages: ['사', '묘'],
  },
  health: {
    favorableSibsin: ['정인', '비견', '식신'],
    favorableStages: ['건록', '제왕', '장생'],
    favorableElements: ['토', '금'],
    avoidSibsin: ['편관', '상관'],
    avoidStages: ['병', '사', '묘'],
  },
  relationship: {
    favorableSibsin: ['정재', '정관', '식신', '비견'],
    favorableStages: ['건록', '관대', '장생'],
    favorableElements: ['화', '목'],
    avoidSibsin: ['겁재', '편관'],
    avoidStages: ['사', '묘', '절'],
  },
};

// Event-specific astrology conditions
export const ASTRO_EVENT_CONDITIONS: Record<EventType, {
  favorableSigns: string[];
  keyPlanets: string[];
  favorableHouses: number[];
  avoidRetrogrades: string[];
  moonPhaseBonus: Record<string, number>;
}> = {
  marriage: {
    favorableSigns: ['Libra', 'Taurus', 'Cancer', 'Leo'],
    keyPlanets: ['Venus', 'Moon', 'Jupiter'],
    favorableHouses: [7, 5, 1],
    avoidRetrogrades: ['Venus'],
    moonPhaseBonus: { 'full_moon': 8, 'waxing_gibbous': 5, 'first_quarter': 3 },
  },
  career: {
    favorableSigns: ['Capricorn', 'Leo', 'Aries', 'Virgo'],
    keyPlanets: ['Sun', 'Saturn', 'Jupiter', 'Mars'],
    favorableHouses: [10, 6, 1, 2],
    avoidRetrogrades: ['Mercury', 'Saturn'],
    moonPhaseBonus: { 'waxing_gibbous': 6, 'first_quarter': 4, 'full_moon': 5 },
  },
  investment: {
    favorableSigns: ['Taurus', 'Scorpio', 'Capricorn', 'Virgo'],
    keyPlanets: ['Jupiter', 'Venus', 'Pluto'],
    favorableHouses: [2, 8, 11],
    avoidRetrogrades: ['Mercury', 'Jupiter'],
    moonPhaseBonus: { 'new_moon': 5, 'waxing_crescent': 6, 'first_quarter': 4 },
  },
  move: {
    favorableSigns: ['Sagittarius', 'Cancer', 'Gemini'],
    keyPlanets: ['Moon', 'Mercury', 'Jupiter'],
    favorableHouses: [4, 9, 3],
    avoidRetrogrades: ['Mercury'],
    moonPhaseBonus: { 'new_moon': 7, 'waxing_crescent': 5 },
  },
  study: {
    favorableSigns: ['Gemini', 'Virgo', 'Sagittarius', 'Aquarius'],
    keyPlanets: ['Mercury', 'Jupiter', 'Uranus'],
    favorableHouses: [3, 9, 5],
    avoidRetrogrades: ['Mercury'],
    moonPhaseBonus: { 'waxing_crescent': 6, 'first_quarter': 5, 'waxing_gibbous': 4 },
  },
  health: {
    favorableSigns: ['Virgo', 'Scorpio', 'Capricorn'],
    keyPlanets: ['Sun', 'Mars', 'Saturn'],
    favorableHouses: [6, 1, 8],
    avoidRetrogrades: ['Mars'],
    moonPhaseBonus: { 'waning_gibbous': 5, 'last_quarter': 4, 'new_moon': 6 },
  },
  relationship: {
    favorableSigns: ['Libra', 'Taurus', 'Leo', 'Pisces'],
    keyPlanets: ['Venus', 'Moon', 'Mars'],
    favorableHouses: [5, 7, 11],
    avoidRetrogrades: ['Venus', 'Mars'],
    moonPhaseBonus: { 'full_moon': 7, 'waxing_gibbous': 5, 'first_quarter': 3 },
  },
};
