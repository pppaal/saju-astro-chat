import { calculateNatalChart } from "../astrology/astrologyService";
import { calculateSajuData } from "../Saju/saju";
import type { DestinyInput, DestinyAggregate } from "./types";

// 서버 런타임에서 사용
export async function buildAggregate(input: DestinyInput): Promise<DestinyAggregate> {
  const western = await calculateNatalChart({
    year: Number(input.birthDate.slice(0,4)),
    month: Number(input.birthDate.slice(5,7)),
    date: Number(input.birthDate.slice(8,10)),
    hour: Number(input.birthTime.slice(0,2)),
    minute: Number(input.birthTime.slice(3,5)),
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timeZone,
  });

  const saju = calculateSajuData(
    input.birthDate,
    input.birthTime,
    input.gender,
    input.calendarType ?? "solar",
    input.timeZone,
    input.longitude
  );

  return { input, western, saju };
}