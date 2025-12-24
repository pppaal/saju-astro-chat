import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';

export type DreamHistoryItem = {
  id: string;
  createdAt: string;
  summary: string;
  dreamText?: string;
  symbols?: string[];
  themes?: { label: string; weight: number }[];
  luckyNumbers?: number[];
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const limitNum = parseInt(searchParams.get('limit') || '20', 10);
    const offsetNum = parseInt(searchParams.get('offset') || '0', 10);
    const limit = Math.max(1, Math.min(50, Number.isFinite(limitNum) ? limitNum : 20));
    const offset = Math.max(0, Number.isFinite(offsetNum) ? offsetNum : 0);

    // Fetch dream consultations from ConsultationHistory
    const dreams = await prisma.consultationHistory.findMany({
      where: {
        userId,
        theme: 'dream',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        createdAt: true,
        summary: true,
        fullReport: true,
        signals: true,
        userQuestion: true,
      },
    });

    // Transform to response format
    const history: DreamHistoryItem[] = dreams.map((dream) => {
      const signals = dream.signals as Record<string, unknown> | null;

      return {
        id: dream.id,
        createdAt: dream.createdAt.toISOString(),
        summary: dream.summary || '꿈 해석',
        dreamText: dream.userQuestion || undefined,
        symbols: (signals?.dreamSymbols as { label: string }[])?.map(s => s.label) ||
                 (signals?.symbols as string[]) ||
                 undefined,
        themes: (signals?.themes as { label: string; weight: number }[]) || undefined,
        luckyNumbers: (signals?.luckyElements as { luckyNumbers?: number[] })?.luckyNumbers || undefined,
      };
    });

    // Get total count for pagination
    const total = await prisma.consultationHistory.count({
      where: {
        userId,
        theme: 'dream',
      },
    });

    return NextResponse.json({
      history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching dream history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a dream history item
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || id.length > 100) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    // Verify ownership and delete
    const deleted = await prisma.consultationHistory.deleteMany({
      where: {
        id,
        userId: session.user.id,
        theme: 'dream',
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Dream not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dream:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
