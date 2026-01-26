import React, { useState, useEffect } from 'react';
import styles from './FormField.module.css';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'date' | 'time';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  validate?: (value: string) => string | null; // Returns error message or null
  helpText?: string;
  icon?: React.ReactNode;
  autoComplete?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  validate,
  helpText,
  icon,
  autoComplete,
  className = '',
}) => {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Real-time validation on value change
  useEffect(() => {
    if (!touched) {return;}

    if (validate) {
      const errorMessage = validate(value);
      setError(errorMessage);
      setIsValid(!errorMessage && value.length > 0);
    } else if (required) {
      setError(value.length === 0 ? 'This field is required' : null);
      setIsValid(value.length > 0);
    } else {
      setIsValid(value.length > 0);
    }
  }, [value, touched, validate, required]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    if (onBlur) {onBlur(e);}
  };

  const fieldClassName = `
    ${styles.field}
    ${error && touched ? styles.fieldError : ''}
    ${isValid && touched ? styles.fieldValid : ''}
    ${className}
  `.trim();

  return (
    <div className={styles.formField}>
      <label htmlFor={name} className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>

      <div className={styles.inputWrapper}>
        {icon && <div className={styles.icon}>{icon}</div>}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={fieldClassName}
          aria-invalid={error && touched ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
        />
        {touched && isValid && (
          <div className={styles.validIcon} aria-label="Valid">
            ✓
          </div>
        )}
        {touched && error && (
          <div className={styles.errorIcon} aria-label="Error">
            !
          </div>
        )}
      </div>

      {helpText && !error && (
        <p id={`${name}-help`} className={styles.helpText}>
          {helpText}
        </p>
      )}

      {touched && error && (
        <p id={`${name}-error`} className={styles.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Common validation functions
export const validators = {
  email: (value: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {return 'Email is required';}
    if (!emailRegex.test(value)) {return 'Please enter a valid email address';}
    return null;
  },

  phone: (value: string): string | null => {
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!value) {return 'Phone number is required';}
    if (!phoneRegex.test(value.replace(/[-\s]/g, ''))) {
      return 'Please enter a valid phone number (10-11 digits)';
    }
    return null;
  },

  required: (value: string): string | null => {
    if (!value || value.trim() === '') {return 'This field is required';}
    return null;
  },

  minLength: (min: number) => (value: string): string | null => {
    if (value.length < min) {return `Must be at least ${min} characters`;}
    return null;
  },

  maxLength: (max: number) => (value: string): string | null => {
    if (value.length > max) {return `Must be no more than ${max} characters`;}
    return null;
  },

  date: (value: string): string | null => {
    if (!value) {return 'Date is required';}
    const date = new Date(value);
    if (isNaN(date.getTime())) {return 'Please enter a valid date';}
    return null;
  },

  time: (value: string): string | null => {
    if (!value) {return 'Time is required';}
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) {return 'Please enter time in HH:MM format';}
    return null;
  },
};

export default FormField;
