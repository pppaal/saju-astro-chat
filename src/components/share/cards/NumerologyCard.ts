import {
  createCanvas,
  drawBackground,
  drawStars,
  drawGlow,
  drawBranding,
  canvasToBlob,
  COLORS,
  CardSize,
} from '../templates/baseTemplate';

export type NumerologyShareData = {
  name: string;
  isKorean?: boolean;
  lifePathNumber: number | string;
  expressionNumber: number | string;
  soulUrgeNumber: number | string;
  personalityNumber: number | string;
  birthdayNumber: number;
  luckyNumbers?: number[];
  locale?: string;
};

const NUMBER_TITLES: Record<number, { en: string; ko: string }> = {
  1: { en: 'Pioneer', ko: '개척자' },
  2: { en: 'Diplomat', ko: '조정자' },
  3: { en: 'Creator', ko: '창조자' },
  4: { en: 'Builder', ko: '건축가' },
  5: { en: 'Adventurer', ko: '탐험가' },
  6: { en: 'Nurturer', ko: '양육자' },
  7: { en: 'Seeker', ko: '탐구자' },
  8: { en: 'Achiever', ko: '성취자' },
  9: { en: 'Humanitarian', ko: '인도주의자' },
  11: { en: 'Master 11', ko: '마스터 11' },
  22: { en: 'Master 22', ko: '마스터 22' },
  33: { en: 'Master 33', ko: '마스터 33' },
};

function reduceToCore(num: number): number {
  const keep = new Set([11, 22, 33]);
  while (num > 9 && !keep.has(num)) {
    num = num.toString().split('').reduce((acc, d) => acc + Number(d), 0);
  }
  return num;
}

function getTitle(n: number, locale: string): string {
  const core = reduceToCore(n);
  const titles = NUMBER_TITLES[core];
  if (!titles) {return '';}
  return locale === 'ko' ? titles.ko : titles.en;
}

export async function generateNumerologyCard(
  data: NumerologyShareData,
  size: CardSize = 'og'
): Promise<Blob | null> {
  const { canvas, ctx, width, height } = createCanvas(size);
  const locale = data.locale || 'en';
  const isKo = locale === 'ko';

  // Background
  drawBackground(ctx, width, height);
  drawStars(ctx, width, height, 80);
  drawGlow(ctx, width, height, 'rgba(255, 209, 102, 0.1)');

  const isStory = size === 'story';
  const centerX = width / 2;

  if (isStory) {
    // Story layout (vertical)
    // Header
    ctx.font = '600 28px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText(isKo ? '수비학 프로필' : 'Numerology Profile', centerX, 80);

    // Name
    ctx.font = '700 48px sans-serif';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText(data.name, centerX, 160);
    if (data.isKorean) {
      ctx.font = '400 18px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(isKo ? '(한글 이름)' : '(Korean name)', centerX, 195);
    }

    // Life Path (main number)
    const lifePathCore = reduceToCore(Number(data.lifePathNumber));
    ctx.font = '400 22px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(isKo ? '인생 경로' : 'Life Path', centerX, 280);

    ctx.font = '700 120px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(String(data.lifePathNumber), centerX, 400);

    ctx.font = '500 28px sans-serif';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(getTitle(lifePathCore, locale), centerX, 460);

    // Core Numbers Grid (2x2)
    const coreNumbers = [
      { label: isKo ? '표현' : 'Expression', value: data.expressionNumber },
      { label: isKo ? '영혼' : 'Soul Urge', value: data.soulUrgeNumber },
      { label: isKo ? '성격' : 'Personality', value: data.personalityNumber },
      { label: isKo ? '생일' : 'Birthday', value: data.birthdayNumber },
    ];

    const gridStartY = 550;
    const cellWidth = 240;
    const cellHeight = 140;
    const gap = 40;

    coreNumbers.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = centerX - cellWidth - gap / 2 + col * (cellWidth + gap) + cellWidth / 2;
      const y = gridStartY + row * (cellHeight + gap);

      // Card background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.roundRect(x - cellWidth / 2, y, cellWidth, cellHeight, 16);
      ctx.fill();

      // Number
      ctx.font = '700 48px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.textAlign = 'center';
      ctx.fillText(String(item.value), x, y + 55);

      // Label
      ctx.font = '500 16px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(item.label, x, y + 90);
    });

    // Lucky Numbers
    if (data.luckyNumbers && data.luckyNumbers.length > 0) {
      const luckyY = 930;
      ctx.font = '600 22px sans-serif';
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(isKo ? '🍀 행운의 숫자' : '🍀 Lucky Numbers', centerX, luckyY);

      ctx.font = '700 36px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(data.luckyNumbers.join('  '), centerX, luckyY + 55);
    }

    drawBranding(ctx, width, height, 'destinypal.me/numerology');
  } else {
    // OG layout (horizontal)
    // Left side - Life Path
    ctx.font = '500 16px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText(isKo ? '수비학 프로필' : 'Numerology Profile', width * 0.28, 50);

    // Name
    ctx.font = '600 20px sans-serif';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText(data.name, width * 0.28, 85);

    // Life Path
    ctx.font = '400 14px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(isKo ? '인생 경로' : 'Life Path', width * 0.28, 150);

    const lifePathCore = reduceToCore(Number(data.lifePathNumber));
    ctx.font = '700 72px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(String(data.lifePathNumber), width * 0.28, 230);

    ctx.font = '500 18px sans-serif';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(getTitle(lifePathCore, locale), width * 0.28, 270);

    // Right side - Other Core Numbers
    const rightStartX = width * 0.52;
    const colWidth = 150;
    const rowHeight = 90;

    const coreNumbers = [
      { label: isKo ? '표현' : 'Expression', value: data.expressionNumber },
      { label: isKo ? '영혼' : 'Soul Urge', value: data.soulUrgeNumber },
      { label: isKo ? '성격' : 'Personality', value: data.personalityNumber },
      { label: isKo ? '생일' : 'Birthday', value: data.birthdayNumber },
    ];

    coreNumbers.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = rightStartX + col * colWidth;
      const y = 100 + row * rowHeight;

      ctx.font = '400 12px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x, y);

      ctx.font = '700 36px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(String(item.value), x, y + 40);
    });

    // Lucky Numbers at bottom right
    if (data.luckyNumbers && data.luckyNumbers.length > 0) {
      ctx.font = '500 14px sans-serif';
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = 'left';
      ctx.fillText(isKo ? '🍀 행운의 숫자' : '🍀 Lucky Numbers', rightStartX, 320);

      ctx.font = '600 20px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(data.luckyNumbers.join('  '), rightStartX, 350);
    }

    drawBranding(ctx, width, height);
  }

  return canvasToBlob(canvas);
}
