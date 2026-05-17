/**
 * promptGenerator.ts - 프롬프트 컨텍스트 생성
 */

import type { LayeredTimingScore } from './types';

export function generateAdvancedTimingPromptContext(
  scores: LayeredTimingScore[],
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push(`=== 정밀 월별 타이밍 분석 (다층 레이어 + 합충형) ===`);
    lines.push('');
    lines.push('📊 레이어 가중치: 대운 50% + 세운 30% + 월운 20%');
    lines.push('');

    for (const s of scores) {
      lines.push(`【${s.month}월】 ${s.grade}등급 (${s.weightedScore}점) | 신뢰도 ${s.confidence}%`);
      lines.push(`  12운성: ${s.preciseStage.stage} (${s.preciseStage.energy})`);
      lines.push(`  주도 오행: ${s.dominantEnergy}`);

      // 레이어별 점수 분리 표시 (TIER 1: 대운/월운 분리)
      if (s.daeunLayer && s.saeunLayer && s.wolunLayer) {
        lines.push(`  레이어: 대운 ${Math.round(s.daeunLayer.score)}점 | 세운 ${Math.round(s.saeunLayer.score)}점 | 월운 ${Math.round(s.wolunLayer.score)}점`);
      }

      if (s.branchInteractions.length > 0) {
        const interStr = s.branchInteractions.map(b => `${b.type}(${b.branches.join('-')})`).join(', ');
        lines.push(`  지지작용: ${interStr}`);
      }

      lines.push(`  테마: ${s.themes.join(', ')}`);
      lines.push(`  기회: ${s.opportunities.slice(0, 2).join(', ') || '-'}`);
      lines.push(`  주의: ${s.cautions.slice(0, 2).join(', ') || '-'}`);
      lines.push(`  길일: ${s.timing.luckyDays.join(', ')}일`);
      lines.push('');
    }

    // 신뢰도 설명 추가
    const avgConfidence = Math.round(scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length);
    lines.push(`--- 신뢰도 안내 ---`);
    lines.push(`평균 신뢰도: ${avgConfidence}%`);
    if (avgConfidence >= 80) {
      lines.push('✅ 대운/세운/시간 정보가 모두 있어 높은 정확도');
    } else if (avgConfidence >= 60) {
      lines.push('📊 일부 데이터 부족, 대략적 추세 참고용');
    } else {
      lines.push('⚠️ 데이터 부족, 정확한 생시 입력시 정확도 향상');
    }
    lines.push('');
  } else {
    lines.push(`=== Advanced Monthly Timing (Multi-layer + Branch Interactions) ===`);
    lines.push('');
    lines.push('📊 Layer weights: Daeun 50% + Saeun 30% + Woleun 20%');
    lines.push('');

    for (const s of scores) {
      lines.push(`【Month ${s.month}】 Grade ${s.grade} (${s.weightedScore}) | Confidence ${s.confidence}%`);
      lines.push(`  Stage: ${s.preciseStage.stage} (${s.preciseStage.energy})`);
      lines.push(`  Dominant Element: ${s.dominantEnergy}`);

      // Layer separation
      if (s.daeunLayer && s.saeunLayer && s.wolunLayer) {
        lines.push(`  Layers: Daeun ${Math.round(s.daeunLayer.score)} | Saeun ${Math.round(s.saeunLayer.score)} | Woleun ${Math.round(s.wolunLayer.score)}`);
      }

      lines.push(`  Lucky Days: ${s.timing.luckyDays.join(', ')}`);
      lines.push('');
    }

    // Confidence explanation
    const avgConfidence = Math.round(scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length);
    lines.push(`--- Confidence Note ---`);
    lines.push(`Average: ${avgConfidence}%`);
    if (avgConfidence >= 80) {
      lines.push('✅ Complete data - high accuracy');
    } else if (avgConfidence >= 60) {
      lines.push('📊 Partial data - general trends');
    } else {
      lines.push('⚠️ Limited data - provide birth time for better accuracy');
    }
    lines.push('');
  }

  return lines.join('\n');
}
