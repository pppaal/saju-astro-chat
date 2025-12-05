// src/lib/astrology/foundation/transit.ts
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc); dayjs.extend(timezone);

const swisseph = require("swisseph");

import { Chart, TransitInput, HouseSystem } from "./types";
import { formatLongitude } from "./utils";
import { calcHouses, inferHouseOf, mapHouseCupsFormatted } from "./houses";

const PLANET_LIST = {
  Sun: swisseph.SE_SUN,
  Moon: swisseph.SE_MOON,
  Mercury: swisseph.SE_MERCURY,
  Venus: swisseph.SE_VENUS,
  Mars: swisseph.SE_MARS,
  Jupiter: swisseph.SE_JUPITER,
  Saturn: swisseph.SE_SATURN,
  Uranus: swisseph.SE_URANUS,
  Neptune: swisseph.SE_NEPTUNE,
  Pluto: swisseph.SE_PLUTO,
  "True Node": swisseph.SE_TRUE_NODE,
};

const SW_FLAGS = swisseph.SEFLG_SPEED;

let EPHE_PATH_SET = false;
function ensureEphePath() {
  if (!EPHE_PATH_SET) {
    const ephePath = path.join(process.cwd(), "public", "ephe");
    swisseph.swe_set_ephe_path(ephePath);
    EPHE_PATH_SET = true;
  }
}

export async function calculateTransitChart(input: TransitInput, system: HouseSystem = "Placidus"): Promise<Chart> {
  ensureEphePath();

  const local = dayjs.tz(input.iso, input.timeZone);
  if (!local.isValid()) throw new Error("Invalid ISO datetime");
  const utcDate = local.utc().toDate();

  const jdResult = swisseph.swe_utc_to_jd(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds(),
    swisseph.SE_GREG_CAL
  );
  if ("error" in jdResult) throw new Error(`swe_utc_to_jd: ${jdResult.error}`);
  const ut_jd = jdResult.julianDayUT;

  const housesRes = calcHouses(ut_jd, input.latitude, input.longitude, system);
  const ascendantInfo = formatLongitude(housesRes.ascendant);
  const mcInfo = formatLongitude(housesRes.mc);

  const planets = Object.entries(PLANET_LIST).map(([name, id]) => {
    const res = swisseph.swe_calc_ut(ut_jd, id, SW_FLAGS);
    if ("error" in res) throw new Error(`swe_calc_ut(${name}): ${res.error}`);
    const info = formatLongitude(res.longitude);
    const house = inferHouseOf(res.longitude, housesRes.house);
    const speed = res.speed;
    const retrograde = typeof speed === "number" ? speed < 0 : undefined;
    return { name, longitude: res.longitude, ...info, house, speed, retrograde };
  });

  return {
    planets,
    ascendant: { name: "Ascendant", longitude: housesRes.ascendant, ...ascendantInfo, house: 1 },
    mc:        { name: "MC",        longitude: housesRes.mc,        ...mcInfo,        house: 10 },
    houses: mapHouseCupsFormatted(housesRes.house),
    meta: {
      jdUT: ut_jd,
      isoUTC: utcDate.toISOString(),
      timeZone: input.timeZone,
      latitude: input.latitude,
      longitude: input.longitude,
      houseSystem: system,
    },
  };
}
