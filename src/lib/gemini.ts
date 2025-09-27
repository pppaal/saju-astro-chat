export async function callGeminiText(prompt: string, maxOutputTokens = 2048) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"] as const;

  async function tryOnce(model: string, attempt = 0) {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }]}],
      generationConfig: { temperature: 0.48, topP: 0.9, topK: 64, maxOutputTokens },
    };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if ((res.status === 429 || res.status === 503) && attempt < 3) {
        await new Promise(r => setTimeout(r, Math.min(2000 * 2 ** attempt, 8000)));
        return tryOnce(model, attempt + 1);
      }
      throw new Error(`Gemini(${model}@v1) ${res.status}: ${txt}`);
    }
    const j = await res.json();
    const text = (j?.candidates?.[0]?.content?.parts as any[] | undefined)?.map(p => p?.text ?? "").join("") || "";
    return { text, model };
  }

  let last = "";
  for (const m of MODELS) {
    try { return await tryOnce(m); } catch (e: any) { last = String(e?.message || e); }
  }
  throw new Error(`All candidates failed. Last=${last}`);
}