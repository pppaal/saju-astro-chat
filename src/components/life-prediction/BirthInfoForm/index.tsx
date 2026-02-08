'use client'

import React from 'react'
import { UnifiedBirthForm, BirthInfo } from '@/components/common/BirthForm'

interface BirthInfoFormProps {
  onSubmit: (birthInfo: BirthInfo) => void | Promise<void>
  locale?: 'ko' | 'en'
  initialData?: Partial<BirthInfo>
}

/**
 * Life Prediction Birth Info Form
 * Now uses UnifiedBirthForm component with optional city toggle
 */
export function BirthInfoForm({ onSubmit, locale = 'ko', initialData }: BirthInfoFormProps) {
  return (
    <UnifiedBirthForm
      onSubmit={onSubmit}
      locale={locale}
      initialData={initialData}
      includeProfileLoader={true}
      includeCity={false}
      includeCityToggle={true}
      allowTimeUnknown={true}
      genderFormat="short"
      submitButtonText={locale === 'ko' ? '시작하기' : 'Get Started'}
      submitButtonIcon="✨"
      showHeader={true}
      headerIcon="🎂"
      headerTitle={locale === 'ko' ? '생년월일을 입력해주세요' : 'Enter Your Birth Info'}
      headerSubtitle={
        locale === 'ko'
          ? '정확한 예측을 위해 필요한 정보입니다'
          : 'Required for accurate predictions'
      }
    />
  )
}

export default BirthInfoForm
