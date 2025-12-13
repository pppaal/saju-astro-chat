import {
  createCanvas,
  drawBackground,
  drawStars,
  drawGlow,
  drawBranding,
  drawScoreCircle,
  drawWrappedText,
  canvasToBlob,
  COLORS,
  CardSize,
} from '../templates/baseTemplate';

export type CompatibilityData = {
  person1Name: string;
  person2Name: string;
  score: number;
  relation: 'lover' | 'friend' | 'other';
  highlights?: string[];
};

const RELATION_EMOJI: Record<string, string> = {
  lover: '💕',
  friend: '🤝',
  other: '✨',
};

export async function generateCompatibilityCard(
  data: CompatibilityData,
  size: CardSize = 'og'
): Promise<Blob | null> {
  const { canvas, ctx, width, height } = createCanvas(size);

  // Background
  drawBackground(ctx, width, height);
  drawStars(ctx, width, height, 80);
  drawGlow(ctx, width, height, 'rgba(254, 214, 227, 0.12)');

  const isStory = size === 'story';
  const centerX = width / 2;

  if (isStory) {
    // Story layout (vertical)
    // Title
    ctx.font = '600 36px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText('COMPATIBILITY', centerX, 120);

    // Emoji
    ctx.font = '80px sans-serif';
    ctx.fillText(RELATION_EMOJI[data.relation] || '💫', centerX, 220);

    // Names
    ctx.font = '700 48px sans-serif';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText(data.person1Name, centerX, 350);

    ctx.font = '400 32px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('&', centerX, 410);

    ctx.font = '700 48px sans-serif';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText(data.person2Name, centerX, 470);

    // Score circle
    drawScoreCircle(ctx, centerX, 700, 120, data.score, 'Compatibility');

    // Highlights
    if (data.highlights && data.highlights.length > 0) {
      ctx.font = '400 28px sans-serif';
      ctx.fillStyle = COLORS.textSecondary;
      let y = 920;
      for (const highlight of data.highlights.slice(0, 3)) {
        drawWrappedText(ctx, `✦ ${highlight}`, centerX, y, width - 120, 36, 2);
        y += 80;
      }
    }

    // CTA
    ctx.font = '500 28px sans-serif';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText('Check your compatibility!', centerX, height - 150);

    drawBranding(ctx, width, height);
  } else {
    // OG layout (horizontal)
    // Left side - Names
    const leftX = width * 0.35;

    ctx.font = '500 24px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText('COMPATIBILITY', leftX, 80);

    ctx.font = '64px sans-serif';
    ctx.fillText(RELATION_EMOJI[data.relation] || '💫', leftX, 180);

    ctx.font = '700 42px sans-serif';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText(data.person1Name, leftX, 280);

    ctx.font = '400 28px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('&', leftX, 330);

    ctx.font = '700 42px sans-serif';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText(data.person2Name, leftX, 380);

    // Highlight (one line)
    if (data.highlights && data.highlights[0]) {
      ctx.font = '400 18px sans-serif';
      ctx.fillStyle = COLORS.textSecondary;
      drawWrappedText(ctx, data.highlights[0], leftX, 440, 350, 24, 2);
    }

    // Right side - Score
    const rightX = width * 0.72;
    drawScoreCircle(ctx, rightX, height / 2, 100, data.score, 'Match Score');

    // Branding
    drawBranding(ctx, width, height, 'destinypal.me/compatibility');
  }

  return canvasToBlob(canvas);
}
