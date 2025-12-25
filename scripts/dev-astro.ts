import { calculateNatalChart, toChart, calculateTransitChart,
findNatalAspects, findAspects,
findAspectsPlus, resolveOptions, buildEngineMeta
} from "@/lib/astrology";

async function main() {
  const natalInput = {
    year: 1990, month: 1, date: 1,
    hour: 12, minute: 0,
    latitude: 37.5665, longitude: 126.9780,
    timeZone: "Asia/Seoul",
  };

  const natal = await calculateNatalChart(natalInput);
  const natalChart = toChart(natal);

  const transit = await calculateTransitChart({
    iso: "2025-01-01T12:00:00",
    latitude: 37.5665, longitude: 126.9780,
    timeZone: "Asia/Seoul",
  });

  const baseNatal = findNatalAspects(natalChart);
  const hits = findAspects(natalChart, transit);

  const opts = resolveOptions({ theme: "hybrid", includeMinorAspects: true });
  const plus = findAspectsPlus(natalChart, transit, {}, opts);
  const meta = buildEngineMeta(transit.meta!, opts);

  console.warn("OK ✓",
    { natalPlanets: natal.planets.length, transitPlanets: transit.planets.length,
      topNatal: baseNatal[0], topTransit: hits[0], topPlus: plus[0], meta });
}

main().catch(e => { console.error("FAIL ✗", e); process.exit(1); });