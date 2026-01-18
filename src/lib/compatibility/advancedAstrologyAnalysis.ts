/**
 * Advanced Astrology Analysis for Compatibility
 * 심화 점성학 분석: Aspects, Synastry, Composite Chart, Progressed Charts
 *
 * This file has been refactored. All functions are now in src/lib/compatibility/astrology/
 *
 * Backwards Compatibility:
 * - All functions and types are re-exported from the astrology/ subpackage
 * - Import paths remain the same
 *
 * New Module Structure:
 * - astrology/types.ts: Type definitions
 * - astrology/element-utils.ts: Element compatibility utilities
 * - astrology/aspect-utils.ts: Aspect calculation utilities
 * - astrology/basic-analysis.ts: Basic aspect and synastry analysis
 * - astrology/composite-house.ts: Composite chart and house overlay analysis
 * - astrology/planet-analysis.ts: Mercury, Jupiter, Saturn analysis
 * - astrology/outer-planets.ts: Uranus, Neptune, Pluto analysis
 * - astrology/nodes-lilith.ts: Node and Lilith analysis
 * - astrology/davison-progressed.ts: Davison and progressed chart analysis
 * - astrology/degree-aspects.ts: Degree-based aspect calculation
 * - astrology/comprehensive.ts: Combined comprehensive analysis
 */

// Re-export everything from the astrology module for backwards compatibility
export * from './astrology';

// Re-export AstrologyProfile type from cosmicCompatibility
export type { AstrologyProfile } from './cosmicCompatibility';
