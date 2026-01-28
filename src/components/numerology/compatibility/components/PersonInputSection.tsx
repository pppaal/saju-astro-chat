"use client";

import DateTimePicker from '@/components/ui/DateTimePicker';
import TimePicker from '@/components/ui/TimePicker';
import type { Person } from '../types';
import styles from '../../CompatibilityAnalyzer.module.css';

interface PersonInputSectionProps {
  person: Person;
  onChange: (person: Person) => void;
  title: string;
  locale: string;
  t: (key: string, fallback: string) => string;
  namePlaceholder: string;
}

export default function PersonInputSection({
  person,
  onChange,
  title,
  locale,
  t,
  namePlaceholder,
}: PersonInputSectionProps) {
  const apiLocale = locale === 'ko' ? 'ko' : 'en';

  return (
    <div className={styles.personSection}>
      <h3 className={styles.personTitle}>{title}</h3>
      <div className={styles.inputGroup}>
        <DateTimePicker
          value={person.birthDate}
          onChange={(date) => onChange({ ...person, birthDate: date })}
          label={t('numerology.birthdateLabel', 'Birthdate')}
          required
          locale={apiLocale}
        />
      </div>
      <div className={styles.inputGroup}>
        <TimePicker
          value={person.birthTime}
          onChange={(time) => onChange({ ...person, birthTime: time })}
          label={t('numerology.birthtimeLabel', 'Birth Time (Optional)')}
          locale={apiLocale}
        />
      </div>
      <div className={styles.inputGroup}>
        <label className={styles.label}>{t('numerology.compatibility.nameOptional', 'Name (Optional)')}</label>
        <input
          type="text"
          value={person.name}
          onChange={(e) => onChange({ ...person, name: e.target.value })}
          placeholder={namePlaceholder}
          className={styles.input}
        />
      </div>
    </div>
  );
}
