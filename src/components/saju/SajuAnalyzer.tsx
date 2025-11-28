// components/saju/SajuAnalyzer.tsx

'use client';

import { useState, FormEvent, useMemo } from 'react';
import SajuResultDisplay from './SajuResultDisplay';
import {
  getSupportedTimezones,
  getUserTimezone,
  getOffsetMinutes,
  formatOffset,
  // 라이브러리 타입
  type DayMaster,
  type DaeunData,
  type YeonunData,
  type WolunData,
  type IljinData,
  type PillarData,
} from '../../lib/Saju';

// 서버 응답 타입: 라이브러리 타입만 사용
interface ApiFullResponse {
  birthYear: number;
  yearPillar: PillarData;
  monthPillar: PillarData;
  dayPillar: PillarData;
  timePillar: PillarData;
  daeun: { daeunsu: number; cycles: DaeunData[] };
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number };
  dayMaster: DayMaster;
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
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      const payload = { ...formData };
      const response = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'An unknown server error occurred.');
      }
      // 서버가 라이브러리 타입과 동일 구조를 반환한다고 가정
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
          marginBottom: '2rem',
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="calendarType" style={labelStyle}>
            양력/음력
          </label>
          <select
            id="calendarType"
            name="calendarType"
            value={formData.calendarType}
            onChange={handleInputChange}
            style={selectStyle}
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="birthDate" style={labelStyle}>
            생년월일
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={handleInputChange}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="birthTime" style={labelStyle}>
            태어난 시간
          </label>
          <input
            id="birthTime"
            name="birthTime"
            type="time"
            value={formData.birthTime}
            onChange={handleInputChange}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="gender" style={labelStyle}>
            성별
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            style={selectStyle}
          >
            <option value="male">남자</option>
            <option value="female">여자</option>
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>타임존</label>
          <input
            placeholder="타임존 검색 (예: seoul, new_york)"
            value={tzQuery}
            onChange={(e) => setTzQuery(e.target.value)}
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

      {error && (
        <p style={{ color: '#ff6b6b', marginTop: '1rem', textAlign: 'center' }}>
          오류: {error}
        </p>
      )}
      {sajuResult && <SajuResultDisplay result={sajuResult} />}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: '500',
  marginBottom: '0.5rem',
  color: '#e0e0e0',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.8rem',
  border: '1px solid #4f4f7a',
  borderRadius: '6px',
  fontSize: '1rem',
  backgroundColor: '#161625',
  color: '#ffffff',
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
  opacity: disabled ? 0.6 : 1,
});