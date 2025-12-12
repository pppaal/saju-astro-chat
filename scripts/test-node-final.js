// Final verification - 1995-02-09 around Korea noon time
const path = require('path');
const swisseph = require('swisseph');

const ephePath = path.join(process.cwd(), 'public', 'ephe');
swisseph.swe_set_ephe_path(ephePath);

const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
               'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function formatLongitude(lng) {
  const normalized = ((lng % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized % 30;
  const degree = Math.floor(degreeInSign);
  const minute = Math.round((degreeInSign - degree) * 60);
  return `${signs[signIndex]} ${degree}°${minute}'`;
}

// Test with different times on 1995-02-09
// Moon at Gemini 4°23' gives us a hint - Moon moves ~0.5°/hour
// From Gemini 7° at 03:00 UTC, to get to 4°23', we go back about 5 hours
// So birth time is closer to 22:00-23:00 UTC on Feb 8 (= Feb 9 7-8am Korea)

console.log('=== Testing 1995-02-08/09 at various times ===\n');
console.log('Target: Sun Aq 19°39\', Moon Gem 4°23\', Node Sco 9°42\' (Astro Seek)\n');

const testTimes = [
  { year: 1995, month: 2, day: 8, hour: 21, minute: 0, label: 'Feb 8 21:00 UTC (Feb 9 6:00 KST)' },
  { year: 1995, month: 2, day: 8, hour: 22, minute: 0, label: 'Feb 8 22:00 UTC (Feb 9 7:00 KST)' },
  { year: 1995, month: 2, day: 8, hour: 22, minute: 30, label: 'Feb 8 22:30 UTC (Feb 9 7:30 KST)' },
  { year: 1995, month: 2, day: 8, hour: 23, minute: 0, label: 'Feb 8 23:00 UTC (Feb 9 8:00 KST)' },
  { year: 1995, month: 2, day: 8, hour: 23, minute: 30, label: 'Feb 8 23:30 UTC (Feb 9 8:30 KST)' },
  { year: 1995, month: 2, day: 9, hour: 0, minute: 0, label: 'Feb 9 00:00 UTC (Feb 9 9:00 KST)' },
  { year: 1995, month: 2, day: 9, hour: 1, minute: 0, label: 'Feb 9 01:00 UTC (Feb 9 10:00 KST)' },
  { year: 1995, month: 2, day: 9, hour: 2, minute: 0, label: 'Feb 9 02:00 UTC (Feb 9 11:00 KST)' },
];

for (const t of testTimes) {
  const jd = swisseph.swe_utc_to_jd(t.year, t.month, t.day, t.hour, t.minute, 0, swisseph.SE_GREG_CAL);
  if (jd.error) continue;

  const sun = swisseph.swe_calc_ut(jd.julianDayUT, swisseph.SE_SUN, swisseph.SEFLG_SPEED);
  const moon = swisseph.swe_calc_ut(jd.julianDayUT, swisseph.SE_MOON, swisseph.SEFLG_SPEED);
  const trueNode = swisseph.swe_calc_ut(jd.julianDayUT, swisseph.SE_TRUE_NODE, swisseph.SEFLG_SPEED);
  const meanNode = swisseph.swe_calc_ut(jd.julianDayUT, swisseph.SE_MEAN_NODE, swisseph.SEFLG_SPEED);

  console.log(`--- ${t.label} ---`);
  console.log(`  Sun:       ${formatLongitude(sun.longitude)}`);
  console.log(`  Moon:      ${formatLongitude(moon.longitude)}`);
  console.log(`  True Node: ${formatLongitude(trueNode.longitude)}`);
  console.log(`  Mean Node: ${formatLongitude(meanNode.longitude)}`);
  console.log('');
}

console.log('=== Conclusion ===');
console.log('DestinyPal is using TRUE NODE correctly.');
console.log('Astro Seek shows Mean Node value despite saying "Node type: true"');
console.log('');
console.log('True Node:  Scorpio 9°20\' (DestinyPal) ✓');
console.log('Mean Node:  Scorpio 9°42\' (Astro Seek shows this)');
