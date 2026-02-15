import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import AuthRequired from '@/components/AuthRequired'
import { getServerI18n, getServerTranslation } from '@/i18n/server'
import MyJourneyClientPage from './MyJourneyClientPage'

export default async function MyJourneyPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    const { messages } = await getServerI18n()
    return (
      <AuthRequired
        title={getServerTranslation(messages, 'authRequired.title', 'Sign in required')}
        description={getServerTranslation(
          messages,
          'authRequired.myjourneyBody',
          'Sign in to view your saved readings and personal history.'
        )}
        primaryLabel={getServerTranslation(messages, 'authRequired.primaryCta', 'Sign in')}
        primaryHref={buildSignInUrl('/myjourney')}
        secondaryLabel={getServerTranslation(
          messages,
          'authRequired.secondaryCta',
          'Explore Destiny Map'
        )}
        secondaryHref="/destiny-map"
      />
    )
  }

  return <MyJourneyClientPage />
}
