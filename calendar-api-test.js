const fs = require("fs");
const TOKEN = "066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e";
async function test() {
  const results = [];
  const profiles = [
    {name:"P1-1970",birthDate:"1970-01-15",birthTime:"08:30",birthPlace:"Seoul"},
    {name:"P2-1975",birthDate:"1975-06-20",birthTime:"14:45",birthPlace:"New York"},
    {name:"P3-1980",birthDate:"1980-11-03",birthTime:"20:15",birthPlace:"London"},
    {name:"P4-1985",birthDate:"1985-03-25",birthTime:"02:30",birthPlace:"Tokyo"},
    {name:"P5-1990",birthDate:"1990-09-10",birthTime:"11:00",birthPlace:"Paris"},
    {name:"P6-1995",birthDate:"1995-02-14",birthTime:"09:15",birthPlace:"Seoul"},
    {name:"P7-2000",birthDate:"2000-07-22",birthTime:"15:30",birthPlace:"New York"},
    {name:"P8-2005",birthDate:"2005-12-31",birthTime:"21:45",birthPlace:"London"}
  ];
  const years = [2005, 2015, 2024, 2025, 2030, 2040];
  const locales = ["ko", "en"];
  let s=0, f=0;
  const start = Date.now();
  for (const p of profiles) {
    for (const yr of years) {
      for (const loc of locales) {
        try {
          const params = new URLSearchParams({year:yr,locale:loc,birthDate:p.birthDate,birthTime:p.birthTime,birthPlace:p.birthPlace});
          const url = "http://localhost:3000/api/calendar?" + params;
          console.log("Testing",p.name,yr,loc,"...");
          const res = await fetch(url, {headers:{"x-api-token":TOKEN}});
          if (\!res.ok) { f++; console.log("  FAILED: HTTP",res.status); continue; }
          const data = await res.json();
          s++;
          const g = {0:0,1:0,2:0,3:0,4:0,5:0};
          const titles = new Set();
          const descs = new Set();
          data.forEach(d=>{
            if(d.grade>=0&&d.grade<=5)g[d.grade]++;
            if(d.title)titles.add(d.title);
            if(d.description)descs.add(d.description);
          });
          results.push({profile:p.name,year:yr,locale:loc,days:data.length,grades:g,uniqueTitles:titles.size,uniqueDescs:descs.size,sample:data[0]});
          console.log("  SUCCESS:",data.length,"days,",titles.size,"unique titles");
          await new Promise(r=>setTimeout(r,120));
        } catch(e) { f++; console.log("  ERROR:",e.message); }
      }
    }
  }
  const dur = ((Date.now()-start)/1000).toFixed(1);
  console.log("\n" + "=".repeat(70));
  console.log("TEST SUMMARY");
  console.log("=".repeat(70));
  console.log("Total tests:",(s+f));
  console.log("Successful:",s,"("+(s/(s+f)*100).toFixed(1)+"%)");
  console.log("Failed:",f,"("+(f/(s+f)*100).toFixed(1)+"%)");
  console.log("Duration:",dur+"s");
  if(s>0){
    const ag={0:0,1:0,2:0,3:0,4:0,5:0};
    let tot=0;
    results.filter(r=>r.days).forEach(r=>{
      Object.entries(r.grades).forEach(([g,c])=>{ag[parseInt(g)]+=c;tot+=c;});
    });
    console.log("\n" + "=".repeat(70));
    console.log("GRADE DISTRIBUTION");
    console.log("=".repeat(70));
    const names=["천운 (Heaven)","최고 (Best)","좋은날 (Good)","보통 (Normal)","나쁜날 (Bad)","최악 (Worst)"];
    for(let i=0;i<=5;i++){
      const c=ag[i];
      const p=(c/tot*100).toFixed(2);
      console.log("Grade",i,names[i]+":",c,"days ("+p+"%)");
    }
    const sr=results.filter(r=>r.days);
    const avgDays=sr.reduce((s,r)=>s+r.days,0)/sr.length;
    const avgTitles=sr.reduce((s,r)=>s+r.uniqueTitles,0)/sr.length;
    const avgDescs=sr.reduce((s,r)=>s+r.uniqueDescs,0)/sr.length;
    console.log("\n" + "=".repeat(70));
    console.log("CONTENT DIVERSITY");
    console.log("=".repeat(70));
    console.log("Average days per response:",avgDays.toFixed(1));
    console.log("Average unique titles:",avgTitles.toFixed(1));
    console.log("Average unique descriptions:",avgDescs.toFixed(1));
    console.log("Title diversity ratio:",(avgTitles/avgDays*100).toFixed(1)+"%");
    console.log("Description diversity ratio:",(avgDescs/avgDays*100).toFixed(1)+"%");
    console.log("\n" + "=".repeat(70));
    console.log("SAMPLE CONTENT (First Result)");
    console.log("=".repeat(70));
    const first=sr[0];
    if(first&&first.sample){
      console.log("Profile:",first.profile,"-","Year:",first.year,"-","Locale:",first.locale);
      console.log("Sample Date:",first.sample.date);
      console.log("Grade:",first.sample.grade,"("+names[first.sample.grade]+")");
      console.log("Title:",first.sample.title);
      const desc=first.sample.description||"";
      console.log("Description:",desc.substring(0,120)+"...");
    }
  }
  if(f>0){
    console.log("\n" + "=".repeat(70));
    console.log("FAILED TESTS");
    console.log("=".repeat(70));
    results.filter(r=>\!r.days).slice(0,10).forEach(r=>{
      console.log("  ",r.profile,r.year,r.locale);
    });
  }
  fs.writeFileSync("c:/dev/saju-astro-chat/calendar-test-results.json",JSON.stringify(results,null,2));
  console.log("\nDetailed results saved to: c:/dev/saju-astro-chat/calendar-test-results.json");
}
test().catch(e=>{console.error("Fatal error:",e);process.exit(1);});
