import type { ShadowPersonalityResult } from '../../analyzers/matrixAnalyzer';

// 숨겨진 자아 분석을 위한 확장 인터페이스
export interface HiddenSelfAnalysis {
  lilithShadow: ShadowPersonalityResult['lilithShadow'] & {
    icon?: string;
    sibsin?: string;
    description?: { ko: string; en: string };
    integration?: { ko: string; en: string };
  } | null;
  hiddenPotential: ShadowPersonalityResult['hiddenPotential'] & {
    icon?: string;
    description?: { ko: string; en: string };
    activation?: { ko: string; en: string };
  } | null;
  chiron?: {
    icon: string;
    element: string;
    wound: { ko: string; en: string };
    healing: { ko: string; en: string };
    gift: { ko: string; en: string };
  };
  vertex?: {
    icon: string;
    element: string;
    fatePattern: { ko: string; en: string };
    turningPoints: { ko: string; en: string };
  };
  specialShinsal?: Array<{
    icon: string;
    shinsal: string;
    planet: string;
    description: { ko: string; en: string };
    hiddenStrength: { ko: string; en: string };
  }>;
  twelfthHouse?: {
    icon: string;
    planets: string[];
    description: { ko: string; en: string };
    advice: { ko: string; en: string };
  };
  shadowScore: number;
  shadowMessage: { ko: string; en: string };
}
