import Link from 'next/link'
import { ZODIAC_SIGNS } from '../serviceConfig'

type CSSModule = Record<string, string>

interface DestinyMapFeatureProps {
  translate: (key: string, fallback: string) => string
  styles: CSSModule
}

const FIVE_ELEMENTS = [
  {
    key: 'wood',
    icon: '🌳',
    labelKo: '목',
    labelEn: 'Wood',
    width: '78%',
    className: 'elementWood',
  },
  {
    key: 'fire',
    icon: '🔥',
    labelKo: '화',
    labelEn: 'Fire',
    width: '62%',
    className: 'elementFire',
  },
  {
    key: 'earth',
    icon: '🏔️',
    labelKo: '토',
    labelEn: 'Earth',
    width: '48%',
    className: 'elementEarth',
  },
  {
    key: 'metal',
    icon: '⚪',
    labelKo: '금',
    labelEn: 'Metal',
    width: '72%',
    className: 'elementMetal',
  },
  {
    key: 'water',
    icon: '💧',
    labelKo: '수',
    labelEn: 'Water',
    width: '84%',
    className: 'elementWater',
  },
] as const

export default function DestinyMapFeature({ translate, styles }: DestinyMapFeatureProps) {
  return (
    <section className={styles.featureSection}>
      <h2 className={styles.featureSectionTitle}>
        {translate('landing.destinyMapSectionTitle', 'Destiny Map: Eastern + Western')}
      </h2>
      <p className={styles.featureSectionSubtitle}>
        {translate(
          'landing.destinyMapSectionSubtitle',
          '사주의 오행 밸런스와 점성의 행성 흐름을 하나로 합쳐 현재의 방향성을 읽어드립니다.'
        )}
      </p>

      <div className={styles.destinyMapPanelGrid}>
        <article className={styles.destinyMapPanel}>
          <h3 className={styles.destinyMapPanelTitle}>
            {translate('landing.destinyMapAstroTitle', 'Planetary Flow')}
          </h3>
          <div className={styles.astrologyChart}>
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

            <div className={styles.stars}>
              {[...Array(20)].map((_, i) => {
                const seed = i * 137.508
                const left = seed % 100
                const top = (seed * 1.618) % 100
                const delay = (i * 0.15) % 3

                return (
                  <div
                    key={i}
                    className={styles.star}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      animationDelay: `${delay}s`,
                    }}
                  >
                    &#10022;
                  </div>
                )
              })}
            </div>

            <div className={`${styles.planet} ${styles.planetSun}`}>&#9737;</div>
            <div className={`${styles.planet} ${styles.planetMoon}`}>&#9789;</div>
            <div className={`${styles.planet} ${styles.planetMercury}`}>&#9791;</div>
            <div className={`${styles.planet} ${styles.planetVenus}`}>&#9792;</div>
            <div className={`${styles.planet} ${styles.planetMars}`}>&#9794;</div>
            <div className={`${styles.planet} ${styles.planetJupiter}`}>&#9795;</div>
            <div className={`${styles.planet} ${styles.planetSaturn}`}>&#9796;</div>
          </div>
        </article>

        <article className={styles.destinyMapPanel}>
          <h3 className={styles.destinyMapPanelTitle}>
            {translate('landing.destinyMapSajuTitle', 'Five Elements Balance')}
          </h3>
          <div className={styles.destinyMapElements}>
            {FIVE_ELEMENTS.map((element) => (
              <div key={element.key} className={styles.elementBar}>
                <div className={styles.elementName}>
                  {element.icon} {translate(`landing.element${element.labelEn}`, element.labelKo)}
                </div>
                <div className={styles.elementProgress}>
                  <div
                    className={`${styles.elementFill} ${styles[element.className]}`}
                    style={{ width: element.width }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className={styles.destinyMapSummary}>
            {translate(
              'landing.destinyMapSummary',
              'Destiny Map은 동양의 구조(사주)와 서양의 흐름(점성)을 함께 읽어 지금 필요한 선택을 더 분명하게 보여줍니다.'
            )}
          </p>
        </article>
      </div>

      <div className={styles.destinyMapCtaWrap}>
        <Link href="/destiny-map" className={styles.destinyMapCta}>
          {translate('landing.destinyMapCta', 'Destiny Map 시작하기')}
        </Link>
      </div>
    </section>
  )
}
