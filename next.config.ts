// 파일 경로: next.config.ts

import path from 'path';
import type { Configuration } from 'webpack';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이 옵션은 swisseph가 node_modules를 참조할 수 있도록 도와줍니다.
  outputFileTracingRoot: path.join(__dirname),
  eslint: { ignoreDuringBuilds: true },

  webpack: (
    config: Configuration,
    { isServer }: { isServer: boolean }
  ) => {
    // swisseph는 서버와 클라이언트 빌드 모두에서 외부 모듈로 처리해야 합니다.
    // 서버: 번들링에서 제외하고 런타임에 Node.js가 require() 하도록 합니다.
    // 클라이언트: 번들링에서 제외하여, 클라이언트 코드에서 실수로 import하는 것을 막습니다.

    // 기존 externals 설정을 안전하게 확장합니다.
    const externals = config.externals || [];
    if (Array.isArray(externals)) {
      // 기존 externals가 배열인 경우, 새 항목을 추가합니다.
      config.externals = [...externals, 'swisseph'];
    } else {
      // 기존 externals가 배열이 아닌 경우(객체, 함수 등),
      // 새 배열을 만들어 기존 값과 새 값을 모두 포함시킵니다.
      config.externals = [externals, 'swisseph'];
    }

    return config;
  },
};

module.exports = nextConfig;