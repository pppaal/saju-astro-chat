'use client';

import React from 'react';
import styles from './TimePicker.module.css';

interface TimePickerProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  locale?: string;
}

export default function TimePicker({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  locale = 'ko',
}: TimePickerProps) {
  // Parse current value - handle empty string
  const parseTime = (timeStr: string): [number | null, number | null] => {
    if (!timeStr || !timeStr.includes(':')) {return [null, null];}
    const parts = timeStr.split(':').map(Number);
    if (parts.some(isNaN)) {return [null, null];}
    return [parts[0], parts[1]];
  };

  const [hour, minute] = parseTime(value);
  const isPM = hour !== null && hour >= 12;
  const displayHour = hour === null ? null : (hour === 0 ? 12 : hour > 12 ? hour - 12 : hour);

  // Generate options
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHourStr = e.target.value;
    if (!newHourStr) {
      onChange('');
      return;
    }
    const newHour = parseInt(newHourStr);
    const actualHour = isPM ? (newHour === 12 ? 12 : newHour + 12) : (newHour === 12 ? 0 : newHour);
    const newTime = `${String(actualHour).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}`;
    onChange(newTime);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinuteStr = e.target.value;
    if (newMinuteStr === '') {
      onChange('');
      return;
    }
    const newMinute = parseInt(newMinuteStr);
    const currentHour = hour !== null ? hour : 0;
    const newTime = `${String(currentHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
    onChange(newTime);
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriod = e.target.value;
    const isNewPM = newPeriod === 'PM';
    if (hour === null) {return;} // No hour selected yet

    let newHour = hour;

    if (isNewPM && !isPM) {
      // AM to PM
      newHour = hour === 0 ? 12 : (hour < 12 ? hour + 12 : hour);
    } else if (!isNewPM && isPM) {
      // PM to AM
      newHour = hour === 12 ? 0 : (hour > 12 ? hour - 12 : hour);
    }

    const newTime = `${String(newHour).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}`;
    onChange(newTime);
  };

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.selectGrid}>
        <select
          value={displayHour !== null ? displayHour : ''}
          onChange={handleHourChange}
          className={styles.select}
          required={required}
          disabled={disabled}
        >
          <option value="">{locale === 'ko' ? '시' : 'Hour'}</option>
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          value={minute !== null ? minute : ''}
          onChange={handleMinuteChange}
          className={styles.select}
          required={required}
          disabled={disabled}
        >
          <option value="">{locale === 'ko' ? '분' : 'Min'}</option>
          {minutes.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, '0')}
            </option>
          ))}
        </select>
        <select
          value={isPM ? 'PM' : 'AM'}
          onChange={handlePeriodChange}
          className={styles.select}
          required={required}
          disabled={disabled}
        >
          <option value="AM">{locale === 'ko' ? '오전' : 'AM'}</option>
          <option value="PM">{locale === 'ko' ? '오후' : 'PM'}</option>
        </select>
      </div>
    </div>
  );
}
