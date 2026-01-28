import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma, Prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import type { ICPQuizAnswers } from '@/lib/icp/types';
import type { PersonaQuizAnswers } from '@/lib/persona/types';
import { HTTP_STATUS } from '@/lib/constants/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SaveCompatibilityRequest {
  person1: {
    userId?: string;
    name?: string;
    icp: {
      primaryStyle: string;
      secondaryStyle: string | null;
      dominanceScore: number;
      affiliationScore: number;
      octantScores: Record<string, number>;
    };
    persona: {
      typeCode: string;
      personaName: string;
      energyScore: number;
      cognitionScore: number;
      decisionScore: number;
      rhythmScore: number;
    };
    icpAnswers?: ICPQuizAnswers;
    personaAnswers?: PersonaQuizAnswers;
  };
  person2: {
    userId?: string;
    name?: string;
    icp: {
      primaryStyle: string;
      secondaryStyle: string | null;
      dominanceScore: number;
      affiliationScore: number;
      octantScores: Record<string, number>;
    };
    persona: {
      typeCode: string;
      personaName: string;
      energyScore: number;
      cognitionScore: number;
      decisionScore: number;
      rhythmScore: number;
    };
    icpAnswers?: ICPQuizAnswers;
    personaAnswers?: PersonaQuizAnswers;
  };
  compatibility: {
    icpScore: number;
    icpLevel: string;
    icpLevelKo?: string;
    icpDescription: string;
    icpDescriptionKo?: string;
    personaScore: number;
    personaLevel: string;
    personaLevelKo?: string;
    personaDescription: string;
    personaDescriptionKo?: string;
    crossSystemScore: number;
    crossSystemLevel: string;
    crossSystemLevelKo?: string;
    crossSystemDescription: string;
    crossSystemDescriptionKo?: string;
    synergies?: string[];
    synergiesKo?: string[];
    tensions?: string[];
    tensionsKo?: string[];
    insights?: string[];
    insightsKo?: string[];
  };
  locale?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const body: SaveCompatibilityRequest = await req.json();
    const { person1, person2, compatibility, locale = 'en' } = body;

    // Validate required fields
    if (!person1?.icp || !person1?.persona || !person2?.icp || !person2?.persona || !compatibility) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Save compatibility result to database
    const compatibilityResult = await prisma.compatibilityResult.create({
      data: {
        userId: session.user.id,
        person1UserId: person1.userId || null,
        person1Name: person1.name || 'Person 1',
        person1ICP: person1.icp,
        person1Persona: person1.persona,
        person2UserId: person2.userId || null,
        person2Name: person2.name || 'Person 2',
        person2ICP: person2.icp,
        person2Persona: person2.persona,
        icpCompatibility: {
          score: compatibility.icpScore,
          level: compatibility.icpLevel,
          levelKo: compatibility.icpLevelKo,
          description: compatibility.icpDescription,
          descriptionKo: compatibility.icpDescriptionKo,
        },
        personaCompatibility: {
          score: compatibility.personaScore,
          level: compatibility.personaLevel,
          levelKo: compatibility.personaLevelKo,
          description: compatibility.personaDescription,
          descriptionKo: compatibility.personaDescriptionKo,
          synergies: compatibility.synergies,
          synergiesKo: compatibility.synergiesKo,
          tensions: compatibility.tensions,
          tensionsKo: compatibility.tensionsKo,
        },
        crossSystemScore: compatibility.crossSystemScore,
        crossSystemAnalysis: {
          level: compatibility.crossSystemLevel,
          levelKo: compatibility.crossSystemLevelKo,
          description: compatibility.crossSystemDescription,
          descriptionKo: compatibility.crossSystemDescriptionKo,
          insights: compatibility.insights,
          insightsKo: compatibility.insightsKo,
        },
        person1Answers: person1.icpAnswers && person1.personaAnswers
          ? { icp: person1.icpAnswers, persona: person1.personaAnswers } as unknown as Prisma.InputJsonValue
          : Prisma.JsonNull,
        person2Answers: person2.icpAnswers && person2.personaAnswers
          ? { icp: person2.icpAnswers, persona: person2.personaAnswers } as unknown as Prisma.InputJsonValue
          : Prisma.JsonNull,
        locale,
      },
    });

    logger.info('Compatibility result saved', { userId: session.user.id, id: compatibilityResult.id });

    return NextResponse.json({
      success: true,
      id: compatibilityResult.id,
      createdAt: compatibilityResult.createdAt,
    });
  } catch (error) {
    logger.error('Error saving compatibility result:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}

// GET endpoint to retrieve compatibility result by ID
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const compatibilityResult = await prisma.compatibilityResult.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!compatibilityResult) {
      return NextResponse.json(
        { error: 'Compatibility result not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json({
      result: compatibilityResult,
    });
  } catch (error) {
    logger.error('Error retrieving compatibility result:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
