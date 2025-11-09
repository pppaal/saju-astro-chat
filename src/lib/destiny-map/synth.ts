import type { DestinyAggregate, DestinySynthesis } from "./types";

function pick<T>(arr: T[] | undefined, name: string): any {
  if (!arr) return undefined;
  // western.planets에서 name으로 찾는 헬퍼
  // @ts-ignore
  return arr.find((p:any) => (p.name || p.planet) === name);
}

export function synthesize(agg: DestinyAggregate): DestinySynthesis {
  const sun = pick(agg.western.planets, "Sun");
  const moon = pick(agg.western.planets, "Moon");
  const asc = agg.western.ascendant;

  const dm = agg.saju.dayMaster; // { name, element, yin_yang }
  const five = agg.saju.fiveElements;

  // 간단한 키워드 합성 규칙(초안)
  const keywords: string[] = [];
  if (sun?.sign) keywords.push(`Sun in ${sun.sign}`);
  if (moon?.sign) keywords.push(`Moon in ${moon.sign}`);
  if (asc?.sign) keywords.push(`ASC ${asc.sign}`);
  if (dm?.name) keywords.push(`DayMaster ${dm.name}(${dm.element}/${dm.yin_yang})`);

  // 오행 불균형 경고(임계치 임의 예: 최댓값-최솟값 >= 3)
  const fiveVals = [five.wood, five.fire, five.earth, five.metal, five.water];
  const fiveMax = Math.max(...fiveVals);
  const fiveMin = Math.min(...fiveVals);
  const cautions: string[] = [];
  if (fiveMax - fiveMin >= 3) cautions.push("Five-Elements imbalance: 보완 활동 필요.");

  // 타이밍 요약(사주 대운 + 서양은 후속 확장)
  const dae = agg.saju.daeWoon;
  const timing: DestinySynthesis["timing"] = {
    daeWoon: dae ? {
      startAge: dae.startAge,
      isForward: !!dae.isForward,
      current: dae.current ? `${dae.current.stem}${dae.current.branch}` : undefined,
    } : undefined,
  };

  // 성향 메모(초안 룰: 일간과 태양/달 상성)
  let notes = "";
  if (dm?.element === "wood" && sun?.sign === "Sagittarius") {
    notes += "확장성+성장지향. ";
  }
  if (dm?.element === "metal" && moon?.sign === "Cancer") {
    notes += "감정·가정 중시와 규율감의 혼합. ";
  }
  // 필요한 경우 룰을 추가

  const highlights = [
    sun && moon ? `Sun ${sun.sign} / Moon ${moon.sign}` : undefined,
    asc?.sign ? `ASC ${asc.sign}` : undefined,
    dm ? `Day Master ${dm.name} (${dm.element}/${dm.yin_yang})` : undefined,
  ].filter(Boolean) as string[];

  return {
    highlights,
    personality: {
      keywords,
      notes: notes.trim(),
    },
    timing,
    elementsBalance: {
      fiveElements: { ...five },
      // 서양 4원소 비율이 있으면 합쳐서 넣기(당장 없으면 생략)
      classicalElements: undefined,
    },
    cautions: cautions.length ? cautions : undefined,
  };
}