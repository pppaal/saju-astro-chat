// Weekly Fortune Image Storage using Upstash Redis

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const WEEKLY_FORTUNE_KEY = 'weekly_fortune_image';

// Validate if URL is properly configured (not placeholder)
function isValidUpstashConfig(): boolean {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return false;
  // Check for common placeholder values
  if (UPSTASH_URL === 'replace_me' || UPSTASH_TOKEN === 'replace_me') return false;
  // Check if URL starts with https
  if (!UPSTASH_URL.startsWith('https://')) return false;
  return true;
}

interface WeeklyFortuneData {
  imageUrl: string;
  generatedAt: string;
  weekNumber: number;
  theme: string;
}

/**
 * Redis에 주간 운세 이미지 URL 저장
 */
export async function saveWeeklyFortuneImage(data: WeeklyFortuneData): Promise<boolean> {
  if (!isValidUpstashConfig()) {
    // Silent return - Upstash is optional
    return false;
  }

  try {
    const url = `${UPSTASH_URL}/set/${WEEKLY_FORTUNE_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[WeeklyFortune] Failed to save:', res.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[WeeklyFortune] Error saving:', error);
    return false;
  }
}

/**
 * Redis에서 주간 운세 이미지 URL 조회
 */
export async function getWeeklyFortuneImage(): Promise<WeeklyFortuneData | null> {
  if (!isValidUpstashConfig()) {
    return null;
  }

  try {
    const url = `${UPSTASH_URL}/get/${WEEKLY_FORTUNE_KEY}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();

    // Upstash returns { result: "stringified json" }
    if (data?.result) {
      if (typeof data.result === 'string') {
        return JSON.parse(data.result);
      }
      return data.result;
    }

    return null;
  } catch (error) {
    console.error('[WeeklyFortune] Error fetching:', error);
    return null;
  }
}

/**
 * ISO 주차 번호 계산
 */
export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
