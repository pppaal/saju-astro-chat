/**
 * @file Karma narratives data module
 * Re-exports narrative data from JSON files for backward compatibility
 * This file maintains the same structure as before but loads from JSON
 */

import dayMasterNarrativesJSON from '@/../public/data/karma/day-master-narratives.json';
import northNodeNarrativesJSON from '@/../public/data/karma/north-node-narratives.json';
import saturnNarrativesJSON from '@/../public/data/karma/saturn-narratives.json';
import shinsalNarrativesJSON from '@/../public/data/karma/shinsal-narratives.json';

// Re-export with proper typing
export const dayMasterExtendedNarratives: Record<string, { ko: string[]; en: string[] }> = dayMasterNarrativesJSON;
export const northNodeExtendedNarratives: Record<number, { ko: string[]; en: string[] }> = northNodeNarrativesJSON as Record<number, { ko: string[]; en: string[] }>;
export const saturnExtendedNarratives: Record<number, { ko: string[]; en: string[] }> = saturnNarrativesJSON as Record<number, { ko: string[]; en: string[] }>;
export const shinsalExtendedNarratives: Record<string, { ko: string[]; en: string[] }> = shinsalNarrativesJSON;
