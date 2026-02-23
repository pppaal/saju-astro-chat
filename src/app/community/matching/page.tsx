import Link from 'next/link'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = {
  title: 'Community Matching',
  description:
    'Community matching is being prepared. Explore other community features in the meantime.',
  openGraph: {
    locale: 'ko_KR',
    alternateLocale: ['en_US'],
    url: `${baseUrl}/community/matching`,
  },
  alternates: {
    canonical: `${baseUrl}/community/matching`,
    languages: {
      'ko-KR': `${baseUrl}/community/matching`,
      'en-US': `${baseUrl}/community/matching`,
      'x-default': `${baseUrl}/community/matching`,
    },
  },
}

export default function CommunityMatchingPage() {
  return (
    <main style={{ maxWidth: 860, margin: '40px auto', padding: 24 }}>
      <h1>Community Matching</h1>
      <p>
        Community matching is currently being prepared. You can still explore posts and
        recommendations.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Link href="/community">Go to Community</Link>
        <Link href="/community/recommendations">View Recommendations</Link>
      </div>
    </main>
  )
}
