"use client";

import Image from "next/image";
import styles from "./tarot-result-view.module.css";

// 타입 예시 (이미 lib/tarot.types 등에 정의돼 있으면 import로 교체!)
interface Interpretation {
  meaning: string;
  keywords: string[];
}
interface Card {
  name: string;
  image: string;
  upright: Interpretation;
  reversed: Interpretation;
}
interface DrawnCard {
  card: Card;
  isReversed: boolean;
}
interface Position {
  title: string;
  description?: string;
}
interface Spread {
  title: string;
  positions: Position[];
}

interface Props {
  drawnCards: DrawnCard[];
  spread: Spread;
  onReset: () => void;
}

export default function TarotResultView({ drawnCards, spread, onReset }: Props) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{spread.title} 결과</h2>
      <div className={styles.cardsWrapper}>
        {drawnCards.map(({ card, isReversed }, index) => {
          const interpretation = isReversed ? card.reversed : card.upright;
          const pos = spread.positions[index];

          return (
            <div key={index} className={styles.cardResult}>
              {/* 위치 정보 (예: Past/Present/Future) */}
              <div className={styles.positionInfo}>
                <h4 className={styles.positionTitle}>
                  {pos?.title || `카드 ${index + 1}`}
                </h4>
                {pos?.description && (
                  <p className={styles.positionDesc}>{pos.description}</p>
                )}
              </div>

              {/* 카드 이미지 */}
              <div
                className={`${styles.imageContainer} ${
                  isReversed ? styles.reversed : ""
                }`}
              >
                <Image
                  src={card.image}
                  alt={card.name}
                  width={150}
                  height={250}
                  className={styles.cardImage}
                />
              </div>

              {/* 카드 이름 */}
              <h3 className={styles.cardName}>
                {card.name} {isReversed && "(역방향)"}
              </h3>

              {/* 해석 */}
              <p className={styles.cardMeaning}>{interpretation.meaning}</p>

              {/* 키워드 */}
              <div className={styles.keywords}>
                {interpretation.keywords.map((keyword) => (
                  <span key={keyword} className={styles.keyword}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onReset} className={styles.resetButton}>
        다시 뽑기
      </button>
    </div>
  );
}