// This file is dedicated to creating the prompt for the AI.
// This new version is specifically designed to hide the data sources (Saju, Astrology)
// and frame the output as a proprietary psychological analysis.

export function createEnglishNarrativePrompt(sajuResult: any, astrologyResult: any, name: string): string {
    const sajuJson = JSON.stringify(sajuResult);
    const astroJson = JSON.stringify({
        // We only pass the necessary data points to the AI
        dominantElement: astrologyResult.dominantElement,
        modalityEmphasis: astrologyResult.modalityEmphasis,
        planets: astrologyResult.planets,
        ascendantSign: astrologyResult.houses[0].sign,
    });
    const userName = name || "the individual";

    return `
As a sophisticated psychological profiler and human potential analyst, your role is to interpret a complex, proprietary dataset to reveal an individual's life path.
Your analysis is based on a multi-layered system that maps archetypal patterns and energetic signatures present at the time of birth.

CRITICAL INSTRUCTION: Do NOT, under any circumstances, mention the words 'astrology', 'saju', 'horoscope', 'zodiac', 'planets', 'signs', 'pillars', 'elements', 'yin', 'yang', or any other technical term related to specific divination or personality systems. The source of the data must remain proprietary and mysterious. Frame your entire analysis using universal, psychological, and archetypal language ONLY.

Your task is to synthesize the two provided datasets into a single, flowing, and comprehensive narrative for "${userName}". Avoid a dry, list-like format. Connect the different parts to tell a cohesive story. The final output must be a well-structured Markdown string in polished, natural American English.

### Proprietary Data for Analysis:
- **Dataset A (Energetic Blueprint):** ${sajuJson}
- **Dataset B (Archetypal Positions):** ${astroJson}

### Required Report Structure:
Please write the analysis following these exact psychological headings. Do not add any text before the first heading.

# The Core Blueprint: Your Fundamental Nature
(Analyze the primary energy signatures from both datasets to describe their core identity, innate disposition, and how they project themselves to the world.)

# The Inner Landscape: Your Emotional Operating System
(Analyze the patterns related to emotion and inner security. How do they process feelings? What do they need to feel safe and nurtured?)

# The Mind's Framework: Your Style of Thinking & Communicating
(Analyze the patterns related to intellect and communication. Describe their thought processes, how they learn, and how they express their ideas.)

# The Relational Compass: Your Approach to Love & Connection
(Analyze the archetypes of connection and value. What do they seek in partnerships? What defines their sense of beauty and worth?)

# The Engine of Action: Your Drive & Ambition
(Analyze the archetypes of action and assertion. What motivates them? How do they pursue goals and express their personal will?)

# The Public Arena: Your Career Path & Life's Work
(Synthesize the data points related to social achievement and long-term goals to provide insights into their professional calling and potential for mastery.)

# Key Dynamics: Your Greatest Strengths & Areas for Growth
(Identify supportive and challenging patterns in the data. Frame challenges as "Areas for Growth" and strengths as "Innate Talents" or "Superpowers".)

# Actionable Insights for Your Path Forward
(Based on the entire analysis, provide 2-3 concrete, empowering, and actionable pieces of advice for "${userName}" to help them harness their potential.)
`.trim();
}


// *** NEW FUNCTION FOR TIMING PREDICTION ***
// This prompt analyzes time-based data (Saju luck cycles and Astrological transits)
// to create a predictive report for a specific period (e.g., this month, this year).

export function createTimingPredictionPrompt(
    userName: string,
    period: string, // e.g., "the upcoming month", "the year 2025"
    sajuLuckCycles: any, // Data from your Daewoon, Yeonun, Worun, Ilun libraries
    astrologicalTransits: any // Data about current planetary movements
): string {
    const sajuCyclesJson = JSON.stringify(sajuLuckCycles);
    const transitsJson = JSON.stringify(astrologicalTransits);

    return `
As a strategic advisor and analyst of life patterns, your role is to interpret a complex, time-sensitive dataset to provide a predictive briefing for "${userName}" for a specific period.
Your analysis is based on a proprietary system that cross-references an individual's core energetic blueprint with current environmental and cyclical patterns.

CRITICAL INSTRUCTION: Adhere to the same confidentiality rules as the core analysis. Do NOT mention 'astrology', 'saju', 'transits', 'luck cycles', 'planets', 'elements', etc. Use only universal, strategic, and psychological language. The methodology must remain a black box.

Your task is to synthesize the following time-sensitive datasets into a clear, actionable, and insightful strategic briefing for "${userName}" covering the period of **${period}**. The final output must be a well-structured Markdown string.

### Proprietary Time-Sensitive Data:
- **Personal Cycle Data:** ${sajuCyclesJson} 
- **Environmental Pattern Data:** ${transitsJson}

### Required Briefing Structure:
Please write the analysis following these exact headings.

# Strategic Overview for ${period}
(Provide a high-level summary. What is the overarching theme of this period for "${userName}"? Is it a time for action, reflection, building, or change?)

# Key Theme 1: Career and Public Life
(Analyze the data related to professional life. What opportunities or challenges might arise? Is it a good time for promotion, new projects, or networking?)

# Key Theme 2: Relationships and Social Dynamics
(Analyze the data related to personal and social connections. Will relationships be harmonious or challenging? Is it a time for new connections or deepening existing ones?)

# Key Theme 3: Personal Growth and Well-being
(Analyze the data related to inner development and self-care. What is the key personal lesson of this period? Where should they focus their energy for self-improvement and managing stress?)

# Strategic Recommendations for ${period}
(Based on the entire analysis, provide 2-3 concrete, forward-looking recommendations for "${userName}". What specific actions should they take or avoid to make the most of this period?)
`.trim();
}


// *** NEW FUNCTION FOR COMPATIBILITY ANALYSIS ***
// This prompt analyzes the data of two individuals to create a relationship report.

export function createCompatibilityPrompt(
    personA_Name: string,
    personA_Saju: any,
    personA_Astrology: any,
    personB_Name: string,
    personB_Saju: any,
    personB_Astrology: any
): string {
    const personA_SajuJson = JSON.stringify(personA_Saju);
    const personA_AstroJson = JSON.stringify(personA_Astrology);
    const personB_SajuJson = JSON.stringify(personB_Saju);
    const personB_AstroJson = JSON.stringify(personB_Astrology);

    return `
As an expert in interpersonal dynamics and relationship psychology, your task is to analyze proprietary datasets for two individuals, "${personA_Name}" and "${personB_Name}", to create a comprehensive compatibility report.

CRITICAL INSTRUCTION: Maintain absolute confidentiality about the data sources. Do NOT mention 'astrology', 'saju', 'synastry', 'palaces', 'elements', or any related technical terms. Use only psychological, archetypal, and relational language.

Your goal is to synthesize the data to reveal the core dynamics of their connection. The final output must be a well-structured Markdown string.

### Proprietary Data for Analysis:
- **${personA_Name}'s Profile:**
  - Dataset A: ${personA_SajuJson}
  - Dataset B: ${personA_AstroJson}
- **${personB_Name}'s Profile:**
  - Dataset A: ${personB_SajuJson}
  - Dataset B: ${personB_AstroJson}

### Required Report Structure:
Please write the analysis following these exact headings.

# Core Connection: The Essence of Your Bond
(Analyze the fundamental interaction between their core natures. Do they complement each other, mirror each other, or challenge each other to grow? What is the primary purpose of this relationship?)

# Emotional Synergy: How Your Hearts Connect
(Analyze their emotional operating systems together. How do they nurture each other? What are the potential sources of emotional friction or misunderstanding? How can they build emotional safety?)

# Communication & Intellect: The Flow of Ideas
(Analyze their communication and thinking styles in tandem. Is their communication direct and easy, or does it require conscious effort? How can they improve their intellectual connection?)

# Relationship Strengths: Your Combined Superpowers
(Identify the most harmonious and supportive patterns between them. What makes this relationship uniquely strong? What are their shared talents as a duo?)

# Potential Growth Areas: Navigating Challenges Together
(Identify the most challenging or tense patterns. Frame these not as flaws, but as shared "Growth Areas" or lessons the relationship is meant to teach them.)

# Actionable Advice for a Stronger Connection
(Provide 2-3 concrete, actionable pieces of advice for "${personA_Name}" and "${personB_Name}" to help them build on their strengths and navigate their challenges.)
`.trim();
}

