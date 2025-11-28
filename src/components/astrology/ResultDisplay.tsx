// src/components/astrology/ResultDisplay.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import type { NatalChartData } from '@/lib/astrology';

const LABELS = {
  en: {
    title: 'Natal Chart Summary',
    asc: 'Ascendant',
    mc: 'MC',
    planetPositions: 'Planet Positions',
    notice: 'Note: This interpretation is automatically generated.',
    planet: 'Planet',
    position: 'Position',
    house: 'House',
    speed: 'Speed',
    ascendant: 'Ascendant (ASC)',
    details: 'Details',
    aspect: 'Aspect',
    from: 'From',
    to: 'To',
    retrograde: 'Retrograde',
    advanced: 'Advanced details',
    engine: 'Engine',
    se: 'Swiss Ephemeris',
    nodeType: 'Node type',
    houseSystem: 'House system',
    theme: 'Theme',
    includeMinor: 'Include minor aspects',
    enable: 'Enable',
    chiron: 'Chiron',
    lilith: 'Lilith',
    pof: 'Part of Fortune',
    extraOnly: 'Points (Extra only)',
    noData: 'No data available.',
    shinsal: 'Shinsal',
    relationships: 'Relationships',
    scope: 'Scope',
    note: 'Note',
  },
  ko: {
    title: '기본 천궁도 요약',
    asc: '상승점',
    mc: '중천',
    planetPositions: '행성 위치',
    notice: '주의: 이 해석은 자동 생성된 요약입니다.',
    planet: '행성',
    position: '위치',
    house: '하우스',
    speed: '속도',
    ascendant: '상승점(ASC)',
    details: '자세히 보기',
    aspect: '위상',
    from: '시작',
    to: '도착',
    retrograde: '역행',
    advanced: '고급 정보',
    engine: '엔진',
    se: 'Swiss Ephemeris',
    nodeType: '노드 타입',
    houseSystem: '하우스 시스템',
    theme: '테마',
    includeMinor: '마이너 위상 포함',
    enable: '추가 포인트',
    chiron: '키론',
    lilith: '리릴리스',
    pof: '행운점',
    extraOnly: '추가 포인트만',
    noData: '데이터가 없습니다.',
    shinsal: '신살',
    relationships: '관계',
    scope: '범위',
    note: '비고',
  },
  zh: {
    title: '本命盘摘要',
    asc: '上升点',
    mc: '天顶点',
    planetPositions: '行星位置',
    notice: '注意：此解读为自动生成。',
    planet: '行星',
    position: '位置',
    house: '宫位',
    speed: '速度',
    ascendant: '上升点 (ASC)',
    details: '更多详情',
    aspect: '相位',
    from: '起点',
    to: '终点',
    retrograde: '逆行',
    advanced: '高级详情',
    engine: '引擎',
    se: 'Swiss Ephemeris',
    nodeType: '交点类型',
    houseSystem: '宫位系统',
    theme: '主题',
    includeMinor: '包含次要相位',
    enable: '启用',
    chiron: '凯龙星',
    lilith: '莉莉丝',
    pof: '福点',
    extraOnly: '仅显示额外点',
    noData: '暂无数据。',
    shinsal: '神煞',
    relationships: '关系',
    scope: '范围',
    note: '备注',
  },
  ar: {
    title: 'ملخص الخريطة الفلكية',
    asc: 'الطالع',
    mc: 'MC',
    planetPositions: 'مواضع الكواكب',
    notice: 'ملاحظة: هذا التفسير تم إنشاؤه تلقائيًا.',
    planet: 'الكوكب',
    position: 'الموضع',
    house: 'البيت',
    speed: 'السرعة',
    ascendant: 'الطالع (ASC)',
    details: 'تفاصيل',
    aspect: 'زاوية',
    from: 'من',
    to: 'إلى',
    retrograde: 'تراجع',
    advanced: 'تفاصيل متقدمة',
    engine: 'المحرك',
    se: 'Swiss Ephemeris',
    nodeType: 'نوع العقدة',
    houseSystem: 'نظام البيوت',
    theme: 'السيماء',
    includeMinor: 'تضمين الزوايا الثانوية',
    enable: 'تفعيل',
    chiron: 'شيرون',
    lilith: 'ليليث',
    pof: 'نقطة الحظ',
    extraOnly: 'النقاط الإضافية فقط',
    noData: 'لا توجد بيانات.',
    shinsal: 'Shinsal',
    relationships: 'العلاقات',
    scope: 'النطاق',
    note: 'ملاحظة',
  },
  es: {
    title: 'Resumen de Carta Natal',
    asc: 'Ascendente',
    mc: 'MC',
    planetPositions: 'Posiciones de los Planetas',
    notice: 'Aviso: Esta interpretación es generada automáticamente.',
    planet: 'Planeta',
    position: 'Posición',
    house: 'Casa',
    speed: 'Velocidad',
    ascendant: 'Ascendente (ASC)',
    details: 'Ver detalles',
    aspect: 'Aspecto',
    from: 'Desde',
    to: 'Hacia',
    retrograde: 'Retrógrado',
    advanced: 'Detalles avanzados',
    engine: 'Motor',
    se: 'Swiss Ephemeris',
    nodeType: 'Tipo de nodo',
    houseSystem: 'Sistema de casas',
    theme: 'Tema',
    includeMinor: 'Incluir aspectos menores',
    enable: 'Activar',
    chiron: 'Quirón',
    lilith: 'Lilith',
    pof: 'Parte de la Fortuna',
    extraOnly: 'Puntos (solo extra)',
    noData: 'No hay datos.',
    shinsal: 'Shinsal',
    relationships: 'Relaciones',
    scope: 'Ámbito',
    note: 'Nota',
  },
} as const;

const SIGNS = {
  en: ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'],
  ko: ['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'],
  zh: ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'],
  ar: ['الحمل','الثور','الجوزاء','السرطان','الأسد','العذراء','الميزان','العقرب','القوس','الجدي','الدلو','الحوت'],
  es: ['Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'],
} as const;
type LocaleKey = keyof typeof SIGNS;

const PLANET_LABELS = {
  en: { Sun:'Sun', Moon:'Moon', Mercury:'Mercury', Venus:'Venus', Mars:'Mars', Jupiter:'Jupiter', Saturn:'Saturn', Uranus:'Uranus', Neptune:'Neptune', Pluto:'Pluto', 'True Node':'True Node', Chiron:'Chiron', 'Lilith(True)':'Lilith(True)', 'Lilith(Mean)':'Lilith(Mean)', Fortune:'Fortune' },
  ko: { Sun:'태양', Moon:'달', Mercury:'수성', Venus:'금성', Mars:'화성', Jupiter:'목성', Saturn:'토성', Uranus:'천왕성', Neptune:'해왕성', Pluto:'명왕성', 'True Node':'진월교점', Chiron:'키론', 'Lilith(True)':'리릴리스(진)', 'Lilith(Mean)':'리릴리스(평균)', Fortune:'행운점' },
  zh: { Sun:'太阳', Moon:'月亮', Mercury:'水星', Venus:'金星', Mars:'火星', Jupiter:'木星', Saturn:'土星', Uranus:'天王星', Neptune:'海王星', Pluto:'冥王星', 'True Node':'真北交点', Chiron:'凯龙星', 'Lilith(True)':'莉莉丝(真)', 'Lilith(Mean)':'莉莉丝(平)', Fortune:'福点' },
  ar: { Sun:'الشمس', Moon:'القمر', Mercury:'عطارد', Venus:'الزهرة', Mars:'المريخ', Jupiter:'المشتري', Saturn:'زحل', Uranus:'أورانوس', Neptune:'نبتون', Pluto:'بلوتو', 'True Node':'العقدة الشمالية', Chiron:'شيرون', 'Lilith(True)':'ليليث(حقيقي)', 'Lilith(Mean)':'ليليث(متوسط)', Fortune:'نقطة الحظ' },
  es: { Sun:'Sol', Moon:'Luna', Mercury:'Mercurio', Venus:'Venus', Mars:'Marte', Jupiter:'Júpiter', Saturn:'Saturno', Uranus:'Urano', Neptune:'Neptuno', Pluto:'Plutón', 'True Node':'Nodo Norte', Chiron:'Quirón', 'Lilith(True)':'Lilith(Verdad)', 'Lilith(Mean)':'Lilith(Media)', Fortune:'Parte de la Fortuna' },
} as const;

const ASPECT_LABELS = {
  en: { conjunction:'conjunction', opposition:'opposition', square:'square', trine:'trine', sextile:'sextile', quincunx:'quincunx', semisextile:'semisextile', quintile:'quintile' },
  ko: { conjunction:'합', opposition:'대립', square:'사각', trine:'삼합', sextile:'육분', quincunx:'퀸컨크스', semisextile:'반육분', quintile:'퀸타일' },
  zh: { conjunction:'合相', opposition:'对冲', square:'四分相', trine:'拱相', sextile:'六合', quincunx:'梅花相', semisextile:'半六合', quintile:'五分相' },
  ar: { conjunction:'اقتران', opposition:'تعارض', square:'تربيع', trine:'تثليث', sextile:'تسديس', quincunx:'كوينكونكس', semisextile:'نصف تسديس', quintile:'كوينتايل' },
  es: { conjunction:'conjunción', opposition:'oposición', square:'cuadratura', trine:'trígono', sextile:'sextil', quincunx:'quincuncio', semisextile:'semisextil', quintile:'quintil' },
} as const;

function normalizeLocale(l?: string): LocaleKey {
  const k = (l || 'en').split('-')[0] as LocaleKey;
  return (SIGNS as any)[k] ? k : 'en';
}
function splitSignAndDegree(text: string) {
  const s = String(text || '').trim();
  const m = s.match(/^(\S+)\s+(.*)$/);
  if (!m) return { signPart: s, degreePart: '' };
  return { signPart: m[1], degreePart: m[2] };
}
function findSignIndex(name: string): number {
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).indexOf(name);
    if (idx >= 0) return idx;
  }
  const cleaned = name.replace(/[^\p{L}]/gu, '').toLowerCase();
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).findIndex(
      (s) => s.replace(/[^\p{L}]/gu, '').toLowerCase() === cleaned
    );
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
function localizeAspectType(type: string, loc: LocaleKey) {
  const key = String(type || '').toLowerCase() as keyof typeof ASPECT_LABELS.en;
  return (ASPECT_LABELS as any)[loc]?.[key] || type;
}

interface ResultDisplayProps {
  interpretation: string | null;
  isLoading: boolean;
  error: string | null;
  chartData?: NatalChartData | null;
  aspects?: any[] | null;
  advanced?: {
    options?: any;
    meta?: any;
    houses?: any[];
    points?: any[];
    aspectsPlus?: any[];
  } | null;

  // 추가: 신살, 관계(옵션)
  shinsal?: {
    name: string;
    scope?: string;
    from?: string;
    to?: string;
    note?: string;
  }[] | null;

  relations?: {
    type?: string;
    from?: string;
    to?: string;
    score?: number;
    note?: string;
  }[] | null;
}

export default function ResultDisplay({
  interpretation,
  isLoading,
  error,
  chartData,
  aspects,
  advanced,
  shinsal,
  relations,
}: ResultDisplayProps) {
  const { locale, dir } = useI18n?.() || { locale: 'en', dir: 'ltr' };
  const locKey = normalizeLocale(locale);
  const L = LABELS[locKey];

  const prettyInterpretation = useMemo(() => {
    if (!interpretation) return null;
    const rawLines = interpretation.split(/\r?\n/);
    let lines = rawLines.map((s) => s.trim()).filter(Boolean);
    const isHeader = (s: string) =>
      /^title$/i.test(s) || /^natal$/i.test(s) || /(요약|summary)$/i.test(s);
    while (lines.length && isHeader(lines[0])) lines.shift();
    const last = lines[lines.length - 1]?.toLowerCase() || '';
    if (/^(주의|note|notice)\s*:/.test(last)) lines.pop();
    return lines.join('\n');
  }, [interpretation]);

  const viewChart = useMemo(() => {
    if (!chartData) return null;
    try {
      const localizedAsc = (() => {
        const { signPart, degreePart } = splitSignAndDegree(
          String((chartData as any).ascendant?.formatted || '')
        );
        const sign = localizeSignLabel(signPart, locKey);
        return `${sign} ${degreePart}`.trim();
      })();
      const localizedMc = (() => {
        const { signPart, degreePart } = splitSignAndDegree(
          String((chartData as any).mc?.formatted || '')
        );
        const sign = localizeSignLabel(signPart, locKey);
        return `${sign} ${degreePart}`.trim();
      })();

      const planets = ((chartData as any).planets || []).map((p: any) => {
        const name = localizePlanetLabel(String(p.name || ''), locKey);
        const { signPart, degreePart } = splitSignAndDegree(String(p.formatted || ''));
        const sign = localizeSignLabel(signPart, locKey);
        return {
          ...p,
          name,
          formatted: `${sign} ${degreePart}`.trim(),
          retrograde: typeof p.speed === 'number' ? p.speed < 0 : !!p.rx,
        };
      });

      const houses = ((chartData as any).houses || []).map((h: any) => {
        const { signPart, degreePart } = splitSignAndDegree(String(h.formatted || ''));
        const sign = localizeSignLabel(signPart, locKey);
        return { ...h, formatted: `${sign} ${degreePart}`.trim() };
      });

      return {
        ...(chartData as any),
        ascendant: { ...(chartData as any).ascendant, formatted: localizedAsc },
        mc: { ...(chartData as any).mc, formatted: localizedMc },
        planets,
        houses,
      };
    } catch {
      return chartData as any;
    }
  }, [chartData, locKey]);

  if (isLoading && !interpretation) {
    return (
      <div className="w-full max-w-2xl mt-8 text-center" dir={dir}>
        <p className="text-lg text-white/80">{L.title}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="w-full mt-8 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-200"
        dir={dir}
      >
        <h3 className="font-bold mb-1">Error</h3>
        <p className="text-red-100/90">{error}</p>
      </div>
    );
  }

  if (!prettyInterpretation) return null;

  const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      className="w-full mt-8 rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md p-6 md:p-8 text-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)]"
      dir={dir}
    >
      {children}
    </div>
  );

  const PlanetsTable = () => {
    if (!viewChart?.planets?.length) return null;
    return (
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/60 border-b border-white/10">
              <th className="py-2 pr-4">{L.planet}</th>
              <th className="py-2 pr-4">{L.position}</th>
              <th className="py-2 pr-4">{L.house}</th>
              <th className="py-2 pr-4">{L.speed}</th>
            </tr>
          </thead>
          <tbody>
            {viewChart.planets.map((p: any, idx: number) => (
              <tr key={`${p.name}-${idx}`} className="border-b border-white/10">
                <td className="py-2 pr-4">
                  <span className="font-medium">{p.name}</span>
                  {p.retrograde ? (
                    <span
                      className="ml-2 align-middle text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/15 border border-yellow-400/40 text-yellow-200"
                      title={L.retrograde}
                      aria-label={L.retrograde}
                    >
                      R
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-4 text-white/90">{p.formatted}</td>
                <td className="py-2 pr-4 text-white/80">{`${L.house} ${p.house}`}</td>
                <td className="py-2 pr-4 text-white/70">
                  {typeof p.speed === 'number' ? `${p.speed.toFixed(3)}°/day` : '−'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const HousesTable = () => {
    if (!viewChart?.houses?.length) return null;
    return (
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/60 border-b border-white/10">
              <th className="py-2 pr-4">{L.house}</th>
              <th className="py-2 pr-4">{L.position}</th>
            </tr>
          </thead>
          <tbody>
            {viewChart.houses.map((h: any, idx: number) => (
              <tr key={`house-${idx + 1}`} className="border-b border-white/10">
                <td className="py-2 pr-4 text-white/80">{`${L.house} ${idx + 1}`}</td>
                <td className="py-2 pr-4 text-white/90">{h.formatted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const AspectsTable = () => {
    if (!aspects?.length) return null;
    return (
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/60 border-b border-white/10">
              <th className="py-2 pr-4">{L.aspect}</th>
              <th className="py-2 pr-4">{L.from}</th>
              <th className="py-2 pr-4">{L.to}</th>
              <th className="py-2 pr-4">orb</th>
              <th className="py-2 pr-4">score</th>
            </tr>
          </thead>
          <tbody>
            {aspects.slice(0, 100).map((a: any, i: number) => {
              const fromName = localizePlanetLabel(String(a?.from?.name || a?.from || ''), locKey);
              const toName = localizePlanetLabel(String(a?.to?.name || a?.to || ''), locKey);
              return (
                <tr key={`asp-${i}`} className="border-b border-white/10">
                  <td className="py-2 pr-4">{localizeAspectType(a.type, locKey)}</td>
                  <td className="py-2 pr-4">{fromName}</td>
                  <td className="py-2 pr-4">{toName}</td>
                  <td className="py-2 pr-4">
                    {typeof a.orb === 'number' ? a.orb.toFixed(2) : '-'}
                  </td>
                  <td className="py-2 pr-4">
                    {typeof a.score === 'number' ? a.score.toFixed(3) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const AdvancedPanel = () => {
    const [open, setOpen] = useState(false);
    if (!advanced) return null;

    const opts = advanced.options || {};
    const meta = advanced.meta || {};
    const advPoints = Array.isArray(advanced.points) ? advanced.points : [];

    const EXTRA_NAMES = new Set([
      'Chiron','키론','Lilith','리릴리스','Lilith(True)','Lilith(Mean)','Black Moon Lilith',
      'Part of Fortune','Fortune','행운점','True Node','Mean Node','North Node','South Node','진월교점',
    ]);
    const extraPoints = advPoints.filter((p: any) => {
      const n = String(p?.name ?? p?.key ?? '').trim();
      return EXTRA_NAMES.has(n);
    });

    const isRx = (p: any) =>
      Boolean(p?.rx || (typeof p?.speed === 'number' && p.speed < 0));

    return (
      <section className="mt-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-4 py-3"
        >
          <span className="font-semibold">{L.advanced}</span>
          <span>{open ? '−' : '+'}</span>
        </button>

        {open && (
          <div className="mt-4 space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Engine & Options</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-white/90">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div><b>{L.engine}:</b> {meta.engine || '—'}</div>
                  <div><b>{L.se}:</b> {meta.seVersion || meta.sweVersion || '—'}</div>
                  <div><b>{L.nodeType}:</b> {meta.nodeType || opts.nodeType || '—'}</div>
                  <div><b>{L.houseSystem}:</b> {meta.houseSystem || opts.houseSystem || '—'}</div>
                  <div><b>{L.theme}:</b> {opts.theme || '—'}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div><b>{L.includeMinor}:</b> {String(!!(opts.includeMinorAspects ?? meta.includeMinorAspects))}</div>
                  <div><b>{L.enable}:</b></div>
                  <ul className="list-disc ml-5">
                    <li>{L.chiron}: {String(!!opts.enable?.chiron)}</li>
                    <li>{L.lilith}: {String(opts.enable?.lilith)}</li>
                    <li>{L.pof}: {String(!!opts.enable?.pof)}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">{L.extraOnly}</h3>
              {extraPoints.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                  {L.noData}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="text-left px-3 py-2">{L.planet}</th>
                        <th className="text-left px-3 py-2">{L.position}</th>
                        <th className="text-left px-3 py-2">{L.house}</th>
                        <th className="text-left px-3 py-2">{L.speed}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraPoints.map((p: any, i: number) => (
                        <tr key={`extra-${i}`} className="border-b border-white/10">
                          <td className="px-3 py-2">
                            <span className="font-medium">
                              {localizePlanetLabel(String(p.name || p.key || ''), locKey)}
                            </span>
                            {isRx(p) && (
                              <span
                                className="ml-2 align-middle text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/15 border border-yellow-400/40 text-yellow-200"
                                title={L.retrograde}
                              >
                                R
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">{p.formatted || '−'}</td>
                          <td className="px-3 py-2">{p.house ?? '−'}</td>
                          <td className="px-3 py-2">
                            {typeof p.speed === 'number' ? `${p.speed.toFixed(3)}°/day` : '−'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    );
  };

  // 신살 섹션
  const ShinsalSection = () => {
    const items = Array.isArray(shinsal) ? shinsal : [];
    return (
      <section className="mt-6">
        <h3 className="text-lg font-semibold mb-2">{L.shinsal}</h3>
        {items.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80">
            {L.noData}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((s, idx) => (
              <div
                key={`shinsal-${idx}`}
                className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
              >
                <div className="font-semibold text-white/90">{s.name}</div>
                {s.scope ? (
                  <div className="text-white/70 mt-1">{L.scope}: {s.scope}</div>
                ) : null}
                {(s.from || s.to) ? (
                  <div className="text-white/70 mt-1">
                    {s.from ? `${L.from}: ${s.from}` : ''} {s.to ? `→ ${L.to}: ${s.to}` : ''}
                  </div>
                ) : null}
                {s.note ? (
                  <div className="text-white/60 mt-1">{L.note}: {s.note}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  // 관계 섹션
  const RelationsSection = () => {
    const items = Array.isArray(relations) ? relations : [];
    return (
      <section className="mt-6">
        <h3 className="text-lg font-semibold mb-2">{L.relationships}</h3>
        {items.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80">
            {L.noData}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/10">
                <tr>
                  <th className="text-left px-3 py-2">{L.from}</th>
                  <th className="text-left px-3 py-2">{L.to}</th>
                  <th className="text-left px-3 py-2">type</th>
                  <th className="text-left px-3 py-2">score</th>
                  <th className="text-left px-3 py-2">{L.note}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => (
                  <tr key={`rel-${i}`} className="border-b border-white/10">
                    <td className="px-3 py-2">{r.from ?? '—'}</td>
                    <td className="px-3 py-2">{r.to ?? '—'}</td>
                    <td className="px-3 py-2">{r.type ?? '—'}</td>
                    <td className="px-3 py-2">
                      {typeof r.score === 'number' ? r.score.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2">{r.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  return (
    <Card>
      <pre
        className="whitespace-pre-wrap leading-relaxed text-white/90 text-[15px]"
        lang={locKey}
        dir={dir}
      >
        {prettyInterpretation}
      </pre>

      {viewChart ? (
        <details className="mt-6 group">
          <summary className="cursor-pointer select-none text-indigo-300 font-semibold flex items-center gap-2">
            <span>{L.details}</span>
            <span className="ml-1 text-indigo-400 group-open:rotate-180 inline-block transition-transform">
              ▾
            </span>
          </summary>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl border border-white/15 bg-white/[0.08] p-4">
                <div className="text-white/60 text-xs mb-1">{L.ascendant}</div>
                <div className="text-lg font-semibold text-white/95">
                  {(viewChart as any).ascendant?.formatted}
                </div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/[0.08] p-4">
                <div className="text-white/60 text-xs mb-1">MC</div>
                <div className="text-lg font-semibold text-white/95">
                  {(viewChart as any).mc?.formatted}
                </div>
              </div>
            </div>

            <PlanetsTable />
            <HousesTable />
            <AspectsTable />

            <AdvancedPanel />

            {/* 여기에 신살/관계 섹션 추가 */}
            <ShinsalSection />
            <RelationsSection />
          </div>
        </details>
      ) : null}
    </Card>
  );
}