'use client';

import React, { useState } from 'react';
import styles from './BirthInfoForm.module.css';

interface BirthInfo {
  birthDate: string;
  birthTime: string;
  gender: 'M' | 'F';
}

interface BirthInfoFormProps {
  onSubmit: (birthInfo: BirthInfo) => void;
  locale?: 'ko' | 'en';
}

export function BirthInfoForm({ onSubmit, locale = 'ko' }: BirthInfoFormProps) {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('12:00');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [showTimeInput, setShowTimeInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) return;

    onSubmit({
      birthDate,
      birthTime: showTimeInput ? birthTime : '12:00',
      gender,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>🎂</span>
        <h3 className={styles.title}>
          {locale === 'ko' ? '생년월일을 입력해주세요' : 'Enter Your Birth Info'}
        </h3>
        <p className={styles.subtitle}>
          {locale === 'ko'
            ? '정확한 예측을 위해 필요한 정보입니다'
            : 'Required for accurate predictions'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Birth Date */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {locale === 'ko' ? '생년월일' : 'Birth Date'}
            <span className={styles.required}>*</span>
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className={styles.input}
            required
            max={new Date().toISOString().split('T')[0]}
            min="1900-01-01"
          />
        </div>

        {/* Gender */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {locale === 'ko' ? '성별' : 'Gender'}
            <span className={styles.required}>*</span>
          </label>
          <div className={styles.genderButtons}>
            <button
              type="button"
              className={`${styles.genderBtn} ${gender === 'M' ? styles.active : ''}`}
              onClick={() => setGender('M')}
            >
              <span>👨</span>
              <span>{locale === 'ko' ? '남성' : 'Male'}</span>
            </button>
            <button
              type="button"
              className={`${styles.genderBtn} ${gender === 'F' ? styles.active : ''}`}
              onClick={() => setGender('F')}
            >
              <span>👩</span>
              <span>{locale === 'ko' ? '여성' : 'Female'}</span>
            </button>
          </div>
        </div>

        {/* Birth Time Toggle */}
        <div className={styles.fieldGroup}>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowTimeInput(!showTimeInput)}
          >
            <span className={styles.toggleIcon}>{showTimeInput ? '▼' : '▶'}</span>
            <span>
              {locale === 'ko' ? '태어난 시간 입력 (선택)' : 'Birth Time (Optional)'}
            </span>
          </button>

          {showTimeInput && (
            <div className={styles.timeInputWrapper}>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className={styles.input}
              />
              <p className={styles.timeHint}>
                {locale === 'ko'
                  ? '모르시면 12:00(정오)로 자동 설정됩니다'
                  : 'Defaults to 12:00 PM if unknown'}
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!birthDate}
        >
          <span>✨</span>
          <span>{locale === 'ko' ? '시작하기' : 'Get Started'}</span>
        </button>
      </form>

      <p className={styles.privacyNote}>
        🔒 {locale === 'ko'
          ? '입력하신 정보는 예측 분석에만 사용되며 저장되지 않습니다'
          : 'Your information is only used for analysis and is not stored'}
      </p>
    </div>
  );
}

export default BirthInfoForm;
