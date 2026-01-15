import Replicate from 'replicate';
import { logger } from "@/lib/logger";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 주간 테마 목록 (52주 다양하게)
const WEEKLY_THEMES = [
  { theme: 'golden sunrise over mountains', mood: 'hope and new beginnings', color: 'warm gold and orange' },
  { theme: 'mystical full moon over calm ocean', mood: 'intuition and reflection', color: 'silver and deep blue' },
  { theme: 'cherry blossoms floating in spring breeze', mood: 'renewal and beauty', color: 'soft pink and white' },
  { theme: 'northern lights dancing in arctic sky', mood: 'magic and wonder', color: 'green and purple aurora' },
  { theme: 'ancient temple under starry night', mood: 'wisdom and spirituality', color: 'deep purple and gold' },
  { theme: 'crystal cave with glowing gems', mood: 'inner discovery', color: 'rainbow crystals on purple' },
  { theme: 'phoenix rising from golden flames', mood: 'transformation and rebirth', color: 'red orange and gold' },
  { theme: 'serene zen garden with flowing water', mood: 'peace and balance', color: 'soft green and grey' },
  { theme: 'cosmic nebula with swirling galaxies', mood: 'infinite possibilities', color: 'deep space purple and blue' },
  { theme: 'enchanted forest with fairy lights', mood: 'mystery and enchantment', color: 'emerald green and gold sparkles' },
  { theme: 'lotus flower blooming on still pond', mood: 'enlightenment and purity', color: 'pink lotus on dark water' },
  { theme: 'majestic waterfall in misty mountains', mood: 'power and flow', color: 'blue water and green mist' },
];

export async function generateWeeklyFortuneImage(): Promise<string> {
  // 주차별로 다른 테마 선택 (연간 순환)
  const weekNumber = getWeekNumber(new Date());
  const themeIndex = weekNumber % WEEKLY_THEMES.length;
  const selectedTheme = WEEKLY_THEMES[themeIndex];

  const prompt = `mystical fortune illustration, ${selectedTheme.theme},
${selectedTheme.mood}, ${selectedTheme.color},
ethereal atmosphere, soft glowing light, magical sparkles,
dreamy cosmic background, premium digital art style,
mobile app card design, elegant composition, 8k quality`;

  try {
    const output = await replicate.run(
      'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
      {
        input: {
          prompt,
          negative_prompt: 'text, watermark, signature, blurry, low quality, distorted',
          width: 768,
          height: 1024,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      }
    );

    // Replicate returns array of URLs
    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (typeof imageUrl === 'string') {
      return imageUrl;
    }

    throw new Error('Invalid response from Replicate');
  } catch (error) {
    logger.error('Failed to generate weekly fortune image:', error);
    throw error;
  }
}

// ISO 주차 계산
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export { replicate };
