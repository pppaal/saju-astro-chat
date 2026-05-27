import { ZODIAC_SIGNS, SAJU_ELEMENTS } from '../convertProfile'
import type { Filters } from '../types'

type CSSStyles = { readonly [key: string]: string }

interface FilterPanelProps {
  filters: Filters
  setFilters: (filters: Filters) => void
  styles: CSSStyles
}

export function FilterPanel({ filters, setFilters, styles }: FilterPanelProps) {
  const hasActiveFilters = filters.zodiacSign !== 'all' || filters.sajuElement !== 'all'

  const handleReset = () => {
    setFilters({ ...filters, zodiacSign: 'all', sajuElement: 'all' })
  }

  return (
    <div className={styles.filtersPanel} role="region" aria-label="Search filters">
      <div className={styles.filterHeader}>
        <h3 className={styles.filterTitle}>
          <span className={styles.filterIcon} aria-hidden="true">
            ⚙️
          </span>
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className={styles.filterReset}
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>

      <div className={styles.filterGrid}>
        <div className={styles.filterGroup}>
          <label htmlFor="zodiac-filter" className={styles.filterLabel}>
            <span className={styles.filterLabelIcon} aria-hidden="true">
              ♈
            </span>
            Zodiac Sign
          </label>
          <select
            id="zodiac-filter"
            value={filters.zodiacSign}
            onChange={(e) => setFilters({ ...filters, zodiacSign: e.target.value })}
            className={styles.filterSelect}
            aria-label="Filter by zodiac sign"
          >
            <option value="all">All Signs</option>
            {ZODIAC_SIGNS.map((sign) => (
              <option key={sign} value={sign}>
                {sign}
              </option>
            ))}
          </select>
          {filters.zodiacSign !== 'all' && (
            <button
              onClick={() => setFilters({ ...filters, zodiacSign: 'all' })}
              className={styles.filterClear}
              aria-label="Clear zodiac filter"
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="saju-filter" className={styles.filterLabel}>
            <span className={styles.filterLabelIcon} aria-hidden="true">
              ☯
            </span>
            Saju Element
          </label>
          <select
            id="saju-filter"
            value={filters.sajuElement}
            onChange={(e) => setFilters({ ...filters, sajuElement: e.target.value })}
            className={styles.filterSelect}
            aria-label="Filter by saju element"
          >
            <option value="all">All Elements</option>
            {SAJU_ELEMENTS.map((elem) => (
              <option key={elem} value={elem}>
                {elem}
              </option>
            ))}
          </select>
          {filters.sajuElement !== 'all' && (
            <button
              onClick={() => setFilters({ ...filters, sajuElement: 'all' })}
              className={styles.filterClear}
              aria-label="Clear saju element filter"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className={styles.filterSummary}>
          <span className={styles.filterSummaryIcon} aria-hidden="true">
            ✓
          </span>
          <span>
            {filters.zodiacSign !== 'all' && `Zodiac: ${filters.zodiacSign}`}
            {filters.zodiacSign !== 'all' && filters.sajuElement !== 'all' && ' • '}
            {filters.sajuElement !== 'all' && `Element: ${filters.sajuElement}`}
          </span>
        </div>
      )}
    </div>
  )
}
