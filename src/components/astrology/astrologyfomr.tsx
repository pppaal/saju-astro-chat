// src/app/components/Astrologyfomr.tsx
'use client';

import { useMemo, useState, FormEvent } from 'react';
import { NatalChartInput, generatePromptForGemini } from '@/lib/astrology';
import {
  getSupportedTimezones,
  getUserTimezone,
  getOffsetMinutes,
  formatOffset,
} from '@/lib/Saju/timezone';

interface AstrologyFormTZProps {
  onResult?: (prompt: string) => void; // 선택: 생성된 프롬프트를 상위로 넘기고 싶을 때
  isLoadingExternal?: boolean;         // 외부 로딩 상태를 쓰고 싶을 때
}

export default function AstrologyFormTZ({
  onResult,
  isLoadingExternal,
}: AstrologyFormTZProps) {
  const [form, setForm] = useState({
    year: 1995,
    month: 2,
    date: 9,
    hour: 6,
    minute: 40,
    latitude: 37.5665,      // 기본: 서울
    longitude: 126.978,
    locationName: 'Seoul',
    timeZone: getUserTimezone() || 'Asia/Seoul',
  });

  const [isLoading, setIsLoading] = useState(false);
  const loading = isLoadingExternal ?? isLoading;

  const timezones = useMemo(() => getSupportedTimezones(), []);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      // 숫자 필드
      const numericKeys = new Set([
        'year',
        'month',
        'date',
        'hour',
        'minute',
        'latitude',
        'longitude',
      ]);
      return {
        ...prev,
        [name]: numericKeys.has(name) ? Number(value) : value,
      } as typeof prev;
    });
  };

  // 사용자가 입력한 날짜/시각 기준 오프셋(DST 반영)
  const offsetMinutes = useMemo(() => {
    try {
      const utcProbe = new Date(
        Date.UTC(form.year, form.month - 1, form.date, form.hour, form.minute, 0)
      );
      return getOffsetMinutes(utcProbe, form.timeZone);
    } catch {
      return 0;
    }
  }, [form.year, form.month, form.date, form.hour, form.minute, form.timeZone]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // NatalChartInput에 timeZone 필드가 포함되어 있어야 합니다(앞서 드린 lib 코드 적용 가정).
      const payload: NatalChartInput = {
        year: form.year,
        month: form.month,
        date: form.date,
        hour: form.hour,
        minute: form.minute,
        latitude: form.latitude,
        longitude: form.longitude,
        locationName: form.locationName,
        timeZone: form.timeZone,
      };

      const prompt = generatePromptForGemini(payload);
      onResult?.(prompt);
      // 필요 시 여기서 바로 API 호출/상태 저장 등 수행
      // setOutput(prompt);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-md"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">
            년
          </label>
          <input
            type="number"
            name="year"
            id="year"
            value={form.year}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="month" className="block text-sm font-medium text-gray-700">
            월
          </label>
          <input
            type="number"
            name="month"
            id="month"
            value={form.month}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            일
          </label>
          <input
            type="number"
            name="date"
            id="date"
            value={form.date}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="hour" className="block text-sm font-medium text-gray-700">
            시
          </label>
          <input
            type="number"
            name="hour"
            id="hour"
            value={form.hour}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="minute" className="block text-sm font-medium text-gray-700">
            분
          </label>
          <input
            type="number"
            name="minute"
            id="minute"
            value={form.minute}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="locationName"
            className="block text-sm font-medium text-gray-700"
          >
            도시명(표시용)
          </label>
          <input
            type="text"
            name="locationName"
            id="locationName"
            value={form.locationName}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
        </div>

        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
            위도
          </label>
          <input
            type="number"
            step="any"
            name="latitude"
            id="latitude"
            value={form.latitude}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
            경도
          </label>
          <input
            type="number"
            step="any"
            name="longitude"
            id="longitude"
            value={form.longitude}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
            시간대(Time Zone)
          </label>
          <select
            name="timeZone"
            id="timeZone"
            value={form.timeZone}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            현재 선택의 오프셋: {formatOffset(offsetMinutes)}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
      >
        {loading ? '해석 생성 중...' : '내 차트 해석하기'}
      </button>
    </form>
  );
}