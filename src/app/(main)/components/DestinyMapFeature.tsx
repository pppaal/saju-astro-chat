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
    icon: '\u{1F333}',
    width: '78%',
    className: 'elementWood',
  },
  {
    key: 'fire',
    icon: '\u{1F525}',
    width: '62%',
    className: 'elementFire',
  },
  {
    key: 'earth',
    icon: '\u{1F3D4}\uFE0F',
    width: '48%',
    className: 'elementEarth',
  },
  {
    key: 'metal',
    icon: '\u26AA',
    width: '72%',
    className: 'elementMetal',
  },
  {
    key: 'water',
    icon: '\u{1F4A7}',
    width: '84%',
    className: 'elementWater',
  },
] as const

const toElementKey = (key: string) => `landing.element${key.charAt(0).toUpperCase()}${key.slice(1)}`

export default function DestinyMapFeature({ translate, styles }: DestinyMapFeatureProps) {
  return (
    <section className={styles.featureSection}>
      <h2 className={styles.featureSectionTitle}>
        {translate('landing.destinyMapSectionTitle', 'Destiny Map')}
      </h2>
      <p className={styles.featureSectionSubtitle}>
        {translate(
          'landing.destinyMapSectionSubtitle',
          "We combine Saju's Five Elements balance with astrology's planetary flow to clarify your direction."
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
                  <span aria-hidden="true">{element.icon}</span>{' '}
                  {translate(
                    toElementKey(element.key),
                    element.key.charAt(0).toUpperCase() + element.key.slice(1)
                  )}
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
              'See structure (Saju) and flow (astrology) together and choose your next step with confidence.'
            )}
          </p>
        </article>
      </div>

      <div className={styles.destinyMapCtaWrap}>
        <Link href="/destiny-map" className={styles.destinyMapCta}>
          {translate('landing.destinyMapCta', 'Start Destiny Map')}
        </Link>
      </div>
    </section>
  )
}
