let countForDay: { date: string; count: number } | null = null;

function todayKeyUTC() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET() {
  const key = todayKeyUTC();
  if (!countForDay || countForDay.date !== key) {
    countForDay = { date: key, count: 0 };
  }
  return Response.json({ date: countForDay.date, count: countForDay.count });
}

export async function POST() {
  const key = todayKeyUTC();
  if (!countForDay || countForDay.date !== key) {
    countForDay = { date: key, count: 0 };
  }
  countForDay.count += 1;
  return Response.json({ date: countForDay.date, count: countForDay.count });
}