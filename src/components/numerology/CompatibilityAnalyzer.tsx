// components/numerology/CompatibilityAnalyzer.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './CompatibilityAnalyzer.module.css';
import { logger } from '@/lib/logger';

import type { Person, RelationshipType } from './compatibility/types';
import { useCompatibilityAnalysis } from './compatibility/useCompatibilityAnalysis';
import {
  PersonInputSection,
  RelationshipSelector,
  LoadingSkeleton,
  ResultsDisplay,
} from './compatibility/components';

export default function CompatibilityAnalyzer() {
  const { t, locale } = useI18n();
  const { status } = useSession();
  const [person1, setPerson1] = useState<Person>({ birthDate: '', birthTime: '12:00', name: '', gender: undefined });
  const [person2, setPerson2] = useState<Person>({ birthDate: '', birthTime: '12:00', name: '', gender: undefined });
  const [loadingProfile, setLoadingProfile] = useState(false);

  const handleLoadMyProfile = async () => {
    if (status !== 'authenticated') return;
    setLoadingProfile(true);
    try {
      const res = await fetch('/api/me/profile', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load profile');
      const { user } = await res.json();
      setPerson1({
        ...person1,
        birthDate: user?.birthDate || '',
        birthTime: user?.birthTime || '12:00',
        name: user?.name || '',
        gender: user?.gender === 'M' ? 'male' : user?.gender === 'F' ? 'female' : undefined,
      });
    } catch (err) {
      logger.error('[CompatibilityAnalyzer] Failed to load profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('lover');

  const relationshipOptions: { value: RelationshipType; label: string }[] = [
    { value: 'lover', label: t('numerology.compatibility.relationLover', 'Romantic Partner') },
    { value: 'spouse', label: t('numerology.compatibility.relationSpouse', 'Spouse') },
    { value: 'friend', label: t('numerology.compatibility.relationFriend', 'Friend') },
    { value: 'business', label: t('numerology.compatibility.relationBusiness', 'Business Partner') },
    { value: 'family', label: t('numerology.compatibility.relationFamily', 'Family') },
  ];

  const { result, isLoading, error, showAdvanced, setShowAdvanced, handleSubmit } = useCompatibilityAnalysis({
    person1,
    person2,
    relationshipType,
    locale,
    t,
  });

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Person 1 - Me */}
        <PersonInputSection
          person={person1}
          onChange={setPerson1}
          title={locale === 'ko' ? '나 (내 정보)' : 'Me (My Info)'}
          locale={locale}
          t={t}
          namePlaceholder={locale === 'ko' ? '홍길동' : 'John Smith'}
          headerExtra={status === 'authenticated' ? (
            <motion.button
              type="button"
              className={styles.loadProfileBtn}
              onClick={handleLoadMyProfile}
              disabled={loadingProfile}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loadingProfile
                ? (locale === 'ko' ? '불러오는 중...' : 'Loading...')
                : (locale === 'ko' ? '👤 내 프로필 불러오기' : '👤 Load My Profile')}
            </motion.button>
          ) : undefined}
        />

        {/* Heart Divider */}
        <div className={styles.divider}>
          <span className={styles.heartIcon}>💕</span>
        </div>

        {/* Person 2 - Partner */}
        <PersonInputSection
          person={person2}
          onChange={setPerson2}
          title={locale === 'ko' ? '상대방' : 'Partner'}
          locale={locale}
          t={t}
          namePlaceholder={locale === 'ko' ? '홍길순' : 'Jane Doe'}
        />

        {/* Relationship Type */}
        <RelationshipSelector
          value={relationshipType}
          onChange={setRelationshipType}
          options={relationshipOptions}
          label={t('numerology.compatibility.relationshipType', 'Relationship Type')}
        />

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <motion.button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <span className={styles.loading}>{t('common.loading', 'Loading...')}</span>
          ) : (
            t('numerology.compatibility.analyzeButton', 'Analyze Compatibility')
          )}
        </motion.button>
      </form>

      {/* Loading Skeleton */}
      {isLoading && <LoadingSkeleton />}

      {/* Results */}
      {result && !isLoading && (
        <ResultsDisplay
          result={result}
          person1={person1}
          person2={person2}
          relationshipType={relationshipType}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}
