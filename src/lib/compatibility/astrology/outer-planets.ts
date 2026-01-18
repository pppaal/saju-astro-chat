/**
 * @file Outer Planets Analysis (외행성 분석)
 * 천왕성, 해왕성, 명왕성 분석
 */

export interface OuterPlanetAnalysis {
  uranusInfluence: {
    changeCompatibility: number;
    revolutionaryEnergy: string;
    unexpectedEvents: string[];
  };
  neptuneInfluence: {
    spiritualConnection: number;
    dreamyQualities: string;
    illusionWarnings: string[];
  };
  plutoInfluence: {
    transformationPotential: number;
    powerDynamics: string;
    deepHealingAreas: string[];
  };
  generationalThemes: string[];
  overallTranscendentScore: number;
}

export function analyzeOuterPlanets(
  p1Outer: { uranus?: { sign: string; element: string }; neptune?: { sign: string; element: string }; pluto?: { sign: string; element: string } },
  p2Outer: { uranus?: { sign: string; element: string }; neptune?: { sign: string; element: string }; pluto?: { sign: string; element: string } },
  p1Sun: { sign: string; element: string },
  p2Sun: { sign: string; element: string }
): OuterPlanetAnalysis {
  const generationalThemes: string[] = [];
  let totalScore = 0;
  let scoreCount = 0;

  // Uranus 분석 (변화, 혁신, 자유)
  let changeCompatibility = 50;
  let revolutionaryEnergy = '각자의 방식으로 변화를 추구';
  const unexpectedEvents: string[] = [];

  if (p1Outer.uranus && p2Outer.uranus) {
    if (p1Outer.uranus.sign === p2Outer.uranus.sign) {
      changeCompatibility = 90;
      revolutionaryEnergy = '같은 세대적 변화 에너지를 공유';
      generationalThemes.push('비슷한 시대적 혁명 경험');
    } else if (p1Outer.uranus.element === p2Outer.uranus.element) {
      changeCompatibility = 75;
      revolutionaryEnergy = '비슷한 방식으로 자유를 추구';
    }

    // Uranus-Sun 상호작용
    if (p1Outer.uranus.element === p2Sun.element || p2Outer.uranus.element === p1Sun.element) {
      unexpectedEvents.push('관계에서 예상치 못한 자극과 변화');
      changeCompatibility += 5;
    }
  }
  totalScore += changeCompatibility;
  scoreCount++;

  // Neptune 분석 (영성, 환상, 직관)
  let spiritualConnection = 50;
  let dreamyQualities = '각자의 영적 세계를 가짐';
  const illusionWarnings: string[] = [];

  if (p1Outer.neptune && p2Outer.neptune) {
    if (p1Outer.neptune.sign === p2Outer.neptune.sign) {
      spiritualConnection = 90;
      dreamyQualities = '같은 세대적 영적 갈망을 공유';
      generationalThemes.push('비슷한 이상과 꿈');
    } else if (p1Outer.neptune.element === p2Outer.neptune.element) {
      spiritualConnection = 75;
      dreamyQualities = '영적 연결이 자연스러움';
    }

    // Neptune-Sun 상호작용
    if (p1Outer.neptune.element === p2Sun.element || p2Outer.neptune.element === p1Sun.element) {
      illusionWarnings.push('상대방을 이상화할 가능성');
      spiritualConnection += 10;
    }
  }
  totalScore += spiritualConnection;
  scoreCount++;

  // Pluto 분석 (변환, 권력, 재생)
  let transformationPotential = 50;
  let powerDynamics = '권력의 균형을 찾아가는 관계';
  const deepHealingAreas: string[] = [];

  if (p1Outer.pluto && p2Outer.pluto) {
    if (p1Outer.pluto.sign === p2Outer.pluto.sign) {
      transformationPotential = 90;
      powerDynamics = '같은 세대적 변환 에너지';
      generationalThemes.push('비슷한 심층적 변화 경험');
      deepHealingAreas.push('함께 깊은 치유와 변환 가능');
    } else if (p1Outer.pluto.element === p2Outer.pluto.element) {
      transformationPotential = 75;
      powerDynamics = '비슷한 방식으로 권력을 이해';
      deepHealingAreas.push('서로의 그림자를 치유');
    }

    // Pluto-Sun 상호작용
    if (p1Outer.pluto.element === p2Sun.element) {
      deepHealingAreas.push('Person1이 Person2를 근본적으로 변환');
      transformationPotential += 10;
    }
    if (p2Outer.pluto.element === p1Sun.element) {
      deepHealingAreas.push('Person2가 Person1을 근본적으로 변환');
      transformationPotential += 10;
    }
  }
  totalScore += transformationPotential;
  scoreCount++;

  const overallTranscendentScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 50;

  return {
    uranusInfluence: {
      changeCompatibility: Math.min(100, changeCompatibility),
      revolutionaryEnergy,
      unexpectedEvents,
    },
    neptuneInfluence: {
      spiritualConnection: Math.min(100, spiritualConnection),
      dreamyQualities,
      illusionWarnings,
    },
    plutoInfluence: {
      transformationPotential: Math.min(100, transformationPotential),
      powerDynamics,
      deepHealingAreas,
    },
    generationalThemes,
    overallTranscendentScore,
  };
}
