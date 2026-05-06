/**
 * Shared Utilities and Constants for Matrix Analyzers
 * 매트릭스 분석기들이 공통으로 사용하는 유틸리티와 상수
 */

// Element Relations
export {
  ElementRelations,
  getGeneratedElement,
  getControlledElement,
  getControllerElement,
  getGeneratorElement,
} from './elementRelations';

// Constants
export {
  ELEMENT_HEALTH_MAP,
  HEALTH_SHINSALS,
  KARMA_SHINSALS,
  LOVE_SHINSALS,
  SHADOW_SHINSALS,
  HOUSE_CAREER_AREAS,
} from './constants';

// Shinsal Filtering
export {
  extractShinsals,
  extractMultipleShinsals,
  calculateShinsalScore,
} from './shinsalFilter';
