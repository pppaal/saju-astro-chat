'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import { useI18n } from '@/i18n/I18nProvider';
import { CompatibilityFreeReport } from '@/components/compatibility/free-report';
import { ShareButton } from '@/components/share/ShareButton';
import { generateCompatibilityCard } from '@/components/share/cards/CompatibilityCard';
import { logger } from '@/lib/logger';
import type { SajuData, AstrologyData } from '@/types/api';

// Loading fallback
function InsightsLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="animate-spin w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full" />
      <p className="mt-4 text-gray-400">로딩 중...</p>
    </div>
  );
}

type PersonData = {
  name: string;
  date: string;
  time: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timeZone?: string;
  relation?: string;
};

function CompatibilityInsightsContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [persons, setPersons] = useState<PersonData[]>([]);
  const [person1Saju, setPerson1Saju] = useState<SajuData | null>(null);
  const [person2Saju, setPerson2Saju] = useState<SajuData | null>(null);
  const [person1Astro, setPerson1Astro] = useState<AstrologyData | null>(null);
  const [person2Astro, setPerson2Astro] = useState<AstrologyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse URL params on mount
  useEffect(() => {
    if (!searchParams) {return;}

    try {
      const personsParam = searchParams.get('persons');
      if (personsParam) {
        const parsed = JSON.parse(decodeURIComponent(personsParam));
        setPersons(parsed);

        // Fetch Saju and Astrology data for both persons
        fetchPersonData(parsed);
      } else {
        setError('사람 정보가 없어요. 입력 화면으로 돌아가 다시 시작해주세요.');
        setIsLoading(false);
      }
    } catch (e) {
      logger.error('Failed to parse URL params:', { error: e });
      setError('정보를 불러오지 못했어요. 다시 시도해주세요.');
      setIsLoading(false);
    }
  }, [searchParams]);

  const fetchPersonData = async (personList: PersonData[]) => {
    if (personList.length < 2) {
      setError('두 명 이상의 정보가 필요해요.');
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel
      const [saju1Response, saju2Response, astro1Response, astro2Response] = await Promise.all([
        fetch('/api/saju', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birthDate: personList[0].date,
            birthTime: personList[0].time || '12:00',
            gender: 'M', // 궁합 분석용 기본값
            calendarType: 'solar',
            timezone: personList[0].timeZone || 'Asia/Seoul',
            latitude: personList[0].latitude || 37.5665,
            longitude: personList[0].longitude || 126.9780,
          }),
        }),
        fetch('/api/saju', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birthDate: personList[1].date,
            birthTime: personList[1].time || '12:00',
            gender: 'F', // 궁합 분석용 기본값
            calendarType: 'solar',
            timezone: personList[1].timeZone || 'Asia/Seoul',
            latitude: personList[1].latitude || 37.5665,
            longitude: personList[1].longitude || 126.9780,
          }),
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
          },
          body: JSON.stringify({
            date: personList[0].date,
            time: personList[0].time || '12:00',
            latitude: personList[0].latitude || 37.5665,
            longitude: personList[0].longitude || 126.9780,
            timeZone: personList[0].timeZone || 'Asia/Seoul',
          }),
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
          },
          body: JSON.stringify({
            date: personList[1].date,
            time: personList[1].time || '12:00',
            latitude: personList[1].latitude || 37.5665,
            longitude: personList[1].longitude || 126.9780,
            timeZone: personList[1].timeZone || 'Asia/Seoul',
          }),
        }),
      ]);

      // Track failed requests
      const errors: string[] = [];

      // Process responses and collect errors
      // NOTE: API responses are wrapped as { data: { ...payload }, requestId, timestamp }
      // We unwrap to get the actual payload for analysis components
      if (saju1Response.ok) {
        const json = await saju1Response.json();
        const sajuPayload = json?.data ?? json;
        setPerson1Saju(sajuPayload);
      } else {
        errors.push(`사주 데이터 조회 실패 (${personList[0].name})`);
        logger.error('Saju1 fetch failed:', { status: saju1Response.status });
      }

      if (saju2Response.ok) {
        const json = await saju2Response.json();
        const sajuPayload = json?.data ?? json;
        setPerson2Saju(sajuPayload);
      } else {
        errors.push(`사주 데이터 조회 실패 (${personList[1].name})`);
        logger.error('Saju2 fetch failed:', { status: saju2Response.status });
      }

      if (astro1Response.ok) {
        const json = await astro1Response.json();
        const astroPayload = json?.data ?? json;
        // Flatten chartData so planets/ascendant are at top level for buildAstroProfile
        const astroData = {
          ...astroPayload,
          planets: astroPayload?.chartData?.planets ?? astroPayload?.planets,
          ascendant: astroPayload?.chartData?.ascendant ?? astroPayload?.ascendant,
        };
        setPerson1Astro(astroData);
      } else {
        errors.push(`점성술 데이터 조회 실패 (${personList[0].name})`);
        logger.error('Astro1 fetch failed:', { status: astro1Response.status });
      }

      if (astro2Response.ok) {
        const json = await astro2Response.json();
        const astroPayload = json?.data ?? json;
        const astroData = {
          ...astroPayload,
          planets: astroPayload?.chartData?.planets ?? astroPayload?.planets,
          ascendant: astroPayload?.chartData?.ascendant ?? astroPayload?.ascendant,
        };
        setPerson2Astro(astroData);
      } else {
        errors.push(`점성술 데이터 조회 실패 (${personList[1].name})`);
        logger.error('Astro2 fetch failed:', { status: astro2Response.status });
      }

      // If all critical data failed, show error
      if (!saju1Response.ok && !saju2Response.ok) {
        setError('사주 데이터를 불러올 수 없습니다. 다시 시도해주세요.');
      } else if (errors.length > 0) {
        // Log partial failures but continue
        logger.warn('Partial data fetch failures:', { errors });
      }

      setIsLoading(false);
    } catch (e) {
      logger.error('Failed to fetch person data:', { error: e });
      setError('분석 데이터를 불러오는데 실패했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  const personNames = persons.map((p) => p.name || 'Person').join(' & ');

  if (error) {
    return (
      <ServicePageLayout
        icon="💕"
        title={t('compatibilityPage.insights.title', '상세 궁합 분석')}
        subtitle={t('compatibilityPage.insights.error', '오류가 발생했습니다')}
        onBack={() => router.back()}
        backLabel={t('app.back', '뒤로')}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => router.push('/compatibility')}
            className="mt-4 px-6 py-2 bg-pink-500/20 border border-pink-500/30 rounded-full text-pink-300 hover:bg-pink-500/30 transition-colors"
          >
            {t('compatibilityPage.tryAgain', '다시 시도')}
          </button>
        </div>
      </ServicePageLayout>
    );
  }

  return (
    <ServicePageLayout
      icon="💕"
      title={t('compatibilityPage.insights.title', '상세 궁합 분석')}
      subtitle={personNames || t('compatibilityPage.insights.subtitle', '사주 + 점성학 심화 분석')}
      onBack={() => router.back()}
      backLabel={t('app.back', '뒤로')}
    >
      {isLoading ? (
        <InsightsLoading />
      ) : (
        <>
          <CompatibilityFreeReport
            persons={persons}
            person1Saju={person1Saju ?? undefined}
            person2Saju={person2Saju ?? undefined}
            person1Astro={person1Astro ?? undefined}
            person2Astro={person2Astro ?? undefined}
            lang={locale}
          />
          {/* Share Button */}
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <ShareButton
              generateCard={() => {
                return generateCompatibilityCard({
                  person1Name: persons[0]?.name || 'Person 1',
                  person2Name: persons[1]?.name || 'Person 2',
                  score: 85, // Default score, could be calculated from saju/astro data
                  relation: (persons[1]?.relation as 'lover' | 'friend' | 'other') || 'lover',
                  highlights: [
                    '깊은 정서적 유대감',
                    '강한 의사소통 능력',
                    '조화로운 에너지'
                  ],
                }, 'og');
              }}
              filename="compatibility-insights.png"
              shareTitle={t('compatibilityPage.insights.shareTitle', '우리의 궁합 분석')}
              shareText={`${persons[0]?.name || 'Person 1'} & ${persons[1]?.name || 'Person 2'}의 상세 궁합 분석 결과! destinypal.me/compatibility에서 확인하세요`}
              label={t('share.shareResult', '결과 공유하기')}
            />
          </div>
        </>
      )}
    </ServicePageLayout>
  );
}

export default function CompatibilityInsightsPage() {
  return (
    <Suspense fallback={<InsightsLoading />}>
      <CompatibilityInsightsContent />
    </Suspense>
  );
}
