/**
 * Family Lineage Analysis Utility Functions
 * Extracted from familyLineage.ts for better organization
 */

import type { StemBranchInfo } from '../types'
import { STEMS, BRANCHES } from '../constants'

export function getStemInfo(stemName: string): StemBranchInfo | undefined {
  return STEMS.find((s) => s.name === stemName)
}

export function getBranchInfo(branchName: string): StemBranchInfo | undefined {
  return BRANCHES.find((b) => b.name === branchName)
}

export function getStemElement(stemName: string): string {
  const stem = getStemInfo(stemName)
  return stem?.element || '토'
}

export function getBranchElement(branchName: string): string {
  const branch = getBranchInfo(branchName)
  return branch?.element || '토'
}
