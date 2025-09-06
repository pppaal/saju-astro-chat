import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 이 부분을 추가해주세요!
  eslint: {
    // 경고: 이 옵션은 프로젝트에 ESLint 오류가 있어도 
    // 프로덕션 빌드를 성공적으로 완료시킵니다.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig