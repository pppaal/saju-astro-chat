/**
 * @file Nodes and Lilith Analysis
 * 노드(카르마적 운명)와 릴리스(그림자/욕망) 분석
 */

import { isIncompatibleElement } from './element-utils';

// ============================================================
// North/South Node Analysis (카르마적 운명)
// ============================================================

export interface NodeAnalysis {
  northNodeConnection: {
    compatibility: number;
    destinyAlignment: string;
    growthDirection: string;
  };
  southNodeConnection: {
    compatibility: number;
    pastLifeIndicators: string;
    comfortZone: string;
  };
  karmicRelationshipType: 'soulmate' | 'karmic' | 'dharmic' | 'neutral';
  lifeLessons: string[];
  evolutionaryPurpose: string;
}

export function analyzeNodes(
  p1NorthNode: { sign: string; element: string } | undefined,
  p1SouthNode: { sign: string; element: string } | undefined,
  p2NorthNode: { sign: string; element: string } | undefined,
  p2SouthNode: { sign: string; element: string } | undefined,
  p1Sun: { sign: string; element: string },
  p2Sun: { sign: string; element: string },
  p1Moon: { sign: string; element: string },
  p2Moon: { sign: string; element: string }
): NodeAnalysis {
  let northNodeCompatibility = 50;
  let southNodeCompatibility = 50;
  let destinyAlignment = '';
  let growthDirection = '';
  let pastLifeIndicators = '';
  let comfortZone = '';
  let karmicRelationshipType: NodeAnalysis['karmicRelationshipType'] = 'neutral';
  const lifeLessons: string[] = [];
  let evolutionaryPurpose = '';

  // North Node 연결 분석
  if (p1NorthNode && p2NorthNode) {
    if (p1NorthNode.sign === p2NorthNode.sign) {
      northNodeCompatibility = 95;
      destinyAlignment = '같은 영혼적 목적지를 향해 진화';
      karmicRelationshipType = 'soulmate';
      lifeLessons.push('함께 영혼의 진화를 경험');
    } else if (p1NorthNode.element === p2NorthNode.element) {
      northNodeCompatibility = 80;
      destinyAlignment = '비슷한 삶의 방향성을 추구';
      karmicRelationshipType = 'dharmic';
    }

    // Person1의 North Node와 Person2의 Sun/Moon
    if (p1NorthNode.element === p2Sun.element) {
      northNodeCompatibility += 15;
      growthDirection = 'Person2가 Person1의 영혼적 성장을 촉진';
      karmicRelationshipType = 'soulmate';
      lifeLessons.push('Person2가 Person1에게 운명적 역할');
    }
    if (p1NorthNode.element === p2Moon.element) {
      northNodeCompatibility += 10;
      lifeLessons.push('Person2가 Person1에게 감정적 성장의 기회');
    }

    // Person2의 North Node와 Person1의 Sun/Moon
    if (p2NorthNode.element === p1Sun.element) {
      northNodeCompatibility += 15;
      if (!growthDirection) {growthDirection = 'Person1이 Person2의 영혼적 성장을 촉진';}
      karmicRelationshipType = 'soulmate';
      lifeLessons.push('Person1이 Person2에게 운명적 역할');
    }
    if (p2NorthNode.element === p1Moon.element) {
      northNodeCompatibility += 10;
      lifeLessons.push('Person1이 Person2에게 감정적 성장의 기회');
    }
  }

  // South Node 연결 분석 (전생의 연결)
  if (p1SouthNode && p2SouthNode) {
    if (p1SouthNode.sign === p2SouthNode.sign) {
      southNodeCompatibility = 95;
      pastLifeIndicators = '같은 과거생 패턴을 공유';
      comfortZone = '함께 있으면 익숙하고 편안함';
      if (karmicRelationshipType === 'neutral') {karmicRelationshipType = 'karmic';}
    } else if (p1SouthNode.element === p2SouthNode.element) {
      southNodeCompatibility = 80;
      pastLifeIndicators = '비슷한 과거 경험의 에너지';
      comfortZone = '자연스럽게 서로를 이해';
    }

    // Person1의 South Node와 Person2의 Sun/Moon
    if (p1SouthNode?.element === p2Sun.element) {
      southNodeCompatibility += 15;
      pastLifeIndicators = '전생에서의 깊은 연결 가능성';
      if (karmicRelationshipType === 'neutral') {karmicRelationshipType = 'karmic';}
      lifeLessons.push('과거의 패턴을 인식하고 넘어서야 함');
    }

    // Person2의 South Node와 Person1의 Sun/Moon
    if (p2SouthNode?.element === p1Sun.element) {
      southNodeCompatibility += 15;
      if (!pastLifeIndicators) {pastLifeIndicators = '전생에서의 깊은 연결 가능성';}
      if (karmicRelationshipType === 'neutral') {karmicRelationshipType = 'karmic';}
      lifeLessons.push('익숙함에 안주하지 않고 성장해야 함');
    }
  }

  // 진화적 목적 결정
  if (karmicRelationshipType === 'soulmate') {
    evolutionaryPurpose = '서로의 영혼 진화를 돕는 운명적 만남';
  } else if (karmicRelationshipType === 'karmic') {
    evolutionaryPurpose = '과거의 카르마를 정산하고 배움을 얻는 관계';
  } else if (karmicRelationshipType === 'dharmic') {
    evolutionaryPurpose = '함께 삶의 사명을 수행하는 파트너십';
  } else {
    evolutionaryPurpose = '서로에게 새로운 경험을 제공하는 관계';
  }

  return {
    northNodeConnection: {
      compatibility: Math.min(100, northNodeCompatibility),
      destinyAlignment,
      growthDirection,
    },
    southNodeConnection: {
      compatibility: Math.min(100, southNodeCompatibility),
      pastLifeIndicators,
      comfortZone,
    },
    karmicRelationshipType,
    lifeLessons,
    evolutionaryPurpose,
  };
}

// ============================================================
// Lilith (Black Moon) Analysis (그림자와 욕망)
// ============================================================

export interface LilithAnalysis {
  lilithCompatibility: number;
  shadowDynamics: string;
  repressedDesires: string[];
  magneticAttraction: number;
  potentialChallenges: string[];
  healingOpportunities: string[];
}

export function analyzeLilith(
  p1Lilith: { sign: string; element: string } | undefined,
  p2Lilith: { sign: string; element: string } | undefined,
  p1Sun: { sign: string; element: string },
  p2Sun: { sign: string; element: string },
  p1Mars: { sign: string; element: string },
  p2Mars: { sign: string; element: string },
  p1Venus: { sign: string; element: string },
  p2Venus: { sign: string; element: string }
): LilithAnalysis {
  let lilithCompatibility = 50;
  let shadowDynamics = '';
  const repressedDesires: string[] = [];
  let magneticAttraction = 50;
  const potentialChallenges: string[] = [];
  const healingOpportunities: string[] = [];

  if (!p1Lilith || !p2Lilith) {
    return {
      lilithCompatibility: 50,
      shadowDynamics: 'Lilith 데이터가 불완전하여 분석 제한적',
      repressedDesires: [],
      magneticAttraction: 50,
      potentialChallenges: [],
      healingOpportunities: [],
    };
  }

  // Lilith-Lilith 연결
  if (p1Lilith.sign === p2Lilith.sign) {
    lilithCompatibility = 90;
    shadowDynamics = '같은 그림자 영역을 공유하며 서로를 깊이 이해';
    magneticAttraction = 95;
    healingOpportunities.push('함께 그림자를 직면하고 치유');
  } else if (p1Lilith.element === p2Lilith.element) {
    lilithCompatibility = 75;
    shadowDynamics = '비슷한 방식으로 억압된 면을 표현';
    magneticAttraction = 80;
    healingOpportunities.push('서로의 숨겨진 면을 수용');
  } else if (isIncompatibleElement(p1Lilith.element, p2Lilith.element)) {
    lilithCompatibility = 40;
    shadowDynamics = '서로 다른 그림자 영역이 충돌할 수 있음';
    magneticAttraction = 60;
    potentialChallenges.push('억압된 욕구가 갈등으로 표면화');
  }

  // Lilith-Mars 연결 (성적 자기력)
  if (p1Lilith.element === p2Mars.element) {
    magneticAttraction += 20;
    repressedDesires.push('Person1의 숨겨진 욕망이 Person2의 행동으로 자극됨');
  }
  if (p2Lilith.element === p1Mars.element) {
    magneticAttraction += 20;
    repressedDesires.push('Person2의 숨겨진 욕망이 Person1의 행동으로 자극됨');
  }

  // Lilith-Venus 연결 (매혹적 끌림)
  if (p1Lilith.element === p2Venus.element) {
    magneticAttraction += 15;
    repressedDesires.push('Person1이 Person2의 매력에 깊이 이끌림');
    healingOpportunities.push('Person2가 Person1의 자기 수용을 도움');
  }
  if (p2Lilith.element === p1Venus.element) {
    magneticAttraction += 15;
    repressedDesires.push('Person2가 Person1의 매력에 깊이 이끌림');
    healingOpportunities.push('Person1이 Person2의 자기 수용을 도움');
  }

  // Lilith-Sun 연결 (정체성과 그림자)
  if (p1Lilith.element === p2Sun.element) {
    potentialChallenges.push('Person1의 그림자가 Person2의 정체성에 도전');
    healingOpportunities.push('Person2를 통해 Person1이 억압된 면을 통합');
  }
  if (p2Lilith.element === p1Sun.element) {
    potentialChallenges.push('Person2의 그림자가 Person1의 정체성에 도전');
    healingOpportunities.push('Person1을 통해 Person2가 억압된 면을 통합');
  }

  // 원소별 Lilith 테마
  switch (p1Lilith.element) {
    case 'fire':
      repressedDesires.push('Person1: 자신감과 주도권에 대한 억압된 욕구');
      break;
    case 'earth':
      repressedDesires.push('Person1: 물질적 안정과 감각적 쾌락에 대한 억압된 욕구');
      break;
    case 'air':
      repressedDesires.push('Person1: 지적 자유와 소통에 대한 억압된 욕구');
      break;
    case 'water':
      repressedDesires.push('Person1: 감정적 깊이와 친밀감에 대한 억압된 욕구');
      break;
  }

  return {
    lilithCompatibility,
    shadowDynamics,
    repressedDesires,
    magneticAttraction: Math.min(100, magneticAttraction),
    potentialChallenges,
    healingOpportunities,
  };
}
