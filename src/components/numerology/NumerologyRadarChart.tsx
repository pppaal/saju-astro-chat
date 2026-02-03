// components/NumerologyRadarChart.tsx
'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { CoreNumerologyProfile } from '@/lib/numerology/numerology'

// Dynamically import Radar chart to code-split Chart.js (6.2MB)
const Radar = dynamic(
  () =>
    import('react-chartjs-2').then((mod) => {
      // Register Chart.js components on client side
      import('chart.js').then((chartMod) => {
        const ChartJS = chartMod.Chart
        const { RadialLinearScale, PointElement, LineElement, Filler, Tooltip } = chartMod
        ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)
      })
      return mod.Radar
    }),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: 'relative',
          height: '400px',
          maxWidth: '500px',
          margin: '2rem auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        Loading chart...
      </div>
    ),
  }
)

interface Props {
  profile: CoreNumerologyProfile
}

export default function NumerologyRadarChart({ profile }: Props) {
  const [chartReady, setChartReady] = useState(false)

  useEffect(() => {
    setChartReady(true)
  }, [])

  if (!chartReady) {
    return (
      <div
        style={{
          position: 'relative',
          height: '400px',
          maxWidth: '500px',
          margin: '2rem auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        Loading chart...
      </div>
    )
  }

  const data = {
    labels: [
      'Life Path (인생 경로)',
      'Expression (표현)',
      'Soul Urge (소울)',
      'Personality (페르소나)',
    ],
    datasets: [
      {
        label: 'Your Numerology Profile',
        data: [
          profile.lifePathNumber,
          profile.expressionNumber,
          profile.soulUrgeNumber,
          profile.personalityNumber,
        ],
        backgroundColor: 'rgba(255, 209, 102, 0.2)',
        borderColor: '#ffd166',
        borderWidth: 2,
        pointBackgroundColor: '#ffd166',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#ffd166',
      },
    ],
  }

  const options = {
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
        grid: { color: 'rgba(255, 255, 255, 0.2)' },
        pointLabels: {
          color: '#fff',
          font: {
            size: 14,
            family: '"Cinzel", serif',
          },
        },
        ticks: {
          color: '#0c0a1a', // 텍스트 색상을 배경과 동일하게
          backdropColor: 'rgba(255, 209, 102, 1)', // 배경색을 지정
          stepSize: 1,
          font: {
            size: 10,
          },
        },
        min: 0,
        max: 9, // 마스터 넘버가 있다면 33까지 동적으로 조절
      },
    },
    plugins: {
      legend: {
        display: false, // 범례 숨기기
      },
    },
    maintainAspectRatio: false,
  }

  return (
    <div style={{ position: 'relative', height: '400px', maxWidth: '500px', margin: '2rem auto' }}>
      <Radar data={data} options={options} />
    </div>
  )
}
