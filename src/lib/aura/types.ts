export interface AuraQuizAnswers {
[questionId: string]: string | undefined;
}

export interface PersonalityProfile {
openness: number;
conscientiousness: number;
extraversion: number;
agreeableness: number;
neuroticism: number;

introversion: number;
intuition: number;
thinking: number;
perceiving: number;

enneagram: { [type: string]: number };
}

export interface AuraAnalysis {
title: string;
summary: string;
primaryColor: string;
secondaryColor: string;
strengths: string[];
challenges: string[];
career: string;
relationships: string;
guidance: string;
profile: PersonalityProfile;
}