type CSSModule = Record<string, string>;

interface SEOContentProps {
  translate: (key: string, fallback: string) => string;
  styles: CSSModule;
}

export default function SEOContent({ translate, styles }: SEOContentProps) {
  return (
    <section className={styles.seoContentSection}>
      <div className={styles.seoContentContainer}>
        <article className={styles.seoArticle}>
          <div className={styles.seoHeader}>
            <h2 className={styles.seoHeading}>
              {translate("landing.seo.whatIsDestinyPal", "DestinyPal이란? 운명과 성격을 분석하는 AI 기반 플랫폼")}
            </h2>
            <p className={styles.seoIntro}>
              {translate(
                "landing.seo.intro",
                "DestinyPal은 동양의 사주팔자와 서양의 점성술을 결합한 종합 운세 분석 플랫폼입니다. 인공지능 기술을 활용하여 개인의 생년월일시를 바탕으로 운명의 흐름, 성격 특성, 적성, 인간관계 등을 깊이 있게 분석합니다. 수천 년간 축적된 동서양의 지혜와 현대 AI 기술이 만나, 당신의 인생에 실질적인 통찰을 제공합니다."
              )}
            </p>
          </div>

          <div className={styles.seoFeatureGrid}>
            <div className={styles.seoFeatureCard}>
              <div className={styles.seoFeatureIcon}>🔮</div>
              <h3 className={styles.seoFeatureTitle}>
                {translate("landing.seo.sajuTitle", "사주팔자 분석")}
              </h3>
              <p className={styles.seoFeatureDesc}>
                {translate(
                  "landing.seo.sajuDescription",
                  "사주팔자(四柱八字)는 출생 연월일시를 기반으로 한 동양 최고의 운명 분석 체계입니다. 네 개의 기둥(년주, 월주, 일주, 시주)과 여덟 글자(천간지지)로 구성되며, 목(木), 화(火), 토(土), 금(金), 수(水) 오행의 상생상극 관계를 통해 개인의 타고난 성향과 운명의 흐름을 파악합니다. DestinyPal은 전문가 수준의 사주 분석을 누구나 쉽게 이해할 수 있도록 시각화하고 해석합니다. 대운(大運), 세운(歲運) 분석을 통해 인생의 각 시기별 운세 변화를 예측하며, 직업운, 재물운, 애정운, 건강운 등 삶의 모든 영역을 포괄적으로 진단합니다."
                )}
              </p>
            </div>

            <div className={styles.seoFeatureCard}>
              <div className={styles.seoFeatureIcon}>⭐</div>
              <h3 className={styles.seoFeatureTitle}>
                {translate("landing.seo.astrologyTitle", "서양 점성술")}
              </h3>
              <p className={styles.seoFeatureDesc}>
                {translate(
                  "landing.seo.astrologyDescription",
                  "서양 점성술(Astrology)은 출생 당시 천체의 배치를 통해 개인의 성격과 운명을 분석하는 체계입니다. 12개의 별자리(Zodiac Sign)와 행성(태양, 달, 수성, 금성, 화성, 목성, 토성 등)의 위치, 하우스 시스템, 행성 간의 각도(Aspect) 등을 종합적으로 고려합니다. DestinyPal은 출생 차트(Natal Chart)를 정밀하게 계산하고, 상승궁(Ascendant), 중천(MC), 하강궁(Descendant), 천저(IC) 등 주요 포인트를 분석합니다. 태양 별자리는 기본 성격을, 달 별자리는 감정적 본성을, 상승궁은 외적 이미지를 나타내며, 이들의 조합으로 개인의 복합적인 성격을 이해할 수 있습니다."
                )}
              </p>
            </div>

            <div className={styles.seoFeatureCard}>
              <div className={styles.seoFeatureIcon}>🎴</div>
              <h3 className={styles.seoFeatureTitle}>
                {translate("landing.seo.tarotTitle", "타로 카드")}
              </h3>
              <p className={styles.seoFeatureDesc}>
                {translate(
                  "landing.seo.tarotDescription",
                  "타로(Tarot)는 78장의 카드를 통해 현재 상황을 분석하고 미래를 조망하는 신비로운 도구입니다. 22장의 메이저 아르카나(Major Arcana)는 인생의 중요한 전환점과 영적 성장을 상징하며, 56장의 마이너 아르카나(Minor Arcana)는 일상의 구체적인 상황을 다룹니다. DestinyPal은 과거-현재-미래 스프레드, 켈틱 크로스, 관계 스프레드 등 다양한 펼침법을 제공하며, AI가 카드의 상징과 질문자의 상황을 연결하여 깊이 있는 해석을 제공합니다. 사랑, 진로, 금전, 건강 등 인생의 모든 질문에 대해 타로는 직관적인 통찰을 선사합니다."
                )}
              </p>
            </div>

            <div className={styles.seoFeatureCard}>
              <div className={styles.seoFeatureIcon}>💕</div>
              <h3 className={styles.seoFeatureTitle}>
                {translate("landing.seo.compatibilityTitle", "궁합 분석")}
              </h3>
              <p className={styles.seoFeatureDesc}>
                {translate(
                  "landing.seo.compatibilityDescription",
                  "궁합(Compatibility) 분석은 두 사람의 사주와 별자리를 비교하여 관계의 조화와 충돌 가능성을 예측합니다. 사주 궁합에서는 일간의 합충형파해 관계, 오행의 상생상극, 신살의 상호작용을 분석하며, 점성술 궁합에서는 태양 별자리의 원소 조화, 금성-화성의 사랑 스타일 궁합, 달 별자리의 감정적 호환성 등을 살펴봅니다. DestinyPal은 연애 궁합뿐만 아니라 부부 궁합, 비즈니스 파트너십, 친구 관계, 부모-자식 관계 등 모든 인간관계의 역학을 분석하여, 상대방을 이해하고 관계를 발전시킬 수 있는 실질적인 조언을 제공합니다."
                )}
              </p>
            </div>

            <div className={styles.seoFeatureCard}>
              <div className={styles.seoFeatureIcon}>📅</div>
              <h3 className={styles.seoFeatureTitle}>
                {translate("landing.seo.calendarTitle", "운세 달력")}
              </h3>
              <p className={styles.seoFeatureDesc}>
                {translate(
                  "landing.seo.calendarDescription",
                  "운세 달력(Fortune Calendar)은 매일의 운세 변화를 추적하고 중요한 날짜를 미리 파악할 수 있는 강력한 도구입니다. 일진(日辰)별 길흉, 행성 이동(Transit), 역행(Retrograde) 주기, 월상(Moon Phase) 등을 통합하여 제공합니다. 결혼식, 개업일, 이사일, 계약일 등 중요한 일정을 잡을 때 좋은 날(吉日)을 선택하거나, 어려움이 예상되는 날(凶日)을 피할 수 있습니다. DestinyPal의 AI는 개인의 사주와 현재 운세를 결합하여 맞춤형 일일 운세를 생성하며, 직업운, 금전운, 애정운, 건강운 등 분야별로 세분화된 조언을 제공합니다."
                )}
              </p>
            </div>

            <div className={styles.seoFeatureCard}>
              <div className={styles.seoFeatureIcon}>🎯</div>
              <h3 className={styles.seoFeatureTitle}>
                {translate("landing.seo.howToUse", "사용 방법")}
              </h3>
              <p className={styles.seoFeatureDesc}>
                {translate(
                  "landing.seo.howToUseDescription",
                  "DestinyPal을 사용하는 것은 매우 간단합니다. 먼저 정확한 생년월일시를 입력하세요. 시간이 불확실한 경우 대략적인 시간대를 선택할 수 있으며, 더 정확한 시간일수록 분석의 정밀도가 높아집니다. 출생지 정보를 입력하면 점성술 차트의 하우스 시스템이 정확하게 계산됩니다. 입력이 완료되면 AI가 사주팔자를 계산하고, 천체 위치를 분석하여 종합적인 운명 리포트를 생성합니다. 대시보드에서 오행 밸런스, 행성 배치도, 대운 타임라인 등을 시각적으로 확인할 수 있으며, 각 섹션을 클릭하면 상세한 해석을 읽을 수 있습니다. 궁금한 점이 있다면 AI 채팅 기능을 통해 실시간으로 질문하고 답변을 받을 수 있습니다."
                )}
              </p>
            </div>

            <div className={styles.seoFeatureCard}>
              <div className={styles.seoFeatureIcon}>🔒</div>
              <h3 className={styles.seoFeatureTitle}>
                {translate("landing.seo.privacyTitle", "개인정보 보호")}
              </h3>
              <p className={styles.seoFeatureDesc}>
                {translate(
                  "landing.seo.privacyDescription",
                  "DestinyPal은 사용자의 개인정보와 운세 데이터를 최고 수준의 보안으로 보호합니다. 모든 데이터는 암호화되어 저장되며, 엄격한 접근 제어 정책을 통해 무단 접근을 차단합니다. 사용자의 동의 없이 개인정보가 제3자에게 공유되지 않으며, 원하는 경우 언제든지 데이터를 삭제할 수 있습니다. 또한 익명 모드를 통해 계정 없이도 기본적인 운세 분석을 이용할 수 있어, 개인정보 노출에 대한 걱정 없이 서비스를 체험할 수 있습니다. GDPR 및 국내 개인정보보호법을 철저히 준수하며, 정기적인 보안 감사를 통해 안전성을 유지합니다."
                )}
              </p>
            </div>

            <div className={styles.seoFeatureCard}>
              <div className={styles.seoFeatureIcon}>💎</div>
              <h3 className={styles.seoFeatureTitle}>
                {translate("landing.seo.freeVsPremium", "무료 vs 프리미엄")}
              </h3>
              <p className={styles.seoFeatureDesc}>
                {translate(
                  "landing.seo.freeVsPremiumDescription",
                  "DestinyPal은 무료 사용자에게도 기본적인 사주 분석, 서양 점성술 차트, 일일 운세, 타로 리딩 등을 제공합니다. 프리미엄 멤버십을 구독하면 대운 분석, 세운 예측, 상세 궁합 리포트, 맞춤형 AI 상담, 무제한 타로 리딩, PDF 리포트 다운로드 등 고급 기능을 이용할 수 있습니다. 프리미엄 사용자는 우선 고객 지원을 받으며, 새로운 기능을 먼저 체험할 수 있는 베타 테스터 자격도 부여됩니다. 월간 구독과 연간 구독 중 선택할 수 있으며, 연간 구독 시 최대 30% 할인 혜택이 제공됩니다. 첫 7일간 무료 체험을 통해 프리미엄 기능을 먼저 경험해 보세요."
                )}
              </p>
            </div>
          </div>

          <div className={styles.seoKeywords}>
            <div className={styles.seoKeywordsHeader}>
              <span className={styles.seoKeywordsIcon}>🔍</span>
              <h4 className={styles.seoKeywordsTitle}>
                {translate("landing.seo.keywords", "주요 키워드")}
              </h4>
            </div>
            <p className={styles.seoKeywordsList}>
              {translate(
                "landing.seo.keywordsList",
                "사주팔자, 사주 보기, 무료 사주, 운세, 오늘의 운세, 별자리 운세, 점성술, 타로 카드, 타로 점, 무료 타로, 궁합, 띠 궁합, 별자리 궁합, 생년월일 궁합, 대운, 세운, 신살, 십성, 오행, 천간지지, 일간, 월지, 년주, 시주, 상승궁, 태양 별자리, 달 별자리, 금성 별자리, 화성 별자리, 출생 차트, 네이탈 차트, 하우스 시스템, 어센던트, 메이저 아르카나, 마이너 아르카나, 켈틱 크로스, 과거현재미래, 사주 풀이, 사주 해석, 무료 운세, 2024년 운세, 2025년 운세, 신년 운세, 토정비결, 정통 사주, AI 운세, 인공지능 사주, 운명 분석, 성격 분석, 적성 테스트, 진로 상담, 연애 운세, 재물 운세, 건강 운세, 직업 운세, 이직 운세, 결혼 운세, 임신 운세, 합격 운세"
              )}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
