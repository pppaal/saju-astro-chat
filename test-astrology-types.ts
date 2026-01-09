// Test script to verify astrology foundation files compile without @ts-nocheck
import { findAspects, findNatalAspects } from './src/lib/astrology/foundation/aspects';
import { calculateAsteroid, calculateAllAsteroids } from './src/lib/astrology/foundation/asteroids';
import { calculateNatalChart, toChart } from './src/lib/astrology/foundation/astrologyService';
import { getSwisseph } from './src/lib/astrology/foundation/ephe';
import { calculateChiron, calculateLilith } from './src/lib/astrology/foundation/extraPoints';
import { calcHouses, inferHouseOf } from './src/lib/astrology/foundation/houses';
import { calculateSecondaryProgressions } from './src/lib/astrology/foundation/progressions';
import { calculateSolarReturn } from './src/lib/astrology/foundation/returns';
import { calculateTransitChart } from './src/lib/astrology/foundation/transit';
import { buildEngineMeta } from './src/lib/astrology/advanced/meta';

// If this file compiles without errors, all type issues are resolved
console.log('All astrology foundation files type-check successfully!');
