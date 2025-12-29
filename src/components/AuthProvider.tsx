// 파일 경로: components/AuthProvider.tsx

"use client"; // 이 컴포넌트는 클라이언트 측에서 실행됨을 명시

import { SessionProvider } from "next-auth/react";
import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function AuthProvider({ children }: Props) {
  return (
    <SessionProvider
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}