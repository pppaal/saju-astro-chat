import React from 'react';
import { type Relation } from '../../lib';
import { PersonCardHeader } from './PersonCardHeader';
import { CircleDropdown } from './CircleDropdown';
import { CityAutocompleteField } from './CityAutocompleteField';
import DateTimePicker from '@/components/ui/DateTimePicker';
import TimePicker from '@/components/ui/TimePicker';
import type { CirclePerson } from '@/hooks/useMyCircle';
import type { CityResult } from '@/lib/cities/types';
import styles from '../../Compatibility.module.css';

interface PersonData {
  name: string;
  date: string;
  time: string;
  cityQuery: string;
  timeZone: string;
  lat: number | null;
  lon: number | null;
  relation?: Relation;
  relationNote?: string;
  suggestions: CityResult[];
  showDropdown: boolean;
}

interface PersonCardProps {
  person: PersonData;
  index: number;
  isAuthenticated: boolean;
  circlePeople: CirclePerson[];
  showCircleDropdown: boolean;
  locale: string;
  t: (key: string, fallback: string) => string;
  onUpdatePerson: (idx: number, field: string, value: any) => void;
  onSetPersons: React.Dispatch<React.SetStateAction<PersonData[]>>;
  onPickCity: (idx: number, city: CityResult) => void;
  onToggleCircleDropdown: () => void;
  onFillFromCircle: (idx: number, person: CirclePerson) => void;
}

export const PersonCard: React.FC<PersonCardProps> = React.memo(({
  person,
  index,
  isAuthenticated,
  circlePeople,
  showCircleDropdown,
  locale,
  t,
  onUpdatePerson,
  onSetPersons,
  onPickCity,
  onToggleCircleDropdown,
  onFillFromCircle,
}) => {
  const idx = index;
  return (
    <div className={styles.personCard} style={{ animationDelay: `${idx * 0.1}s` }}>
      <div className={styles.cardGlow} />
      <PersonCardHeader index={idx} relation={person.relation} t={t}
        circleImportButton={isAuthenticated && circlePeople.length > 0 ? (
          <CircleDropdown circlePeople={circlePeople} isOpen={showCircleDropdown} onToggle={onToggleCircleDropdown} onSelect={(cp) => onFillFromCircle(idx, cp)} t={t} />
        ) : undefined}
      />
      <div className={styles.grid}>
        <div>
          <label htmlFor={`name-${idx}`} className={styles.label}>{t('compatibilityPage.name', 'Name')}</label>
          <input id={`name-${idx}`} value={person.name} onChange={(e) => onUpdatePerson(idx, 'name', e.target.value)} placeholder={t('compatibilityPage.namePlaceholder', 'Name')} className={styles.input} />
        </div>
        <div>
          <DateTimePicker
            value={person.date}
            onChange={(date) => onUpdatePerson(idx, 'date', date)}
            label={t('compatibilityPage.dateOfBirth', 'Date of Birth')}
            required
            locale={locale}
          />
        </div>
        <div>
          <TimePicker
            value={person.time}
            onChange={(time) => onUpdatePerson(idx, 'time', time)}
            label={t('compatibilityPage.timeOfBirth', 'Time of Birth')}
            locale={locale}
          />
        </div>
        <CityAutocompleteField id={`city-${idx}`} value={person.cityQuery} suggestions={person.suggestions} showDropdown={person.showDropdown} locale={locale}
          onChange={(val) => { onSetPersons((prev) => { const next = [...prev]; next[idx] = { ...next[idx], cityQuery: val, lat: null, lon: null }; return next; }); }}
          onFocus={() => { if (person.lat === null) onUpdatePerson(idx, 'showDropdown', true); }}
          onBlur={() => setTimeout(() => onUpdatePerson(idx, 'showDropdown', false), 200)}
          onSelect={(city) => onPickCity(idx, city)} t={t}
        />
        <div>
          <label htmlFor={`tz-${idx}`} className={styles.label}>{t('compatibilityPage.timeZone', 'Time Zone')}</label>
          <input id={`tz-${idx}`} type='text' value={person.timeZone} readOnly className={`${styles.input} ${styles.inputReadonly}`} title={t('compatibilityPage.timezoneAutoSet', 'Automatically set based on city')} />
        </div>
        {idx > 0 && (
          <div className={`${styles.grid} ${styles.gridTwo}`}>
            <div>
              <label htmlFor={`rel-${idx}`} className={styles.label}>{t('compatibilityPage.relationToPerson1', 'Relation to Person 1')}</label>
              <select id={`rel-${idx}`} value={person.relation ?? ''} onChange={(e) => onUpdatePerson(idx, 'relation', e.target.value as Relation)} className={styles.select}>
                <option value=''>{t('compatibilityPage.selectRelation', 'Select relation')}</option>
                <option value='lover'>{t('compatibilityPage.partnerLover', 'Partner / Lover ??')}</option>
                <option value='friend'>{t('compatibilityPage.friend', 'Friend ??')}</option>
                <option value='other'>{t('compatibilityPage.other', 'Other ?')}</option>
              </select>
            </div>
            <div>
              <label htmlFor={`note-${idx}`} className={styles.label}>{t('compatibilityPage.relationNote', 'Relation Note')}</label>
              <input id={`note-${idx}`} value={person.relationNote ?? ''} onChange={(e) => onUpdatePerson(idx, 'relationNote', e.target.value)} placeholder={t('compatibilityPage.shortNote', 'Short note')} className={styles.input} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

PersonCard.displayName = 'PersonCard';
