import React from 'react';
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

export function DreamSymbolsSection({ symbols, locale }: DreamSymbolsSectionProps) {
  const isKo = locale === 'ko';
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className={styles.symbolsSection}>
      <SectionHeader
        icon="🔮"
        title={isKo ? '꿈의 상징' : 'Dream Symbols'}
        badge={isKo ? '뒤집어보세요!' : 'Flip to explore!'}
      />
      <div className={styles.symbolsScroll}>
        {symbols.map((sym, i) => {
          const color = colors[i % colors.length];
          return (
            <DreamSymbolCard
              key={i}
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
}
