"use client";

// src/components/calendar/BirthInfoForm.tsx
import React from 'react';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import DateTimePicker from '@/components/ui/DateTimePicker';
import TimePicker from '@/components/ui/TimePicker';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import { useCitySearch } from '@/hooks/calendar/useCitySearch';
import { useProfileLoader } from '@/hooks/calendar/useProfileLoader';
import { formatCityForDropdown } from '@/lib/cities/formatter';
import styles from './DestinyCalendar.module.css';

interface BirthInfo {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: 'Male' | 'Female';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface BirthInfoFormProps {
  birthInfo: BirthInfo;
  setBirthInfo: (info: BirthInfo) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  timeUnknown: boolean;
  setTimeUnknown: (value: boolean) => void;
}

const ICONS = {
  calendar: "📅",
} as const;

export default function BirthInfoForm({
  birthInfo,
  setBirthInfo,
  onSubmit,
  submitting,
  timeUnknown,
  setTimeUnknown,
}: BirthInfoFormProps) {
  const { locale, t } = useI18n();
  const { status } = useSession();
  const signInUrl = buildSignInUrl();

  const {
    suggestions,
    openSug,
    cityErr,
    setOpenSug,
    setSelectedCity,
    handleCitySelect,
  } = useCitySearch();

  const { loadingProfile, profileLoaded, loadProfile } = useProfileLoader();
  const { data: session } = useSession();

  const handleLoadProfile = async () => {
    if (status !== 'authenticated' || !session?.user?.id) {
      console.warn('User not authenticated or session missing');
      return;
    }

    const userId = session.user.id;
    await loadProfile(userId, (info, city) => {
      setBirthInfo(info);
      setSelectedCity(city);
    });
  };

  const onPickCity = (city: { name: string; country: string; lat: number; lon: number; timezone?: string }) => {
    handleCitySelect(city);
    setBirthInfo({
      ...birthInfo,
      birthPlace: `${city.name}, ${city.country}`,
      latitude: city.lat,
      longitude: city.lon,
      timezone: city.timezone,
    });
  };

  return (
    <div className={styles.introContainer}>
      <BackButton />

      <main className={styles.introMain}>
        <div className={styles.pageHeader}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>{ICONS.calendar}</span>
          </div>
          <h1 className={styles.pageTitle}>
            {t('calendar.pageTitle', 'Destiny Calendar')}
          </h1>
          <p className={styles.pageSubtitle}>
            {t('calendar.pageSubtitle', 'Cross-analyze Eastern and Western fortune to find your important dates')}
          </p>
        </div>

        <div className={styles.birthFormCard}>
          <div className={styles.formHeader}>
            <span className={styles.formIcon}>🎂</span>
            <h3 className={styles.formTitle}>
              {t('calendar.formTitle', 'Enter Your Birth Info')}
            </h3>
            <p className={styles.formSubtitle}>
              {t('calendar.formSubtitle', 'Required for accurate analysis')}
            </p>
          </div>

          {/* Load Profile Button */}
          {status === 'authenticated' && !profileLoaded && (
            <button
              type="button"
              className={styles.loadProfileButton}
              onClick={handleLoadProfile}
              disabled={loadingProfile}
            >
              <span className={styles.loadProfileIcon}>
                {loadingProfile ? '⏳' : '👤'}
              </span>
              <span className={styles.loadProfileText}>
                {loadingProfile
                  ? t('calendar.loadingProfile', 'Loading...')
                  : t('calendar.loadMyProfile', 'Load My Profile')}
              </span>
              <span className={styles.loadProfileArrow}>→</span>
            </button>
          )}

          {/* Profile loaded success message */}
          {status === 'authenticated' && profileLoaded && (
            <div className={styles.profileLoadedMessage}>
              <span className={styles.profileLoadedIcon}>✓</span>
              <span className={styles.profileLoadedText}>
                {t('calendar.profileLoaded', 'Profile loaded!')}
              </span>
            </div>
          )}

          <form onSubmit={onSubmit} className={styles.form}>
            {/* Birth Date */}
            <div className={styles.fieldGroup}>
              <DateTimePicker
                value={birthInfo.birthDate}
                onChange={(date) => setBirthInfo({ ...birthInfo, birthDate: date })}
                label={locale === "ko" ? "생년월일" : "Birth Date"}
                required
                locale={locale}
              />
            </div>

            {/* Birth Time */}
            <div className={styles.fieldGroup}>
              <TimePicker
                value={birthInfo.birthTime}
                onChange={(time) => setBirthInfo({ ...birthInfo, birthTime: time })}
                label={locale === "ko" ? "출생 시간" : "Birth Time"}
                required={!timeUnknown}
                disabled={timeUnknown}
                locale={locale}
              />
              <div className={styles.checkboxWrapper}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="time-unknown-checkbox"
                    checked={timeUnknown}
                    onChange={(e) => {
                      setTimeUnknown(e.target.checked);
                      if (e.target.checked) {
                        setBirthInfo({ ...birthInfo, birthTime: "" });
                      }
                    }}
                    className={styles.checkbox}
                    aria-describedby="time-unknown-help"
                  />
                  <span id="time-unknown-help">
                    {locale === "ko"
                      ? "출생 시간을 모름 (정오 12:00으로 설정됩니다)"
                      : "Time unknown (will use 12:00 noon)"}
                  </span>
                </label>
              </div>
            </div>

            {/* Birth City */}
            <div className={styles.fieldGroup} style={{ position: 'relative' }}>
              <label className={styles.label} htmlFor="birth-city-input">
                {locale === "ko" ? "출생 도시" : "Birth City"}
                <span className={styles.required} aria-label="required">*</span>
              </label>
              <input
                id="birth-city-input"
                className={styles.input}
                placeholder={locale === "ko" ? "도시를 입력하세요" : "Enter your city"}
                value={birthInfo.birthPlace}
                onChange={(e) => {
                  setBirthInfo({ ...birthInfo, birthPlace: e.target.value });
                  setOpenSug(true);
                }}
                onBlur={() => {
                  setTimeout(() => setOpenSug(false), 150);
                }}
                autoComplete="address-level2"
                inputMode="text"
                required
                autoFocus
                aria-required="true"
                aria-invalid={cityErr ? "true" : "false"}
                aria-describedby={cityErr ? "city-error" : "city-help"}
                role="combobox"
                aria-expanded={openSug && suggestions.length > 0}
                aria-controls="city-suggestions"
                aria-autocomplete="list"
              />
              {!cityErr && (
                <span id="city-help" className={styles.helpText}>
                  {locale === "ko" ? "도시명을 2글자 이상 입력하세요" : "Enter at least 2 characters"}
                </span>
              )}
              {openSug && suggestions.length > 0 && (
                <ul id="city-suggestions" role="listbox" className={styles.dropdown}>
                  {suggestions.map((s, idx) => {
                    const formattedCity = formatCityForDropdown(s.name, s.country, locale);
                    return (
                      <li
                        key={`${s.name}-${s.country}-${idx}`}
                        role="option"
                        className={styles.dropdownItem}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onPickCity(s);
                        }}
                      >
                        {formattedCity}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Gender */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} id="gender-label">
                {locale === "ko" ? "성별" : "Gender"}
                <span className={styles.required} aria-label="required">*</span>
              </label>
              <div className={styles.genderButtons} role="group" aria-labelledby="gender-label" aria-required="true">
                <button
                  type="button"
                  className={`${styles.genderBtn} ${birthInfo.gender === 'Male' ? styles.active : ''}`}
                  onClick={() => setBirthInfo({ ...birthInfo, gender: 'Male' })}
                  aria-pressed={birthInfo.gender === 'Male'}
                  aria-label={locale === "ko" ? "남성" : "Male"}
                >
                  <span aria-hidden="true">👨</span>
                  <span>{locale === "ko" ? "남성" : "Male"}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.genderBtn} ${birthInfo.gender === 'Female' ? styles.active : ''}`}
                  onClick={() => setBirthInfo({ ...birthInfo, gender: 'Female' })}
                  aria-pressed={birthInfo.gender === 'Female'}
                  aria-label={locale === "ko" ? "여성" : "Female"}
                >
                  <span aria-hidden="true">👩</span>
                  <span>{locale === "ko" ? "여성" : "Female"}</span>
                </button>
              </div>
            </div>

            {cityErr && <div id="city-error" className={styles.error} role="alert">{cityErr}</div>}

            {/* Submit Button */}
            <div className={styles.submitWrapper}>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || !birthInfo.birthDate || (!birthInfo.birthTime && !timeUnknown) || !birthInfo.birthPlace}
                aria-label={
                  submitting
                    ? t('calendar.analyzingButton', 'Analyzing...')
                    : t('calendar.analyzeButton', 'View Destiny Calendar')
                }
              >
                {submitting ? (
                  <>
                    <div className={styles.buttonSpinner} />
                    <span>{t('calendar.analyzingButton', 'Analyzing...')}</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">✨</span>
                    <span>{t('calendar.analyzeButton', 'View Destiny Calendar')}</span>
                  </>
                )}
              </button>
              {!submitting && (!birthInfo.birthDate || (!birthInfo.birthTime && !timeUnknown) || !birthInfo.birthPlace) && (
                <p className={styles.submitHint} role="status">
                  {locale === "ko"
                    ? "* 필수 항목을 모두 입력해주세요"
                    : "* Please fill in all required fields"}
                </p>
              )}
            </div>
          </form>

          {status === 'unauthenticated' && (
            <div className={styles.loginHint}>
              <p>
                {locale === "ko"
                  ? "로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요"
                  : "Log in to save your info for a better experience"}
              </p>
              <a href={signInUrl} className={styles.loginLink}>
                {locale === "ko" ? "로그인하기" : "Log in"}
              </a>
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className={styles.quickTips}>
          <h4>{locale === "ko" ? "💡 이런 분들께 추천해요" : "💡 Recommended for"}</h4>
          <ul>
            <li>{locale === "ko" ? "중요한 일정을 잡아야 할 때" : "Planning important events"}</li>
            <li>{locale === "ko" ? "좋은 날과 조심할 날을 알고 싶을 때" : "Know your best and caution days"}</li>
            <li>{locale === "ko" ? "사주와 점성술을 함께 참고하고 싶을 때" : "Want both Saju and Astrology insights"}</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
