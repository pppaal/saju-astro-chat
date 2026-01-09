// src/components/astrology/ResultDisplay.tsx
'use client';

import React, { useMemo, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useI18n } from '@/i18n/I18nProvider';
import type { NatalChartData, PlanetData } from '@/lib/astrology';
import { buildSignInUrl } from '@/lib/auth/signInUrl';

// Local type definitions for ResultDisplay
interface HouseData {
  cusp: number;
  formatted: string;
  sign?: string;
}

interface AspectData {
  planet1?: string;
  planet2?: string;
  type?: string;
  orb?: number;
  from?: string | { name?: string };
  to?: string | { name?: string };
  aspect?: string;
  score?: number;
}

interface AdvancedPoint {
  name?: string;
  key?: string;
  formatted?: string;
  sign?: string;
  house?: number;
  speed?: number;
  retrograde?: boolean;
  rx?: boolean;
}

interface AdvancedOptions {
  houseSystem?: string;
  theme?: string;
  nodeType?: string;
  includeMinorAspects?: boolean;
  enable?: {
    chiron?: boolean;
    lilith?: boolean;
    pof?: boolean;
  };
  [key: string]: unknown;
}

interface AdvancedMeta {
  engine?: string;
  version?: string;
  seVersion?: string;
  sweVersion?: string;
  nodeType?: string;
  houseSystem?: string;
  includeMinorAspects?: boolean;
  [key: string]: unknown;
}

interface AdvancedData {
  options?: AdvancedOptions;
  meta?: AdvancedMeta;
  houses?: HouseData[];
  points?: AdvancedPoint[];
  aspectsPlus?: AspectData[];
}

// Localized planet type (extends PlanetData with localized name)
interface LocalizedPlanet extends PlanetData {
  retrograde?: boolean;
}

interface LocalizedHouse {
  cusp: number;
  formatted: string;
}

// 행성 이미지 매핑
const PLANET_IMAGES: Record<string, string> = {
  Sun: '/images/planets/sun.png',
  Moon: '/images/planets/moon.png',
  Mercury: '/images/planets/mercury.png',
  Venus: '/images/planets/venus.png',
  Mars: '/images/planets/mars.png',
  Jupiter: '/images/planets/jupiter.png',
  Saturn: '/images/planets/saturn.png',
  Uranus: '/images/planets/uranus.png',
  Neptune: '/images/planets/neptune.png',
  Pluto: '/images/planets/pluto.png',
  'True Node': '/images/planets/node.png',
  Chiron: '/images/planets/node.png',
  'Lilith(True)': '/images/planets/pluto.png',
  'Lilith(Mean)': '/images/planets/pluto.png',
  Fortune: '/images/planets/node.png',
};

// 영문 행성명으로 이미지 찾기
function getPlanetImage(planetName: string): string | null {
  // 직접 매칭
  if (PLANET_IMAGES[planetName]) return PLANET_IMAGES[planetName];

  // 한글/다국어 이름을 영문으로 변환해서 찾기
  const nameMap: Record<string, string> = {
    '태양': 'Sun', '달': 'Moon', '수성': 'Mercury', '금성': 'Venus',
    '화성': 'Mars', '목성': 'Jupiter', '토성': 'Saturn', '천왕성': 'Uranus',
    '해왕성': 'Neptune', '명왕성': 'Pluto', '진월교점': 'True Node',
    '키론': 'Chiron', '행운점': 'Fortune',
    // 중국어
    '太阳': 'Sun', '月亮': 'Moon', '水星': 'Mercury', '金星': 'Venus',
    '火星': 'Mars', '木星': 'Jupiter', '土星': 'Saturn', '天王星': 'Uranus',
    '海王星': 'Neptune', '冥王星': 'Pluto',
  };

  const englishName = nameMap[planetName];
  if (englishName && PLANET_IMAGES[englishName]) {
    return PLANET_IMAGES[englishName];
  }

  return null;
}

// 콘텐츠 열람 기록 저장
async function logContentAccess(params: {
  service: string;
  contentType: string;
  locale: string;
  metadata?: Record<string, any>;
}) {
  try {
    await fetch('/api/content-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    // 열람 기록 실패해도 무시
  }
}

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
  return (SIGNS)[k] ? k : 'en';
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
  if (enKeys.includes(inputName as keyof typeof PLANET_LABELS.en)) {
    return PLANET_LABELS[target][inputName as keyof typeof PLANET_LABELS.en] || String(inputName);
  }
  for (const labels of Object.values(PLANET_LABELS)) {
    for (const enKey of enKeys) {
      if (labels[enKey] === inputName) {
        return (PLANET_LABELS)[target][enKey] || (PLANET_LABELS).en[enKey];
      }
    }
  }
  return inputName;
}
function localizeAspectType(type: string, loc: LocaleKey) {
  const key = String(type || '').toLowerCase() as keyof typeof ASPECT_LABELS.en;
  return (ASPECT_LABELS)[loc]?.[key] || type;
}

interface ResultDisplayProps {
  interpretation: string | null;
  isLoading: boolean;
  error: string | null;
  chartData?: NatalChartData | null;
  aspects?: AspectData[] | null;
  advanced?: AdvancedData | null;
  isLoggedIn?: boolean;
  isPremium?: boolean;
}

const PAYWALL_LABELS = {
  en: {
    loginRequired: 'Login Required',
    loginDesc: 'Sign in to view detailed chart analysis',
    loginBtn: 'Sign In',
    premiumRequired: 'Premium Feature',
    premiumDesc: 'Upgrade to Premium to unlock detailed planetary positions, houses, and aspect analysis',
    premiumBtn: 'Upgrade to Premium',
    advancedPremiumDesc: 'Get advanced analysis including extra celestial points, engine details, and in-depth interpretations',
  },
  ko: {
    loginRequired: '로그인이 필요합니다',
    loginDesc: '상세 차트 분석을 보려면 로그인하세요',
    loginBtn: '로그인',
    premiumRequired: '프리미엄 전용',
    premiumDesc: '행성 위치, 하우스, 위상 분석을 확인하려면 프리미엄으로 업그레이드하세요',
    premiumBtn: '프리미엄 업그레이드',
    advancedPremiumDesc: '추가 천체 포인트, 엔진 상세 정보, 심층 해석을 확인하세요',
  },
  zh: {
    loginRequired: '需要登录',
    loginDesc: '登录以查看详细星盘分析',
    loginBtn: '登录',
    premiumRequired: '高级功能',
    premiumDesc: '升级到高级版以解锁行星位置、宫位和相位分析',
    premiumBtn: '升级到高级版',
    advancedPremiumDesc: '获取高级分析，包括额外天体点、引擎详情和深度解读',
  },
  ar: {
    loginRequired: 'تسجيل الدخول مطلوب',
    loginDesc: 'سجّل الدخول لعرض تحليل الخريطة المفصل',
    loginBtn: 'تسجيل الدخول',
    premiumRequired: 'ميزة مميزة',
    premiumDesc: 'قم بالترقية إلى Premium لفتح مواضع الكواكب والبيوت وتحليل الزوايا',
    premiumBtn: 'الترقية إلى Premium',
    advancedPremiumDesc: 'احصل على تحليل متقدم يشمل نقاط سماوية إضافية وتفاصيل المحرك والتفسيرات المعمقة',
  },
  es: {
    loginRequired: 'Inicio de sesión requerido',
    loginDesc: 'Inicia sesión para ver el análisis detallado de la carta',
    loginBtn: 'Iniciar sesión',
    premiumRequired: 'Función Premium',
    premiumDesc: 'Actualiza a Premium para desbloquear posiciones planetarias, casas y análisis de aspectos',
    premiumBtn: 'Actualizar a Premium',
    advancedPremiumDesc: 'Obtén análisis avanzado incluyendo puntos celestes adicionales, detalles del motor e interpretaciones en profundidad',
  },
} as const;

export default function ResultDisplay({
  interpretation,
  isLoading,
  error,
  chartData,
  aspects,
  advanced,
  isLoggedIn = false,
  isPremium = false,
}: ResultDisplayProps) {
  const { locale, dir } = useI18n?.() || { locale: 'en', dir: 'ltr' };
  const locKey = normalizeLocale(locale);
  const L = LABELS[locKey];
  const PL = PAYWALL_LABELS[locKey] || PAYWALL_LABELS.en;
  const signInUrl = buildSignInUrl();

  // 잠금 UI 컴포넌트
  const PaywallOverlay: React.FC<{ type: 'login' | 'premium'; description?: string }> = ({ type, description }) => (
    <div className="relative">
      {/* 블러 처리된 미리보기 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/60 to-gray-900/90 backdrop-blur-sm rounded-xl z-10" />

      {/* 잠금 메시지 */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 flex items-center justify-center">
            {type === 'login' ? (
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {type === 'login' ? PL.loginRequired : PL.premiumRequired}
          </h3>
          <p className="text-white/70 text-sm mb-4">
            {description || (type === 'login' ? PL.loginDesc : PL.premiumDesc)}
          </p>
          <a
            href={type === 'login' ? signInUrl : '/pricing'}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
              type === 'login'
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white'
            }`}
          >
            {type === 'login' ? PL.loginBtn : PL.premiumBtn}
          </a>
        </div>
      </div>

      {/* 더미 콘텐츠 (블러 배경용) */}
      <div className="opacity-30 pointer-events-none select-none p-4 min-h-[200px]">
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
          <div className="h-4 bg-white/10 rounded w-5/6" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
          <div className="h-4 bg-white/10 rounded w-4/5" />
        </div>
      </div>
    </div>
  );

  // 프리미엄 콘텐츠 접근 가능 여부 - 임시로 모든 사용자에게 접근 허용
  const canAccessPremium = true;

  // 열람 기록 중복 방지
  const detailsLoggedRef = useRef(false);
  const advancedLoggedRef = useRef(false);

  // Details 열람 기록
  const handleDetailsToggle = useCallback((e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = (e.target as HTMLDetailsElement).open;
    if (isOpen && canAccessPremium && !detailsLoggedRef.current) {
      detailsLoggedRef.current = true;
      logContentAccess({
        service: 'astrology',
        contentType: 'details',
        locale: locKey,
        metadata: {
          hasChartData: !!chartData,
          hasAspects: !!aspects?.length,
        },
      });
    }
  }, [canAccessPremium, locKey, chartData, aspects]);

  // Advanced 열람 기록
  const handleAdvancedToggle = useCallback((isOpen: boolean) => {
    if (isOpen && canAccessPremium && !advancedLoggedRef.current) {
      advancedLoggedRef.current = true;
      logContentAccess({
        service: 'astrology',
        contentType: 'advanced',
        locale: locKey,
        metadata: {
          hasAdvanced: !!advanced,
        },
      });
    }
  }, [canAccessPremium, locKey, advanced]);

  const prettyInterpretation = useMemo(() => {
    if (!interpretation) return null;
    const rawLines = interpretation.split(/\r?\n/);
    const lines = rawLines.map((s) => s.trim()).filter(Boolean);
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
          String(chartData.ascendant?.formatted || '')
        );
        const sign = localizeSignLabel(signPart, locKey);
        return `${sign} ${degreePart}`.trim();
      })();
      const localizedMc = (() => {
        const { signPart, degreePart } = splitSignAndDegree(
          String(chartData.mc?.formatted || '')
        );
        const sign = localizeSignLabel(signPart, locKey);
        return `${sign} ${degreePart}`.trim();
      })();

      const planets = (chartData.planets || []).map((p: PlanetData) => {
        const name = localizePlanetLabel(String(p.name || ''), locKey);
        const { signPart, degreePart } = splitSignAndDegree(String(p.formatted || ''));
        const sign = localizeSignLabel(signPart, locKey);
        return {
          ...p,
          name,
          formatted: `${sign} ${degreePart}`.trim(),
          retrograde: typeof p.speed === 'number' ? p.speed < 0 : false,
        };
      });

      const houses = (chartData.houses || []).map((h: { cusp: number; formatted: string }) => {
        const { signPart, degreePart } = splitSignAndDegree(String(h.formatted || ''));
        const sign = localizeSignLabel(signPart, locKey);
        return { ...h, formatted: `${sign} ${degreePart}`.trim() };
      });

      return {
        ...chartData,
        ascendant: { ...chartData.ascendant, formatted: localizedAsc },
        mc: { ...chartData.mc, formatted: localizedMc },
        planets,
        houses,
      };
    } catch {
      return chartData;
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

  // 고급스러운 카드 컴포넌트
  const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      className="w-full mt-8 relative group"
      dir={dir}
    >
      {/* 외곽 글로우 효과 */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-indigo-500/20 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

      {/* 메인 카드 */}
      <div className="relative rounded-3xl border border-amber-200/20 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/90 backdrop-blur-xl p-8 md:p-10 text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        {/* 상단 장식 라인 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        {/* 코너 장식 */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-amber-400/30 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-amber-400/30 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-amber-400/30 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-amber-400/30 rounded-br-lg" />

        {/* 배경 별 장식 */}
        <div className="absolute top-6 right-12 text-amber-400/20 text-2xl">✦</div>
        <div className="absolute bottom-8 left-10 text-indigo-400/20 text-xl">✧</div>

        {children}
      </div>
    </div>
  );

  const PlanetsTable = () => {
    if (!viewChart?.planets?.length) return null;

    // 원래 영문 행성명 찾기 (이미지 매핑용)
    const getOriginalPlanetName = (localizedName: string): string => {
      // 역방향 검색: 현지화된 이름에서 영문 이름 찾기
      for (const [_locale, labels] of Object.entries(PLANET_LABELS)) {
        for (const [key, value] of Object.entries(labels)) {
          if (value === localizedName) return key;
        }
      }
      return localizedName;
    };

    return (
      <div className="mt-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-200/90 mb-4">
          <span className="text-amber-400/50">◈</span>
          {L.planetPositions}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-amber-400/10 bg-gradient-to-br from-slate-800/50 to-indigo-900/30">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-amber-200/70 border-b border-amber-400/15 bg-gradient-to-r from-amber-900/20 to-transparent">
                <th className="py-3 px-4 font-semibold tracking-wide">{L.planet}</th>
                <th className="py-3 px-4 font-semibold tracking-wide">{L.position}</th>
                <th className="py-3 px-4 font-semibold tracking-wide">{L.house}</th>
                <th className="py-3 px-4 font-semibold tracking-wide">{L.speed}</th>
              </tr>
            </thead>
            <tbody>
              {viewChart.planets.map((p: LocalizedPlanet, idx: number) => {
                const originalName = getOriginalPlanetName(p.name);
                const planetImage = getPlanetImage(originalName);
                return (
                  <tr
                    key={`${p.name}-${idx}`}
                    className="border-b border-white/5 hover:bg-amber-400/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {planetImage && (
                          <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden border border-amber-400/20 bg-black/30">
                            <Image
                              src={planetImage}
                              alt={p.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-white/95">{p.name}</span>
                          {p.retrograde ? (
                            <span
                              className="ml-2 align-middle text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-200 font-bold"
                              title={L.retrograde}
                              aria-label={L.retrograde}
                            >
                              R
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/90 font-medium">{p.formatted}</td>
                    <td className="py-3 px-4 text-amber-100/70">{`${L.house} ${p.house}`}</td>
                    <td className="py-3 px-4 text-white/60 font-mono text-xs">
                      {typeof p.speed === 'number' ? `${p.speed.toFixed(3)}°/day` : '−'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const HousesTable = () => {
    if (!viewChart?.houses?.length) return null;
    return (
      <div className="mt-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-200/90 mb-4">
          <span className="text-amber-400/50">⌂</span>
          Houses
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {viewChart.houses.map((h: LocalizedHouse, idx: number) => (
            <div
              key={`house-${idx + 1}`}
              className="rounded-lg border border-amber-400/10 bg-gradient-to-br from-slate-800/40 to-indigo-900/20 p-3 hover:border-amber-400/25 transition-colors"
            >
              <div className="text-amber-300/60 text-xs font-semibold mb-1 tracking-wider uppercase">
                {`${L.house} ${idx + 1}`}
              </div>
              <div className="text-white/90 font-medium">{h.formatted}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 위상(Aspect) 유형별 색상
  const getAspectColor = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'conjunction') return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
    if (t === 'trine') return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
    if (t === 'sextile') return 'text-blue-300 bg-blue-500/10 border-blue-500/30';
    if (t === 'square') return 'text-red-300 bg-red-500/10 border-red-500/30';
    if (t === 'opposition') return 'text-orange-300 bg-orange-500/10 border-orange-500/30';
    return 'text-purple-300 bg-purple-500/10 border-purple-500/30';
  };

  const AspectsTable = () => {
    if (!aspects?.length) return null;
    return (
      <div className="mt-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-200/90 mb-4">
          <span className="text-amber-400/50">◇</span>
          {L.aspect}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-amber-400/10 bg-gradient-to-br from-slate-800/50 to-indigo-900/30">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-amber-200/70 border-b border-amber-400/15 bg-gradient-to-r from-amber-900/20 to-transparent">
                <th className="py-3 px-4 font-semibold tracking-wide">{L.aspect}</th>
                <th className="py-3 px-4 font-semibold tracking-wide">{L.from}</th>
                <th className="py-3 px-4 font-semibold tracking-wide">{L.to}</th>
                <th className="py-3 px-4 font-semibold tracking-wide">Orb</th>
                <th className="py-3 px-4 font-semibold tracking-wide">Score</th>
              </tr>
            </thead>
            <tbody>
              {aspects.slice(0, 100).map((a: AspectData, i: number) => {
                const fromVal = typeof a?.from === 'object' ? a.from?.name : a?.from;
                const toVal = typeof a?.to === 'object' ? a.to?.name : a?.to;
                const fromName = localizePlanetLabel(String(fromVal || ''), locKey);
                const toName = localizePlanetLabel(String(toVal || ''), locKey);
                const colorClass = getAspectColor(a.type || '');
                return (
                  <tr
                    key={`asp-${i}`}
                    className="border-b border-white/5 hover:bg-amber-400/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                        {localizeAspectType(a.type || '', locKey)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/90 font-medium">{fromName}</td>
                    <td className="py-3 px-4 text-white/90 font-medium">{toName}</td>
                    <td className="py-3 px-4 text-white/60 font-mono text-xs">
                      {typeof a.orb === 'number' ? `${a.orb.toFixed(2)}°` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {typeof a.score === 'number' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                              style={{ width: `${Math.min(Math.abs(a.score) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-white/50 text-xs font-mono">{a.score.toFixed(2)}</span>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    const extraPoints = advPoints.filter((p: AdvancedPoint) => {
      const n = String(p?.name ?? '').trim();
      return EXTRA_NAMES.has(n);
    });

    const isRx = (p: AdvancedPoint) =>
      Boolean(p?.rx || (typeof p?.speed === 'number' && p.speed < 0));

    const handleToggle = () => {
      const newOpen = !open;
      setOpen(newOpen);
      if (newOpen) {
        handleAdvancedToggle(true);
      }
    };

    return (
      <section className="mt-8">
        {/* 구분선 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-400/20 to-transparent" />
          <span className="text-purple-400/40 text-xs">✧</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-400/20 to-transparent" />
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className="w-full flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 hover:from-purple-500/15 hover:via-indigo-500/15 hover:to-purple-500/15 border border-purple-400/20 hover:border-purple-400/40 rounded-xl px-5 py-4 transition-all"
        >
          <span className="flex items-center gap-2 font-semibold text-purple-200">
            <span className="text-purple-400/60">⚙</span>
            {L.advanced}
          </span>
          <span className="text-purple-400/60 text-lg transition-transform duration-300" style={{ transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
        </button>

        {open && (
          <div className="mt-5 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Engine & Options */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-purple-200/90 mb-4">
                <span className="text-purple-400/50">⚡</span>
                Engine & Options
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-400/15 p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-white/50">{L.engine}</span><span className="text-white/90 font-medium">{meta.engine || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">{L.se}</span><span className="text-white/90 font-medium">{meta.seVersion || meta.sweVersion || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">{L.nodeType}</span><span className="text-white/90 font-medium">{meta.nodeType || opts.nodeType || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">{L.houseSystem}</span><span className="text-white/90 font-medium">{meta.houseSystem || opts.houseSystem || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">{L.theme}</span><span className="text-white/90 font-medium">{opts.theme || '—'}</span></div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-400/15 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/50">{L.includeMinor}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(opts.includeMinorAspects ?? meta.includeMinorAspects) ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-400'}`}>
                      {String(!!(opts.includeMinorAspects ?? meta.includeMinorAspects))}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <div className="text-white/50 mb-2">{L.enable}</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`text-center px-2 py-1.5 rounded-lg text-xs ${opts.enable?.chiron ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-slate-800/50 text-slate-500'}`}>
                        {L.chiron}
                      </div>
                      <div className={`text-center px-2 py-1.5 rounded-lg text-xs ${opts.enable?.lilith ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'bg-slate-800/50 text-slate-500'}`}>
                        {L.lilith}
                      </div>
                      <div className={`text-center px-2 py-1.5 rounded-lg text-xs ${opts.enable?.pof ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800/50 text-slate-500'}`}>
                        {L.pof}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Extra Points */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-purple-200/90 mb-4">
                <span className="text-purple-400/50">★</span>
                {L.extraOnly}
              </h3>
              {extraPoints.length === 0 ? (
                <div className="rounded-xl border border-purple-400/10 bg-purple-900/10 p-4 text-sm text-white/60 text-center">
                  {L.noData}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-purple-400/10 bg-gradient-to-br from-slate-800/50 to-purple-900/20">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-purple-200/70 border-b border-purple-400/15 bg-gradient-to-r from-purple-900/30 to-transparent">
                        <th className="py-3 px-4 font-semibold">{L.planet}</th>
                        <th className="py-3 px-4 font-semibold">{L.position}</th>
                        <th className="py-3 px-4 font-semibold">{L.house}</th>
                        <th className="py-3 px-4 font-semibold">{L.speed}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraPoints.map((p: AdvancedPoint, i: number) => (
                        <tr key={`extra-${i}`} className="border-b border-white/5 hover:bg-purple-400/5 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-medium text-white/95">
                              {localizePlanetLabel(String(p.name || p.key || ''), locKey)}
                            </span>
                            {isRx(p) && (
                              <span
                                className="ml-2 align-middle text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-200 font-bold"
                                title={L.retrograde}
                              >
                                R
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-white/90 font-medium">{p.formatted || '−'}</td>
                          <td className="py-3 px-4 text-purple-100/70">{p.house ?? '−'}</td>
                          <td className="py-3 px-4 text-white/60 font-mono text-xs">
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

  // 해석 텍스트는 행성 카드에서 시각적으로 표시되므로 별도 렌더링하지 않음

  return (
    <Card>
      {/* 제목 섹션 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="text-amber-400/60">✧</span>
          <h2 className="font-serif text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 bg-clip-text text-transparent tracking-wide">
            {L.title}
          </h2>
          <span className="text-amber-400/60">✧</span>
        </div>
        <div className="w-24 h-px mx-auto bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
      </div>

      {/* 행성 이미지 그리드 - 3열, 큰 사이즈 */}
      {viewChart && viewChart.planets && viewChart.planets.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {viewChart.planets.map((p: LocalizedPlanet, idx: number) => {
              // 영문 행성명 찾기
              let englishName = p.name;
              for (const labels of Object.values(PLANET_LABELS)) {
                for (const [key, value] of Object.entries(labels)) {
                  if (value === p.name) {
                    englishName = key;
                    break;
                  }
                }
              }
              const planetImage = getPlanetImage(englishName);

              return (
                <div
                  key={`planet-card-${idx}`}
                  className="group relative flex flex-col items-center p-3 sm:p-5 rounded-xl border border-amber-400/20 bg-gradient-to-br from-slate-800/70 to-indigo-900/50 hover:border-amber-400/50 hover:from-slate-800/90 hover:to-indigo-900/70 transition-all duration-300"
                >
                  {/* 행성 이미지 - 크게 */}
                  {planetImage && (
                    <div className="relative w-[72px] h-[72px] sm:w-28 sm:h-28 mb-2 sm:mb-4 rounded-xl overflow-hidden border-2 border-amber-400/40 bg-black/50 shadow-xl group-hover:border-amber-400/60 transition-colors">
                      <Image
                        src={planetImage}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    </div>
                  )}
                  {/* 행성명 - 크게 */}
                  <span className="text-base sm:text-lg font-bold text-white text-center">
                    {p.name}
                  </span>
                  {/* 위치 - 크게 */}
                  <span className="text-sm sm:text-base text-amber-200/80 text-center mt-1 font-medium">
                    {p.formatted}
                  </span>
                  {/* 역행 표시 */}
                  {p.retrograde && (
                    <span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/40 to-orange-500/40 border border-amber-400/60 text-amber-100 font-bold shadow-lg">
                      R
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 하단 장식 구분선 */}
      <div className="flex items-center justify-center gap-4 my-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        <span className="text-amber-400/40 text-sm">✦</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
      </div>

      {viewChart ? (
        <details className="group" onToggle={handleDetailsToggle}>
          <summary className="cursor-pointer select-none flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-400/20 hover:border-amber-400/40 transition-all group-open:rounded-b-none">
            <span className="text-amber-200 font-semibold tracking-wide">{L.details}</span>
            {!canAccessPremium && (
              <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border border-amber-400/40 font-semibold">
                Premium
              </span>
            )}
            <span className="text-amber-400/60 group-open:rotate-180 inline-block transition-transform duration-300">
              ▼
            </span>
          </summary>

          <div className="rounded-b-xl border border-t-0 border-amber-400/20 bg-gradient-to-br from-slate-900/80 to-indigo-950/60 p-6 md:p-8">
            {/* 로그인 안 됨 - 로그인 필요 */}
            {!isLoggedIn && (
              <PaywallOverlay type="login" />
            )}

            {/* 로그인 됨 but 프리미엄 아님 - 결제 필요 */}
            {isLoggedIn && !isPremium && (
              <PaywallOverlay type="premium" />
            )}

            {/* 프리미엄 사용자 - 전체 콘텐츠 표시 */}
            {canAccessPremium && (
              <>
                {/* ASC / MC 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <div className="relative overflow-hidden rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-900/20 via-slate-800/50 to-indigo-900/30 p-5 group/card hover:border-amber-400/40 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
                    <div className="text-amber-300/70 text-xs font-semibold mb-2 tracking-wider uppercase flex items-center gap-2">
                      <span className="text-amber-400/50">↑</span>
                      {L.ascendant}
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-amber-100 to-amber-200 bg-clip-text text-transparent">
                      {(viewChart).ascendant?.formatted}
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-900/20 via-slate-800/50 to-purple-900/30 p-5 group/card hover:border-indigo-400/40 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full" />
                    <div className="text-indigo-300/70 text-xs font-semibold mb-2 tracking-wider uppercase flex items-center gap-2">
                      <span className="text-indigo-400/50">◎</span>
                      MC (Midheaven)
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-indigo-100 to-indigo-200 bg-clip-text text-transparent">
                      {(viewChart).mc?.formatted}
                    </div>
                  </div>
                </div>

                <PlanetsTable />
                <HousesTable />
                <AspectsTable />

                <AdvancedPanel />
              </>
            )}
          </div>
        </details>
      ) : null}
    </Card>
  );
}
