import { NextRequest, NextResponse } from 'next/server';
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";
import { apiClient } from "@/lib/api/ApiClient";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { captureServerError } from '@/lib/telemetry';
import {
  isValidDate,
  isValidTime,
  isValidLatitude,
  isValidLongitude,
  LIMITS,
} from "@/lib/validation";
import { sanitizeString } from "@/lib/api/sanitizers";
import { logger } from '@/lib/logger';
import type {
  Relation,
  PersonInput,
  CompatibilityBackendResponse,
} from './types';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function relationWeight(r?: Relation) {
  if (!r) return 1.0;
  if (r === 'lover') return 1.0;
  if (r === 'friend') return 0.95;
  return 0.9; // other
}

const MAX_NOTE = 240;


export async function POST(req: NextRequest) {
  try {
    // Apply middleware: public token auth + rate limiting (no credits for compatibility)
    const guardOptions = createPublicStreamGuard({
      route: "compatibility",
      limit: 30,
      windowSeconds: 60,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    const body = await req.json();
    const persons: PersonInput[] = Array.isArray(body?.persons) ? body.persons : [];

    if (persons.length < 2 || persons.length > 4) {
      return bad('Provide between 2 and 4 people for compatibility.', 400);
    }

    for (let i = 0; i < persons.length; i++) {
      const p = persons[i] || ({} as PersonInput);
      p.name = sanitizeString(p.name, LIMITS.NAME);
      p.city = sanitizeString(p.city, LIMITS.CITY);
      p.relationNoteToP1 = sanitizeString(p.relationNoteToP1, MAX_NOTE);

      if (!p?.date || !p?.time || !p?.timeZone) {
        return bad(`${i + 1}: date, time, and timeZone are required.`, 400);
      }
      if (!isValidDate(p.date)) {
        return bad(`${i + 1}: date must be YYYY-MM-DD.`, 400);
      }
      if (!isValidTime(p.time)) {
        return bad(`${i + 1}: time must be HH:mm (24h).`, 400);
      }
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number' || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) {
        return bad(`${i + 1}: latitude/longitude must be numbers.`, 400);
      }
      if (!isValidLatitude(p.latitude) || !isValidLongitude(p.longitude)) {
        return bad(`${i + 1}: latitude/longitude out of range.`, 400);
      }
      if (!p.timeZone || typeof p.timeZone !== 'string' || !p.timeZone.trim()) {
        return bad(`${i + 1}: timeZone is required.`, 400);
      }
      p.timeZone = p.timeZone.trim().slice(0, 80);
      if (i > 0 && !p.relationToP1) {
        return bad(`${i + 1}: relationToP1 is required.`, 400);
      }
      if (i > 0 && !['friend', 'lover', 'other'].includes(p.relationToP1 as string)) {
        return bad(`${i + 1}: relationToP1 must be friend | lover | other.`, 400);
      }
      if (i > 0 && p.relationToP1 === 'other' && !p.relationNoteToP1?.trim()) {
        return bad(`${i + 1}: add a short note for relationToP1 = "other".`, 400);
      }
      persons[i] = p;
    }

    const names = persons.map((p, i) => p.name?.trim() || `Person ${i + 1}`);

    const pairs: [number, number][] = [];
    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) pairs.push([i, j]);
    }

    const scores = pairs.map(([a, b]) => {
      const pa = persons[a];
      const pb = persons[b];
      const geo = Math.hypot(pa.latitude - pb.latitude, pa.longitude - pb.longitude);
      const base = Math.max(0, 100 - Math.min(100, Math.round(geo)));

      let weight = 1.0;
      if (a === 0) {
        weight = relationWeight(pb.relationToP1);
      } else if (b === 0) {
        weight = relationWeight(pa.relationToP1);
      } else {
        weight = (relationWeight(pa.relationToP1) + relationWeight(pb.relationToP1)) / 2;
      }

      const score = Math.round(base * weight);
      return { pair: [a, b], score };
    });

    const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);

    const lines: string[] = [];
    lines.push(`People: ${persons.length}`);
    lines.push('');
    for (let i = 1; i < persons.length; i++) {
      const r = persons[i].relationToP1!;
      const rLabel = r === 'lover' ? 'Partner' : r === 'friend' ? 'Friend' : persons[i].relationNoteToP1 || 'Other';
      lines.push(`vs Person 1 -> ${names[i]}: ${rLabel}`);
    }
    lines.push('');
    scores.forEach(({ pair: [a, b], score }) => {
      lines.push(`${names[a]} & ${names[b]}: compatibility ${score}/100`);
    });
    lines.push('');
    lines.push(`Average: ${avg}/100`);

    // ======== AI backend call (GPT + Fusion) ========
    let aiInterpretation = '';
    let aiModelUsed = '';
    let aiScore: number | null = null;
    let timing: Record<string, unknown> | null = null;
    let actionItems: string[] = [];
    let isGroup = false;
    let groupAnalysis: Record<string, unknown> | null = null;
    let synergyBreakdown: Record<string, unknown> | null = null;

    try {
      // Send to backend with full birth data for Saju+Astrology fusion analysis
      const response = await apiClient.post<CompatibilityBackendResponse>('/api/compatibility', {
        persons: persons.map((p, i) => ({
          name: names[i],
          birthDate: p.date,
          birthTime: p.time,
          latitude: p.latitude,
          longitude: p.longitude,
          timeZone: p.timeZone,
          relation: i > 0 ? p.relationToP1 : undefined,
          relationNote: i > 0 ? p.relationNoteToP1 : undefined,
        })),
        relationship_type: persons[1]?.relationToP1 || 'lover',
        locale: body?.locale || 'ko',
      }, { timeout: 60000 });

      if (response.ok && response.data) {
        const aiData = response.data;
        // Handle both nested (data.report) and flat response formats
        aiInterpretation = ('data' in aiData && aiData.data?.report) || ('interpretation' in aiData && aiData.interpretation) || ('report' in aiData && aiData.report) || '';
        aiModelUsed = ('data' in aiData && aiData.data?.model) || ('model' in aiData && aiData.model) || 'gpt-4o';
        // Get the AI-calculated overall score (Saju+Astrology fusion)
        aiScore = ('data' in aiData && aiData.data?.overall_score) || ('overall_score' in aiData && aiData.overall_score) || null;
        // Get timing analysis
        timing = ('data' in aiData && aiData.data?.timing) || ('timing' in aiData && aiData.timing) || null;
        // Get action items
        actionItems = ('data' in aiData && aiData.data?.action_items) || ('action_items' in aiData && aiData.action_items) || [];
        // Get group analysis data (for 3+ people)
        isGroup = ('is_group' in aiData && aiData.is_group) || false;
        groupAnalysis = ('group_analysis' in aiData && aiData.group_analysis) || null;
        synergyBreakdown = ('synergy_breakdown' in aiData && aiData.synergy_breakdown) || null;
      }
    } catch (aiErr) {
      logger.warn('[Compatibility API] AI backend call failed:', aiErr);
      aiInterpretation = '';
      aiModelUsed = 'error-fallback';
    }

    // Use AI score if available, otherwise use geo-based fallback
    const finalScore = aiScore ?? avg;
    const fallbackInterpretation = lines.join('\n') + '\n\nNote: This is a playful heuristic score, not professional guidance.';

    // ======== 기록 저장 (로그인 사용자만) ========
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      try {
        await prisma.reading.create({
          data: {
            userId: session.user.id,
            type: 'compatibility',
            title: `${names.slice(0, 2).join(' & ')} 궁합 분석 (${finalScore}점)`,
            content: JSON.stringify({
              persons: persons.map((p, i) => ({
                name: names[i],
                date: p.date,
                time: p.time,
                relation: i > 0 ? p.relationToP1 : undefined,
              })),
              score: finalScore,
              pairScores: scores,
            }),
          },
        });
      } catch (saveErr) {
        logger.warn('[Compatibility API] Failed to save reading:', saveErr);
      }
    }

    const res = NextResponse.json({
      interpretation: aiInterpretation || fallbackInterpretation,
      aiInterpretation,
      aiModelUsed,
      pairs: scores,
      average: finalScore,
      overall_score: finalScore,
      timing,
      action_items: actionItems,
      fusion_enabled: !!aiScore,
      is_group: isGroup,
      group_analysis: groupAnalysis,
      synergy_breakdown: synergyBreakdown,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e: unknown) {
    captureServerError(e as Error, { route: "/api/compatibility" });
    return bad(e instanceof Error ? e.message : 'Unexpected server error', 500);
  }
}
