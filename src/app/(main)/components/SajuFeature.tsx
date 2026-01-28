type CSSModule = Record<string, string>;

interface SajuFeatureProps {
  translate: (key: string, fallback: string) => string;
  styles: CSSModule;
}

export default function SajuFeature({ translate, styles }: SajuFeatureProps) {
  return (
    <section className={styles.featureSection}>
      <h2 className={styles.featureSectionTitle}>
        {translate("landing.sajuSectionTitle", "사주로 보는 오행 밸런스")}
      </h2>
      <p className={styles.featureSectionSubtitle}>
        {translate("landing.sajuSectionSubtitle", "당신의 오행 에너지 분포를 확인하고 균형을 맞추세요")}
      </p>
      {/* Four Pillars */}
      <div className={styles.sajuPillars}>
        <div className={styles.pillar}>
          <div className={styles.pillarLabel}>{translate("landing.hourPillar", "時柱")}</div>
          <div className={styles.pillarChar}>
            <div className={styles.stem} style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.5)' }}>
              <span className={styles.elementIcon}>🌳</span>
              <span className={styles.charMain}>甲</span>
              <span className={styles.charTranslation}>{translate("landing.elementWoodEn", "Wood")}</span>
            </div>
            <div className={styles.branch} style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 0.5)' }}>
              <span className={styles.elementIcon}>💧</span>
              <span className={styles.charMain}>子</span>
              <span className={styles.charTranslation}>{translate("landing.elementWaterEn", "Water")}</span>
            </div>
          </div>
        </div>
        <div className={styles.pillar}>
          <div className={styles.pillarLabel}>{translate("landing.dayPillar", "日柱")}</div>
          <div className={styles.pillarChar}>
            <div className={styles.stem} style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)' }}>
              <span className={styles.elementIcon}>🔥</span>
              <span className={styles.charMain}>丙</span>
              <span className={styles.charTranslation}>{translate("landing.elementFireEn", "Fire")}</span>
            </div>
            <div className={styles.branch} style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.5)' }}>
              <span className={styles.elementIcon}>🌳</span>
              <span className={styles.charMain}>寅</span>
              <span className={styles.charTranslation}>{translate("landing.elementWoodEn", "Wood")}</span>
            </div>
          </div>
        </div>
        <div className={styles.pillar}>
          <div className={styles.pillarLabel}>{translate("landing.monthPillar", "月柱")}</div>
          <div className={styles.pillarChar}>
            <div className={styles.stem} style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', borderColor: 'rgba(234, 179, 8, 0.5)' }}>
              <span className={styles.elementIcon}>🏔️</span>
              <span className={styles.charMain}>戊</span>
              <span className={styles.charTranslation}>{translate("landing.elementEarthEn", "Earth")}</span>
            </div>
            <div className={styles.branch} style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)' }}>
              <span className={styles.elementIcon}>🔥</span>
              <span className={styles.charMain}>午</span>
              <span className={styles.charTranslation}>{translate("landing.elementFireEn", "Fire")}</span>
            </div>
          </div>
        </div>
        <div className={styles.pillar}>
          <div className={styles.pillarLabel}>{translate("landing.yearPillar", "年柱")}</div>
          <div className={styles.pillarChar}>
            <div className={styles.stem} style={{ backgroundColor: 'rgba(229, 229, 229, 0.2)', borderColor: 'rgba(229, 229, 229, 0.5)' }}>
              <span className={styles.elementIcon}>⚔️</span>
              <span className={styles.charMain}>庚</span>
              <span className={styles.charTranslation}>{translate("landing.elementMetalEn", "Metal")}</span>
            </div>
            <div className={styles.branch} style={{ backgroundColor: 'rgba(229, 229, 229, 0.2)', borderColor: 'rgba(229, 229, 229, 0.5)' }}>
              <span className={styles.elementIcon}>⚔️</span>
              <span className={styles.charMain}>申</span>
              <span className={styles.charTranslation}>{translate("landing.elementMetalEn", "Metal")}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Luck Cycle Timeline */}
      <div className={styles.luckTimeline}>
        <div className={styles.timelineLabel}>{translate("landing.greatFortune", "대운 (大運)")}</div>
        <div className={styles.timelineTrack}>
          <div className={styles.luckPeriod}>
            <span className={styles.luckAge}>8-17{translate("landing.ageUnit", "세")}</span>
            <div className={styles.luckChars}>
              <span>己未</span>
              <span className={styles.luckTranslation}>{translate("landing.elementCombo.earthEarth", "Earth-Earth")}</span>
            </div>
          </div>
          <div className={styles.luckPeriod}>
            <span className={styles.luckAge}>18-27{translate("landing.ageUnit", "세")}</span>
            <div className={styles.luckChars}>
              <span>庚申</span>
              <span className={styles.luckTranslation}>{translate("landing.elementCombo.metalMetal", "Metal-Metal")}</span>
            </div>
          </div>
          <div className={`${styles.luckPeriod} ${styles.active}`}>
            <span className={styles.luckAge}>28-37{translate("landing.ageUnit", "세")}</span>
            <div className={styles.luckChars}>
              <span>辛酉</span>
              <span className={styles.luckTranslation}>{translate("landing.elementCombo.metalMetal", "Metal-Metal")}</span>
            </div>
          </div>
          <div className={styles.luckPeriod}>
            <span className={styles.luckAge}>38-47{translate("landing.ageUnit", "세")}</span>
            <div className={styles.luckChars}>
              <span>壬戌</span>
              <span className={styles.luckTranslation}>{translate("landing.elementCombo.waterEarth", "Water-Earth")}</span>
            </div>
          </div>
          <div className={styles.luckPeriod}>
            <span className={styles.luckAge}>48-57{translate("landing.ageUnit", "세")}</span>
            <div className={styles.luckChars}>
              <span>癸亥</span>
              <span className={styles.luckTranslation}>{translate("landing.elementCombo.waterWater", "Water-Water")}</span>
            </div>
          </div>
          <div className={styles.luckPeriod}>
            <span className={styles.luckAge}>58-67{translate("landing.ageUnit", "세")}</span>
            <div className={styles.luckChars}>
              <span>甲子</span>
              <span className={styles.luckTranslation}>{translate("landing.elementCombo.woodWater", "Wood-Water")}</span>
            </div>
          </div>
          <div className={styles.luckPeriod}>
            <span className={styles.luckAge}>68-77{translate("landing.ageUnit", "세")}</span>
            <div className={styles.luckChars}>
              <span>乙丑</span>
              <span className={styles.luckTranslation}>{translate("landing.elementCombo.woodEarth", "Wood-Earth")}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Five Elements */}
      <div className={styles.sajuContainer}>
        <div className={styles.elementBar}>
          <div className={styles.elementName}>🌳 {translate("landing.elementWood", "목")}</div>
          <div className={styles.elementProgress}>
            <div className={`${styles.elementFill} ${styles.elementWood}`} style={{width: '75%'}} />
          </div>
        </div>
        <div className={styles.elementBar}>
          <div className={styles.elementName}>🔥 {translate("landing.elementFire", "화")}</div>
          <div className={styles.elementProgress}>
            <div className={`${styles.elementFill} ${styles.elementFire}`} style={{width: '60%'}} />
          </div>
        </div>
        <div className={styles.elementBar}>
          <div className={styles.elementName}>🏔️ {translate("landing.elementEarth", "토")}</div>
          <div className={styles.elementProgress}>
            <div className={`${styles.elementFill} ${styles.elementEarth}`} style={{width: '45%'}} />
          </div>
        </div>
        <div className={styles.elementBar}>
          <div className={styles.elementName}>⚪ {translate("landing.elementMetal", "금")}</div>
          <div className={styles.elementProgress}>
            <div className={`${styles.elementFill} ${styles.elementMetal}`} style={{width: '85%'}} />
          </div>
        </div>
        <div className={styles.elementBar}>
          <div className={styles.elementName}>💧 {translate("landing.elementWater", "수")}</div>
          <div className={styles.elementProgress}>
            <div className={`${styles.elementFill} ${styles.elementWater}`} style={{width: '90%'}} />
          </div>
        </div>
      </div>
      {/* Shinsal (Lucky Stars) Section */}
      <div className={styles.shinsalContainer}>
        <div className={styles.shinsalCard}>
          <div className={styles.shinsalIcon}>✨</div>
          <div className={styles.shinsalName}>{translate("landing.shinsal.heavenlyNoble", "Heavenly Noble")}</div>
          <div className={styles.shinsalDesc}>{translate("landing.shinsal.heavenlyNobleDesc", "Guardian energy")}</div>
        </div>
        <div className={styles.shinsalCard}>
          <div className={styles.shinsalIcon}>🐴</div>
          <div className={styles.shinsalName}>{translate("landing.shinsal.postHorse", "Post Horse")}</div>
          <div className={styles.shinsalDesc}>{translate("landing.shinsal.postHorseDesc", "Travel & movement")}</div>
        </div>
        <div className={styles.shinsalCard}>
          <div className={styles.shinsalIcon}>🌸</div>
          <div className={styles.shinsalName}>{translate("landing.shinsal.peachBlossom", "Peach Blossom")}</div>
          <div className={styles.shinsalDesc}>{translate("landing.shinsal.peachBlossomDesc", "Charm & romance")}</div>
        </div>
      </div>
    </section>
  );
}
