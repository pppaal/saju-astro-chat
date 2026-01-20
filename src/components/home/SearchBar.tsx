import React, { useMemo } from 'react';
import styles from './SearchBar.module.css';

interface ServiceOption {
  key: string;
  icon: string;
  path: string;
}

interface SearchBarProps {
  lifeQuestion: string;
  typingPlaceholder: string;
  showServiceSelector: boolean;
  selectedService: string | null;
  serviceOptions: ServiceOption[];
  onQuestionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onServiceSelect: (serviceKey: string) => void;
  onToggleSelector: () => void;
  onFocus: () => void;
  onHintClick: (hint: string) => void;
  hints: string[];
  t: (key: string) => string;
  translate: (key: string, fallback: string) => string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const SearchBar = React.memo(function SearchBar({
  lifeQuestion,
  typingPlaceholder,
  showServiceSelector,
  selectedService,
  serviceOptions,
  onQuestionChange,
  onSubmit,
  onServiceSelect,
  onToggleSelector,
  onFocus,
  onHintClick,
  hints,
  t,
  translate,
  containerRef,
}: SearchBarProps) {
  // Memoize selected service icon to avoid recalculation on every render
  const selectedIcon = useMemo(
    () => serviceOptions.find((s) => s.key === selectedService)?.icon || '🌟',
    [serviceOptions, selectedService]
  );

  return (
    <div className={styles.questionSearchContainer} ref={containerRef}>
      <form onSubmit={onSubmit} className={styles.questionSearchForm}>
        <div className={styles.questionSearchWrapper}>
          {/* Service Selector Button */}
          <button
            type="button"
            className={styles.serviceSelectBtn}
            onClick={onToggleSelector}
            title={translate('landing.selectService', '서비스 선택')}
          >
            <span className={styles.serviceSelectIcon}>
              {selectedIcon}
            </span>
            <span className={styles.serviceSelectArrow}>▼</span>
          </button>

          {/* Service Dropdown */}
          {showServiceSelector && (
            <div className={styles.serviceDropdown}>
              {serviceOptions.map((service) => (
                <button
                  key={service.key}
                  type="button"
                  className={`${styles.serviceDropdownItem} ${selectedService === service.key ? styles.selected : ''}`}
                  onClick={() => onServiceSelect(service.key)}
                >
                  <span className={styles.serviceDropdownIcon}>{service.icon}</span>
                  <span className={styles.serviceDropdownLabel}>{t(`menu.${service.key}`)}</span>
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            className={styles.questionSearchInput}
            placeholder={typingPlaceholder || translate('landing.searchPlaceholder', '오늘 무엇이 궁금하세요?')}
            value={lifeQuestion}
            onChange={(e) => onQuestionChange(e.target.value)}
            onFocus={onFocus}
            autoComplete="off"
          />
          <button type="submit" className={styles.questionSearchBtn} aria-label="Search">
            &#10148;
          </button>
        </div>
        <div className={styles.questionHints}>
          {hints.map((hint, index) => (
            <button
              key={index}
              type="button"
              className={styles.questionHint}
              onClick={() => onHintClick(hint)}
            >
              {hint}
            </button>
          ))}
        </div>
      </form>

      {/* AI Routing Guide */}
      <div className={styles.aiRoutingGuide}>
        <p className={styles.aiRoutingText}>
          {translate('landing.aiRoutingText', '서비스를 선택하고 질문을 입력하세요')}
        </p>
        <div className={styles.serviceIconsRow}>
          {serviceOptions.map((service) => (
            <span key={service.key} className={styles.serviceIcon} title={t(`menu.${service.key}`)}>
              {service.icon}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});
