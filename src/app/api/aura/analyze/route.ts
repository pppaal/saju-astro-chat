import { NextResponse } from 'next/server';
import { analyzeAura } from '@/lib/aura/analysis';
import { AuraQuizAnswers } from '@/lib/aura/types';

export async function POST(request: Request) {
try {
const answers: AuraQuizAnswers = await request.json();
if (!answers || Object.keys(answers).length === 0) {
return NextResponse.json({ error: 'Quiz answers are required.' }, { status: 400 });
}
const analysisResult = analyzeAura(answers);
return NextResponse.json(analysisResult);
} catch (error) {
console.error('Aura Analysis API Error:', error);
return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
}
}