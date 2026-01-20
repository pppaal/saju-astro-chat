import { useState, useEffect } from 'react';
import { getAnnualCycles, getMonthlyCycles, getIljinCalendar } from '@/lib/Saju';
import type { DayMaster, DaeunData, YeonunData, WolunData, IljinData } from '@/lib/Saju';

export function useSajuCycles(
  birthYear: number,
  dayMaster: DayMaster,
  daeunCycles: DaeunData[]
) {
  const [selectedDaeun, setSelectedDaeun] = useState<DaeunData | null>(null);
  const [selectedYeonun, setSelectedYeonun] = useState<YeonunData | undefined>();
  const [selectedWolun, setSelectedWolun] = useState<WolunData | undefined>();
  const [displayedYeonun, setDisplayedYeonun] = useState<YeonunData[]>([]);
  const [displayedWolun, setDisplayedWolun] = useState<WolunData[]>([]);
  const [displayedIljin, setDisplayedIljin] = useState<IljinData[]>([]);

  // 초기 대운 선택
  useEffect(() => {
    if (daeunCycles && daeunCycles.length > 0) {
      const currentYear = new Date().getFullYear();
      const currentAge = currentYear - birthYear + 1;
      const initialDaeun =
        daeunCycles.find((d) => currentAge >= d.age && currentAge < d.age + 10) || daeunCycles[0];
      setSelectedDaeun(initialDaeun);
    }
  }, [daeunCycles, birthYear]);

  // 연운 계산
  useEffect(() => {
    if (!selectedDaeun) return;
    const daeunStartYear = birthYear + selectedDaeun.age - 1;
    const newYeonun = getAnnualCycles(daeunStartYear, 10, dayMaster);
    setDisplayedYeonun(newYeonun);
    setSelectedYeonun(
      newYeonun.find((y) => y.year === new Date().getFullYear()) || newYeonun[newYeonun.length - 1]
    );
  }, [selectedDaeun, birthYear, dayMaster]);

  // 월운 계산
  useEffect(() => {
    if (!selectedYeonun) return;
    const newWolun = getMonthlyCycles(selectedYeonun.year, dayMaster);
    setDisplayedWolun(newWolun);

    const now = new Date();
    const nowKst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), -9, 0, 0, 0));
    const kstMonth = nowKst.getUTCMonth() + 1;
    setSelectedWolun(newWolun.find((m) => m.month === kstMonth) ?? newWolun[newWolun.length - 1]);
  }, [selectedYeonun, dayMaster]);

  // 일진 달력
  useEffect(() => {
    if (!selectedWolun) return;
    const y = selectedWolun.year;
    const m = selectedWolun.month;
    const newIljin = getIljinCalendar(y, m, dayMaster);
    const fixed = newIljin.filter((d) => d.year === y && d.month === m);
    setDisplayedIljin(fixed);
  }, [selectedWolun, dayMaster]);

  return {
    selectedDaeun,
    setSelectedDaeun,
    selectedYeonun,
    setSelectedYeonun,
    selectedWolun,
    setSelectedWolun,
    displayedYeonun,
    displayedWolun,
    displayedIljin,
  };
}
