import React from 'react';
import { sectionTitleKeys, type ParsedSection } from '../../lib';
import { ScoreBar } from '../shared';
import styles from '../../Compatibility.module.css';

interface ResultSectionsDisplayProps {
  sections: ParsedSection[];
  t: (key: string, fallback: string) => string;
}

export const ResultSectionsDisplay: React.FC<ResultSectionsDisplayProps> = React.memo(({ sections, t }) => {
  if (sections.length === 0) {return null;}

  return (
    <div className={styles.resultSections}>
      {sections.map((section, idx) => (
        <div key={idx} className={`${styles.resultCard} ${section.content.length > 300 ? styles.resultCardFullWidth : ''}`}>
          <div className={styles.resultCardGlow} />
          <div className={styles.resultCardHeader}>
            <span className={styles.resultCardIcon}>{section.icon}</span>
            <h3 className={styles.resultCardTitle}>
              {sectionTitleKeys[section.title] ? t(sectionTitleKeys[section.title], section.title) : section.title}
            </h3>
          </div>
          <div className={styles.resultCardContent}>
            {section.content.split('\n').map((line, i) => {
              const scoreMatch = line.match(/(\d{1,3})(?:\s*)?(?:%|점|\/100)/);
              if (scoreMatch) {
                const lineScore = parseInt(scoreMatch[1], 10);
                if (lineScore >= 0 && lineScore <= 100) {
                  return (
                    <div key={i}>
                      <p>{line.replace(scoreMatch[0], '').trim()}</p>
                      <ScoreBar score={lineScore} t={t} />
                    </div>
                  );
                }
              }
              if (line.trim()) {
                return <p key={i}>{line}</p>;
              }
              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
});

ResultSectionsDisplay.displayName = 'ResultSectionsDisplay';
