import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 워크스페이스 루트 명시(루트 추정 경고 제거)
  outputFileTracingRoot: path.join(__dirname),

  // 필요 시 주석 해제: standalone 산출물(.next/standalone) 생성
  // output: "standalone",

  // 빌드 시 ESLint 오류로 중단하지 않도록
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;