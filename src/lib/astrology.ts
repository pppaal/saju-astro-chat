// src/lib/astrology.ts

// 라이브러리를 import 합니다.
import { Horoscope, Origin } from "circular-natal-horoscope-js";

// --- 여기부터가 수정된 부분 ---

// 라이브러리가 반환하는 행성 객체의 구조를 설명하는 타입을 직접 정의합니다.
// 이렇게 하면 TypeScript가 객체의 내용을 이해하고 자동완성도 지원해줍니다.
interface CelestialBodyFromLibrary {
    label: string;
    Sign: {
        label: string;
    };
    ChartPosition: {
        Ecliptic: {
            normDegree: number;
            normMinute: number;
        };
    };
    House: {
        id: number;
    };
    isRetrograde: boolean;
}

// --- 여기까지 ---


// 입력 데이터의 타입을 정의합니다.
export interface NatalChartInput {
    year: number;
    month: number; // 1-12
    date: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
}

// 행성 데이터의 타입을 정의합니다.
export interface PlanetData {
    name: string;
    sign: string;
    degree: number;
    minute: number;
    house: number;
    isRetrograde: boolean;
}

// 최종 결과 데이터의 타입을 정의합니다.
export interface NatalChartData {
    planets: PlanetData[];
}

/**
 * 출생 정보를 받아 내이털 차트 데이터를 계산하는 함수
 * @param input NatalChartInput
 * @returns NatalChartData
 */
export function getNatalChartData(input: NatalChartInput): NatalChartData {
    const origin = new Origin({
        year: input.year,
        month: input.month - 1,
        date: input.date,
        hour: input.hour,
        minute: input.minute,
        latitude: input.latitude,
        longitude: input.longitude,
    });

    const horoscope = new Horoscope({
        origin: origin,
        houseSystem: "Placidus",
        zodiac: "tropical",
    });

    const chartData: NatalChartData = {
        // --- 여기가 수정된 부분 ---
        // .map의 planet 매개변수에 우리가 방금 정의한 타입을 지정해줍니다.
        planets: horoscope.CelestialBodies.all.map((planet: CelestialBodyFromLibrary) => ({
            name: planet.label,
            sign: planet.Sign.label,
            degree: Math.floor(planet.ChartPosition.Ecliptic.normDegree),
            minute: Math.floor(planet.ChartPosition.Ecliptic.normMinute),
            house: planet.House.id,
            isRetrograde: planet.isRetrograde,
        })),
        // --- 여기까지 ---
    };

    return chartData;
}