import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'

interface TestStatusCardProps {
  styles: Record<string, string>
  isKo: boolean
  hasIcp: boolean
  hasPersona: boolean
}

export default function TestStatusCard({ styles, isKo, hasIcp, hasPersona }: TestStatusCardProps) {
  return (
    <main className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.icon}>⟡</div>
          <h1 className={styles.title}>
            {isKo ? '통합 성격 분석' : 'Combined Personality Analysis'}
          </h1>
          <p className={styles.subtitle}>
            {isKo
              ? 'ICP와 Persona 테스트를 모두 완료하면 통합 리포트를 볼 수 있습니다.'
              : 'Complete both ICP and Persona tests to view your combined report.'}
          </p>
        </div>

        <div className={styles.testStatus}>
          <div className={`${styles.statusItem} ${hasPersona ? styles.statusComplete : ''}`}>
            <span className={styles.statusIcon}>{hasPersona ? '✓' : '○'}</span>
            <span>{isKo ? 'Persona 성격 테스트' : 'Persona Test'}</span>
            {!hasPersona && (
              <Link href="/personality" className={styles.startLink}>
                {isKo ? '시작' : 'Start'}
              </Link>
            )}
          </div>

          <div className={`${styles.statusItem} ${hasIcp ? styles.statusComplete : ''}`}>
            <span className={styles.statusIcon}>{hasIcp ? '✓' : '○'}</span>
            <span>{isKo ? 'ICP 대인관계 테스트' : 'ICP Test'}</span>
            {!hasIcp && (
              <Link href="/icp" className={styles.startLink}>
                {isKo ? '시작' : 'Start'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
