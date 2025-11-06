interface AnalysisData {
  astrologyResult: any;
  sajuResult: any;
  name?: string;
}

export function createDestinyMapPrompt(data: AnalysisData): string {
  const { astrologyResult, sajuResult, name } = data;
  const currentYear = new Date().getFullYear();

  // Slim serialization (no pretty-print) to reduce payload size
  const sajuJson = JSON.stringify(sajuResult);
  const astroJson = JSON.stringify(astrologyResult);

  const prompt = `
You are "Destiny Navigator AI." Analyze the Saju and Astrology data and return ONLY one raw JSON object that matches the contract below. Do NOT add any extra text outside the JSON.

### REQUIRED JSON OUTPUT STRUCTURE
{
  "text": "<Markdown, ≥550 words, using the exact headings below>",
  "scores": { "overall": 0-100, "career": 0-100, "love": 0-100, "health": 0-100 },
  "highlights": ["<insight 1>", "<insight 2>", "<insight 3>"]
}

### USER DATA
- Name: ${name || "The Querent"}
- Saju Data: ${sajuJson}
- Astrology Data: ${astroJson}

### OUTPUT RULES
- Use ALL headings exactly as specified.
- Every section must reference BOTH Saju and Astrology (dual-sourced).
- Be practical, clear, motivational. No filler. No extra keys beyond the contract.

### STRUCTURE FOR THE 'text' FIELD
# Executive Overview (≈150 words)
Summarize the life headline for ${currentYear}.

# Integrated Element Dynamics
- Subsection: "Elemental & Planetary Balance"
- Subsection: "Cycle Intersections"

# Strategic Focus Areas
Create three subsections: Career & Wealth, Relationships & Collaboration, Vitality & Inner Alignment.

# Month-by-Month Navigator
Create a table with columns: Month, Energy Theme, Action Cue.

# Action Playbook (Bullet list)
List 5 high-leverage habits.

# Contingency Signals
Identify 3 warning signs to watch.
`;
  return prompt;
}