import { NextResponse } from 'next/server';
import { analyzePersona } from '@/lib/persona/analysis';
import { PersonaQuizAnswers } from '@/lib/persona/types';

export async function POST(request: Request) {
try {
const answers: PersonaQuizAnswers = await request.json();
if (!answers || Object.keys(answers).length === 0) {
return NextResponse.json({ error: 'Quiz answers are required.' }, { status: 400 });
}
const analysisResult = analyzePersona(answers);
return NextResponse.json(analysisResult);
} catch (error) {
console.error('Persona Analysis API Error:', error);
return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
}
}