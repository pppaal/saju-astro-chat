import { NextRequest, NextResponse } from 'next/server';
import { analyzeICP, getICPCompatibility, getCrossSystemCompatibility } from '@/lib/icp/analysis';
import { analyzePersona, getPersonaCompatibility } from '@/lib/persona/analysis';
import type { ICPQuizAnswers } from '@/lib/icp/types';
import type { PersonaQuizAnswers } from '@/lib/persona/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CompatibilityRequest {
  person1: {
    icpAnswers: ICPQuizAnswers;
    personaAnswers: PersonaQuizAnswers;
  };
  person2: {
    icpAnswers: ICPQuizAnswers;
    personaAnswers: PersonaQuizAnswers;
  };
  locale?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CompatibilityRequest = await req.json();
    const { person1, person2, locale = 'en' } = body;

    // Validate input
    if (!person1?.icpAnswers || !person1?.personaAnswers || !person2?.icpAnswers || !person2?.personaAnswers) {
      return NextResponse.json(
        { error: 'Missing required quiz answers' },
        { status: 400 }
      );
    }

    // Analyze both persons
    const icp1 = analyzeICP(person1.icpAnswers, locale);
    const icp2 = analyzeICP(person2.icpAnswers, locale);
    const persona1 = analyzePersona(person1.personaAnswers, locale);
    const persona2 = analyzePersona(person2.personaAnswers, locale);

    // Calculate compatibility scores
    const icpCompatibility = getICPCompatibility(
      icp1.primaryStyle,
      icp2.primaryStyle,
      locale
    );

    const personaCompatibility = getPersonaCompatibility(
      persona1.typeCode,
      persona2.typeCode,
      persona1.axes,
      persona2.axes,
      locale
    );

    const crossSystemCompatibility = getCrossSystemCompatibility(
      icp1.primaryStyle,
      icp2.primaryStyle,
      persona1.typeCode,
      persona2.typeCode,
      persona1.axes,
      persona2.axes,
      locale
    );

    return NextResponse.json({
      person1: {
        icp: {
          primaryStyle: icp1.primaryStyle,
          secondaryStyle: icp1.secondaryStyle,
          dominanceScore: icp1.dominanceScore,
          affiliationScore: icp1.affiliationScore,
          octantScores: icp1.octantScores,
        },
        persona: {
          typeCode: persona1.typeCode,
          personaName: persona1.personaName,
          axes: persona1.axes,
        },
      },
      person2: {
        icp: {
          primaryStyle: icp2.primaryStyle,
          secondaryStyle: icp2.secondaryStyle,
          dominanceScore: icp2.dominanceScore,
          affiliationScore: icp2.affiliationScore,
          octantScores: icp2.octantScores,
        },
        persona: {
          typeCode: persona2.typeCode,
          personaName: persona2.personaName,
          axes: persona2.axes,
        },
      },
      compatibility: {
        icp: icpCompatibility,
        persona: personaCompatibility,
        crossSystem: crossSystemCompatibility,
      },
    });
  } catch (error) {
    console.error('Personality compatibility error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
