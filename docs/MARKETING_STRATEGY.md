# Marketing Strategy & Competitiveness

Last updated: 2026-06-16

> **Scope of this doc.** A practical go-to-market plan for the product **as it
> actually exists in code today**, written for a **solo operator with a ~$0
> paid-marketing budget**, targeting **Korea + English markets in parallel**.
> This is non-normative for runtime behavior (same rule as `UNICORN_STRATEGY.md`):
> strategy claims must never override code truth.

For the broader (and partly aspirational) market sizing, see
`docs/archive/unicorn-analysis/`. **Read the "Honest claims" section below before
reusing any copy from those archived docs** — several of their claims do not
match the current codebase.

---

## 1. What we are actually selling (claim hygiene)

The archived unicorn docs overstate the product. Before writing any ad, landing
page, or post, hold copy to this table. Say only the left column.

| Claim you CAN make (true in code)                                                                         | Claim to AVOID (not in current code)                      |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Saju (사주) · Western astrology · Tarot · Compatibility (궁합) · timing Calendar (운흐름) · AI counseling | "8 systems", a dating / "Destiny Match" feature           |
| Powered by **Claude** (Anthropic)                                                                         | "GPT-4o" / OpenAI                                         |
| **Korean + English**                                                                                      | "10 languages"                                            |
| **One-time credit packs** (₩1,900–₩39,900); first reading is the cheap hook                               | "Subscription", "$X/month plans"                          |
| The **judgment is computed by a deterministic engine**; the AI only narrates it                           | "the AI predicts your future" / unbounded mystical claims |

Source of truth: `CLAUDE.md`, `OVERVIEW.md`, `src/lib/config/pricing.ts`.

---

## 2. The one real differentiator (lead with this)

Most "AI 사주 / AI tarot" products — and ChatGPT-as-a-fortune-teller — share one
fatal flaw: **the model makes it up, and says something different every time.**
Pure astrology apps (Co-Star, The Pattern) give shallow, generic readings.
Manse-ryeok (만세력) apps give you raw pillars with no interpretation.

Our architecture is structurally different (`CLAUDE.md`):

> The **judgment** — which signals matter, how Saju and astrology reinforce or
> contradict each other, what the timing is — is computed by a **deterministic
> engine in code**. The LLM only puts that judgment into warm, readable language.

That yields three claims competitors can't easily copy:

1. **Reproducible** — same birth input → same judgment, every time. (`calculateSajuData`)
2. **East–West cross-validation** — Saju × astrology fused in one fact layer
   (`src/lib/cross/`). Almost no competitor does both, let alone reconciles them.
3. **Korean-native Saju authenticity** + English in the same engine.

### Positioning line (use everywhere)

- **KO:** "지어내지 않는 AI 사주 — 계산은 엔진이, 풀이는 AI가."
- **EN:** "AI readings that don't make it up — the engine computes, the AI explains."

This wedges precisely into the gap between **ChatGPT 사주 (hallucinates)** and
**만세력 앱 (no interpretation)**.

---

## 3. Honest competitiveness assessment

| Dimension                    | Verdict    | Notes                                                                                         |
| ---------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Product / engine depth       | **Strong** | Deterministic engine + Saju×astrology fusion is a genuine moat.                               |
| Price                        | **Strong** | First reading hook + ₩1,900 entry vs ₩30k–100k offline.                                       |
| Distribution / brand         | **Zero**   | No users, no audience, no PMF data yet. This is the real problem.                             |
| Defensibility vs big players | **Medium** | Kakao/Naver could enter, but Saju×astrology fusion + reproducibility is non-trivial to clone. |

**Bottom line:** the thing we'd sell is good; nobody knows it exists. The threat
isn't competitors — it's **first users + retention**. Every action below optimizes
for cheap reach and a first "aha", not for fighting Co-Star.

---

## 4. Zero-budget channel plan (KO + EN in parallel)

Ranked by leverage-per-dollar. All achievable solo.

### 4.1 SEO content — the cheapest durable channel (do first)

We already ship a bilingual blog in `src/data/blog/posts/` (ko/en pairs):

- `what-is-saju-four-pillars-destiny`
- `understanding-western-astrology-birth-chart`
- `compatibility-astrology-relationship-guide`
- `tarot-love-reading-complete-guide`
- `tarot-card-meanings-beginners-guide`
- `destiny-map-life-blueprint-guide`

Action: make each post earn its keyword and funnel to a free reading.

**Keyword map (intent → content):**

| Korean                                | English                                    | Target page                    |
| ------------------------------------- | ------------------------------------------ | ------------------------------ |
| 무료 사주, 사주 보는 법, 내 사주 풀이 | free saju reading, four pillars calculator | Saju post → free reading CTA   |
| 궁합 보기, 무료 궁합, 사주 궁합       | free compatibility, synastry calculator    | Compatibility post → 궁합 flow |
| 타로 연애, 무료 타로, 타로 카드 의미  | free tarot reading, tarot card meanings    | Tarot posts → tarot flow       |
| 별자리 운세, 내 별자리표, 출생 차트   | birth chart reading, natal chart free      | Astrology post → chart flow    |

Each post must: target one primary keyword in title/H1/meta, answer the query
fully, then CTA to the relevant free reading. Submit sitemap to Google Search
Console + Naver Search Advisor on day 1.

### 4.2 Free first reading → shareable result card (viral loop)

Saju/궁합/tarot are inherently social — people read them _with_ friends.

- First reading free, instant, no signup friction before the "aha".
- Auto-generate a clean share image (Open Graph card) for KakaoTalk / Instagram
  Story / X. The reproducibility angle is the hook: _"AI인데 매번 말이 안 바뀌네."_
- Referral: both sides get credits (pricing already supports credit grants).

### 4.3 Community seeding (manual, high-trust)

- **KO:** Instagram 사주/타로/MBTI accounts, 더쿠/디시 related boards, Naver
  cafes/blogs. Lead with the _"doesn't make it up"_ angle, not a sales pitch.
- **EN:** Reddit (r/astrology, r/tarot — read each sub's self-promo rules first),
  astrology TikTok/Reels comment presence, Product Hunt launch when polished.
- Win condition is authentic "wait, this one is actually consistent" reactions,
  which money can't buy and bigger competitors won't bother with.

### 4.4 What to skip for now

Paid ads, influencer contracts, PR pushes, B2B API, international expansion
beyond EN. Revisit only after the funnel below shows a real retention signal.

---

## 5. 30 / 60 / 90-day execution (solo)

**Days 0–30 — instrument + foundation**

- [ ] Google Search Console + Naver Search Advisor verified; sitemap submitted.
- [ ] Free first reading flow is frictionless; "aha" reachable in < 5 min.
- [ ] OG share-card image generates for every reading type.
- [ ] Basic funnel analytics: visit → reading started → reading completed → return.
- [ ] Each of the 6 blog posts mapped to one keyword + CTA (§4.1).

**Days 31–60 — distribution**

- [ ] Publish 2–4 new SEO posts on long-tail keywords with weak competition.
- [ ] Seed 3–5 communities/week (KO + EN), tracking which drive completed readings.
- [ ] Ship referral credit loop; instrument K-factor.

**Days 61–90 — double down on what moved**

- [ ] Cut dead channels; reinvest time in the 1–2 that produced completed readings.
- [ ] Product Hunt / larger community launch once the funnel is smooth.
- [ ] First retention read: are day-7 returners trending up?

---

## 6. Metrics that matter (ignore vanity numbers)

North-star: **completed readings per week** (a completed reading ≈ delivered value).

| Stage       | Watch                                               | Early healthy signal                     |
| ----------- | --------------------------------------------------- | ---------------------------------------- |
| Acquisition | organic visits, source per completed reading        | any non-zero organic from SEO            |
| Activation  | % who finish a first reading, time-to-first-reading | > 60% finish, < 5 min                    |
| Referral    | share rate, K-factor                                | shares > 0, K trending up                |
| Retention   | D7 return                                           | the single number that says "keep going" |

Don't chase MAU/downloads before D7 retention shows life. With $0 and one person,
retention is the only honest proof of product–market fit.

---

## 7. Risks specific to this plan

- **Thin spreading (KO+EN at once):** mitigate by sharing the _same_ engine and
  blog infra — only copy/community work forks per language.
- **Trust/compliance:** keep claims bounded (§1). Never promise outcomes; frame
  as guidance. This is also a legal-safety posture, not just honesty.
- **Big-platform entry (Kakao/Naver):** can't out-spend them — out-specialize.
  Reproducibility + Saju×astrology fusion is the defensible corner.

---

## Related

- `CLAUDE.md`, `OVERVIEW.md` — what the product actually is (claim source of truth)
- `src/lib/config/pricing.ts` — credit-pack pricing (do not hardcode elsewhere)
- `docs/archive/unicorn-analysis/` — broader market sizing (treat claims with care)
