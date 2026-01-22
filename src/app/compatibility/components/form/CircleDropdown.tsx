import React from 'react';
import { type CirclePerson } from '@/hooks/useMyCircle';
import styles from '../../Compatibility.module.css';

interface CircleDropdownProps {
  /** Array of people from My Circle */
  circlePeople: CirclePerson[];
  /** Whether dropdown is shown for this person */
  isOpen: boolean;
  /** Callback when import button is clicked */
  onToggle: () => void;
  /** Callback when a person is selected */
  onSelect: (person: CirclePerson) => void;
  /** Translation function */
  t: (key: string, fallback: string) => string;
}

/**
 * CircleDropdown Component
 *
 * My Circle import dropdown that allows users to import
 * saved person data from their circle.
 */
export const CircleDropdown: React.FC<CircleDropdownProps> = React.memo(({
  circlePeople,
  isOpen,
  onToggle,
  onSelect,
  t,
}) => {
  if (circlePeople.length === 0) {
    return null;
  }

  return (
    <div className={styles.circleDropdownWrapper} data-circle-dropdown>
      <button
        type="button"
        className={styles.circleImportBtn}
        onClick={onToggle}
      >
        👥 {t('compatibilityPage.fromCircle', 'My Circle')}
      </button>
      {isOpen && (
        <ul className={styles.circleDropdown}>
          {circlePeople.map((cp) => (
            <li
              key={cp.id}
              className={styles.circleDropdownItem}
              onClick={() => onSelect(cp)}
            >
              <span className={styles.circlePersonName}>{cp.name}</span>
              <span className={styles.circlePersonRelation}>
                {cp.relation === 'partner' ? '❤️' :
                 cp.relation === 'family' ? '👨‍👩‍👧‍👦' :
                 cp.relation === 'friend' ? '🤝' : '💼'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

CircleDropdown.displayName = 'CircleDropdown';
