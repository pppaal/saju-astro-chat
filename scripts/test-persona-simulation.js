/**
 * Personality 테스트 시뮬레이션
 * 10명의 무작위 응답으로 Nova 성격 유형 분석 테스트
 */

// 질문 ID 목록 (questions.ts에서)
const QUESTION_IDS = [
  // Energy (10)
  'q1_energy_network', 'q2_energy_weekend', 'q3_energy_spontaneous', 'q4_energy_transit',
  'q5_energy_idealday', 'q21_energy_focus', 'q22_energy_solo_group', 'q23_energy_interruptions',
  'q24_energy_events', 'q25_energy_noise',
  // Cognition (10)
  'q6_cog_problem', 'q7_cog_explain', 'q8_cog_evaluate', 'q9_cog_basis', 'q10_cog_constraints',
  'q26_cog_detail_bigpicture', 'q27_cog_rule_break', 'q28_cog_metrics_story', 'q29_cog_timehorizon',
  'q30_cog_changecomfort',
  // Decision (10)
  'q11_decision_conflict', 'q12_decision_feedback', 'q13_decision_resources', 'q14_decision_rules',
  'q15_decision_delay', 'q31_decision_dataemotion', 'q32_decision_feedback_tone', 'q33_decision_risk',
  'q34_decision_delegate', 'q35_decision_conflict_speed',
  // Rhythm (10)
  'q16_rhythm_deadline', 'q17_rhythm_change', 'q18_rhythm_workstyle', 'q19_rhythm_holiday',
  'q20_rhythm_feeling', 'q36_rhythm_morning_evening', 'q37_rhythm_planslack', 'q38_rhythm_batching',
  'q39_rhythm_contextswitch', 'q40_rhythm_deadtime'
];

// 축 정의
const AXES = {
  energy: ['radiant', 'grounded'],
  cognition: ['visionary', 'structured'],
  decision: ['logic', 'empathic'],
  rhythm: ['flow', 'anchor']
};

// 아키타입 데이터 (한국어)
const ARCHETYPES_KO = {
  RVLA: { name: '별을 빚는 설계자', summary: '카리스마 있는 비전가, 복잡한 시스템을 설계하고 팀을 이끄는 리더' },
  RVLF: { name: '불꽃의 발명가', summary: '창의적인 혁신가, 새로운 가능성을 발견하고 빠르게 실험' },
  RVHA: { name: '비전의 연결자', summary: '스토리텔러, 사람들의 마음을 움직이고 팀의 사기를 높임' },
  RVHF: { name: '영감의 탐험가', summary: '매력적인 개척자, 트렌드를 감지하고 커뮤니티를 활기차게' },
  RSLA: { name: '철벽의 지휘관', summary: '신뢰할 수 있는 리더, 혼란 속에서 질서를 세우고 목표 달성' },
  RSLF: { name: '현장의 해결사', summary: '실시간 문제 해결의 달인, 위기를 기회로 바꿈' },
  RSHA: { name: '따뜻한 조직가', summary: '배려심 깊은 관리자, 사람들이 최고 성과를 낼 환경 조성' },
  RSHF: { name: '장을 여는 진행자', summary: '타고난 퍼실리테이터, 모임을 활기차게 만들고 참여 유도' },
  GVLA: { name: '심연의 설계자', summary: '깊은 사고의 전략가, 복잡한 시스템과 장기 설계에 탁월' },
  GVLF: { name: '고요한 탐구자', summary: '분석적 탐험가, 데이터에서 인사이트 발견' },
  GVHA: { name: '지혜로운 안내자', summary: '신뢰받는 조언자, 사람들이 스스로 답을 찾도록 이끔' },
  GVHF: { name: '영혼의 길잡이', summary: '깊이 있는 안내자, 내면 변화와 진정한 성장을 돕는' },
  GSLA: { name: '시스템의 수호자', summary: '믿음직한 파수꾼, 조직의 안정성과 일관성을 지킴' },
  GSLF: { name: '묵묵한 해결사', summary: '실용적인 장인, 조용히 문제를 해결하는' },
  GSHA: { name: '든든한 멘토', summary: '따뜻한 기반, 안정감 속에서 성장 환경 조성' },
  GSHF: { name: '평화의 조율사', summary: '조화의 마스터, 갈등을 해소하고 안전한 공간 창출' }
};

// 효과 매핑 (analysis.ts에서 간소화)
function getEffectForAnswer(qId, answer) {
  const axis = qId.includes('energy') ? 'energy' :
               qId.includes('cog') ? 'cognition' :
               qId.includes('decision') ? 'decision' : 'rhythm';

  if (answer === 'A') {
    if (axis === 'energy') return [{ axis: 'energy', pole: 'radiant', weight: 2 }];
    if (axis === 'cognition') return [{ axis: 'cognition', pole: 'visionary', weight: 2 }];
    if (axis === 'decision') return [{ axis: 'decision', pole: 'logic', weight: 2 }];
    // rhythm은 질문에 따라 다름 - 간단히 처리
    return [{ axis: 'rhythm', pole: 'flow', weight: 1 }, { axis: 'rhythm', pole: 'anchor', weight: 1 }];
  }
  if (answer === 'B') {
    if (axis === 'energy') return [{ axis: 'energy', pole: 'grounded', weight: 2 }];
    if (axis === 'cognition') return [{ axis: 'cognition', pole: 'structured', weight: 2 }];
    if (axis === 'decision') return [{ axis: 'decision', pole: 'empathic', weight: 2 }];
    return [{ axis: 'rhythm', pole: 'anchor', weight: 2 }];
  }
  // C = 균형
  const [p1, p2] = AXES[axis];
  return [{ axis, pole: p1, weight: 1 }, { axis, pole: p2, weight: 1 }];
}

// 분석 함수
function analyzePersona(answers) {
  const state = {
    energy: { radiant: 0, grounded: 0 },
    cognition: { visionary: 0, structured: 0 },
    decision: { logic: 0, empathic: 0 },
    rhythm: { flow: 0, anchor: 0 }
  };

  // 효과 적용
  Object.entries(answers).forEach(([qId, choice]) => {
    const effects = getEffectForAnswer(qId, choice);
    effects.forEach(({ axis, pole, weight }) => {
      state[axis][pole] += weight;
    });
  });

  // 축 결과 계산
  const axisResults = {};
  Object.entries(AXES).forEach(([axis, [p1, p2]]) => {
    const a = state[axis][p1];
    const b = state[axis][p2];
    const total = a + b || 1;
    axisResults[axis] = {
      pole: a >= b ? p1 : p2,
      score: Math.round((a / total) * 100),
      dominant: a >= b ? p1 : p2
    };
  });

  // 타입 코드 생성
  const letterForAxis = (axis, pole) => {
    if (axis === 'energy') return pole === 'radiant' ? 'R' : 'G';
    if (axis === 'cognition') return pole === 'visionary' ? 'V' : 'S';
    if (axis === 'decision') return pole === 'logic' ? 'L' : 'H';
    return pole === 'flow' ? 'F' : 'A';
  };

  const typeCode =
    letterForAxis('energy', axisResults.energy.pole) +
    letterForAxis('cognition', axisResults.cognition.pole) +
    letterForAxis('decision', axisResults.decision.pole) +
    letterForAxis('rhythm', axisResults.rhythm.pole);

  return {
    typeCode,
    axes: axisResults,
    archetype: ARCHETYPES_KO[typeCode] || { name: '적응형 박학다식', summary: '균형 잡힌 적응력' }
  };
}

// 무작위 응답 생성
function generateRandomAnswers(bias = null) {
  const answers = {};
  QUESTION_IDS.forEach(qId => {
    if (bias) {
      // 편향된 응답 (특정 유형 만들기)
      const rand = Math.random();
      if (rand < 0.6) answers[qId] = bias;
      else if (rand < 0.8) answers[qId] = 'C';
      else answers[qId] = bias === 'A' ? 'B' : 'A';
    } else {
      // 완전 무작위
      const choices = ['A', 'B', 'C'];
      answers[qId] = choices[Math.floor(Math.random() * choices.length)];
    }
  });
  return answers;
}

// 테스트 프로필
const testProfiles = [
  { name: '무작위 1', bias: null },
  { name: '무작위 2', bias: null },
  { name: '무작위 3', bias: null },
  { name: '무작위 4', bias: null },
  { name: '무작위 5', bias: null },
  { name: '외향 편향', bias: 'A' },  // A 선택 편향 (외향/비전/논리)
  { name: '내향 편향', bias: 'B' },  // B 선택 편향 (내향/구조/공감)
  { name: '무작위 6', bias: null },
  { name: '무작위 7', bias: null },
  { name: '무작위 8', bias: null },
];

// 메인 테스트
console.log('='.repeat(80));
console.log('Nova Personality 테스트 시뮬레이션');
console.log('10명의 무작위/편향 응답으로 성격 유형 분석');
console.log('='.repeat(80));
console.log('');

const results = [];
const typeCount = {};

for (const profile of testProfiles) {
  const answers = generateRandomAnswers(profile.bias);
  const analysis = analyzePersona(answers);

  results.push({
    name: profile.name,
    ...analysis
  });

  typeCount[analysis.typeCode] = (typeCount[analysis.typeCode] || 0) + 1;
}

// 결과 출력
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  console.log(`[ 테스트 ${i + 1}: ${r.name} ]`);
  console.log('-'.repeat(80));
  console.log(`유형 코드: ${r.typeCode}`);
  console.log(`성격 유형: ${r.archetype.name}`);
  console.log(`설명: ${r.archetype.summary}`);
  console.log('');
  console.log('축별 점수:');
  console.log(`  에너지: ${r.axes.energy.pole === 'radiant' ? 'R(활발)' : 'G(차분)'} ${r.axes.energy.score}%`);
  console.log(`  인지: ${r.axes.cognition.pole === 'visionary' ? 'V(비전)' : 'S(구조)'} ${r.axes.cognition.score}%`);
  console.log(`  결정: ${r.axes.decision.pole === 'logic' ? 'L(논리)' : 'H(공감)'} ${r.axes.decision.score}%`);
  console.log(`  리듬: ${r.axes.rhythm.pole === 'flow' ? 'F(유동)' : 'A(안정)'} ${r.axes.rhythm.score}%`);
  console.log('');
}

// 통계
console.log('='.repeat(80));
console.log('[ 통계 ]');
console.log('-'.repeat(80));

console.log('');
console.log('유형별 분포:');
const sortedTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
for (const [type, count] of sortedTypes) {
  const archetype = ARCHETYPES_KO[type];
  const bar = '█'.repeat(count * 5);
  console.log(`  ${type} ${archetype?.name || '알수없음'}: ${bar} ${count}명`);
}

// 축별 분포
const axisStats = {
  energy: { radiant: 0, grounded: 0 },
  cognition: { visionary: 0, structured: 0 },
  decision: { logic: 0, empathic: 0 },
  rhythm: { flow: 0, anchor: 0 }
};

results.forEach(r => {
  Object.entries(r.axes).forEach(([axis, data]) => {
    axisStats[axis][data.pole]++;
  });
});

console.log('');
console.log('축별 분포:');
console.log(`  에너지: R(활발) ${axisStats.energy.radiant}명 / G(차분) ${axisStats.energy.grounded}명`);
console.log(`  인지:   V(비전) ${axisStats.cognition.visionary}명 / S(구조) ${axisStats.cognition.structured}명`);
console.log(`  결정:   L(논리) ${axisStats.decision.logic}명 / H(공감) ${axisStats.decision.empathic}명`);
console.log(`  리듬:   F(유동) ${axisStats.rhythm.flow}명 / A(안정) ${axisStats.rhythm.anchor}명`);

console.log('');
console.log('='.repeat(80));
console.log('시뮬레이션 완료');
console.log('');
console.log('참고: 16개 유형 (2^4) 중 무작위 분포 확인');
console.log('실제 테스트는 40개 질문에 대한 사용자 응답으로 분석됩니다.');
