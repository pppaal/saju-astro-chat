// src/lib/personality/data.ts

// This defines the "shape" of a personality type
export interface Archetype {
  archetype_id: number;
  archetype_name: string;
  tagline: string;
  details: { core_motivation: string; };
  guidance: { career: { ideal_roles: string; }; personal_growth: { blind_spot: string; }; };
}

// This defines the "shape" of a single question
export interface Question {
  id: number;
  section: 'A' | 'B' | 'C' | 'D';
  text: string;
}

// This is the main data for the personality types
export const archetypeData: Archetype[] = [
  {
    "archetype_id": 1, "archetype_name": "The Director", "tagline": "The Architect of Achievement",
    "details": { "core_motivation": "To achieve mastery and create a lasting impact." },
    "guidance": { "career": { "ideal_roles": "CEO, project manager, entrepreneur, surgeon." }, "personal_growth": { "blind_spot": "Impatience and overlooking emotions." } }
  },
  {
    "archetype_id": 2, "archetype_name": "The Catalyst", "tagline": "The Spark of Innovation",
    "details": { "core_motivation": "To inspire change and connect with others." },
    "guidance": { "career": { "ideal_roles": "Sales leader, public relations, creative director." }, "personal_growth": { "blind_spot": "Losing focus on details." } }
  },
  {
    "archetype_id": 3, "archetype_name": "The Analyst", "tagline": "The Seeker of Truth",
    "details": { "core_motivation": "To understand the world through logic and knowledge." },
    "guidance": { "career": { "ideal_roles": "Data scientist, researcher, financial analyst." }, "personal_growth": { "blind_spot": "Analysis paralysis." } }
  },
  {
    "archetype_id": 4, "archetype_name": "The Harmonizer", "tagline": "The Heart of the Team",
    "details": { "core_motivation": "To create harmony and support others." },
    "guidance": { "career": { "ideal_roles": "Human resources, therapist, teacher." }, "personal_growth": { "blind_spot": "Avoiding conflict." } }
  }
];

// This is the list of all the questions
export const questions: Question[] = [
    { id: 1, section: 'A', text: 'When starting a project, my first instinct is to create a clear, step-by-step plan.' },
    { id: 2, section: 'A', text: 'I am most comfortable when I am in control of a situation.' },
    { id: 3, section: 'A', text: 'I believe efficiency and results are more important than process.' },
    { id: 4, section: 'A', text: 'I am quick to make decisions, even with incomplete information.' },
    { id: 5, section: 'A', text: 'I am often the one who takes charge in a group setting.' },
    { id: 6, section: 'B', text: 'I get energized by brainstorming big, new ideas with other people.' },
    { id: 7, section: 'B', text: 'I find it easy to strike up conversations with strangers and build rapport.' },
    { id: 8, section: 'B', text: 'I am very persuasive and can usually get people excited about my vision.' },
    { id: 9, section: 'B', text: 'I would rather be in a dynamic, fast-paced environment than a predictable one.' },
    { id: 10, section: 'B', text: 'My enthusiasm is often described as "infectious."' },
    { id: 11, section: 'C', text: 'Before I speak, I need time to think through my ideas completely.' },
    { id: 12, section: 'C', text: 'I am not satisfied with an answer until I understand the "why" behind it.' },
    { id: 13, section: 'C', text: 'I enjoy diving deep into a single topic to become an expert.' },
    { id: 14, section: 'C', text: 'I am more interested in accuracy and quality than in speed.' },
    { id: 15, section: 'C', text: 'I often notice inconsistencies or flaws that others miss.' },
    { id: 16, section: 'D', text: 'I am highly aware of the feelings and needs of the people around me.' },
    { id: 17, section: 'D', text: 'I prefer to work in a collaborative and supportive team environment.' },
    { id: 18, section: 'D', text: 'Maintaining group harmony is one of my top priorities.' },
    { id: 19, section: 'D', text: 'I am known as a patient and reliable person.' },
    { id: 20, section: 'D', text: 'I often find myself mediating disagreements between others.' }
];