'use client';

import React from 'react';
import styles from './DateTimePicker.module.css';

interface DateTimePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  locale?: string;
  maxDate?: string; // YYYY-MM-DD format
  minDate?: string; // YYYY-MM-DD format
}

export default function DateTimePicker({
  value,
  onChange,
  label,
  required = false,
  locale = 'ko',
  maxDate = new Date().toISOString().split('T')[0],
  minDate = '1900-01-01',
}: DateTimePickerProps) {
  // Parse current value
  const [year, month, day] = value ? value.split('-').map(Number) : [0, 0, 0];

  // Generate year options (1900 to current year)
  const currentYear = new Date().getFullYear();
  const minYear = parseInt(minDate.split('-')[0]);
  const maxYear = parseInt(maxDate.split('-')[0]);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  // Generate month options (1-12)
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate day options (1-31, adjusted for selected month/year)
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m, 0).getDate();
  };
  const daysInMonth = year && month ? getDaysInMonth(year, month) : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    if (!newYear) {
      onChange('');
      return;
    }
    const currentMonth = month || 1;
    const currentDay = day || 1;
    // Adjust day if it exceeds the days in the new month
    const maxDays = getDaysInMonth(newYear, currentMonth);
    const adjustedDay = Math.min(currentDay, maxDays);
    const newDate = `${newYear}-${String(currentMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
    onChange(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    if (!newMonth) {
      onChange('');
      return;
    }
    const selectedYear = year || currentYear;
    const currentDay = day || 1;
    // Adjust day if it exceeds the days in the new month
    const maxDays = getDaysInMonth(selectedYear, newMonth);
    const adjustedDay = Math.min(currentDay, maxDays);
    const newDate = `${selectedYear}-${String(newMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
    onChange(newDate);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = parseInt(e.target.value);
    if (!newDay) {
      onChange('');
      return;
    }
    const selectedYear = year || currentYear;
    const selectedMonth = month || 1;
    const newDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
    onChange(newDate);
  };

  const monthNames = locale === 'ko'
    ? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
          value={year || ''}
          onChange={handleYearChange}
          className={styles.select}
          required={required}
          aria-label={locale === 'ko' ? '출생 연도' : 'Birth year'}
        >
          <option value="">{locale === 'ko' ? '년도' : 'Year'}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}{locale === 'ko' ? '년' : ''}
            </option>
          ))}
        </select>
        <select
          value={month || ''}
          onChange={handleMonthChange}
          className={styles.select}
          required={required}
          aria-label={locale === 'ko' ? '출생 월' : 'Birth month'}
        >
          <option value="">{locale === 'ko' ? '월' : 'Month'}</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthNames[m - 1]}
            </option>
          ))}
        </select>
        <select
          value={day || ''}
          onChange={handleDayChange}
          className={styles.select}
          required={required}
          aria-label={locale === 'ko' ? '출생 일' : 'Birth day'}
        >
          <option value="">{locale === 'ko' ? '일' : 'Day'}</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}{locale === 'ko' ? '일' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
