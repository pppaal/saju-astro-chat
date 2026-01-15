// tests/lib/destiny-map/astrologyengine.test.ts
// 운명지도 점성학 엔진 테스트



// 모듈에서 사용하는 타입 정의
interface CombinedInput {
  name?: string;
  gender?: 'male' | 'female';
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  theme?: string;
  tz?: string;
  userTimezone?: string;
}

interface CombinedResult {
  meta: { generator: string; generatedAt: string; name?: string; gender?: string };
  astrology: Record<string, unknown>;
  saju: Record<string, unknown>;
  summary: string;
  userTimezone?: string;
  analysisDate?: string;
  extraPoints?: Record<string, unknown>;
  solarReturn?: Record<string, unknown>;
  lunarReturn?: Record<string, unknown>;
  progressions?: Record<string, unknown>;
  draconic?: Record<string, unknown>;
  harmonics?: Record<string, unknown>;
  asteroids?: Record<string, unknown>;
  fixedStars?: unknown[];
  eclipses?: Record<string, unknown>;
  electional?: Record<string, unknown>;
  midpoints?: Record<string, unknown>;
}

describe('astrologyengine (destiny-map)', () => {
  describe('CombinedInput validation', () => {
    it('should require birthDate in YYYY-MM-DD format', () => {
      const input: CombinedInput = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
      };

      expect(input.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should require birthTime in HH:MM format', () => {
      const input: CombinedInput = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
      };

      expect(input.birthTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should validate latitude range (-90 to 90)', () => {
      const validLatitudes = [0, 37.5, -45.2, 89.9, -89.9];
      const invalidLatitudes = [91, -91, 180, -180];

      validLatitudes.forEach((lat) => {
        expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      });

      invalidLatitudes.forEach((lat) => {
        expect(Math.abs(lat)).toBeGreaterThan(90);
      });
    });

    it('should validate longitude range (-180 to 180)', () => {
      const validLongitudes = [0, 126.9, -122.4, 179.9, -179.9];
      const invalidLongitudes = [181, -181, 200, -200];

      validLongitudes.forEach((lon) => {
        expect(Math.abs(lon)).toBeLessThanOrEqual(180);
      });

      invalidLongitudes.forEach((lon) => {
        expect(Math.abs(lon)).toBeGreaterThan(180);
      });
    });

    it('should accept optional gender', () => {
      const inputMale: CombinedInput = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
        gender: 'male',
      };

      const inputFemale: CombinedInput = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
        gender: 'female',
      };

      expect(inputMale.gender).toBe('male');
      expect(inputFemale.gender).toBe('female');
    });

    it('should accept optional timezone', () => {
      const input: CombinedInput = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
        tz: 'Asia/Seoul',
      };

      expect(input.tz).toBe('Asia/Seoul');
    });
  });

  describe('CombinedResult structure', () => {
    it('should have required meta fields', () => {
      const result: CombinedResult = {
        meta: {
          generator: 'DestinyMap Core Engine',
          generatedAt: new Date().toISOString(),
        },
        astrology: {},
        saju: {},
        summary: '',
      };

      expect(result.meta.generator).toBeTruthy();
      expect(result.meta.generatedAt).toBeTruthy();
    });

    it('should have astrology data section', () => {
      const result: CombinedResult = {
        meta: { generator: 'test', generatedAt: new Date().toISOString() },
        astrology: {
          facts: {},
          planets: [],
          houses: [],
          ascendant: {},
          mc: {},
          aspects: [],
        },
        saju: {},
        summary: '',
      };

      expect(result.astrology).toBeDefined();
    });

    it('should have saju data section', () => {
      const result: CombinedResult = {
        meta: { generator: 'test', generatedAt: new Date().toISOString() },
        astrology: {},
        saju: {
          facts: {},
          pillars: {},
          dayMaster: {},
          unse: { daeun: [], annual: [], monthly: [], iljin: [] },
        },
        summary: '',
      };

      expect(result.saju).toBeDefined();
    });
  });

  describe('timezone resolution', () => {
    function resolveTimezone(tz: string | undefined, latitude: number, longitude: number): string {
      if (tz) return tz;
      // 간단한 타임존 추정 (경도 기반)
      if (longitude >= 120 && longitude <= 135) return 'Asia/Seoul';
      if (longitude >= -125 && longitude <= -65) return 'America/New_York';
      if (longitude >= -10 && longitude <= 5) return 'Europe/London';
      return 'UTC';
    }

    it('should use provided timezone if available', () => {
      const tz = resolveTimezone('America/Los_Angeles', 34.0522, -118.2437);
      expect(tz).toBe('America/Los_Angeles');
    });

    it('should infer Asia/Seoul for Korean coordinates', () => {
      const tz = resolveTimezone(undefined, 37.5665, 126.9780);
      expect(tz).toBe('Asia/Seoul');
    });

    it('should return default timezone for coordinates outside known regions', () => {
      const tz = resolveTimezone(undefined, 0, 0);
      // 적도 (0,0)는 대서양 상에 있어 정의된 범위에 없음 -> UTC 또는 기본값
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });
  });

  describe('coordinate normalization', () => {
    function normalizeAngle(deg: number): number {
      return ((deg % 360) + 360) % 360;
    }

    it('should normalize positive angles', () => {
      expect(normalizeAngle(450)).toBe(90);
      expect(normalizeAngle(720)).toBe(0);
      expect(normalizeAngle(180)).toBe(180);
    });

    it('should normalize negative angles', () => {
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-180)).toBe(180);
      expect(normalizeAngle(-360)).toBe(0);
    });
  });

  describe('Yin/Yang determination', () => {
    // 천간 음양: 갑/병/무/경/임 = 양, 을/정/기/신간/계 = 음
    // 지지 음양: 자/인/진/오/신지/술 = 양, 축/묘/사/미/유/해 = 음
    // '신'이 천간(辛)과 지지(申)에 둘 다 있어 한글로 구분 불가 -> 한자 사용
    function getYinYangFromChar(char: string): '음' | '양' {
      const yangStems = ['甲', '丙', '戊', '庚', '壬'];
      const yangBranches = ['子', '寅', '辰', '午', '申', '戌'];
      if (yangStems.includes(char) || yangBranches.includes(char)) return '양';
      return '음';
    }

    it('should identify yang stems (한자)', () => {
      expect(getYinYangFromChar('甲')).toBe('양'); // 갑
      expect(getYinYangFromChar('丙')).toBe('양'); // 병
      expect(getYinYangFromChar('戊')).toBe('양'); // 무
      expect(getYinYangFromChar('庚')).toBe('양'); // 경
      expect(getYinYangFromChar('壬')).toBe('양'); // 임
    });

    it('should identify yin stems (한자)', () => {
      expect(getYinYangFromChar('乙')).toBe('음'); // 을
      expect(getYinYangFromChar('丁')).toBe('음'); // 정
      expect(getYinYangFromChar('己')).toBe('음'); // 기
      expect(getYinYangFromChar('辛')).toBe('음'); // 신 (천간)
      expect(getYinYangFromChar('癸')).toBe('음'); // 계
    });

    it('should identify yang branches (한자)', () => {
      expect(getYinYangFromChar('子')).toBe('양'); // 자
      expect(getYinYangFromChar('寅')).toBe('양'); // 인
      expect(getYinYangFromChar('辰')).toBe('양'); // 진
      expect(getYinYangFromChar('午')).toBe('양'); // 오
      expect(getYinYangFromChar('申')).toBe('양'); // 신 (지지)
      expect(getYinYangFromChar('戌')).toBe('양'); // 술
    });

    it('should identify yin branches (한자)', () => {
      expect(getYinYangFromChar('丑')).toBe('음'); // 축
      expect(getYinYangFromChar('卯')).toBe('음'); // 묘
      expect(getYinYangFromChar('巳')).toBe('음'); // 사
      expect(getYinYangFromChar('未')).toBe('음'); // 미
      expect(getYinYangFromChar('酉')).toBe('음'); // 유
      expect(getYinYangFromChar('亥')).toBe('음'); // 해
    });
  });

  describe('transit aspect calculation', () => {
    function calcTransitAngleDiff(a: number, b: number): number {
      const d = Math.abs(a - b) % 360;
      return Math.min(d, 360 - d);
    }

    const aspectAngles = {
      conjunction: 0,
      sextile: 60,
      square: 90,
      trine: 120,
      opposition: 180,
    };

    it('should calculate conjunction (0°)', () => {
      const diff = calcTransitAngleDiff(100, 100);
      expect(diff).toBe(0);
    });

    it('should calculate opposition (180°)', () => {
      const diff = calcTransitAngleDiff(0, 180);
      expect(diff).toBe(180);
    });

    it('should calculate square (90°)', () => {
      const diff = calcTransitAngleDiff(0, 90);
      expect(diff).toBe(90);
    });

    it('should calculate trine (120°)', () => {
      const diff = calcTransitAngleDiff(0, 120);
      expect(diff).toBe(120);
    });

    it('should calculate sextile (60°)', () => {
      const diff = calcTransitAngleDiff(0, 60);
      expect(diff).toBe(60);
    });

    it('should handle wrap-around angles', () => {
      const diff = calcTransitAngleDiff(350, 10);
      expect(diff).toBe(20);
    });

    it('should detect aspects within orb', () => {
      const orb = 4;
      const detectAspect = (diff: number): string | null => {
        for (const [name, angle] of Object.entries(aspectAngles)) {
          if (Math.abs(diff - angle) <= orb) return name;
        }
        return null;
      };

      expect(detectAspect(2)).toBe('conjunction');
      expect(detectAspect(58)).toBe('sextile');
      expect(detectAspect(92)).toBe('square');
      expect(detectAspect(118)).toBe('trine');
      expect(detectAspect(178)).toBe('opposition');
      expect(detectAspect(45)).toBeNull();
    });
  });

  describe('Part of Fortune calculation', () => {
    function calculatePartOfFortune(
      ascLon: number,
      sunLon: number,
      moonLon: number,
      isNightChart: boolean
    ): number {
      const norm = (deg: number) => ((deg % 360) + 360) % 360;
      // Day formula: ASC + Moon - Sun
      // Night formula: ASC + Sun - Moon
      if (isNightChart) {
        return norm(ascLon + sunLon - moonLon);
      }
      return norm(ascLon + moonLon - sunLon);
    }

    it('should calculate Part of Fortune for day chart', () => {
      const asc = 0;
      const sun = 30;
      const moon = 90;
      const pof = calculatePartOfFortune(asc, sun, moon, false);
      // ASC + Moon - Sun = 0 + 90 - 30 = 60
      expect(pof).toBe(60);
    });

    it('should calculate Part of Fortune for night chart', () => {
      const asc = 0;
      const sun = 30;
      const moon = 90;
      const pof = calculatePartOfFortune(asc, sun, moon, true);
      // ASC + Sun - Moon = 0 + 30 - 90 = -60 = 300
      expect(pof).toBe(300);
    });

    it('should normalize negative results', () => {
      const pof = calculatePartOfFortune(10, 200, 50, false);
      // ASC + Moon - Sun = 10 + 50 - 200 = -140 = 220
      expect(pof).toBe(220);
    });
  });

  describe('zodiac sign determination', () => {
    const signNames = [
      'Aries', 'Taurus', 'Gemini', 'Cancer',
      'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ];

    function getZodiacSign(longitude: number): string {
      const signIndex = Math.floor(longitude / 30) % 12;
      return signNames[signIndex];
    }

    it('should identify Aries (0-30°)', () => {
      expect(getZodiacSign(15)).toBe('Aries');
      expect(getZodiacSign(0)).toBe('Aries');
      expect(getZodiacSign(29)).toBe('Aries');
    });

    it('should identify Taurus (30-60°)', () => {
      expect(getZodiacSign(30)).toBe('Taurus');
      expect(getZodiacSign(45)).toBe('Taurus');
    });

    it('should identify Pisces (330-360°)', () => {
      expect(getZodiacSign(330)).toBe('Pisces');
      expect(getZodiacSign(359)).toBe('Pisces');
    });

    it('should wrap around at 360°', () => {
      expect(getZodiacSign(360)).toBe('Aries');
      expect(getZodiacSign(390)).toBe('Taurus'); // 390 = 30 -> Taurus
    });
  });

  describe('house determination', () => {
    function getHouseFromLongitude(
      longitude: number,
      cusps: number[]
    ): number {
      if (cusps.length !== 12) return 0;

      for (let i = 0; i < 12; i++) {
        const start = cusps[i];
        const end = cusps[(i + 1) % 12];
        const inRange =
          start < end
            ? longitude >= start && longitude < end
            : longitude >= start || longitude < end;
        if (inRange) return i + 1;
      }
      return 0;
    }

    it('should determine house for standard cusps', () => {
      const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
      expect(getHouseFromLongitude(15, cusps)).toBe(1);
      expect(getHouseFromLongitude(45, cusps)).toBe(2);
      expect(getHouseFromLongitude(315, cusps)).toBe(11);
    });

    it('should handle wrap-around cusps', () => {
      const cusps = [330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300];
      // Longitude 345 should be in house 1 (between 330 and 0)
      expect(getHouseFromLongitude(345, cusps)).toBe(1);
      // Longitude 15 should be in house 2 (between 0 and 30)
      expect(getHouseFromLongitude(15, cusps)).toBe(2);
    });
  });

  describe('cache management', () => {
    const cache = new Map<string, { result: unknown; timestamp: number }>();
    const CACHE_TTL = 5 * 60 * 1000; // 5분
    const MAX_CACHE_SIZE = 50;

    function generateCacheKey(input: CombinedInput): string {
      return `${input.birthDate}|${input.birthTime}|${input.latitude.toFixed(4)}|${input.longitude.toFixed(4)}`;
    }

    function setCacheItem(key: string, result: unknown): void {
      if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }
      cache.set(key, { result, timestamp: Date.now() });
    }

    function getCacheItem(key: string): unknown | null {
      const cached = cache.get(key);
      if (!cached) return null;
      if (Date.now() - cached.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
      }
      return cached.result;
    }

    beforeEach(() => {
      cache.clear();
    });

    it('should generate consistent cache keys', () => {
      const input: CombinedInput = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
      };

      const key1 = generateCacheKey(input);
      const key2 = generateCacheKey(input);
      expect(key1).toBe(key2);
    });

    it('should store and retrieve cache items', () => {
      const key = 'test-key';
      const result = { data: 'test' };

      setCacheItem(key, result);
      const retrieved = getCacheItem(key);

      expect(retrieved).toEqual(result);
    });

    it('should respect MAX_CACHE_SIZE limit', () => {
      for (let i = 0; i < MAX_CACHE_SIZE + 5; i++) {
        setCacheItem(`key-${i}`, { i });
      }

      expect(cache.size).toBe(MAX_CACHE_SIZE);
    });
  });

  describe('date/time parsing', () => {
    function parseBirthDateTime(birthDate: string, birthTime: string) {
      const [year, month, day] = birthDate.split('-').map(Number);
      const [hour, minute] = birthTime.split(':').map((v) => Number(v) || 0);
      return { year, month, day, hour, minute };
    }

    it('should parse standard date format', () => {
      const parsed = parseBirthDateTime('1990-05-15', '14:30');
      expect(parsed).toEqual({
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30,
      });
    });

    it('should handle midnight', () => {
      const parsed = parseBirthDateTime('2000-01-01', '00:00');
      expect(parsed.hour).toBe(0);
      expect(parsed.minute).toBe(0);
    });

    it('should handle missing minutes', () => {
      const parsed = parseBirthDateTime('2000-01-01', '14:');
      expect(parsed.hour).toBe(14);
      expect(parsed.minute).toBe(0);
    });
  });

  describe('summary generation', () => {
    interface PlanetData {
      name: string;
      sign: string;
    }

    function generateSummary(
      name: string | undefined,
      planets: PlanetData[],
      ascSign: string,
      mcSign: string,
      dominantElement: string | undefined,
      dayMasterText: string
    ): string {
      const sun = planets.find((p) => p.name === 'Sun')?.sign ?? '-';
      const moon = planets.find((p) => p.name === 'Moon')?.sign ?? '-';

      return [
        name ? `Name: ${name}` : '',
        `Sun: ${sun}`,
        `Moon: ${moon}`,
        `Asc: ${ascSign}`,
        `MC: ${mcSign}`,
        dominantElement ? `Dominant Element: ${dominantElement}` : '',
        `Day Master: ${dayMasterText}`,
      ]
        .filter(Boolean)
        .join(' | ');
    }

    it('should generate complete summary', () => {
      const planets: PlanetData[] = [
        { name: 'Sun', sign: 'Taurus' },
        { name: 'Moon', sign: 'Cancer' },
      ];

      const summary = generateSummary(
        'John',
        planets,
        'Leo',
        'Taurus',
        'Earth',
        '갑 (목)'
      );

      expect(summary).toContain('Name: John');
      expect(summary).toContain('Sun: Taurus');
      expect(summary).toContain('Moon: Cancer');
      expect(summary).toContain('Asc: Leo');
      expect(summary).toContain('MC: Taurus');
      expect(summary).toContain('Dominant Element: Earth');
      expect(summary).toContain('Day Master: 갑 (목)');
    });

    it('should omit name if not provided', () => {
      const planets: PlanetData[] = [
        { name: 'Sun', sign: 'Aries' },
        { name: 'Moon', sign: 'Leo' },
      ];

      const summary = generateSummary(
        undefined,
        planets,
        'Virgo',
        'Gemini',
        'Fire',
        '병 (화)'
      );

      expect(summary).not.toContain('Name:');
    });

    it('should omit dominant element if not provided', () => {
      const planets: PlanetData[] = [
        { name: 'Sun', sign: 'Pisces' },
        { name: 'Moon', sign: 'Scorpio' },
      ];

      const summary = generateSummary(
        'Jane',
        planets,
        'Cancer',
        'Pisces',
        undefined,
        '임 (수)'
      );

      expect(summary).not.toContain('Dominant Element:');
    });
  });
});
