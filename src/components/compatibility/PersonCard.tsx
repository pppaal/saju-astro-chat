import React from 'react';
import type { PersonForm, SavedPerson, Relation, CityItem } from '@/app/compatibility/lib';
import { relationIcons } from '@/app/compatibility/lib';
import { formatCityForDropdown } from '@/lib/cities/formatter';
import styles from './PersonCard.module.css';

interface PersonCardProps {
  person: PersonForm;
  index: number;
  isAuthenticated: boolean;
  circlePeople: SavedPerson[];
  showCircleDropdown: number | null;
  onToggleCircleDropdown: (idx: number | null) => void;
  onFillFromCircle: (idx: number, savedPerson: SavedPerson) => void;
  onUpdate: <K extends keyof PersonForm>(idx: number, key: K, value: PersonForm[K]) => void;
  onPickCity: (idx: number, item: CityItem) => void;
  t: (key: string, fallback?: string) => string;
}

export function PersonCard({
  person,
  index,
  isAuthenticated,
  circlePeople,
  showCircleDropdown,
  onToggleCircleDropdown,
  onFillFromCircle,
  onUpdate,
  onPickCity,
  t,
}: PersonCardProps) {
  return (
    <div className={styles.personCard} style={{ animationDelay: `${index * 0.1}s` }}>
      <div className={styles.cardGlow} />
      <div className={styles.personTitleRow}>
        <h3 className={styles.personTitle}>
          <span className={styles.personIcon}>
            {index === 0 ? '👤' : relationIcons[person.relation || 'friend']}
          </span>
          {t('compatibilityPage.person', 'Person')} {index + 1}
        </h3>
        {/* My Circle import button */}
        {isAuthenticated && circlePeople.length > 0 && (
          <div className="circleDropdownWrapper">
            <button
              type="button"
              className={styles.circleImportBtn}
              onClick={() => onToggleCircleDropdown(showCircleDropdown === index ? null : index)}
            >
              👥 {t('compatibilityPage.fromCircle', 'My Circle')}
            </button>
            {showCircleDropdown === index && (
              <ul className={styles.circleDropdown}>
                {circlePeople.map((cp) => (
                  <li
                    key={cp.id}
                    className={styles.circleDropdownItem}
                    onClick={() => onFillFromCircle(index, cp)}
                  >
                    <span className={styles.circlePersonName}>{cp.name}</span>
                    <span className={styles.circlePersonRelation}>
                      {cp.relation === 'partner'
                        ? '❤️'
                        : cp.relation === 'family'
                          ? '👨‍👩‍👧‍👦'
                          : cp.relation === 'friend'
                            ? '🤝'
                            : '💼'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className={styles.grid}>
        {/* Name */}
        <div>
          <label htmlFor={`name-${index}`} className={styles.label}>
            {t('compatibilityPage.name', 'Name')}
          </label>
          <input
            id={`name-${index}`}
            value={person.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            placeholder={t('compatibilityPage.namePlaceholder', 'Name')}
            className={styles.input}
          />
        </div>

        {/* Date & Time */}
        <div className={`${styles.grid} ${styles.gridTwo}`}>
          <div>
            <label htmlFor={`date-${index}`} className={styles.label}>
              {t('compatibilityPage.dateOfBirth', 'Date of Birth')}
            </label>
            <input
              id={`date-${index}`}
              type="date"
              value={person.date}
              onChange={(e) => onUpdate(index, 'date', e.target.value)}
              className={styles.input}
            />
          </div>
          <div>
            <label htmlFor={`time-${index}`} className={styles.label}>
              {t('compatibilityPage.timeOfBirth', 'Time of Birth')}
            </label>
            <input
              id={`time-${index}`}
              type="time"
              value={person.time}
              onChange={(e) => onUpdate(index, 'time', e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        {/* City Autocomplete */}
        <div className={styles.relative}>
          <label htmlFor={`city-${index}`} className={styles.label}>
            {t('compatibilityPage.cityOfBirth', 'City of Birth')}
          </label>
          <input
            id={`city-${index}`}
            autoComplete="off"
            value={person.cityQuery}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate(index, 'cityQuery', val);
              onUpdate(index, 'lat', null);
              onUpdate(index, 'lon', null);
            }}
            onFocus={() => {
              if (person.lat === null) onUpdate(index, 'showDropdown', true);
            }}
            onBlur={() => setTimeout(() => onUpdate(index, 'showDropdown', false), 200)}
            placeholder={t('compatibilityPage.cityPlaceholder', 'e.g., Seoul, KR')}
            className={styles.input}
          />
          {person.suggestions.length > 0 && person.showDropdown && (
            <ul className={styles.dropdown}>
              {person.suggestions.map((c, i) => (
                <li
                  key={`${c.name}-${c.country}-${i}`}
                  className={styles.dropdownItem}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPickCity(index, c);
                  }}
                >
                  {c.name}, {c.country}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Timezone (auto-set, readonly) */}
        <div>
          <label htmlFor={`tz-${index}`} className={styles.label}>
            {t('compatibilityPage.timeZone', 'Time Zone')}
          </label>
          <input
            id={`tz-${index}`}
            type="text"
            value={person.timeZone}
            readOnly
            className={`${styles.input} ${styles.inputReadonly}`}
            title={t('compatibilityPage.timezoneAutoSet', 'Automatically set based on city')}
          />
        </div>

        {/* Relation (for Person 2+) */}
        {index > 0 && (
          <div className={`${styles.grid} ${styles.gridTwo}`}>
            <div>
              <label htmlFor={`rel-${index}`} className={styles.label}>
                {t('compatibilityPage.relationToPerson1', 'Relation to Person 1')}
              </label>
              <select
                id={`rel-${index}`}
                value={person.relation ?? ''}
                onChange={(e) => onUpdate(index, 'relation', e.target.value as Relation)}
                className={styles.select}
              >
                <option value="">{t('compatibilityPage.selectRelation', 'Select relation')}</option>
                <option value="lover">{t('compatibilityPage.partnerLover', 'Partner / Lover 💕')}</option>
                <option value="friend">{t('compatibilityPage.friend', 'Friend 🤝')}</option>
                <option value="other">{t('compatibilityPage.other', 'Other ✨')}</option>
              </select>
            </div>
            <div>
              <label htmlFor={`note-${index}`} className={styles.label}>
                {t('compatibilityPage.relationNote', 'Relation Note')}
              </label>
              <input
                id={`note-${index}`}
                value={person.relationNote ?? ''}
                onChange={(e) => onUpdate(index, 'relationNote', e.target.value)}
                placeholder={t('compatibilityPage.shortNote', 'Short note')}
                className={styles.input}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
