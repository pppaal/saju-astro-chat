// components/saju/SajuAnalyzer.tsx

'use client';

import { toUTC } from "src/utils/datetime"; // 경로 맞게 조정
import { useState, FormEvent, useMemo } from 'react';
import SajuResultDisplay from './SajuResultDisplay';
// 상대경로로 변경(components/saju → lib/Saju)
import { getSupportedTimezones, getUserTimezone, getOffsetMinutes, formatOffset } from '../../lib/Saju';

// --- 타입 정의 ---
type FiveElement = '목' | '화' | '토' | '금' | '수';
type YinYang = '양' | '음';
interface GanjiData { name: string; element: FiveElement; sibsin: string; }
interface JijangganData { chogi: { name: string; sibsin: string; }; junggi: { name: string; sibsin: string; }; jeonggi: { name: string; sibsin: string; }; }
interface PillarData { heavenlyStem: GanjiData; earthlyBranch: GanjiData; jijanggan: JijangganData; }
interface UnseData { heavenlyStem: string; earthlyBranch:string; sibsin: { cheon: string; ji: string; }; }
interface DaeunData extends UnseData { age: number; }
interface YeonunData extends UnseData { year: number; }
interface WolunData extends UnseData { year: number; month: number; }
interface IljinData {
  year: number; month: number; day: number;
  heavenlyStem: string; earthlyBranch: string;
  sibsin: { cheon: string; ji: string; };
  isCheoneulGwiin: boolean;
}

interface ApiFullResponse {
  birthYear: number;
  yearPillar: PillarData;
  monthPillar: PillarData;
  dayPillar: PillarData;
  timePillar: PillarData;
  daeun: { daeunsu: number; cycles: DaeunData[]; };
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number; };
  dayMaster: { name: string; element: FiveElement; yin_yang: YinYang; };
  yeonun: YeonunData[];
  wolun: WolunData[];
  iljin: IljinData[];
  gptPrompt: string;
}

export default function SajuAnalyzer() {
  const userTz = useMemo(() => getUserTimezone(), []);
  const tzList: string[] = useMemo(() => getSupportedTimezones(), []);
  const baseInstant = useMemo(() => new Date(), []);
  const [tzQuery, setTzQuery] = useState('');

  const [formData, setFormData] = useState({
    calendarType: 'solar' as 'solar' | 'lunar',
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male' as 'male' | 'female',
    timezone: userTz,
  });

  const [sajuResult, setSajuResult] = useState<ApiFullResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredTz: string[] = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return tzList.slice(0, 200);
    return tzList.filter((t: string) => t.toLowerCase().includes(q)).slice(0, 200);
  }, [tzList, tzQuery]);


const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError(null);
  setSajuResult(null);

  try {
    // 2) 여기(try 안)에서 birthUTC 계산 — 추가됨
    const birthUTC = toUTC(
      formData.birthDate,
      formData.birthTime,
      formData.timezone
    ).toISOString();

    // 3) 원래 payload에 birthUTC만 추가 — 추가됨
    const payload = { ...formData, birthUTC };

    const response = await fetch('/api/saju', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'An unknown server error occurred.');
    }
    setSajuResult(data as ApiFullResponse);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch analysis data.');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#1e1e2f',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #4f4f7a',
          marginBottom: '2rem'
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="calendarType" style={labelStyle}>양력/음력</label>
          <select id="calendarType" name="calendarType" value={formData.calendarType} onChange={handleInputChange} style={selectStyle}>
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="birthDate" style={labelStyle}>생년월일</label>
          <input id="birthDate" name="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="birthTime" style={labelStyle}>태어난 시간</label>
          <input id="birthTime" name="birthTime" type="time" value={formData.birthTime} onChange={handleInputChange} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="gender" style={labelStyle}>성별</label>
          <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} style={selectStyle}>
            <option value="male">남자</option>
            <option value="female">여자</option>
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>타임존</label>
          <input
            placeholder="타임존 검색 (예: seoul, new_york)"
            value={tzQuery}
            onChange={e => setTzQuery(e.target.value)}
            style={inputStyle}
          />
          <select
            name="timezone"
            value={formData.timezone}
            onChange={handleInputChange}
            style={{ ...selectStyle, marginTop: '8px' }}
          >
            {filteredTz.map((tz: string) => {
              const off = formatOffset(getOffsetMinutes(baseInstant, tz));
              return (
                <option key={tz} value={tz}>
                  {tz} ({off})
                </option>
              );
            })}
          </select>
        </div>

        <button type="submit" disabled={isLoading} style={buttonStyle(isLoading)}>
          {isLoading ? '분석 중...' : '사주 분석하기'}
        </button>
      </form>

      {error && <p style={{ color: '#ff6b6b', marginTop: '1rem', textAlign: 'center' }}>오류: {error}</p>}
      {sajuResult && <SajuResultDisplay result={sajuResult} />}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: '500',
  marginBottom: '0.5rem',
  color: '#e0e0e0'
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.8rem',
  border: '1px solid #4f4f7a',
  borderRadius: '6px',
  fontSize: '1rem',
  backgroundColor: '#161625',
  color: '#ffffff'
};
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' };
const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '1rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? '#2a2a3e' : '#3a6df0',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  transition: 'background-color 0.2s',
  opacity: disabled ? 0.6 : 1
});