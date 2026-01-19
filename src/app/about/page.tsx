"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import ScrollToTop from "@/components/ui/ScrollToTop";
import styles from "./about.module.css";

type Service = {
  id: string;
  icon: string;
  title: string;
  titleKo: string;
  description: string;
  descriptionEn: string;
  href: string;
  gradient: string;
  featured?: boolean;
  comingSoon?: boolean;
};

const getServices = (t: (key: string, fallback: string) => string): Service[] => [
  {
    id: "destinyMap",
    icon: "🗺️",
    title: t('about.services.destinyMap.title', 'Destiny Map'),
    titleKo: t('about.services.destinyMap.title', '운명 지도'),
    description: t('about.services.destinyMap.description', 'AI integrates Saju, Astrology, and Tarot for personalized fortune reading'),
    descriptionEn: t('about.services.destinyMap.description', 'AI integrates Saju, Astrology, and Tarot for personalized fortune reading'),
    href: "/destiny-map",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    featured: true,
  },
  {
    id: "lifePrediction",
    icon: "🔮",
    title: t('about.services.lifePrediction.title', 'Life Prediction'),
    titleKo: t('about.services.lifePrediction.title', '인생 예측'),
    description: t('about.services.lifePrediction.description', 'Discover your 10-year fortune flow and life turning points'),
    descriptionEn: t('about.services.lifePrediction.description', 'Discover your 10-year fortune flow and life turning points'),
    href: "/life-prediction",
    gradient: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
    featured: true,
  },
  {
    id: "tarot",
    icon: "♜",
    title: t('about.services.tarot.title', 'Tarot'),
    titleKo: t('about.services.tarot.title', '타로'),
    description: t('about.services.tarot.description', 'Explore current situations and future possibilities through 78 cards'),
    descriptionEn: t('about.services.tarot.description', 'Explore current situations and future possibilities through 78 cards'),
    href: "/tarot",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    id: "calendar",
    icon: "📅",
    title: t('about.services.calendar.title', 'Fortune Calendar'),
    titleKo: t('about.services.calendar.title', '운세 캘린더'),
    description: t('about.services.calendar.description', 'Check daily fortune and auspicious days on your calendar'),
    descriptionEn: t('about.services.calendar.description', 'Check daily fortune and auspicious days on your calendar'),
    href: "/calendar",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    id: "dream",
    icon: "💭",
    title: t('about.services.dream.title', 'Dream Interpretation'),
    titleKo: t('about.services.dream.title', '꿈해몽'),
    description: t('about.services.dream.description', 'Interpret dream symbols and messages from your subconscious'),
    descriptionEn: t('about.services.dream.description', 'Interpret dream symbols and messages from your subconscious'),
    href: "/dream",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  },
  {
    id: "personality",
    icon: "🎭",
    title: t('about.services.personality.title', 'Personality Analysis'),
    titleKo: t('about.services.personality.title', '성격분석'),
    description: t('about.services.personality.description', 'Deep analysis of your personality traits, strengths, and weaknesses'),
    descriptionEn: t('about.services.personality.description', 'Deep analysis of your personality traits, strengths, and weaknesses'),
    href: "/personality",
    gradient: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  },
  {
    id: "numerology",
    icon: "🔢",
    title: t('about.services.numerology.title', 'Numerology'),
    titleKo: t('about.services.numerology.title', '수비학'),
    description: t('about.services.numerology.description', 'Discover your life purpose and potential through numerological analysis of your name and birth date'),
    descriptionEn: t('about.services.numerology.description', 'Discover your life purpose and potential through numerological analysis of your name and birth date'),
    href: "/numerology",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
];

export default function AboutPage() {
  const { translate, locale } = useI18n();
  const isKo = locale === "ko";
  const services = getServices(translate);

  return (
    <div className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.stars} aria-hidden />
          <h1 className={styles.heroTitle}>
            <span className={styles.heroLine}>{translate("about.heroTitle1", "Diagnose with Fate.")}</span>
            <span className={styles.heroLine}>{translate("about.heroTitle2", "Analyze with Psychology.")}</span>
            <span className={styles.heroLine}>{translate("about.heroTitle3", "Heal with Spirituality.")}</span>
          </h1>
          <p className={styles.heroSub}>
            {translate("about.heroSubtitle", "Fate speaks. AI listens. You decide.")}
          </p>
          <p className={styles.tagline}>
            {translate("about.tagline", "Understand your patterns. Change your outcomes.")}
          </p>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>
              {translate("about.servicesEyebrow", "DestinyPal Services")}
            </p>
            <h2 className={styles.sectionTitle}>
              {translate("about.servicesTitle", "7 Destiny Readings")}
            </h2>
            <p className={styles.sectionDesc}>
              {translate("about.servicesDesc", "Explore your destiny from multiple perspectives with each unique service")}
            </p>
          </div>

          <div className={styles.serviceGrid}>
            {services.map((service) => (
              <Link
                key={service.id}
                href={service.comingSoon ? "#" : service.href}
                className={`${styles.serviceCard} ${service.comingSoon ? styles.comingSoon : ""}`}
                style={{
                  background: service.gradient,
                }}
                onClick={service.comingSoon ? (e) => e.preventDefault() : undefined}
              >
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  <div className={styles.serviceIcon}>{service.icon}</div>
                  <h3 className={styles.serviceTitle}>
                    {isKo ? service.titleKo : service.title}
                  </h3>
                  <p className={styles.serviceDesc}>
                    {isKo ? service.description : service.descriptionEn}
                  </p>
                  {service.comingSoon ? (
                    <span className={styles.comingSoonBadge}>Coming Soon</span>
                  ) : (
                    <span className={styles.serviceArrow}>→</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.philosophy}>
          <h2 className={styles.philosophyTitle}>
            {translate("about.philosophyTitle", "Our Philosophy")}
          </h2>
          <div className={styles.philosophyGrid}>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>🎯</div>
              <h3>{translate("about.philosophy.accurate.title", "Accurate Calculation")}</h3>
              <p>
                {translate("about.philosophy.accurate.desc", "Reliable calculations reflecting time zones, seasons, and DST")}
              </p>
            </div>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>🤝</div>
              <h3>{translate("about.philosophy.ethical.title", "Ethical Guidance")}</h3>
              <p>
                {translate("about.philosophy.ethical.desc", "Practical hints to help choices, not absolute predictions")}
              </p>
            </div>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>✨</div>
              <h3>{translate("about.philosophy.ui.title", "Intuitive UI")}</h3>
              <p>
                {translate("about.philosophy.ui.desc", "Beautiful interface that makes complex information easy")}
              </p>
            </div>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>🤖</div>
              <h3>{translate("about.philosophy.ai.title", "AI Integration")}</h3>
              <p>
                {translate("about.philosophy.ai.desc", "AI-powered integration of multiple divination systems")}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.detailedInfo}>
          <div className={styles.infoBlock}>
            <h2 className={styles.infoTitle}>
              {translate("about.whatIsDestinyPal.title", "DestinyPal이란 무엇인가요?")}
            </h2>
            <p className={styles.infoParagraph}>
              {translate(
                "about.whatIsDestinyPal.p1",
                "DestinyPal(데스티니팔)은 동양의 사주팔자(四柱八字), 서양의 점성술(Astrology), 그리고 타로(Tarot) 카드를 통합한 AI 기반 운세 분석 플랫폼입니다. 수천 년간 인류가 축적해 온 운명학의 지혜를 현대 인공지능 기술과 결합하여, 사용자에게 깊이 있고 정확한 인생 통찰을 제공합니다."
              )}
            </p>
            <p className={styles.infoParagraph}>
              {translate(
                "about.whatIsDestinyPal.p2",
                "우리는 단순한 '오늘의 운세'를 넘어서, 개인의 타고난 성향, 인생의 주기적 변화, 관계의 역학, 진로와 적성, 건강 패턴 등을 종합적으로 분석합니다. 생년월일시(Birth Chart Data)를 입력하면 사주팔자의 천간지지(天干地支), 서양 점성술의 행성 배치(Planetary Positions), 그리고 타로 리딩을 통해 다면적인 운명 분석을 받을 수 있습니다."
              )}
            </p>
          </div>

          <div className={styles.infoBlock}>
            <h2 className={styles.infoTitle}>
              {translate("about.whyChooseUs.title", "왜 DestinyPal을 선택해야 하나요?")}
            </h2>
            <h3 className={styles.infoSubtitle}>
              {translate("about.whyChooseUs.reason1.title", "1. 동서양 운명학의 완벽한 통합")}
            </h3>
            <p className={styles.infoParagraph}>
              {translate(
                "about.whyChooseUs.reason1.desc",
                "대부분의 운세 사이트는 사주만, 또는 별자리만 다룹니다. DestinyPal은 사주팔자의 오행 이론, 서양 점성술의 행성 사이클, 타로의 직관적 상징을 하나의 통합된 시각으로 제공합니다. 이를 통해 당신의 운명을 다각도로 이해할 수 있습니다."
              )}
            </p>

            <h3 className={styles.infoSubtitle}>
              {translate("about.whyChooseUs.reason2.title", "2. AI 기술 기반 고도화된 해석")}
            </h3>
            <p className={styles.infoParagraph}>
              {translate(
                "about.whyChooseUs.reason2.desc",
                "DestinyPal은 ChatGPT와 같은 최신 대형 언어 모델(LLM)을 활용하여, 복잡한 사주 구조와 행성 배치를 자연어로 쉽게 설명합니다. 전통적인 사주 전문가의 해석 논리를 AI가 학습하여, 초보자도 이해하기 쉬운 맞춤형 설명을 제공합니다. 또한 사용자가 질문을 입력하면 실시간으로 대화형 상담이 가능합니다."
              )}
            </p>

            <h3 className={styles.infoSubtitle}>
              {translate("about.whyChooseUs.reason3.title", "3. 정밀한 천체 계산과 시간대 보정")}
            </h3>
            <p className={styles.infoParagraph}>
              {translate(
                "about.whyChooseUs.reason3.desc",
                "사주와 점성술은 정확한 출생 시간과 위치가 매우 중요합니다. DestinyPal은 스위스 천문력(Swiss Ephemeris) 엔진을 사용하여 0.001도 단위까지 정밀한 행성 위치를 계산하며, 시간대(Timezone), 일광절약시간(DST), 역법 차이를 모두 반영합니다. 또한 음력 변환, 절기 계산, 태양시 보정 등 전문적인 알고리즘을 적용하여 한국의 전통 사주학 표준을 충실히 따릅니다."
              )}
            </p>

            <h3 className={styles.infoSubtitle}>
              {translate("about.whyChooseUs.reason4.title", "4. 개인정보 보호와 보안")}
            </h3>
            <p className={styles.infoParagraph}>
              {translate(
                "about.whyChooseUs.reason4.desc",
                "생년월일시와 운세 정보는 매우 민감한 개인 데이터입니다. DestinyPal은 최고 수준의 암호화 기술과 접근 제어를 통해 데이터를 보호하며, GDPR 및 국내 개인정보보호법을 준수합니다. 사용자는 언제든지 자신의 데이터를 다운로드하거나 삭제할 수 있으며, 익명 모드를 통해 계정 생성 없이도 기본 분석을 이용할 수 있습니다."
              )}
            </p>
          </div>

          <div className={styles.infoBlock}>
            <h2 className={styles.infoTitle}>
              {translate("about.howItWorks.title", "DestinyPal은 어떻게 작동하나요?")}
            </h2>
            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <h3 className={styles.stepTitle}>
                  {translate("about.howItWorks.step1.title", "정보 입력")}
                </h3>
                <p className={styles.stepDesc}>
                  {translate(
                    "about.howItWorks.step1.desc",
                    "생년월일시와 출생지를 입력합니다. 시간이 불확실하면 대략적인 시간대를 선택할 수 있습니다. 더 정확한 시간일수록 분석이 정밀해집니다."
                  )}
                </p>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <h3 className={styles.stepTitle}>
                  {translate("about.howItWorks.step2.title", "AI 분석")}
                </h3>
                <p className={styles.stepDesc}>
                  {translate(
                    "about.howItWorks.step2.desc",
                    "입력된 정보를 바탕으로 사주팔자를 계산하고, 천체 위치를 정밀하게 계산합니다. AI가 오행 밸런스, 십성 구조, 대운 흐름, 행성 배치, 하우스 시스템 등을 종합적으로 분석합니다."
                  )}
                </p>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <h3 className={styles.stepTitle}>
                  {translate("about.howItWorks.step3.title", "리포트 생성")}
                </h3>
                <p className={styles.stepDesc}>
                  {translate(
                    "about.howItWorks.step3.desc",
                    "분석 결과를 시각적이고 이해하기 쉬운 형태로 제공합니다. 차트, 그래프, 타임라인 등 직관적인 UI를 통해 복잡한 운명학 정보를 쉽게 파악할 수 있습니다."
                  )}
                </p>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>4</div>
                <h3 className={styles.stepTitle}>
                  {translate("about.howItWorks.step4.title", "대화형 상담")}
                </h3>
                <p className={styles.stepDesc}>
                  {translate(
                    "about.howItWorks.step4.desc",
                    "궁금한 점이 있다면 AI 채팅을 통해 실시간으로 질문하고 답변을 받을 수 있습니다. '올해 이직이 좋을까요?', '이 사람과 궁합이 맞나요?' 등 구체적인 질문에 맞춤형 답변을 제공합니다."
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.infoBlock}>
            <h2 className={styles.infoTitle}>
              {translate("about.whoIsItFor.title", "누가 DestinyPal을 사용하나요?")}
            </h2>
            <ul className={styles.infoList}>
              <li>
                <strong>{translate("about.whoIsItFor.item1.title", "진로 고민자:")}</strong>{" "}
                {translate(
                  "about.whoIsItFor.item1.desc",
                  "자신의 적성과 재능을 파악하고, 직업 선택이나 이직 타이밍을 결정할 때 참고합니다."
                )}
              </li>
              <li>
                <strong>{translate("about.whoIsItFor.item2.title", "연애·결혼 준비자:")}</strong>{" "}
                {translate(
                  "about.whoIsItFor.item2.desc",
                  "상대방과의 궁합을 확인하고, 관계의 강점과 약점을 이해하여 더 나은 소통을 합니다."
                )}
              </li>
              <li>
                <strong>{translate("about.whoIsItFor.item3.title", "자기계발 추구자:")}</strong>{" "}
                {translate(
                  "about.whoIsItFor.item3.desc",
                  "자신의 성격, 강점, 약점을 깊이 이해하고 성장 방향을 설정합니다."
                )}
              </li>
              <li>
                <strong>{translate("about.whoIsItFor.item4.title", "운세·영성 관심자:")}</strong>{" "}
                {translate(
                  "about.whoIsItFor.item4.desc",
                  "사주, 점성술, 타로에 관심이 있지만 전문 지식이 없는 초보자부터, 더 깊은 통찰을 원하는 고급 사용자까지 모두 사용할 수 있습니다."
                )}
              </li>
              <li>
                <strong>{translate("about.whoIsItFor.item5.title", "중요한 결정을 앞둔 사람:")}</strong>{" "}
                {translate(
                  "about.whoIsItFor.item5.desc",
                  "사업 시작, 투자, 이사, 수술 등 중요한 결정을 앞두고 타이밍과 방향성을 참고합니다."
                )}
              </li>
            </ul>
          </div>

          <div className={styles.infoBlock}>
            <h2 className={styles.infoTitle}>
              {translate("about.accuracy.title", "운세는 정확한가요?")}
            </h2>
            <p className={styles.infoParagraph}>
              {translate(
                "about.accuracy.p1",
                "DestinyPal은 과학적으로 검증된 천체 계산 엔진과, 수천 년간 축적된 전통 운명학 이론을 기반으로 합니다. 그러나 운세는 '절대적 미래 예측'이 아니라 '경향성과 가능성의 제시'입니다. 사주와 점성술은 태어난 순간의 우주적 에너지 패턴을 분석하여, 개인의 성향, 재능, 인생 주기, 운명의 흐름을 이해하는 도구입니다."
              )}
            </p>
            <p className={styles.infoParagraph}>
              {translate(
                "about.accuracy.p2",
                "DestinyPal의 분석은 통계적으로 높은 정확도를 보이지만, 최종적인 선택과 책임은 항상 사용자에게 있습니다. 우리는 운세를 맹신하지 말고, 자신의 직관과 이성을 함께 사용하여 현명한 결정을 내리기를 권장합니다. DestinyPal은 당신의 '나침반'이지, '절대적 지도'가 아닙니다."
              )}
            </p>
          </div>

          <div className={styles.infoBlock}>
            <h2 className={styles.infoTitle}>
              {translate("about.pricing.title", "가격 정책")}
            </h2>
            <p className={styles.infoParagraph}>
              {translate(
                "about.pricing.p1",
                "DestinyPal은 기본적인 사주 분석, 별자리 차트, 일일 운세, 타로 리딩 등을 무료로 제공합니다. 프리미엄 멤버십을 구독하면 대운 분석, 세운 예측, 상세 궁합 리포트, 맞춤형 AI 상담, 무제한 타로 리딩, PDF 리포트 다운로드 등 고급 기능을 이용할 수 있습니다."
              )}
            </p>
            <p className={styles.infoParagraph}>
              {translate(
                "about.pricing.p2",
                "프리미엄 사용자는 우선 고객 지원을 받으며, 새로운 기능을 먼저 체험할 수 있는 베타 테스터 자격도 부여됩니다. 월간 구독과 연간 구독 중 선택할 수 있으며, 연간 구독 시 최대 30% 할인 혜택이 제공됩니다. 첫 7일간 무료 체험을 통해 프리미엄 기능을 먼저 경험해 보세요."
              )}
            </p>
          </div>

          <div className={styles.infoBlock}>
            <h2 className={styles.infoTitle}>
              {translate("about.community.title", "커뮤니티와 지원")}
            </h2>
            <p className={styles.infoParagraph}>
              {translate(
                "about.community.p1",
                "DestinyPal은 단순한 분석 도구를 넘어, 운명과 영성에 관심 있는 사람들이 모이는 커뮤니티를 만들어가고 있습니다. 블로그에서 사주, 점성술, 타로에 관한 심층 기사를 읽을 수 있으며, 포럼(준비 중)에서 다른 사용자들과 경험을 공유할 수 있습니다."
              )}
            </p>
            <p className={styles.infoParagraph}>
              {translate(
                "about.community.p2",
                "궁금한 점이나 기술적 문제가 있다면 support@destinypal.com으로 문의해 주세요. 프리미엄 사용자는 24시간 이내 우선 응답을 보장합니다. 또한 공식 SNS 채널을 통해 매일 운세 팁, 점성술 뉴스, 타로 카드 해석 등 유익한 콘텐츠를 제공합니다."
              )}
            </p>
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>
            {translate("about.ctaTitle", "Start Now")}
          </h2>
          <p className={styles.ctaSub}>
            {translate("about.ctaSub", "Explore your destiny map with AI")}
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/destiny-map" className={styles.ctaPrimary}>
              {translate("about.ctaPrimary", "Start Destiny Map")}
            </Link>
            <Link href="/" className={styles.ctaSecondary}>
              {translate("about.ctaSecondary", "Go Home")}
            </Link>
          </div>
        </section>
      </main>
      <ScrollToTop label={isKo ? "맨 위로" : "Top"} />
    </div>
  );
}
