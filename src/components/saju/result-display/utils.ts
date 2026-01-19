// src/components/saju/result-display/utils.ts

import type { GanjiValue } from './types';
import type { ElementEN } from './constants';
import { stemElement, branchElement } from './constants';

export function getGanjiName(val: GanjiValue): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'name' in val) return val.name;
  return '';
}

export function getElementOfChar(ch: string): ElementEN | null {
  if (stemElement[ch]) return stemElement[ch];
  if (branchElement[ch]) return branchElement[ch];
  return null;
}

export function makeKstDateUTC(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 15, 0, 0, 0));
}
