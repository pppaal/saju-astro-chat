import BrandSplash from '@/components/branding/BrandSplash';

interface LoadingScreenProps {
  // 기존 prop 시그니처 유지 (호출부 회귀 방지) — 내부적으로는 BrandSplash 로 통일.
  styles?: Record<string, string>;
  isKo: boolean;
}

export default function LoadingScreen({ isKo }: LoadingScreenProps) {
  return <BrandSplash message={isKo ? '결과를 불러오는 중...' : 'Loading your results...'} />;
}
