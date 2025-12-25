'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import styles from './ICP.module.css';

export default function ICPHomePage() {
  const { locale } = useI18n();
  const router = useRouter();
  const isKo = locale === 'ko';

  const handleStart = () => {
    router.push('/icp/quiz');
  };

  return (
    <main className={styles.page}>
      {/* Back Button */}
      <div className={styles.backButton}>
        <BackButton />
      </div>

      {/* Animated Stars Background */}
      <div className={styles.stars}>
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              animationDelay: `${(i * 0.08) % 4}s`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
            }}
          />
        ))}
      </div>

      {/* Hero Card */}
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <div className={styles.header}>
          <div className={styles.icon}>🎭</div>
          <h1 className={styles.title}>
            {isKo ? '대인관계 스타일 진단' : 'Interpersonal Style Assessment'}
          </h1>
          <p className={styles.subtitle}>
            {isKo
              ? 'ICP(Interpersonal Circumplex) 기반의 과학적 대인관계 스타일 분석'
              : 'Discover your interpersonal style based on the Interpersonal Circumplex model'}
          </p>
        </div>

        {/* Test Info */}
        <div className={styles.testInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>📝</span>
            <span className={styles.infoText}>
              {isKo ? '32문항' : '32 Questions'}
            </span>
          </div>
          <div className={styles.infoDivider} />
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>⏱️</span>
            <span className={styles.infoText}>
              {isKo ? '약 5분' : '~5 Minutes'}
            </span>
          </div>
        </div>

        {/* Features */}
        <div className={styles.features}>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>↕️</span>
            <div>
              <h3>{isKo ? '지배-복종 축' : 'Dominance Axis'}</h3>
              <p>{isKo ? '관계에서 주도적인지 수용적인지' : 'How assertive or accommodating you are'}</p>
            </div>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>↔️</span>
            <div>
              <h3>{isKo ? '친밀-적대 축' : 'Affiliation Axis'}</h3>
              <p>{isKo ? '타인에게 따뜻한지 거리를 두는지' : 'How warm or reserved you are with others'}</p>
            </div>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🎯</span>
            <div>
              <h3>{isKo ? '8가지 스타일' : '8 Unique Styles'}</h3>
              <p>{isKo ? '당신만의 대인관계 패턴 발견' : 'Discover your unique interpersonal pattern'}</p>
            </div>
          </div>
        </div>

        {/* Octant Preview */}
        <div className={styles.octantPreview}>
          <h4>{isKo ? '8가지 대인관계 스타일' : 'The 8 Interpersonal Styles'}</h4>
          <div className={styles.octantGrid}>
            <span className={styles.octantTag}>PA {isKo ? '지배적' : 'Dominant'}</span>
            <span className={styles.octantTag}>BC {isKo ? '경쟁적' : 'Competitive'}</span>
            <span className={styles.octantTag}>DE {isKo ? '냉담형' : 'Cold'}</span>
            <span className={styles.octantTag}>FG {isKo ? '내향형' : 'Introverted'}</span>
            <span className={styles.octantTag}>HI {isKo ? '수용형' : 'Submissive'}</span>
            <span className={styles.octantTag}>JK {isKo ? '협력형' : 'Cooperative'}</span>
            <span className={styles.octantTag}>LM {isKo ? '친화형' : 'Friendly'}</span>
            <span className={styles.octantTag}>NO {isKo ? '양육형' : 'Nurturant'}</span>
          </div>
        </div>

        {/* CTA Button */}
        <button onClick={handleStart} className={styles.submitButton}>
          {isKo ? '무료 진단 시작하기' : 'Start Free Assessment'}
        </button>

        <p className={styles.disclaimer}>
          {isKo
            ? '* 이 검사는 심리학의 ICP 모델에 기반한 자기보고식 검사입니다.'
            : '* This is a self-report assessment based on the psychological ICP model.'}
        </p>
      </div>
    </main>
  );
}
