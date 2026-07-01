// 통합 리포트 로딩 스켈레톤 — 첫 방문(캐시 미스)엔 사주+점성 천체 계산으로
// ~600ms 정도 걸린다. 이전엔 그동안 빈 화면이라 "멍하니 대기" 체감이 났다.
// 리포트의 페이퍼 톤과 같은 스켈레톤을 즉시 띄워 레이아웃을 선점(체감 속도↑).
import { getServerLocale } from '@/components/seo/SEO'

const BLOCK = '#ece5d6'

export default async function Loading() {
  const isKo = (await getServerLocale()) !== 'en'
  const bar = (w: string, h: number, mt = 0) => (
    <div style={{ width: w, height: h, borderRadius: 8, background: BLOCK, marginTop: mt }} />
  )
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #FCFAF4 0%, #F6F1E6 100%)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 22px 80px' }}>
        <div
          className="animate-pulse"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
        >
          {bar('42%', 14)}
          {bar('70%', 30, 10)}
          <div
            style={{
              width: '100%',
              height: 190,
              borderRadius: 18,
              background: BLOCK,
              marginTop: 20,
            }}
          />
          {bar('88%', 14, 24)}
          {bar('80%', 14, 8)}
          {bar('84%', 14, 8)}
          <div
            style={{
              width: '100%',
              height: 150,
              borderRadius: 16,
              background: BLOCK,
              marginTop: 24,
            }}
          />
          {bar('82%', 14, 20)}
          {bar('76%', 14, 8)}
        </div>
        <p style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: '#9a9384' }}>
          {isKo ? '사주와 별자리를 계산하고 있어요…' : 'Reading your chart…'}
        </p>
      </div>
    </main>
  )
}
