'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';

export default function DestinyMapPage() {
  const router = useRouter();
  const { t, locale, dir } = useI18n();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [city, setCity] = useState('Seoul');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      name,
      birthDate,
      birthTime,
      city,
      gender,
      lang: locale, // 현재 언어를 결과 페이지로 전달
    });
    router.push(`/destiny-map/result?${params.toString()}`);
  };

  return (
    <div className="wrapper" dir={dir}>
      <main className="page" style={{ position: 'relative' }}>
        <button
          onClick={() => router.back()}
          className="back-btn"
          style={{ position: 'absolute', top: 24, left: 24, zIndex: 20 }}
          aria-label={t('app.back')}
          type="button"
        >
          ←
        </button>

        <section className="card">
          <h1 className="title">{t('menu.destinyMap')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>

          <form onSubmit={onSubmit} className="form">
            <div className="field">
              <label className="label">{t('app.name') || t('menu.personality') /* 안전 fallback */}</label>
              <input
                className="input"
                placeholder={t('app.namePh') || t('app.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid2">
              <div className="field">
                <label className="label">{t('app.birthDate')}</label>
                <input
                  className="input"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="label">{t('app.birthTime')}</label>
                <input
                  className="input"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid2">
              <div className="field">
                <label className="label">{t('app.birthCity') || t('menu.astrology')}</label>
                <input
                  className="input"
                  placeholder={t('app.cityPh') || 'Seoul'}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="label">{t('app.gender') || 'Gender'}</label>
                <select
                  className="input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                >
                  <option value="Male">{t('app.male') || 'Male'}</option>
                  <option value="Female">{t('app.female') || 'Female'}</option>
                  <option value="Other">{t('app.other') || 'Other'}</option>
                  <option value="Prefer not to say">{t('app.preferNot') || 'Prefer not to say'}</option>
                </select>
              </div>
            </div>

            <button className="primary" type="submit">
              {t('app.subtitle') && t('app.analyze') ? t('app.analyze') : 'Analyze'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}