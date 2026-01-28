import { ZODIAC_SIGNS, SAJU_ELEMENTS } from '../convertProfile';
import type { Filters } from '../types';

type CSSStyles = { readonly [key: string]: string };

interface FilterPanelProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  styles: CSSStyles;
}

export function FilterPanel({ filters, setFilters, styles }: FilterPanelProps) {
  return (
    <div className={styles.filtersPanel}>
      <h3>Filters</h3>
      <div className={styles.filterGrid}>
        <div>
          <label>Zodiac Sign</label>
          <select
            value={filters.zodiacSign}
            onChange={(e) => setFilters({ ...filters, zodiacSign: e.target.value })}
            className={styles.filterSelect}
          >
            <option value="all">All Signs</option>
            {ZODIAC_SIGNS.map(sign => (
              <option key={sign} value={sign}>{sign}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Saju Element</label>
          <select
            value={filters.sajuElement}
            onChange={(e) => setFilters({ ...filters, sajuElement: e.target.value })}
            className={styles.filterSelect}
          >
            <option value="all">All Elements</option>
            {SAJU_ELEMENTS.map(elem => (
              <option key={elem} value={elem}>{elem}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
