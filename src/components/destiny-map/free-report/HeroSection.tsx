'use client'

import { elementTraits, zodiacData } from './data'

const DAY_MASTER_LABELS: Record<string, { ko: string; en: string }> = {
  신: { ko: '보석 같은 사람', en: 'Gem-like' },
  갑: { ko: '리더 같은 사람', en: 'Leader' },
  을: { ko: '유연한 사람', en: 'Flexible' },
  병: { ko: '밝은 사람', en: 'Bright' },
  정: { ko: '따뜻한 사람', en: 'Warm' },
  무: { ko: '든든한 사람', en: 'Solid' },
  기: { ko: '포용적인 사람', en: 'Nurturing' },
  경: { ko: '시원시원한 사람', en: 'Decisive' },
  임: { ko: '깊은 사람', en: 'Deep' },
  계: { ko: '순수한 사람', en: 'Pure' },
}

interface HeroSectionProps {
  isKo: boolean
  data: {
    dayMasterName: string
    dayMasterInfo: {
      animal: string
      personality: { ko: string; en: string }
    }
    strongest: [string, number]
    weakest: [string, number]
    sunSign: string | null
    moonSign: string | null
    ascSign?: string | null
    report?: string
  }
  destinyNarrative: {
    lifeTheme?: { ko: string; en: string }
  } | null
}

export default function HeroSection({ isKo, data, destinyNarrative }: HeroSectionProps) {
  const sunData = data.sunSign ? zodiacData[data.sunSign] : null
  const moonData = data.moonSign ? zodiacData[data.moonSign] : null
  const ascData = data.ascSign ? zodiacData[data.ascSign] : null
  const dayMasterLabel = DAY_MASTER_LABELS[data.dayMasterName] || {
    ko: '특별한 사람',
    en: 'Special',
  }

  const reportLines = data.report ? data.report.split('\n') : []
  const reportPreview = reportLines.slice(0, 6).join('\n')
  const reportTruncated = reportLines.length > 6

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900 border border-purple-500/30 p-6 md:p-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

      {/* 운명 한 줄 */}
      <div className="relative mb-6">
        <p className="text-xl md:text-2xl text-gray-100 leading-relaxed font-medium">
          {isKo ? (
            <>
              &quot;<span className="text-amber-400">{data.dayMasterInfo.personality.ko}</span>의
              본성으로 태어나, 태양{' '}
              <span className="text-purple-400">{sunData?.ko || '알 수 없음'}</span>, 달{' '}
              <span className="text-blue-400">{moonData?.ko || '알 수 없음'}</span>의 결을 따라{' '}
              <span className="text-emerald-400">
                &apos;{destinyNarrative?.lifeTheme?.ko || '나만의 길'}&apos;
              </span>
              의 길을 걷는 운명.&quot;
            </>
          ) : (
            <>
              &quot;Born with the soul of{' '}
              <span className="text-amber-400">{data.dayMasterInfo.personality.en}</span>, shaped by
              the <span className="text-purple-400">{sunData?.en || 'Unknown'}</span> Sun and{' '}
              <span className="text-blue-400">{moonData?.en || 'Unknown'}</span> Moon, walking the
              path of{' '}
              <span className="text-emerald-400">
                &apos;{destinyNarrative?.lifeTheme?.en || 'your own way'}&apos;
              </span>
              .&quot;
            </>
          )}
        </p>
      </div>

      {data.report && (
        <div className="relative mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 md:p-5">
          <p className="text-sm md:text-base text-cyan-50 leading-relaxed whitespace-pre-line">
            {reportPreview}
            {reportTruncated && (isKo ? '\n…' : '\n…')}
          </p>
        </div>
      )}

      {/* 핵심 프로필 뱃지 */}
      <div className="relative flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30">
          <span className="text-lg">{data.dayMasterInfo.animal}</span>
          <span className="text-amber-300 font-medium">
            {isKo ? dayMasterLabel.ko : dayMasterLabel.en}
          </span>
        </div>
        {sunData && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
            <span className="text-lg">☀️</span>
            <span className="text-purple-300 font-medium">
              {isKo ? `본질(☉): ${sunData.ko}` : `Sun: ${sunData.en}`}
            </span>
          </div>
        )}
        {moonData && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30">
            <span className="text-lg">🌙</span>
            <span className="text-blue-300 font-medium">
              {isKo ? `감정(☽): ${moonData.ko}` : `Moon: ${moonData.en}`}
            </span>
          </div>
        )}
        {ascData && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/20 border border-rose-500/30">
            <span className="text-lg">{ascData.emoji}</span>
            <span className="text-rose-300 font-medium">
              {isKo ? `겉모습(ASC): ${ascData.ko}` : `Ascendant: ${ascData.en}`}
            </span>
          </div>
        )}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            backgroundColor: elementTraits[data.strongest[0]]?.bgColor,
            border: `1px solid ${elementTraits[data.strongest[0]]?.color}`,
          }}
        >
          <span className="text-lg">{elementTraits[data.strongest[0]]?.emoji}</span>
          <span className="font-medium" style={{ color: elementTraits[data.strongest[0]]?.color }}>
            {isKo
              ? `강한 오행: ${elementTraits[data.strongest[0]]?.ko}`
              : `Strong: ${elementTraits[data.strongest[0]]?.en}`}
          </span>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            backgroundColor: elementTraits[data.weakest[0]]?.bgColor,
            border: `1px solid ${elementTraits[data.weakest[0]]?.color}`,
          }}
        >
          <span className="text-lg">{elementTraits[data.weakest[0]]?.emoji}</span>
          <span className="font-medium" style={{ color: elementTraits[data.weakest[0]]?.color }}>
            {isKo
              ? `약한 오행: ${elementTraits[data.weakest[0]]?.ko}`
              : `Weak: ${elementTraits[data.weakest[0]]?.en}`}
          </span>
        </div>
      </div>
    </div>
  )
}
