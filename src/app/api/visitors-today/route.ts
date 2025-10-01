let countForDay: { date: string; count: number } | null = null;

function todayKeyKST() {
  // KST는 UTC+9
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC→KST 보정
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET() {
  const key = todayKeyKST();
  if (!countForDay || countForDay.date !== key) {
    countForDay = { date: key, count: 0 };
  }
  return Response.json({ date: countForDay.date, count: countForDay.count });
}

export async function POST() {
  const key = todayKeyKST();
  if (!countForDay || countForDay.date !== key) {
    countForDay = { date: key, count: 0 };
  }
  countForDay.count += 1;
  return Response.json({ date: countForDay.date, count: countForDay.count });
}