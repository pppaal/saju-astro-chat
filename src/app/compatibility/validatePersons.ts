import type { PersonForm } from '@/app/compatibility/lib'

/**
 * Form-level validation for the compatibility page. Extracted from the
 * legacy `useCompatibilityAnalysis` hook (which also ran an inline
 * /api/compatibility analysis and rendered a result card). The page now
 * routes straight to `/compatibility/counselor` after collecting
 * person info, so only the validation pass survived.
 */
export function validatePersons(
  persons: PersonForm[],
  count: number,
  t: (key: string, fallback: string) => string,
): string | null {
  if (count < 2 || count > 4) {
    return t('compatibilityPage.errorAddPeople', 'Add between 2 and 4 people.')
  }
  for (let i = 0; i < persons.length; i++) {
    const p = persons[i]
    const isDetailedMode = Boolean(p.isDetailedMode)
    if (!p.date) {
      return `${i + 1}: ${t('compatibilityPage.errorDateTimeRequired', 'date and time are required.')}`
    }
    // Saju needs gender to compute daeun direction (male and female
    // run the 10-year cycle opposite). Without it, person[i]'s chart
    // computation throws downstream and the counselor route ends up
    // calling the LLM with an empty chart — the user sees a generic
    // "오류가 발생했습니다" instead of a useful prompt.
    if (!p.gender) {
      return `${i + 1}: ${t('compatibilityPage.errorGenderRequired', 'gender is required.')}`
    }
    if (isDetailedMode && !p.time) {
      return `${i + 1}: ${t('compatibilityPage.errorDateTimeRequired', 'date and time are required.')}`
    }
    if (isDetailedMode && (p.lat == null || p.lon == null)) {
      return `${i + 1}: ${t('compatibilityPage.errorSelectCity', 'select a city from suggestions.')}`
    }
    if (isDetailedMode && !p.timeZone) {
      return `${i + 1}: ${t('compatibilityPage.errorTimezoneRequired', 'timezone is required.')}`
    }
    if (i > 0 && isDetailedMode && !p.relation) {
      return `${i + 1}: ${t('compatibilityPage.errorRelationRequired', 'relation to Person 1 is required.')}`
    }
    if (i > 0 && isDetailedMode && p.relation === 'other' && !p.relationNote?.trim()) {
      return `${i + 1}: ${t('compatibilityPage.errorOtherNote', "add a note for relation 'other'.")}`
    }
  }
  return null
}
