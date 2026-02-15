import Link from 'next/link'
import Card from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface AuthRequiredProps {
  title: string
  description: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
}

export default function AuthRequired({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: AuthRequiredProps) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl space-y-4 p-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
        <p className="text-sm leading-6 text-slate-300">{description}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="primary">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>
      </Card>
    </main>
  )
}
