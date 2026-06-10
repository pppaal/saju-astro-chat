export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { handlers } from '@/lib/auth/nextAuth'

export const { GET, POST } = handlers
