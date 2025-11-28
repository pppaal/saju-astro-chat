// src/app/api/astrology/details/route.ts

import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

// 별칭(@)이 안 먹는 환경이면 상대 경로로 바꾸세요:
// "../../../lib/astrology" (details 폴더 기준)
import {
  calculateNatalChart,
  toChart,
  type AspectRules,
} from "@/lib/astrology";
import {
  resolveOptions,
  findNatalAspectsPlus,
  buildEngineMeta,
} from "@/lib/astrology";

/* =========================
   i18n 라벨(요약 텍스트)
   ========================= */
const LABELS = {
  en: {
    title: "Natal Chart Summary",
    asc: "Ascendant",
    mc: "MC",
    planetPositions: "Planet Positions",
    notice: "Note: This interpretation is automatically generated.",
  },
  ko: {
    title: "기본 천궁도 요약",
    asc: "상승점",
    mc: "중천",
    planetPositions: "행성 위치",
    notice: "주의: 이 해석은 자동 생성된 요약입니다.",
  },
  zh: {
    title: "本命盘摘要",
    asc: "上升点",
    mc: "天顶点",
    planetPositions: "行星位置",
    notice: "注意：此解读为自动生成。",
  },
  ar: {
    title: "ملخص الخريطة الفلكية",
    asc: "الطالع",
    mc: "MC",
    planetPositions: "مواضع الكواكب",
    notice: "ملاحظة: هذا التفسير تم إنشاؤه تلقائيًا.",
  },
  es: {
    title: "Resumen de Carta Natal",
    asc: "Ascendente",
    mc: "MC",
    planetPositions: "Posiciones de los Planetas",
    notice: "Aviso: Esta interpretación es generada automáticamente.",
  },
} as const;

function pickLabels(locale?: string) {
  const key = (locale || "en").split("-")[0] as keyof typeof LABELS;
  return LABELS[key] ?? LABELS.en;
}

/* =========================
   별자리/행성 라벨 현지화 유틸
   ========================= */
const SIGNS = {
  en: ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"],
  ko: ["양자리","황소자리","쌍둥이자리","게자리","사자자리","처녀자리","천칭자리","전갈자리","사수자리","염소자리","물병자리","물고기자리"],
  zh: ["白羊座","金牛座","双子座","巨蟹座","狮子座","处女座","天秤座","天蝎座","射手座","摩羯座","水瓶座","双鱼座"],
  ar: ["الحمل","الثور","الجوزاء","السرطان","الأسد","العذراء","الميزان","العقرب","القوس","الجدي","الدلو","الحوت"],
  es: ["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"],
} as const;

type LocaleKey = keyof typeof SIGNS;

const PLANET_LABELS = {
  en: { Sun:"Sun", Moon:"Moon", Mercury:"Mercury", Venus:"Venus", Mars:"Mars", Jupiter:"Jupiter", Saturn:"Saturn", Uranus:"Uranus", Neptune:"Neptune", Pluto:"Pluto", "True Node":"True Node" },
  ko: { Sun:"태양", Moon:"달", Mercury:"수성", Venus:"금성", Mars:"화성", Jupiter:"목성", Saturn:"토성", Uranus:"천왕성", Neptune:"해왕성", Pluto:"명왕성", "True Node":"진월교점" },
  zh: { Sun:"太阳", Moon:"月亮", Mercury:"水星", Venus:"金星", Mars:"火星", Jupiter:"木星", Saturn:"土星", Uranus:"天王星", Neptune:"海王星", Pluto:"冥王星", "True Node":"真北交点" },
  ar: { Sun:"الشمس", Moon:"القمر", Mercury:"عطارد", Venus:"الزهرة", Mars:"المريخ", Jupiter:"المشتري", Saturn:"زحل", Uranus:"أورانوس", Neptune:"نبتون", Pluto:"بلوتو", "True Node":"العقدة الشمالية" },
  es: { Sun:"Sol", Moon:"Luna", Mercury:"Mercurio", Venus:"Venus", Mars:"Marte", Jupiter:"Júpiter", Saturn:"Saturno", Uranus:"Urano", Neptune:"Neptuno", Pluto:"Plutón", "True Node":"Nodo Norte" },
} as const;

function normalizeLocale(l?: string): LocaleKey {
  const k = (l || "en").split("-")[0] as LocaleKey;
  return (SIGNS as any)[k] ? k : "en";
}

// "물병자리 21° 57'" 등 formatted에서 별자리/각도를 분리
function splitSignAndDegree(text: string) {
  const trimmed = String(text || "").trim();
  const m = trimmed.match(/^(\S+)\s+(.*)$/);
  if (!m) return { signPart: trimmed, degreePart: "" };
  return { signPart: m[1], degreePart: m[2] };
}

function findSignIndex(name: string): number {
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).indexOf(name);
    if (idx >= 0) return idx;
  }
  const cleaned = name.replace(/[^\p{L}]/gu, "").toLowerCase();
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).findIndex(s => s.replace(/[^\p{L}]/gu, "").toLowerCase() === cleaned);
    if (idx >= 0) return idx;
  }
  return -1;
}

function localizeSignLabel(inputSign: string, target: LocaleKey): string {
  const idx = findSignIndex(inputSign);
  if (idx >= 0) return SIGNS[target][idx] || SIGNS.en[idx];
  const { signPart } = splitSignAndDegree(inputSign);
  const idx2 = findSignIndex(signPart);
  if (idx2 >= 0) return SIGNS[target][idx2] || SIGNS.en[idx2];
  return inputSign;
}

function localizePlanetLabel(inputName: string, target: LocaleKey): string {
  const enKeys = Object.keys(PLANET_LABELS.en) as (keyof typeof PLANET_LABELS.en)[];
  if (enKeys.includes(inputName as any)) {
    return PLANET_LABELS[target][inputName as keyof typeof PLANET_LABELS.en] || String(inputName);
  }
  for (const labels of Object.values(PLANET_LABELS) as any[]) {
    for (const enKey of enKeys) {
      if (labels[enKey] === inputName) {
        return (PLANET_LABELS as any)[target][enKey] || (PLANET_LABELS as any).en[enKey];
      }
    }
  }
  return inputName;
}

function parseHM(input: string) {
  const s = String(input).trim().toUpperCase();
  const ampm = (s.match(/\s?(AM|PM)$/) || [])[1];
  const core = s.replace(/\s?(AM|PM)$/, "");
  const [hhRaw, mmRaw = "0"] = core.split(":");
  let h = Number(hhRaw), m = Number(mmRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) throw new Error("시간 형식이 올바르지 않습니다.");
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error("시간 범위가 올바르지 않습니다.");
  return { h, m };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // options를 받아 advanced를 반영 (없으면 preset/기본값)
    const { date, time, latitude, longitude, timeZone, locale, options } = body ?? {};
    const L = pickLabels(locale);
    const locKey = normalizeLocale(locale);

    // 입력 검증
    if (!date || !time || latitude === undefined || longitude === undefined || !timeZone) {
      return NextResponse.json(
        { error: "필수 입력(date, time, latitude, longitude, timeZone)이 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "위도/경도 값이 올바르지 않습니다." }, { status: 400 });
    }

    const [year, month, day] = String(date).split("-").map(Number);
    if (!year || !month || !day) {
      return NextResponse.json({ error: "날짜 형식은 YYYY-MM-DD 이어야 합니다." }, { status: 400 });
    }

    const { h, m } = parseHM(String(time));

    const local = dayjs.tz(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      "YYYY-MM-DD HH:mm",
      String(timeZone)
    );
    if (!local.isValid()) {
      return NextResponse.json({ error: "날짜/시간/시간대 조합이 올바르지 않습니다." }, { status: 400 });
    }

    // 0) 옵션 확정
    const opts = resolveOptions(options);

    // 1) 출생 차트 계산
    const natal = await calculateNatalChart({
      year, month, date: day,
      hour: h, minute: m,
      latitude, longitude,
      timeZone: String(timeZone),
      // houseSystem/nodeType을 내부에서 지원한다면 전달
    });

    // 2) Asc/MC/행성 라벨을 대상 언어로 재조립
    const ascFmt = String((natal as any).ascendant?.formatted || "");
    const mcFmt  = String((natal as any).mc?.formatted || "");

    const ascSplit = splitSignAndDegree(ascFmt);
    const mcSplit  = splitSignAndDegree(mcFmt);

    const ascStr = `${localizeSignLabel(ascSplit.signPart, locKey)} ${ascSplit.degreePart}`.trim();
    const mcStr  = `${localizeSignLabel(mcSplit.signPart, locKey)} ${mcSplit.degreePart}`.trim();

    const planetLines = ((natal as any).planets || []).map((p: any) => {
      const name = localizePlanetLabel(String(p.name || ""), locKey);
      const { signPart, degreePart } = splitSignAndDegree(String(p.formatted || ""));
      const sign = localizeSignLabel(signPart, locKey);
      return `${name}: ${sign} ${degreePart}`.trim();
    }).join("\n");

    const basics = `${L.asc}: ${ascStr}\n${L.mc}: ${mcStr}`;
    const interpretation =
      `${L.title}\n${basics}\n\n${L.planetPositions}\n${planetLines}\n\n${L.notice}`;

    // 3) 위상(aspects) 계산 - Advanced Plus 사용
    const chart = toChart(natal as any);
    const aspectRules: AspectRules = {
      includeMinor: opts.includeMinorAspects,
      maxResults: 120,
      scoring: { weights: { orb: 0.55, aspect: 0.4, speed: 0.05 } },
    };
    const aspectsPlus = findNatalAspectsPlus(chart as any, aspectRules, opts);

    // 4) 엔진 메타 확장(meta는 NatalChartData 타입에 없을 수 있으므로 별도로)
    const chartMeta = buildEngineMeta(((natal as any).meta ?? {}) as any, opts);

    // 5) Advanced 페이로드(더보기용)
    const houses = (chart as any).houses || (natal as any).houses || [];
    const pointsRaw = (chart as any).points || (natal as any).planets || [];
    const points = pointsRaw.map((p: any) => ({
      key: p.key || p.name,
      name: p.name,
      formatted: p.formatted,
      sign: p.sign,
      degree: p.degree,
      minute: p.minute,
      house: p.house,
      speed: p.speed,
      rx: typeof p.speed === "number" ? p.speed < 0 : !!p.rx,
    }));

    const advanced = {
      options: opts,
      meta: chartMeta,
      houses,
      points,
      aspectsPlus,
    };

    // 6) 응답
    return NextResponse.json(
      {
        chartData: natal,        // 기본 구조는 그대로
        chartMeta,               // 엔진/옵션 메타는 별도
        aspects: aspectsPlus,    // Plus 규칙 위상
        interpretation,          // 현지화 요약 텍스트
        advanced,                // 더보기용 전체 페이로드
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API 처리 중 최종 에러(details):", error);
    return NextResponse.json({ error: error?.message || "알 수 없는 에러가 발생했습니다." }, { status: 500 });
  }
}