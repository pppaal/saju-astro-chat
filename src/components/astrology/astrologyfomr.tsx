// src/app/components/AstrologyForm.tsx

"use client";

import { useState, FormEvent } from 'react';
import { NatalChartInput } from '@/lib/astrology';

interface AstrologyFormProps {
    onGenerate: (data: NatalChartInput) => void;
    isLoading: boolean;
}

export default function AstrologyForm({ onGenerate, isLoading }: AstrologyFormProps) {
    const [formData, setFormData] = useState<NatalChartInput>({
        year: 1995,
        month: 2,
        date: 9,
        hour: 6,
        minute: 40,
        latitude: 37.5665,
        longitude: 126.9780,
        locationName: '서울',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        // 문자열로 받은 데이터를 숫자로 변환하여 전달
        const numericData = {
            ...formData,
            year: parseInt(String(formData.year), 10),
            month: parseInt(String(formData.month), 10),
            date: parseInt(String(formData.date), 10),
            hour: parseInt(String(formData.hour), 10),
            minute: parseInt(String(formData.minute), 10),
            latitude: parseFloat(String(formData.latitude)),
            longitude: parseFloat(String(formData.longitude)),
        };
        onGenerate(numericData);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700">년</label>
                    <input type="number" name="year" id="year" value={formData.year} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                </div>
                <div>
                    <label htmlFor="month" className="block text-sm font-medium text-gray-700">월</label>
                    <input type="number" name="month" id="month" value={formData.month} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">일</label>
                    <input type="number" name="date" id="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                </div>
                <div>
                    <label htmlFor="hour" className="block text-sm font-medium text-gray-700">시</label>
                    <input type="number" name="hour" id="hour" value={formData.hour} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                </div>
                <div>
                    <label htmlFor="minute" className="block text-sm font-medium text-gray-700">분</label>
                    <input type="number" name="minute" id="minute" value={formData.minute} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                </div>
                <div>
                    <label htmlFor="locationName" className="block text-sm font-medium text-gray-700">도시명</label>
                    <input type="text" name="locationName" id="locationName" value={formData.locationName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                </div>
                <div>
                    <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">위도</label>
                    <input type="number" step="any" name="latitude" id="latitude" value={formData.latitude} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                </div>
                <div>
                    <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">경도</label>
                    <input type="number" step="any" name="longitude" id="longitude" value={formData.longitude} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                </div>
            </div>
            <button type="submit" disabled={isLoading} className="mt-6 w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400">
                {isLoading ? '해석 생성 중...' : '내 차트 해석하기'}
            </button>
        </form>
    );
}