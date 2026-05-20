/**
 * 사주 고급분석 상세 테스트
 * 실제 데이터 구조 확인 및 고급분석 검증
 */

describe("사주 데이터 구조 확인", { timeout: 30000 }, () => {
  it("pillar 구조 확인", async () => {
    const { calculateSajuData } = await import("../src/lib/saju/saju");

    const saju = calculateSajuData(
      "1990-05-15",
      "14:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    console.warn("✅ dayMaster:", saju.dayMaster);
    console.warn("\n✅ yearPillar 구조:", JSON.stringify(saju.yearPillar, null, 2));
    console.warn("\n✅ monthPillar 구조:", JSON.stringify(saju.monthPillar, null, 2));
    console.warn("\n✅ dayPillar 구조:", JSON.stringify(saju.dayPillar, null, 2));
    console.warn("\n✅ timePillar 구조:", JSON.stringify(saju.timePillar, null, 2));

    expect(saju.dayMaster).toBeDefined();
    expect(saju.yearPillar).toBeDefined();
    expect(saju.monthPillar).toBeDefined();
    expect(saju.dayPillar).toBeDefined();
    expect(saju.timePillar).toBeDefined();
  });

  it("격국 분석용 pillar 변환 테스트", async () => {
    const { calculateSajuData } = await import("../src/lib/saju/saju");
    const { determineGeokguk } = await import("../src/lib/saju/geokguk");

    const saju = calculateSajuData(
      "1990-05-15",
      "14:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    // 실제 pillar 구조에 맞게 변환
    type PillarLike = {
      heavenlyStem?: { name?: string };
      earthlyBranch?: { name?: string };
      stem?: { name?: string } | string;
      branch?: { name?: string } | string;
    };
    type SimplePillars = {
      year: { stem: string; branch: string };
      month: { stem: string; branch: string };
      day: { stem: string; branch: string };
      time: { stem: string; branch: string };
    };
    const yp: PillarLike = saju.yearPillar;
    const mp: PillarLike = saju.monthPillar;
    const dp: PillarLike = saju.dayPillar;
    const tp: PillarLike = saju.timePillar;

    // heavenlyStem/earthlyBranch가 객체 형태 (name 속성 포함)
    const getStem = (p: PillarLike) => p.heavenlyStem?.name
      || (typeof p.stem === "string" ? p.stem : p.stem?.name)
      || "";
    const getBranch = (p: PillarLike) => p.earthlyBranch?.name
      || (typeof p.branch === "string" ? p.branch : p.branch?.name)
      || "";

    const pillars: SimplePillars = {
      year: { stem: getStem(yp), branch: getBranch(yp) },
      month: { stem: getStem(mp), branch: getBranch(mp) },
      day: { stem: getStem(dp), branch: getBranch(dp) },
      time: { stem: getStem(tp), branch: getBranch(tp) },
    };

    console.warn("✅ 변환된 pillars:");
    console.warn("   년주:", pillars.year.stem + pillars.year.branch);
    console.warn("   월주:", pillars.month.stem + pillars.month.branch);
    console.warn("   일주:", pillars.day.stem + pillars.day.branch);
    console.warn("   시주:", pillars.time.stem + pillars.time.branch);

    // 이제 격국 분석 - determineGeokguk은 pillars만 받음
    try {
      const geokguk = determineGeokguk(pillars);
      console.warn("\n✅ 격국:", geokguk.primary);
      console.warn("   카테고리:", geokguk.category);
      expect(geokguk.primary).toBeTruthy();
    } catch (e) {
      console.warn("⚠️ 격국 오류:", (e as Error).message);
    }
  });

  it("모든 고급분석 종합 테스트", async () => {
    const { calculateSajuData } = await import("../src/lib/saju/saju");
    const { determineGeokguk } = await import("../src/lib/saju/geokguk");
    const { determineYongsin } = await import("../src/lib/saju/yongsin");
    const { calculateTonggeun } = await import("../src/lib/saju/tonggeun");
    const { analyzeHyeongchung } = await import("../src/lib/saju/hyeongchung");

    const saju = calculateSajuData(
      "1990-05-15",
      "14:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    // pillar 변환
    type PillarLike = {
      heavenlyStem?: { name?: string };
      earthlyBranch?: { name?: string };
      stem?: { name?: string } | string;
      branch?: { name?: string } | string;
    };
    type SimplePillars = {
      year: { stem: string; branch: string };
      month: { stem: string; branch: string };
      day: { stem: string; branch: string };
      time: { stem: string; branch: string };
    };
    type HyeongchungPillars = Omit<SimplePillars, "time"> & { hour: SimplePillars["time"] };
    const yp: PillarLike = saju.yearPillar;
    const mp: PillarLike = saju.monthPillar;
    const dp: PillarLike = saju.dayPillar;
    const tp: PillarLike = saju.timePillar;

    // heavenlyStem/earthlyBranch가 객체 형태 (name 속성 포함)
    const getStem = (p: PillarLike) => p.heavenlyStem?.name
      || (typeof p.stem === "string" ? p.stem : p.stem?.name)
      || "";
    const getBranch = (p: PillarLike) => p.earthlyBranch?.name
      || (typeof p.branch === "string" ? p.branch : p.branch?.name)
      || "";

    const pillars: SimplePillars = {
      year: { stem: getStem(yp), branch: getBranch(yp) },
      month: { stem: getStem(mp), branch: getBranch(mp) },
      day: { stem: getStem(dp), branch: getBranch(dp) },
      time: { stem: getStem(tp), branch: getBranch(tp) },
    };

    console.warn("\n🔮 사주 고급분석 결과:");
    console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 기본 정보
    console.warn("\n📌 기본 정보:");
    console.warn(`   일간: ${saju.dayMaster.name} (${saju.dayMaster.element}/${saju.dayMaster.yin_yang})`);
    console.warn(`   년주: ${pillars.year.stem}${pillars.year.branch}`);
    console.warn(`   월주: ${pillars.month.stem}${pillars.month.branch}`);
    console.warn(`   일주: ${pillars.day.stem}${pillars.day.branch}`);
    console.warn(`   시주: ${pillars.time.stem}${pillars.time.branch}`);
    console.warn(`   오행: 목${saju.fiveElements.wood} 화${saju.fiveElements.fire} 토${saju.fiveElements.earth} 금${saju.fiveElements.metal} 수${saju.fiveElements.water}`);

    // 격국 - determineGeokguk은 pillars만 받음
    console.warn("\n📌 격국 분석:");
    try {
      const geokguk = determineGeokguk(pillars);
      console.warn(`   격국: ${geokguk.primary} (${geokguk.category})`);
      console.warn(`   신뢰도: ${geokguk.confidence}`);
      if (geokguk.description) console.warn(`   설명: ${geokguk.description.slice(0, 80)}...`);
    } catch (e) {
      console.warn(`   ⚠️ 오류: ${(e as Error).message}`);
    }

    // 용신 - determineYongsin은 pillars만 받음
    console.warn("\n📌 용신 분석:");
    try {
      const yongsin = determineYongsin(pillars);
      console.warn(`   용신: ${yongsin.primaryYongsin} (${yongsin.yongsinType})`);
      console.warn(`   기신: ${yongsin.kibsin}`);
      console.warn(`   신강/신약: ${yongsin.daymasterStrength}`);
      if (yongsin.secondaryYongsin) console.warn(`   보조 용신: ${yongsin.secondaryYongsin}`);
    } catch (e) {
      console.warn(`   ⚠️ 오류: ${(e as Error).message}`);
    }

    // 통근
    console.warn("\n📌 통근 분석:");
    try {
      const tonggeun = calculateTonggeun(saju.dayMaster.name, pillars);
      console.warn(`   통근 여부: ${tonggeun.hasRoot ? "있음" : "없음"}`);
      console.warn(`   통근 강도: ${tonggeun.totalStrength}`);
      if (tonggeun.roots?.length) {
        console.warn(`   통근 위치: ${tonggeun.roots.map((root) => root.branch).join(", ")}`);
      }
    } catch (e) {
      console.warn(`   ⚠️ 오류: ${(e as Error).message}`);
    }

    // 형충회합 - pillars with hour key (not time)
    console.warn("\n📌 형충회합 분석:");
    try {
      const pillarsForHyeongchung: HyeongchungPillars = {
        year: pillars.year,
        month: pillars.month,
        day: pillars.day,
        hour: pillars.time,  // time -> hour 변환
      };
      type HyeongchungDebug = {
        chung?: Array<{ type?: string } | string>;
        hap?: Array<{ type?: string } | string>;
        hyeong?: Array<unknown>;
        hae?: Array<unknown>;
      };
      const hyeongchung = analyzeHyeongchung(pillarsForHyeongchung) as unknown as HyeongchungDebug;
      console.warn(`   충: ${hyeongchung.chung?.length || 0}개 - ${hyeongchung.chung?.map((c) => c.type || c).join(", ") || "없음"}`);
      console.warn(`   합: ${hyeongchung.hap?.length || 0}개 - ${hyeongchung.hap?.map((h) => h.type || h).join(", ") || "없음"}`);
      console.warn(`   형: ${hyeongchung.hyeong?.length || 0}개`);
      console.warn(`   해: ${hyeongchung.hae?.length || 0}개`);
    } catch (e) {
      console.warn(`   ⚠️ 오류: ${(e as Error).message}`);
    }

    // 대운
    console.warn("\n📌 대운 정보:");
    console.warn(`   대운 시작 나이: ${saju.daeWoon.startAge}세`);
    console.warn(`   대운 목록 (처음 5개):`);
    saju.daeWoon.list.slice(0, 5).forEach((d, i: number) => {
      console.warn(`     ${i + 1}. ${d.stem?.name || d.heavenlyStem}${d.branch?.name || d.earthlyBranch} (${saju.daeWoon.startAge + i * 10}세)`);
    });

    console.warn("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    expect(saju.dayMaster.name).toBeTruthy();
  });
});
