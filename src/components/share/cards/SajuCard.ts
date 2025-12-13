import {
  createCanvas,
  drawBackground,
  drawStars,
  drawGlow,
  drawBranding,
  drawBar,
  canvasToBlob,
  COLORS,
  CardSize,
} from '../templates/baseTemplate';

export type SajuShareData = {
  name?: string;
  dayMaster: { stem: string; branch: string; element: string };
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number };
  pillars: {
    year: { stem: string; branch: string };
    month: { stem: string; branch: string };
    day: { stem: string; branch: string };
    time: { stem: string; branch: string };
  };
  geokguk?: string;
  yongsin?: string;
};

const ELEMENT_COLORS: Record<string, string> = {
  wood: COLORS.wood,
  fire: COLORS.fire,
  earth: COLORS.earth,
  metal: COLORS.metal,
  water: COLORS.water,
};

const ELEMENT_LABELS: Record<string, { ko: string; emoji: string }> = {
  wood: { ko: '목', emoji: '🌳' },
  fire: { ko: '화', emoji: '🔥' },
  earth: { ko: '토', emoji: '🪨' },
  metal: { ko: '금', emoji: '🪙' },
  water: { ko: '수', emoji: '💧' },
};

const PILLAR_LABELS = ['시주', '일주', '월주', '년주'];

export async function generateSajuCard(
  data: SajuShareData,
  size: CardSize = 'og'
): Promise<Blob | null> {
  const { canvas, ctx, width, height } = createCanvas(size);

  // Background with Eastern aesthetic
  drawBackground(ctx, width, height);
  drawStars(ctx, width, height, 60);
  drawGlow(ctx, width, height, 'rgba(139, 92, 246, 0.12)');

  const isStory = size === 'story';
  const centerX = width / 2;

  if (isStory) {
    // Story layout
    ctx.font = '600 32px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText('四柱命式', centerX, 100);

    // Name
    if (data.name) {
      ctx.font = '700 42px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(data.name, centerX, 180);
    }

    // Day Master (일주)
    ctx.font = '400 24px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('일주 (Day Master)', centerX, 260);

    ctx.font = '700 72px sans-serif';
    const dmColor = ELEMENT_COLORS[data.dayMaster.element] || COLORS.purple;
    ctx.fillStyle = dmColor;
    ctx.fillText(`${data.dayMaster.stem}${data.dayMaster.branch}`, centerX, 350);

    // Four Pillars
    const pillarStartY = 450;
    const pillarWidth = 180;
    const pillarGap = 40;
    const totalWidth = pillarWidth * 4 + pillarGap * 3;
    const startX = (width - totalWidth) / 2;

    const pillarOrder = ['time', 'day', 'month', 'year'] as const;

    pillarOrder.forEach((key, i) => {
      const pillar = data.pillars[key];
      const x = startX + i * (pillarWidth + pillarGap) + pillarWidth / 2;

      // Label
      ctx.font = '500 18px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(PILLAR_LABELS[i], x, pillarStartY);

      // Stem
      ctx.font = '700 40px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(pillar.stem, x, pillarStartY + 60);

      // Branch
      ctx.fillText(pillar.branch, x, pillarStartY + 110);
    });

    // Five Elements bars
    const barStartY = 650;
    const barWidth = 600;
    const barHeight = 16;
    const barGap = 50;
    const barX = (width - barWidth) / 2;

    ctx.font = '600 24px sans-serif';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText('오행 밸런스', centerX, barStartY - 30);

    const elements = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
    const maxElement = Math.max(...Object.values(data.fiveElements), 1);

    elements.forEach((el, i) => {
      const y = barStartY + 20 + i * barGap;
      const value = data.fiveElements[el];
      const { ko, emoji } = ELEMENT_LABELS[el];

      // Label
      ctx.font = '500 18px sans-serif';
      ctx.fillStyle = COLORS.textSecondary;
      ctx.textAlign = 'left';
      ctx.fillText(`${emoji} ${ko}`, barX, y - 5);

      ctx.textAlign = 'right';
      ctx.fillText(`${value}`, barX + barWidth, y - 5);

      ctx.textAlign = 'center';

      // Bar
      drawBar(ctx, barX, y + 5, barWidth, barHeight, value, maxElement, ELEMENT_COLORS[el]);
    });

    // Geokguk & Yongsin
    if (data.geokguk || data.yongsin) {
      const infoY = 980;
      ctx.font = '400 22px sans-serif';
      ctx.fillStyle = COLORS.textSecondary;
      if (data.geokguk) {
        ctx.fillText(`격국: ${data.geokguk}`, centerX, infoY);
      }
      if (data.yongsin) {
        ctx.fillText(`용신: ${data.yongsin}`, centerX, infoY + 40);
      }
    }

    drawBranding(ctx, width, height, 'destinypal.me/saju');
  } else {
    // OG layout (horizontal)
    // Left side - Pillars
    ctx.font = '500 20px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText('四柱命式', width * 0.25, 60);

    // Day Master
    ctx.font = '400 16px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('일주', width * 0.25, 120);

    ctx.font = '700 56px sans-serif';
    const dmColor = ELEMENT_COLORS[data.dayMaster.element] || COLORS.purple;
    ctx.fillStyle = dmColor;
    ctx.fillText(`${data.dayMaster.stem}${data.dayMaster.branch}`, width * 0.25, 190);

    // Four pillars in a row
    const pillarStartX = 60;
    const pillarWidth = 90;
    const pillarGap = 20;

    const pillarOrder = ['time', 'day', 'month', 'year'] as const;

    pillarOrder.forEach((key, i) => {
      const pillar = data.pillars[key];
      const x = pillarStartX + i * (pillarWidth + pillarGap) + pillarWidth / 2;
      const y = 280;

      ctx.font = '400 12px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(PILLAR_LABELS[i], x, y);

      ctx.font = '600 28px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(pillar.stem, x, y + 35);
      ctx.fillText(pillar.branch, x, y + 70);
    });

    // Right side - Five Elements
    const rightX = width * 0.6;
    const barWidth = 320;
    const barHeight = 12;
    const barGap = 38;
    const barStartY = 100;

    ctx.font = '500 18px sans-serif';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.textAlign = 'center';
    ctx.fillText('오행 밸런스', rightX + barWidth / 2, barStartY - 25);

    const elements = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
    const maxElement = Math.max(...Object.values(data.fiveElements), 1);

    elements.forEach((el, i) => {
      const y = barStartY + i * barGap;
      const value = data.fiveElements[el];
      const { ko, emoji } = ELEMENT_LABELS[el];

      ctx.font = '400 14px sans-serif';
      ctx.fillStyle = COLORS.textSecondary;
      ctx.textAlign = 'left';
      ctx.fillText(`${emoji} ${ko}`, rightX, y + 10);

      ctx.textAlign = 'right';
      ctx.fillText(`${value}`, rightX + barWidth + 35, y + 10);

      // Bar (offset for label)
      drawBar(ctx, rightX + 50, y, barWidth - 50, barHeight, value, maxElement, ELEMENT_COLORS[el]);
    });

    // Geokguk & Yongsin at bottom right
    if (data.geokguk || data.yongsin) {
      ctx.font = '400 14px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.textAlign = 'left';
      let infoY = barStartY + 5 * barGap + 20;
      if (data.geokguk) {
        ctx.fillText(`격국: ${data.geokguk}`, rightX, infoY);
        infoY += 25;
      }
      if (data.yongsin) {
        ctx.fillText(`용신: ${data.yongsin}`, rightX, infoY);
      }
    }

    // Name at top right
    if (data.name) {
      ctx.font = '600 16px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.textAlign = 'right';
      ctx.fillText(data.name, width - 40, 40);
    }

    drawBranding(ctx, width, height);
  }

  return canvasToBlob(canvas);
}
