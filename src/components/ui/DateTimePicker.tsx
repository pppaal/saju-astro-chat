'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  // Parse external value into individual parts
  const parseValue = (v: string): [number, number, number] => {
    if (!v) return [0, 0, 0];
    const parts = v.split('-').map(Number);
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  };

  const [parsed] = useState(() => parseValue(value));
  const [selectedYear, setSelectedYear] = useState(parsed[0]);
  const [selectedMonth, setSelectedMonth] = useState(parsed[1]);
  const [selectedDay, setSelectedDay] = useState(parsed[2]);

  // Track whether internal state was updated from props to avoid infinite loops
  const updatingFromProps = useRef(false);

  // Sync internal state when external value changes (e.g. profile load)
  useEffect(() => {
    const [y, m, d] = parseValue(value);
    if (y !== selectedYear || m !== selectedMonth || d !== selectedDay) {
      updatingFromProps.current = true;
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedDay(d);
    }
    // Only react to external value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Emit full date only when all three fields are selected
  useEffect(() => {
    if (updatingFromProps.current) {
      updatingFromProps.current = false;
      return;
    }

    if (selectedYear && selectedMonth && selectedDay) {
      const newDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      if (newDate !== value) {
        onChange(newDate);
      }
    } else if (!selectedYear && !selectedMonth && !selectedDay && value) {
      // All cleared — reset
      onChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, selectedDay]);

  // Generate year options (1900 to current year)
  const minYear = parseInt(minDate.split('-')[0]);
  const maxYear = parseInt(maxDate.split('-')[0]);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  // Generate month options (1-12)
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate day options (1-31, adjusted for selected month/year)
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m, 0).getDate();
  };
  const daysInMonth = selectedYear && selectedMonth ? getDaysInMonth(selectedYear, selectedMonth) : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value) || 0;
    setSelectedYear(newYear);
    // Adjust day if it exceeds days in the selected month
    if (newYear && selectedMonth && selectedDay) {
      const maxDays = getDaysInMonth(newYear, selectedMonth);
      if (selectedDay > maxDays) {
        setSelectedDay(maxDays);
      }
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value) || 0;
    setSelectedMonth(newMonth);
    // Adjust day if it exceeds days in the new month
    if (selectedYear && newMonth && selectedDay) {
      const maxDays = getDaysInMonth(selectedYear, newMonth);
      if (selectedDay > maxDays) {
        setSelectedDay(maxDays);
      }
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = parseInt(e.target.value) || 0;
    setSelectedDay(newDay);
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
          value={selectedYear || ''}
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
          value={selectedMonth || ''}
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
          value={selectedDay || ''}
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
