/**
 * @file History page helper functions
 * Extracted from page.tsx for modularity
 */

/**
 * Format date string for display
 * Returns "Today", "Yesterday", or formatted date
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Convert service name (camelCase or kebab-case) to Title Case
 */
export function formatServiceName(service: string): string {
  return service
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .split(/[-\s]/) // Split by dash or space
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

/**
 * Get grade emoji based on grade number
 */
export function getGradeEmoji(grade: number): string {
  switch (grade) {
    case 0: return "💫";
    case 1: return "🌟";
    case 2: return "✨";
    case 3: return "⭐";
    default: return "⚠️";
  }
}

/**
 * Get grade label based on grade number
 */
export function getGradeLabel(grade: number): string {
  switch (grade) {
    case 0: return "천운의 날";
    case 1: return "아주 좋은 날";
    case 2: return "좋은 날";
    case 3: return "보통 날";
    default: return "주의할 날";
  }
}

/**
 * Get theme display name
 */
export function getThemeDisplayName(theme: string): string {
  const themeMap: Record<string, string> = {
    "focus_love": "연애운",
    "focus_career": "직장/사업운",
    "focus_money": "재물운",
    "focus_health": "건강운",
    "focus_overall": "종합 운세",
  };
  return themeMap[theme] || theme;
}

/**
 * Get category display with emoji
 */
export function getCategoryDisplay(category: string): string {
  const categoryMap: Record<string, string> = {
    "wealth": "💰 재물",
    "career": "💼 직장",
    "love": "💕 연애",
    "health": "💪 건강",
    "travel": "✈️ 여행",
    "study": "📚 학업",
  };
  return categoryMap[category] || `⭐ ${category}`;
}
