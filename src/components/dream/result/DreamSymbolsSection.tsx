import React, { useMemo, memo } from 'react';
import DreamSymbolCard from '@/components/dream/DreamSymbolCard';
import { SectionHeader } from '../SectionHeader';
import styles from './DreamSymbolsSection.module.css';

interface DreamSymbol {
  label: string;
  meaning: string;
  interpretations?: {
    jung?: string;
    stoic?: string;
    tarot?: string;
  };
}

interface DreamSymbolsSectionProps {
  symbols: DreamSymbol[];
  locale: string;
}

// 색상 배열을 컴포넌트 외부로 이동 (재생성 방지)
const SYMBOL_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export const DreamSymbolsSection = memo(function DreamSymbolsSection({ symbols, locale }: DreamSymbolsSectionProps) {
  const isKo = useMemo(() => locale === 'ko', [locale]);

  return (
    <div className={styles.symbolsSection}>
      <SectionHeader
        icon="🔮"
        title={isKo ? '꿈의 상징' : 'Dream Symbols'}
        badge={isKo ? '뒤집어보세요!' : 'Flip to explore!'}
      />
      <div className={styles.symbolsScroll}>
        {symbols.map((sym, i) => {
          const color = SYMBOL_COLORS[i % SYMBOL_COLORS.length];
          return (
            <DreamSymbolCard
              key={sym.label}
              symbol={sym.label}
              meaning={sym.meaning}
              interpretations={sym.interpretations}
              color={color}
              locale={locale as 'ko' | 'en'}
            />
          );
        })}
      </div>
    </div>
  );
});
