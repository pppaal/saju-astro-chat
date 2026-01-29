/**
 * Format date with internationalization support
 * Uses centralized date utilities with i18n labels
 */
import { formatRelativeDate } from '@/lib/utils/date'

export function formatDate(dateStr: string, t: (key: string) => string, locale: string): string {
  return formatRelativeDate(dateStr, {
    locale,
    labels: {
      today: t('myjourney.activity.today'),
      yesterday: t('myjourney.activity.yesterday'),
    },
  })
}
