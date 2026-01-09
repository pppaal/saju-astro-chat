import fetch from 'node-fetch';

const profiles = [
  { name: 'P1-70s', birthDate: '1970-01-15', birthTime: '08:30', birthPlace: 'Seoul' },
  { name: 'P2-70s', birthDate: '1975-06-20', birthTime: '14:45', birthPlace: 'New York' },
  { name: 'P3-80s', birthDate: '1980-11-03', birthTime: '20:15', birthPlace: 'London' },
  { name: 'P4-80s', birthDate: '1985-03-25', birthTime: '02:30', birthPlace: 'Tokyo' },
  { name: 'P5-90s', birthDate: '1990-09-10', birthTime: '11:00', birthPlace: 'Paris' },
  { name: 'P6-90s', birthDate: '1995-02-14', birthTime: '09:15', birthPlace: 'Seoul' },
  { name: 'P7-00s', birthDate: '2000-07-22', birthTime: '15:30', birthPlace: 'New York' },
  { name: 'P8-00s', birthDate: '2005-12-31', birthTime: '21:45', birthPlace: 'London' },
];

const years = [2005, 2015, 2024, 2025, 2030, 2040];
const locales = ['ko', 'en'];

async function testApi() {
  const results = [];
  let success = 0, failed = 0;
  const start = Date.now();
  
  for (const p of profiles) {
    for (const yr of years) {
      for (const loc of locales) {
        const url = 'http://localhost:3000/api/calendar?' + 
          new URLSearchParams({
            year: yr.toString(),
            locale: loc,
            birthDate: p.birthDate,
            birthTime: p.birthTime,
            birthPlace: p.birthPlace
          });
        
        try {
          console.log();
          const res = await fetch(url);
          
          if (!res.ok) {
            failed++;
            results.push({ profile: p.name, year: yr, locale: loc, error:  });
            continue;
          }
          
          const data = await res.json();
          const grades = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0 };
          const titles = new Set();
          const descs = new Set();
          
          data.forEach(d => {
            if (d.grade >= 0 && d.grade <= 5) grades[d.grade]++;
            if (d.title) titles.add(d.title);
            if (d.description) descs.add(d.description);
          });
          
          success++;
          results.push({
            profile: p.name,
            year: yr,
            locale: loc,
            days: data.length,
            grades,
            uniqueTitles: titles.size,
            uniqueDescs: descs.size,
            sample: data[0]
          });
          
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          failed++;
          results.push({ profile: p.name, year: yr, locale: loc, error: err.message });
        }
      }
    }
  }
  
  const dur = ((Date.now() - start) / 1000).toFixed(1);
  
  console.log('
' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('Total:', success + failed);
  console.log('Success:', success);
  console.log('Failed:', failed);
  console.log('Duration:', dur + 's');
  
  if (success > 0) {
    const agg = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0 };
    let totalDays = 0;
    
    results.filter(r => r.grades).forEach(r => {
      Object.entries(r.grades).forEach(([g, c]) => {
        agg[g] += c;
        totalDays += c;
      });
    });
    
    console.log('
Grade Distribution:');
    const names = ['천운', '최고', '좋은날', '보통', '나쁜날', '최악'];
    for (let i = 0; i <= 5; i++) {
      const pct = ((agg[i] / totalDays) * 100).toFixed(1);
      console.log();
    }
    
    const avgDays = results.filter(r => r.days).reduce((s, r) => s + r.days, 0) / results.filter(r => r.days).length;
    const avgTitles = results.filter(r => r.uniqueTitles).reduce((s, r) => s + r.uniqueTitles, 0) / results.filter(r => r.uniqueTitles).length;
    
    console.log('
Content Diversity:');
    console.log('  Avg days:', avgDays.toFixed(1));
    console.log('  Avg unique titles:', avgTitles.toFixed(1));
    console.log('  Diversity ratio:', ((avgTitles / avgDays) * 100).toFixed(1) + '%');
  }
  
  if (failed > 0) {
    console.log('
Failed Tests:');
    results.filter(r => r.error).forEach(r => {
      console.log();
    });
  }
  
  require('fs').writeFileSync('c:/dev/saju-astro-chat/test-results.json', JSON.stringify(results, null, 2));
  console.log('
Results saved to test-results.json');
}

testApi().catch(err => console.error('Error:', err));
