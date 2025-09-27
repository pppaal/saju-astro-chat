import { Horoscope, Origin } from "circular-natal-horoscope-js";

// --- Type definitions ---
interface ArcDegrees {
  degrees: number;
  minutes: number;
  seconds: number;
}

interface CelestialBody {
  label: string;
  Sign?: { label: string };
  ChartPosition?: { Ecliptic?: { ArcDegrees?: ArcDegrees } };
  House?: { id: number };
  isRetrograde?: boolean;
}

interface House {
  id: number;
  Sign?: { label: string };
  ChartPosition?: { Ecliptic?: { ArcDegrees?: ArcDegrees } };
}

interface Aspect {
  point1: string;
  point2: string;
  aspect: { label: string };
  orb: number;
}

// Input data interface
export interface NatalChartInput {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  locationName: string;
}

export function generatePromptForGemini(input: NatalChartInput): string {
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
    aspectPoints: [
      "sun",
      "moon",
      "mercury",
      "venus",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
      "pluto",
      "ascendant",
      "midheaven",
    ],
    aspectTypes: ["conjunction", "opposition", "trine", "square", "sextile"],
  });

  let dataDescription = `--- Birth Chart Data ---\n\n`;

  // Basic info
  dataDescription += `[Basic Information]\n`;
  dataDescription += `- Birth Time: ${input.year}-${input.month}-${input.date} ${input.hour}:${input.minute}\n`;
  dataDescription += `- Birth Location: ${input.locationName} (Lat ${input.latitude.toFixed(
    4
  )}, Lon ${input.longitude.toFixed(4)})\n`;

  const ascendant = horoscope.Ascendant;
  if (ascendant?.Sign && ascendant?.ChartPosition?.Ecliptic?.ArcDegrees) {
    const arc = ascendant.ChartPosition.Ecliptic.ArcDegrees;
    dataDescription += `- Ascendant (ASC): ${ascendant.Sign.label} ${arc.degrees}°${arc.minutes}′\n`;
  }

  const midheaven = horoscope.Midheaven;
  if (midheaven?.Sign && midheaven?.ChartPosition?.Ecliptic?.ArcDegrees) {
    const arc = midheaven.ChartPosition.Ecliptic.ArcDegrees;
    dataDescription += `- Midheaven (MC): ${midheaven.Sign.label} ${arc.degrees}°${arc.minutes}′\n`;
  }

  dataDescription += `\n`;

  // Planets
  dataDescription += `[Planetary Positions]\n`;
  horoscope.CelestialBodies.all.forEach((planet: CelestialBody) => {
    if (
      planet?.Sign &&
      planet?.ChartPosition?.Ecliptic?.ArcDegrees &&
      planet?.House
    ) {
      const retrograde = planet.isRetrograde ? " (retrograde)" : "";
      const arc = planet.ChartPosition.Ecliptic.ArcDegrees;
      dataDescription += `- ${planet.label} is in ${planet.Sign.label} ${arc.degrees}°${arc.minutes}′, in House ${planet.House.id}${retrograde}\n`;
    }
  });
  dataDescription += `\n`;

  // Houses
  dataDescription += `[House System: ${horoscope._houseSystem}]\n`;
  horoscope.Houses.forEach((house: House) => {
    if (house?.Sign && house?.ChartPosition?.Ecliptic?.ArcDegrees) {
      const arc = house.ChartPosition.Ecliptic.ArcDegrees;
      dataDescription += `- House ${house.id} cusp: ${house.Sign.label} ${arc.degrees}°${arc.minutes}′\n`;
    }
  });
  dataDescription += `\n`;

  // Aspects
  dataDescription += `[Major Aspects]\n`;
  horoscope.Aspects.all.forEach((aspect: Aspect) => {
    if (aspect?.aspect?.label) {
      dataDescription += `- ${aspect.point1} and ${aspect.point2} form a ${aspect.aspect.label} (orb: ${aspect.orb}°)\n`;
    }
  });
  dataDescription += `\n`;

  const finalPrompt = `Your Cosmic Interpretation\nYou are the world’s greatest astrologer. Your mission is to provide a profound analysis and insightful advice based on the birth chart data below. Use professional terminology, but explain it in a way that non-experts can also understand. Address both positive potentials and challenging aspects in a balanced manner.\n\n${dataDescription}\n--- Analysis ---\nBased on this data, please provide a comprehensive interpretation of this person’s personality, talents, potential, and life challenges, offering warm and wise guidance.`;

  return finalPrompt.trim();
}