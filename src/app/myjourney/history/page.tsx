'use client'

import { useSession } from 'next-auth/react'
import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import { useI18n } from '@/i18n/I18nProvider'
import ParticleCanvas from '@/components/animations/ParticleCanvas'
import styles from './history.module.css'

// Hooks
import { useHistoryData, useDetailModal } from './hooks'

// Components
import { ServiceGrid, RecordsList, DetailModalWrapper } from './components'

// Constants
import { SERVICE_CONFIG, ALL_SERVICES_ORDER } from './lib'
import { filterMyJourneyCoreServices } from '@/lib/coreServices'

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <HistoryContent />
    </Suspense>
  )
}

function HistoryContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useI18n()

  // Custom hooks for state management
  const {
    history,
    loading,
    selectedService,
    setSelectedService,
    showAllRecords,
    setShowAllRecords,
  } = useHistoryData(status === 'authenticated')

  const {
    selectedRecord,
    detailLoading,
    ichingDetail,
    destinyMapDetail,
    calendarDetail,
    tarotDetail,
    numerologyDetail,
    icpDetail,
    compatibilityDetail,
    matrixDetail,
    loadReadingDetail,
    closeDetail,
  } = useDetailModal()

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/myjourney')
    }
  }, [status, router])

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <main className={styles.container}>
        <ParticleCanvas />
        <div className={styles.loadingCard}>
          <div className={styles.spinner}></div>
          <p>Loading your destiny...</p>
        </div>
      </main>
    )
  }

  // Not authenticated
  if (!session) {
    return null
  }

  // Calculate service counts
  const serviceCounts: Record<string, number> = {}
  history.forEach((day) => {
    day.records.forEach((r) => {
      serviceCounts[r.service] = (serviceCounts[r.service] || 0) + 1
    })
  })

  // Show only core services in the history service list/filter UI
  const displayServices = filterMyJourneyCoreServices(ALL_SERVICES_ORDER)

  // Filter history by selected service
  const filteredHistory = selectedService
    ? history
        .map((day) => ({
          ...day,
          records: day.records.filter((r) => r.service === selectedService),
        }))
        .filter((day) => day.records.length > 0)
    : []

  // Count total filtered records
  const filteredRecordsCount = filteredHistory.reduce((sum, day) => sum + day.records.length, 0)

  // Total records across all services
  const totalRecords = history.reduce((sum, day) => sum + day.records.length, 0)

  return (
    <main className={styles.container}>
      <ParticleCanvas />

      <section className={styles.card}>
        {/* Header */}
        <header className={styles.header}>
          <BackButton
            onClick={() => {
              if (selectedService) {
                setSelectedService(null)
                setShowAllRecords(false)
              } else {
                router.push('/myjourney')
              }
            }}
          />
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              {selectedService
                ? SERVICE_CONFIG[selectedService]
                  ? t(SERVICE_CONFIG[selectedService].titleKey)
                  : selectedService
                : 'My Destiny'}
            </h1>
            <p className={styles.subtitle}>
              {selectedService
                ? `${serviceCounts[selectedService] || 0}${t('history.recordUnit')}`
                : `${totalRecords}${t('history.savedUnit')}`}
            </p>
          </div>
        </header>

        {/* Service Selection Grid (when no service selected) */}
        {!selectedService ? (
          <ServiceGrid
            services={displayServices}
            serviceCounts={serviceCounts}
            onSelectService={setSelectedService}
            translate={t}
          />
        ) : (
          /* Records List (when service selected) */
          <RecordsList
            filteredHistory={filteredHistory}
            filteredRecordsCount={filteredRecordsCount}
            showAllRecords={showAllRecords}
            onToggleShowAll={() => setShowAllRecords(!showAllRecords)}
            onRecordClick={loadReadingDetail}
            onBackClick={() => setSelectedService(null)}
            translate={t}
          />
        )}

        {/* AI Context Info */}
        {totalRecords > 0 && !selectedService && (
          <div className={styles.aiInfo}>
            <span className={styles.aiIcon}>🤖</span>
            <p>{totalRecords}개의 리딩이 AI 상담 개인화에 활용됩니다</p>
          </div>
        )}
      </section>

      {/* Detail Modal */}
      <DetailModalWrapper
        selectedRecord={selectedRecord}
        detailLoading={detailLoading}
        ichingDetail={ichingDetail}
        destinyMapDetail={destinyMapDetail}
        calendarDetail={calendarDetail}
        tarotDetail={tarotDetail}
        numerologyDetail={numerologyDetail}
        icpDetail={icpDetail}
        compatibilityDetail={compatibilityDetail}
        matrixDetail={matrixDetail}
        closeDetail={closeDetail}
      />
    </main>
  )
}
