import { ZODIAC_SIGNS } from "../serviceConfig";

type CSSModule = Record<string, string>;

interface AstrologyFeatureProps {
  translate: (key: string, fallback: string) => string;
  styles: CSSModule;
}

export default function AstrologyFeature({ translate, styles }: AstrologyFeatureProps) {
  return (
    <section className={styles.featureSection}>
      <h2 className={styles.featureSectionTitle}>
        {translate("landing.astrologySectionTitle", "오늘의 당신, 점성학적으로")}
      </h2>
      <p className={styles.featureSectionSubtitle}>
        {translate("landing.astrologySectionSubtitle", "행성의 배치가 당신의 운명에 어떤 영향을 미치는지 실시간으로 확인하세요")}
      </p>
      <div className={styles.astrologyChart}>
        {/* Zodiac Circle with 12 signs */}
        <div className={styles.zodiacCircle}>
          {ZODIAC_SIGNS.map((sign, i) => (
            <div
              key={sign}
              className={styles.zodiacSign}
              style={{ transform: `rotate(${i * 30}deg) translateY(-180px)` }}
            >
              {sign}
            </div>
          ))}
        </div>
        {/* Stars background */}
        <div className={styles.stars}>
          {[...Array(20)].map((_, i) => {
            // Use index to generate consistent positions
            const seed = i * 137.508; // Golden angle
            const left = (seed % 100);
            const top = ((seed * 1.618) % 100);
            const delay = ((i * 0.15) % 3);

            return (
              <div
                key={i}
                className={styles.star}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  animationDelay: `${delay}s`
                }}
              >&#10022;</div>
            );
          })}
        </div>
        {/* Planets */}
        <div className={`${styles.planet} ${styles.planetSun}`}>&#9737;</div>
        <div className={`${styles.planet} ${styles.planetMoon}`}>&#9789;</div>
        <div className={`${styles.planet} ${styles.planetMercury}`}>&#9791;</div>
        <div className={`${styles.planet} ${styles.planetVenus}`}>&#9792;</div>
        <div className={`${styles.planet} ${styles.planetMars}`}>&#9794;</div>
        <div className={`${styles.planet} ${styles.planetJupiter}`}>&#9795;</div>
        <div className={`${styles.planet} ${styles.planetSaturn}`}>&#9796;</div>
      </div>
      <div className={styles.astrologyInfo}>
        <p><strong>{translate("landing.ascendant", "Ascendant")}:</strong> {translate("landing.aquarius", "Aquarius")} ♒ | <strong>{translate("landing.sun", "Sun")}:</strong> {translate("landing.scorpio", "Scorpio")} ♏ | <strong>{translate("landing.moon", "Moon")}:</strong> {translate("landing.pisces", "Pisces")} ♓</p>
        <p>{translate("landing.todayMessage", "Today is a favorable day for new beginnings. Creativity will shine.")}</p>
      </div>
    </section>
  );
}
