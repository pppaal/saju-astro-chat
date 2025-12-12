// Test True Node calculation - find matching chart
const path = require('path');
const swisseph = require('swisseph');

const ephePath = path.join(process.cwd(), 'public', 'ephe');
swisseph.swe_set_ephe_path(ephePath);

// Target values from Astro Seek
const TARGET = {
  sun: { sign: 'Aquarius', deg: 19, min: 39 },
  moon: { sign: 'Gemini', deg: 4, min: 23 },
  trueNode: { sign: 'Scorpio', deg: 9, min: 42 },
  pluto: { sign: 'Sagittarius', deg: 0, min: 26 },
  uranus: { sign: 'Capricorn', deg: 27, min: 44 },
  neptune: { sign: 'Capricorn', deg: 24, min: 0 },
  asc: { sign: 'Aquarius', deg: 2, min: 17 },
};

const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
               'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function formatLongitude(lng) {
  const normalized = ((lng % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized % 30;
  const degree = Math.floor(degreeInSign);
  const minute = Math.round((degreeInSign - degree) * 60);
  return { sign: signs[signIndex], degree, minute, longitude: normalized };
}

function calcPlanet(jd, planetId) {
  const res = swisseph.swe_calc_ut(jd, planetId, swisseph.SEFLG_SPEED);
  return res.error ? null : formatLongitude(res.longitude);
}

function testDate(year, month, day, hour, minute) {
  const jdResult = swisseph.swe_utc_to_jd(year, month, day, hour, minute, 0, swisseph.SE_GREG_CAL);
  if (jdResult.error) return null;
  const jd = jdResult.julianDayUT;

  return {
    sun: calcPlanet(jd, swisseph.SE_SUN),
    moon: calcPlanet(jd, swisseph.SE_MOON),
    trueNode: calcPlanet(jd, swisseph.SE_TRUE_NODE),
    meanNode: calcPlanet(jd, swisseph.SE_MEAN_NODE),
    pluto: calcPlanet(jd, swisseph.SE_PLUTO),
    uranus: calcPlanet(jd, swisseph.SE_URANUS),
    neptune: calcPlanet(jd, swisseph.SE_NEPTUNE),
    jd
  };
}

console.log('=== Testing multiple years to find matching chart ===\n');
console.log('Target from Astro Seek:');
console.log('  True Node: Scorpio 9°42\'');
console.log('  Sun: Aquarius 19°39\'');
console.log('  Pluto: Sagittarius 0°26\'');
console.log('  Moon: Gemini 4°23\'\n');

// Node at Scorpio 9° + Pluto at Sag 0° is rare combination
// Pluto was at Sag 0° around Nov 1995 and briefly
// But Sun at Aquarius 19° is early February
// So this chart might not be from when Pluto first entered Sag

// Let's try various years
const testYears = [1991, 1992, 1993, 1994, 1995];

for (const year of testYears) {
  // Test around Feb 8-9 when Sun would be at Aquarius 19-20°
  for (let day = 7; day <= 10; day++) {
    const result = testDate(year, 2, day, 3, 0); // UTC 3:00 = Korea 12:00
    if (result && result.sun.sign === 'Aquarius' &&
        Math.abs(result.sun.degree - 19) <= 1) {
      console.log(`\n--- ${year}-02-${day.toString().padStart(2,'0')} UTC 03:00 ---`);
      console.log(`Sun: ${result.sun.sign} ${result.sun.degree}°${result.sun.minute}'`);
      console.log(`Moon: ${result.moon.sign} ${result.moon.degree}°${result.moon.minute}'`);
      console.log(`True Node: ${result.trueNode.sign} ${result.trueNode.degree}°${result.trueNode.minute}'`);
      console.log(`Mean Node: ${result.meanNode.sign} ${result.meanNode.degree}°${result.meanNode.minute}'`);
      console.log(`Pluto: ${result.pluto.sign} ${result.pluto.degree}°${result.pluto.minute}'`);
      console.log(`Uranus: ${result.uranus.sign} ${result.uranus.degree}°${result.uranus.minute}'`);
      console.log(`Neptune: ${result.neptune.sign} ${result.neptune.degree}°${result.neptune.minute}'`);
    }
  }
}

// Special search: find when True Node was at Scorpio 9° AND Sun at Aquarius 19°
console.log('\n\n=== Searching for exact match ===');
console.log('Looking for: Node at Scorpio ~9°, Sun at Aquarius ~19°, Moon at Gemini ~4°\n');

// Node at Scorpio 9° is about 219° longitude
// Node moves backwards ~19°/year, so we search various years
for (let year = 1990; year <= 1996; year++) {
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= 28; day++) {
      const result = testDate(year, month, day, 3, 0);
      if (!result) continue;

      // Check if all major conditions match
      if (result.trueNode.sign === 'Scorpio' &&
          Math.abs(result.trueNode.degree - 9) <= 1 &&
          result.sun.sign === 'Aquarius' &&
          Math.abs(result.sun.degree - 19) <= 1) {
        console.log(`MATCH: ${year}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`);
        console.log(`  Sun: ${result.sun.sign} ${result.sun.degree}°${result.sun.minute}'`);
        console.log(`  Moon: ${result.moon.sign} ${result.moon.degree}°${result.moon.minute}'`);
        console.log(`  True Node: ${result.trueNode.sign} ${result.trueNode.degree}°${result.trueNode.minute}'`);
        console.log(`  Pluto: ${result.pluto.sign} ${result.pluto.degree}°${result.pluto.minute}'`);
      }
    }
  }
}

console.log('\n=== Swiss Ephemeris version:', swisseph.swe_version ? swisseph.swe_version() : 'N/A', '===');
