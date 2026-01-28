export function formatDate(
  dateStr: string,
  t: (key: string) => string,
  locale: string
): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return t("myjourney.activity.today");
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return t("myjourney.activity.yesterday");
  }

  return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}
