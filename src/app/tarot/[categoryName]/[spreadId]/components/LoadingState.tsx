/**
 * Loading State Component
 *
 * Tarot 인터프리트 진행 중 등 in-flow 로딩 — 브랜드 스플래시(로고)로 통일.
 */

'use client';

import BrandSplash from '@/components/branding/BrandSplash';

interface LoadingStateProps {
  message: string;
  submessage?: string;
}

export default function LoadingState({ message, submessage }: LoadingStateProps) {
  return <BrandSplash message={message} submessage={submessage} />;
}
