import fs from "fs";
import path from "path";
import { computeDestinyMap } from "../src/lib/destiny-map/astrologyengine";

async function main() {
  const result = await computeDestinyMap({
    name: "User",
    birthDate: "1995-02-09",
    birthTime: "06:40",
    latitude: 37.5665,
    longitude: 126.9780,
    gender: "male",
    tz: "Asia/Seoul",
    userTimezone: "Asia/Seoul",
    theme: "career",
  });

  const planets = Array.isArray(result.astrology?.planets) ? result.astrology.planets : [];
  const byName: Record<string, any> = Object.create(null);
  for (const p of planets) {
    if (p && p.name) byName[String(p.name).toLowerCase()] = p;
  }

  const astroPayload = {
    sun: byName.sun,
    moon: byName.moon,
    mercury: byName.mercury,
    venus: byName.venus,
    mars: byName.mars,
    jupiter: byName.jupiter,
    saturn: byName.saturn,
    ascendant: result.astrology?.ascendant,
    houses: result.astrology?.houses,
    aspects: result.astrology?.aspects,
    facts: result.astrology?.facts,
    planets: result.astrology?.planets,
    mc: result.astrology?.mc,
  };

  const saju = result.saju || {};
  const facts = (saju as any).facts || {};
  const sajuPayload = {
    ...saju,
    fiveElements: facts.fiveElements,
    dominantElement: facts.dominantElement,
    tenGods: facts.tenGods,
  };

  const out = { saju: sajuPayload, astro: astroPayload };
  const outPath = path.join("logs", "tmp-destiny-sample.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
