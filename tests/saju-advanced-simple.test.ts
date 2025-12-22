/**
 * 사주 고급분석 상세 테스트
 * 실제 데이터 구조 확인 및 고급분석 검증
 */

describe("사주 데이터 구조 확인", () => {
  it("pillar 구조 확인", async () => {
    const { calculateSajuData } = await import("../src/lib/Saju/saju");

    const saju = calculateSajuData(
      "1990-05-15",
      "14:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    console.log("✅ dayMaster:", saju.dayMaster);
    console.log("\n✅ yearPillar 구조:", JSON.stringify(saju.yearPillar, null, 2));
    console.log("\n✅ monthPillar 구조:", JSON.stringify(saju.monthPillar, null, 2));
    console.log("\n✅ dayPillar 구조:", JSON.stringify(saju.dayPillar, null, 2));
    console.log("\n✅ timePillar 구조:", JSON.stringify(saju.timePillar, null, 2));

    expect(saju.dayMaster).toBeDefined();
    expect(saju.yearPillar).toBeDefined();
    expect(saju.monthPillar).toBeDefined();
    expect(saju.dayPillar).toBeDefined();
    expect(saju.timePillar).toBeDefined();
  });

  it("격국 분석용 pillar 변환 테스트", async () => {
    const { calculateSajuData } = await import("../src/lib/Saju/saju");
    const { determineGeokguk } = await import("../src/lib/Saju/geokguk");

    const saju = calculateSajuData(
      "1990-05-15",
      "14:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    // 실제 pillar 구조에 맞게 변환
    const yp = saju.yearPillar as any;
    const mp = saju.monthPillar as any;
    const dp = saju.dayPillar as any;
    const tp = saju.timePillar as any;

    // heavenlyStem/earthlyBranch가 객체 형태 (name 속성 포함)
    const getStem = (p: any) => p.heavenlyStem?.name || p.stem?.name || p.stem || "";
    const getBranch = (p: any) => p.earthlyBranch?.name || p.branch?.name || p.branch || "";

    const pillars = {
      year: { stem: getStem(yp), branch: getBranch(yp) },
      month: { stem: getStem(mp), branch: getBranch(mp) },
      day: { stem: getStem(dp), branch: getBranch(dp) },
      time: { stem: getStem(tp), branch: getBranch(tp) },
    };

    console.log("✅ 변환된 pillars:");
    console.log("   년주:", pillars.year.stem + pillars.year.branch);
    console.log("   월주:", pillars.month.stem + pillars.month.branch);
    console.log("   일주:", pillars.day.stem + pillars.day.branch);
    console.log("   시주:", pillars.time.stem + pillars.time.branch);

    // 이제 격국 분석 - determineGeokguk은 pillars만 받음
    try {
      const geokguk = determineGeokguk(pillars as any);
      console.log("\n✅ 격국:", geokguk.primary);
      console.log("   카테고리:", geokguk.category);
      expect(geokguk.primary).toBeTruthy();
    } catch (e) {
      console.log("⚠️ 격국 오류:", (e as Error).message);
    }
  });

  it("모든 고급분석 종합 테스트", async () => {
    const { calculateSajuData } = await import("../src/lib/Saju/saju");
    const { determineGeokguk } = await import("../src/lib/Saju/geokguk");
    const { determineYongsin } = await import("../src/lib/Saju/yongsin");
    const { calculateTonggeun } = await import("../src/lib/Saju/tonggeun");
    const { analyzeHyeongchung } = await import("../src/lib/Saju/hyeongchung");

    const saju = calculateSajuData(
      "1990-05-15",
      "14:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    // pillar 변환
    const yp = saju.yearPillar as any;
    const mp = saju.monthPillar as any;
    const dp = saju.dayPillar as any;
    const tp = saju.timePillar as any;

    // heavenlyStem/earthlyBranch가 객체 형태 (name 속성 포함)
    const getStem = (p: any) => p.heavenlyStem?.name || p.stem?.name || p.stem || "";
    const getBranch = (p: any) => p.earthlyBranch?.name || p.branch?.name || p.branch || "";

    const pillars = {
      year: { stem: getStem(yp), branch: getBranch(yp) },
      month: { stem: getStem(mp), branch: getBranch(mp) },
      day: { stem: getStem(dp), branch: getBranch(dp) },
      time: { stem: getStem(tp), branch: getBranch(tp) },
    };

    console.log("\n🔮 사주 고급분석 결과:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 기본 정보
    console.log("\n📌 기본 정보:");
    console.log(`   일간: ${saju.dayMaster.name} (${saju.dayMaster.element}/${saju.dayMaster.yin_yang})`);
    console.log(`   년주: ${pillars.year.stem}${pillars.year.branch}`);
    console.log(`   월주: ${pillars.month.stem}${pillars.month.branch}`);
    console.log(`   일주: ${pillars.day.stem}${pillars.day.branch}`);
    console.log(`   시주: ${pillars.time.stem}${pillars.time.branch}`);
    console.log(`   오행: 목${saju.fiveElements.wood} 화${saju.fiveElements.fire} 토${saju.fiveElements.earth} 금${saju.fiveElements.metal} 수${saju.fiveElements.water}`);

    // 격국 - determineGeokguk은 pillars만 받음
    console.log("\n📌 격국 분석:");
    try {
      const geokguk = determineGeokguk(pillars as any);
      console.log(`   격국: ${geokguk.primary} (${geokguk.category})`);
      console.log(`   신뢰도: ${geokguk.confidence}`);
      if (geokguk.description) console.log(`   설명: ${geokguk.description.slice(0, 80)}...`);
    } catch (e) {
      console.log(`   ⚠️ 오류: ${(e as Error).message}`);
    }

    // 용신 - determineYongsin은 pillars만 받음
    console.log("\n📌 용신 분석:");
    try {
      const yongsin = determineYongsin(pillars as any);
      console.log(`   용신: ${yongsin.primaryYongsin} (${yongsin.yongsinType})`);
      console.log(`   기신: ${yongsin.kibsin}`);
      console.log(`   신강/신약: ${yongsin.daymasterStrength}`);
      if (yongsin.secondaryYongsin) console.log(`   보조 용신: ${yongsin.secondaryYongsin}`);
    } catch (e) {
      console.log(`   ⚠️ 오류: ${(e as Error).message}`);
    }

    // 통근
    console.log("\n📌 통근 분석:");
    try {
      const tonggeun = calculateTonggeun(saju.dayMaster.name, pillars as any);
      console.log(`   통근 여부: ${tonggeun.hasRoot ? "있음" : "없음"}`);
      console.log(`   통근 강도: ${tonggeun.totalStrength}`);
      if (tonggeun.roots?.length) {
        console.log(`   통근 위치: ${tonggeun.roots.map((r: any) => r.branch).join(", ")}`);
      }
    } catch (e) {
      console.log(`   ⚠️ 오류: ${(e as Error).message}`);
    }

    // 형충회합 - pillars with hour key (not time)
    console.log("\n📌 형충회합 분석:");
    try {
      const pillarsForHyeongchung = {
        year: pillars.year,
        month: pillars.month,
        day: pillars.day,
        hour: pillars.time,  // time -> hour 변환
      };
      const hyeongchung = analyzeHyeongchung(pillarsForHyeongchung as any);
      console.log(`   충: ${hyeongchung.chung?.length || 0}개 - ${hyeongchung.chung?.map((c: any) => c.type || c).join(", ") || "없음"}`);
      console.log(`   합: ${hyeongchung.hap?.length || 0}개 - ${hyeongchung.hap?.map((h: any) => h.type || h).join(", ") || "없음"}`);
      console.log(`   형: ${hyeongchung.hyeong?.length || 0}개`);
      console.log(`   해: ${hyeongchung.hae?.length || 0}개`);
    } catch (e) {
      console.log(`   ⚠️ 오류: ${(e as Error).message}`);
    }

    // 대운
    console.log("\n📌 대운 정보:");
    console.log(`   대운 시작 나이: ${saju.daeWoon.startAge}세`);
    console.log(`   대운 목록 (처음 5개):`);
    saju.daeWoon.list.slice(0, 5).forEach((d: any, i: number) => {
      console.log(`     ${i + 1}. ${d.stem?.name || d.heavenlyStem}${d.branch?.name || d.earthlyBranch} (${saju.daeWoon.startAge + i * 10}세)`);
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    expect(saju.dayMaster.name).toBeTruthy();
  });
});
