import React from 'react';
import { AnalysisCard, CardRow, CardDesc } from './AnalysisCard';
import type { GeokgukAnalysis, YongsinAnalysis } from '@/lib/Saju/saju-result.types';

interface GeokgukYongsinSectionProps {
  geokguk?: GeokgukAnalysis;
  yongsin?: YongsinAnalysis;
}

export function GeokgukYongsinSection({ geokguk, yongsin }: GeokgukYongsinSectionProps) {
  if (!geokguk && !yongsin) return null;

  return (
    <div className="flex flex-wrap gap-4" role="group" aria-label="격국 용신 분석">
      {geokguk && (
        <AnalysisCard title="격국 (格局)" color="#8aa4ff">
          <CardRow label="격국" value={geokguk.primary || '미정'} />
          {geokguk.category && <CardRow label="분류" value={geokguk.category} />}
          {geokguk.confidence && <CardRow label="확신도" value={geokguk.confidence} />}
          {geokguk.description && <CardDesc>{geokguk.description}</CardDesc>}
        </AnalysisCard>
      )}

      {yongsin && (
        <AnalysisCard title="용신 (用神)" color="#ffd479">
          <CardRow label="용신" value={yongsin.primaryYongsin || '-'} />
          {yongsin.secondaryYongsin && <CardRow label="희신" value={yongsin.secondaryYongsin} />}
          {yongsin.kibsin && <CardRow label="기신" value={yongsin.kibsin} />}
          {yongsin.daymasterStrength && <CardRow label="신강/신약" value={yongsin.daymasterStrength} />}
          {yongsin.luckyColors && yongsin.luckyColors.length > 0 && (
            <CardRow label="행운색" value={yongsin.luckyColors.join(', ')} />
          )}
          {yongsin.luckyDirection && <CardRow label="행운방향" value={yongsin.luckyDirection} />}
          {yongsin.luckyNumbers && yongsin.luckyNumbers.length > 0 && (
            <CardRow label="행운숫자" value={yongsin.luckyNumbers.join(', ')} />
          )}
          {yongsin.description && <CardDesc>{yongsin.description}</CardDesc>}
        </AnalysisCard>
      )}
    </div>
  );
}
