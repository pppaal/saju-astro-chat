import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import AuthRequired from '@/components/AuthRequired'
import { getServerI18n, getServerTranslation } from '@/i18n/server'
import DestinyMatchClientPage from './DestinyMatchClientPage'

export default async function DestinyMatchPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    const { messages } = await getServerI18n()
    return (
      <AuthRequired
        title={getServerTranslation(messages, 'authRequired.title', 'Sign in required')}
        description={getServerTranslation(
          messages,
          'authRequired.destinyMatchBody',
          'Sign in to discover compatibility matches and start conversations.'
        )}
        primaryLabel={getServerTranslation(messages, 'authRequired.primaryCta', 'Sign in')}
        primaryHref={buildSignInUrl('/destiny-match')}
        secondaryLabel={getServerTranslation(
          messages,
          'authRequired.secondaryPricingCta',
          'View Pricing'
        )}
        secondaryHref="/pricing"
      />
    )
  }

  return <DestinyMatchClientPage />
}
