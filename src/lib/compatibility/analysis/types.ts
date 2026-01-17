/**
 * @file Shared types for advanced Saju analysis modules
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { FiveElement } from '../../Saju/types';

export type { SajuProfile, FiveElement };

// Ten Gods type
export type TenGod =
  | '비견' | '겁재'      // 比劫 (Self)
  | '식신' | '상관'      // 食傷 (Output)
  | '편재' | '정재'      // 財 (Wealth)
  | '편관' | '정관'      // 官 (Authority)
  | '편인' | '정인';     // 印 (Resource)

// Twelve States type
export type TwelveState =
  | '태' | '양' | '장생' | '목욕' | '관대' | '건록'
  | '제왕' | '쇠' | '병' | '사' | '묘' | '절';

// Gyeokguk (Pattern) type
export type GyeokgukType =
  | '정관격' | '편관격' | '정인격' | '편인격'
  | '식신격' | '상관격' | '정재격' | '편재격'
  | '건록격' | '양인격' | '종격' | '특수격';

// Common compatibility grade
export type CompatibilityGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

// Common compatibility level
export type CompatibilityLevel = 'excellent' | 'good' | 'neutral' | 'challenging';

// Common impact level
export type ImpactLevel = 'positive' | 'neutral' | 'challenging';
