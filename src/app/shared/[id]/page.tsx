'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/i18n/I18nProvider'

interface SharedData {
  type: string
  title: string
  description?: string
  data?: Record<string, unknown>
}

export default function SharedResultPage() {
  const params = useParams()
  const id = params?.id as string
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [sharedData, setSharedData] = useState<SharedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSharedData = async () => {
      try {
        const response = await fetch(`/api/share/${id}`)
        if (!response.ok) {
          throw new Error('Not found')
        }
        const data = await response.json()
        setSharedData(data);
      } catch {
        setError(isKo ? '공유된 결과를 찾을 수 없습니다.' : 'Shared result not found.')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchSharedData()
    }
  }, [id, isKo])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">{isKo ? '로딩 중...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  if (error || !sharedData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 text-center border border-purple-500/20">
          <span className="text-6xl mb-6 block">🔮</span>
          <h1 className="text-2xl font-bold text-white mb-4">
            {isKo ? '결과를 찾을 수 없습니다' : 'Result Not Found'}
          </h1>
          <p className="text-gray-400 mb-8">
            {isKo
              ? '이 공유 링크가 만료되었거나 존재하지 않습니다.'
              : 'This share link may have expired or does not exist.'}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition"
          >
            {isKo ? '나도 운세 보러 가기' : 'Get My Fortune Reading'}
          </Link>
        </div>
      </div>
    )
  }

  // Get type-specific styling and icons
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'saju':
        return {
          icon: '🎋',
          title: isKo ? '사주 분석' : 'Saju Analysis',
          color: 'from-emerald-500 to-teal-500',
        }
      case 'tarot':
        return {
          icon: '🎴',
          title: isKo ? '타로 리딩' : 'Tarot Reading',
          color: 'from-purple-500 to-indigo-500',
        }
      case 'astrology':
        return {
          icon: '✨',
          title: isKo ? '별자리 운세' : 'Astrology Reading',
          color: 'from-blue-500 to-cyan-500',
        }
      case 'compatibility':
        return {
          icon: '💕',
          title: isKo ? '궁합 분석' : 'Compatibility Analysis',
          color: 'from-pink-500 to-rose-500',
        }
      case 'personality':
      case 'persona':
        return {
          icon: '🧬',
          title: isKo ? '성격 분석' : 'Personality Analysis',
          color: 'from-amber-500 to-orange-500',
        }
      case 'icp':
        return {
          icon: '💡',
          title: isKo ? 'ICP 분석' : 'ICP Analysis',
          color: 'from-cyan-500 to-blue-500',
        }
      default:
        return {
          icon: '🔮',
          title: isKo ? '운세 결과' : 'Fortune Result',
          color: 'from-purple-500 to-pink-500',
        }
    }
  }

  const typeInfo = getTypeInfo(sharedData.type);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">{typeInfo.icon}</span>
          <h1
            className={`text-3xl font-bold bg-gradient-to-r ${typeInfo.color} bg-clip-text text-transparent mb-2`}
          >
            {typeInfo.title}
          </h1>
          <p className="text-gray-400">
            {isKo ? 'DestinyPal에서 공유된 결과입니다' : 'Shared from DestinyPal'}
          </p>
        </div>

        {/* Shared Content Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">{sharedData.title}</h2>
          {sharedData.description && (
            <p className="text-gray-300 whitespace-pre-line">{sharedData.description}</p>
          )}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 border border-purple-500/30 text-center">
          <h3 className="text-xl font-bold text-white mb-3">
            {isKo ? '나도 무료로 운세 보기' : 'Get Your Free Reading'}
          </h3>
          <p className="text-gray-300 mb-6">
            {isKo
              ? 'DestinyPal에서 무료로 사주, 타로, 별자리 운세를 확인해보세요!'
              : 'Check your Saju, Tarot, and Astrology readings for free on DestinyPal!'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition"
            >
              {isKo ? '시작하기' : 'Get Started'}
            </Link>
            <Link
              href={(() => {
                // 활성 서비스만 정확히 라우팅. 옛 type(persona/personality/icp/
                // saju/astrology/numerology/iching/dream)은 폴더가 삭제됐으므로
                // 대표 채널(destiny-map)로 fallback — 404 방지.
                const ACTIVE_TYPE_ROUTES: Record<string, string> = {
                  compatibility: '/compatibility',
                  tarot: '/tarot',
                  counselor: '/destiny-counselor',
                }
                return ACTIVE_TYPE_ROUTES[sharedData.type] ?? '/destiny-map'
              })()}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition"
            >
              {isKo ? `${typeInfo.title} 보러가기` : `Try ${typeInfo.title}`}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>
            Powered by <span className="text-purple-400">DestinyPal</span>
          </p>
        </div>
      </div>
    </div>
  )
}
