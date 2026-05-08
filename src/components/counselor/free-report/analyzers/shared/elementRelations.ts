/**
 * Element Relations Utility
 * 오행 관계 매핑을 위한 공통 유틸리티
 */

import type { FiveElement } from '@/lib/Saju/types';

/**
 * 생성 관계 (相生): 어떤 오행이 생성하는 오행
 * 목→화→토→금→수→목
 */
const GENERATION_CYCLE: Record<FiveElement, FiveElement> = {
  '목': '화',
  '화': '토',
  '토': '금',
  '금': '수',
  '수': '목',
};

/**
 * 극복 관계 (相克): 어떤 오행이 극복하는 오행
 * 목극토, 화극금, 토극수, 금극목, 수극화
 */
const CONTROL_CYCLE: Record<FiveElement, FiveElement> = {
  '목': '토',
  '화': '금',
  '토': '수',
  '금': '목',
  '수': '화',
};

/**
 * 역극 관계: 어떤 오행을 극복하는 오행
 */
const CONTROLLER_CYCLE: Record<FiveElement, FiveElement> = {
  '목': '금',
  '화': '수',
  '토': '목',
  '금': '화',
  '수': '토',
};

/**
 * 역생 관계: 어떤 오행을 생성하는 오행
 */
const GENERATOR_CYCLE: Record<FiveElement, FiveElement> = {
  '목': '수',
  '화': '목',
  '토': '화',
  '금': '토',
  '수': '금',
};

/**
 * Element Relations Manager
 * 오행 관계를 관리하는 유틸리티 클래스
 */
export class ElementRelations {
  /**
   * 생성하는 오행 (나 → ?)
   * @example 목 → 화
   */
  static getGenerated(element: FiveElement): FiveElement {
    return GENERATION_CYCLE[element];
  }

  /**
   * 극복하는 오행 (나 극 ?)
   * @example 목 극 토
   */
  static getControlled(element: FiveElement): FiveElement {
    return CONTROL_CYCLE[element];
  }

  /**
   * 나를 극복하는 오행 (? 극 나)
   * @example 금 극 목
   */
  static getController(element: FiveElement): FiveElement {
    return CONTROLLER_CYCLE[element];
  }

  /**
   * 나를 생성하는 오행 (? → 나)
   * @example 수 → 목
   */
  static getGenerator(element: FiveElement): FiveElement {
    return GENERATOR_CYCLE[element];
  }

  /**
   * 모든 오행 관계를 반환
   */
  static getAllRelations(element: FiveElement) {
    return {
      generates: this.getGenerated(element),
      controls: this.getControlled(element),
      controlledBy: this.getController(element),
      generatedBy: this.getGenerator(element),
    };
  }

  /**
   * 십신(十神)을 오행으로 변환
   * @param sibsin 십신 이름
   * @param dayMasterElement 일주 오행
   */
  static sibsinToElement(sibsin: string, dayMasterElement: FiveElement): FiveElement {
    const relations: Record<string, (el: FiveElement) => FiveElement> = {
      '비견': (el) => el,
      '겁재': (el) => el,
      '식신': this.getGenerated,
      '상관': this.getGenerated,
      '편재': this.getControlled,
      '정재': this.getControlled,
      '편관': this.getController,
      '정관': this.getController,
      '편인': this.getGenerator,
      '정인': this.getGenerator,
    };

    const converter = relations[sibsin];
    return converter ? converter(dayMasterElement) : dayMasterElement;
  }

  /**
   * 십신 분포를 오행 분포로 변환
   */
  static convertSibsinDistribution(
    sibsinDist: Record<string, number>,
    dayMasterElement: FiveElement
  ): Record<FiveElement, number> {
    const result: Record<FiveElement, number> = {
      '목': 0,
      '화': 0,
      '토': 0,
      '금': 0,
      '수': 0,
    };

    for (const [sibsin, count] of Object.entries(sibsinDist)) {
      const element = this.sibsinToElement(sibsin, dayMasterElement);
      result[element] += count;
    }

    return result;
  }
}

/**
 * Legacy function exports for backward compatibility
 */
export const getGeneratedElement = ElementRelations.getGenerated;
export const getControlledElement = ElementRelations.getControlled;
export const getControllerElement = ElementRelations.getController;
export const getGeneratorElement = ElementRelations.getGenerator;
