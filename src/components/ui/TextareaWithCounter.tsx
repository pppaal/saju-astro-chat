import * as React from "react";
import { Textarea, TextareaProps } from "./textarea";
import styles from "./TextareaWithCounter.module.css";

export interface TextareaWithCounterProps extends TextareaProps {
  /** Maximum character limit */
  maxLength?: number;
  /** Show character counter */
  showCounter?: boolean;
  /** Label for the textarea */
  label?: string;
  /** Help text shown below the textarea */
  helpText?: string;
  /** Whether the field is required */
  required?: boolean;
}

export const TextareaWithCounter = React.forwardRef<
  HTMLTextAreaElement,
  TextareaWithCounterProps
>(
  (
    {
      maxLength,
      showCounter = true,
      label,
      helpText,
      required = false,
      value,
      onChange,
      error,
      className = "",
      ...props
    },
    ref
  ) => {
    const [charCount, setCharCount] = React.useState(0);
    const [isFocused, setIsFocused] = React.useState(false);

    // Track character count
    React.useEffect(() => {
      const textValue = typeof value === "string" ? value : "";
      setCharCount(textValue.length);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;

      // If maxLength is set, enforce it
      if (maxLength && newValue.length > maxLength) {
        return;
      }

      setCharCount(newValue.length);
      if (onChange) {
        onChange(e);
      }
    };

    const isNearLimit = maxLength && charCount >= maxLength * 0.9;
    const isAtLimit = maxLength && charCount >= maxLength;

    return (
      <div className={styles.container}>
        {label && (
          <label className={styles.label}>
            {label}
            {required && (
              <span className={styles.required} aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        <div className={styles.textareaWrapper}>
          <Textarea
            ref={ref}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            error={error}
            className={className}
            maxLength={maxLength}
            aria-describedby={
              helpText || showCounter ? `${props.id}-description` : undefined
            }
            {...props}
          />

          {showCounter && maxLength && (
            <div
              className={`${styles.counter} ${
                isAtLimit
                  ? styles.counterError
                  : isNearLimit
                  ? styles.counterWarning
                  : ""
              } ${isFocused ? styles.counterFocused : ""}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className={styles.counterText}>
                {charCount} / {maxLength}
              </span>
            </div>
          )}
        </div>

        {helpText && (
          <p
            id={`${props.id}-description`}
            className={styles.helpText}
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

TextareaWithCounter.displayName = "TextareaWithCounter";

export default TextareaWithCounter;
