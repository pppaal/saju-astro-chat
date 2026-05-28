// src/lib/destiny-matrix/index.ts
/**
 * ============================================================================
 * Destiny Fusion Matrix™ - Main Export
 * ============================================================================
 *
 * © 2024 All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 *
 * This source code and all associated data structures, algorithms, and
 * methodologies are the exclusive intellectual property of the copyright holder.
 *
 * PROHIBITED ACTIVITIES:
 * - Unauthorized copying, reproduction, or distribution
 * - Reverse engineering or decompilation
 * - Automated data extraction or scraping
 * - Commercial use without explicit written permission
 *
 * LEGAL NOTICE:
 * Violation of these terms may result in civil and criminal penalties
 * under applicable intellectual property laws.
 *
 * Patent Pending: Multi-layer fusion matrix system for Eastern-Western
 * astrological interpretation (10-layer, 1,206-cell cross-reference system)
 * ============================================================================
 */

export * from './types'
export * from './engine'
export * from './data'
export * from './interpreter'
export * from './validation'
export * from './errors'
export * from './performance'
export * from './alignment'
export * from './timeOverlap'
// componentScores 는 clamp01 import 가 destiny-matrix root utils 였는데 core 제거 시
//   다른 영향 0 이라 그대로 유지. core/ wildcard export 는 통째 제거.
export * from './componentScores'
export * from './contributionMap'
export * from './drivers'
export * from './calendarSignals'
export * from './domainMap'
export * from './domainScoring'
export * from './monthlyTimeline'
export * from './layerSemantics'
