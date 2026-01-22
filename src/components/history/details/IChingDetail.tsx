import type { IChingContent } from '@/app/myjourney/history/lib/types';
import styles from './DetailModal.module.css';

type IChingDetailProps = {
  detail: IChingContent;
};

export function IChingDetail({ detail }: IChingDetailProps) {
  return (
    <div className={styles.ichingDetail}>
      {/* Header with hexagram */}
      <div className={styles.ichingHeader}>
        <div className={styles.hexagramDisplay}>
          {/* Hexagram visual from lines */}
          {detail.hexagramLines ? (
            <div className={styles.hexagramLines}>
              {[...detail.hexagramLines].reverse().map((line, idx) => (
                <div
                  key={idx}
                  className={`${styles.hexLine} ${line.value === 0 ? styles.broken : ""} ${line.isChanging ? styles.changing : ""}`}
                />
              ))}
            </div>
          ) : detail.primaryHexagram.binary ? (
            <div className={styles.hexagramLines}>
              {[...detail.primaryHexagram.binary].reverse().map((bit, idx) => (
                <div
                  key={idx}
                  className={`${styles.hexLine} ${bit === "0" ? styles.broken : ""}`}
                />
              ))}
            </div>
          ) : (
            <div className={styles.hexagramSymbol}>{detail.primaryHexagram.symbol}</div>
          )}
        </div>
        <div className={styles.hexagramInfo}>
          <h2>{detail.primaryHexagram.name} {detail.primaryHexagram.symbol}</h2>
          <p className={styles.hexagramNumber}>Hexagram #{detail.primaryHexagram.number}</p>
          {detail.question && (
            <div className={styles.questionBox}>
              <span className={styles.questionIcon}>❓</span>
              <p>{detail.question}</p>
            </div>
          )}
        </div>
      </div>

      {/* Judgment */}
      {detail.primaryHexagram.judgment && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Judgment</h3>
          <p>{detail.primaryHexagram.judgment}</p>
        </div>
      )}

      {/* Changing Lines */}
      {detail.changingLines && detail.changingLines.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Changing Lines</h3>
          <div className={styles.changingLinesList}>
            {detail.changingLines.map((line, idx) => (
              <div key={idx} className={styles.changingLineItem}>
                <span className={styles.lineNumber}>Line {line.index + 1}</span>
                <p>{line.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resulting Hexagram */}
      {detail.resultingHexagram && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>→ Resulting Hexagram</h3>
          <div className={styles.resultingHex}>
            <span className={styles.resultingSymbol}>{detail.resultingHexagram.symbol}</span>
            <div>
              <p className={styles.resultingName}>{detail.resultingHexagram.name}</p>
              {detail.resultingHexagram.judgment && (
                <p className={styles.resultingJudgment}>{detail.resultingHexagram.judgment}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Interpretation */}
      {detail.aiInterpretation && (
        <div className={styles.aiSection}>
          <h3 className={styles.aiSectionTitle}>
            <span>✨</span> AI Interpretation
          </h3>

          {detail.aiInterpretation.overview && (
            <div className={styles.aiBlock}>
              <h4>Overall Interpretation</h4>
              <p>{detail.aiInterpretation.overview}</p>
            </div>
          )}

          {detail.aiInterpretation.changing && (
            <div className={styles.aiBlock}>
              <h4>Changing Lines Analysis</h4>
              <p>{detail.aiInterpretation.changing}</p>
            </div>
          )}

          {detail.aiInterpretation.advice && (
            <div className={styles.aiBlock}>
              <h4>Practical Guidance</h4>
              <p>{detail.aiInterpretation.advice}</p>
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      {detail.timestamp && (
        <p className={styles.timestamp}>
          {new Date(detail.timestamp).toLocaleString()}
        </p>
      )}
    </div>
  );
}
