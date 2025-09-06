// src/components/theme-provider.tsx

"use client" // 이 컴포넌트는 클라이언트 측에서 상호작용해야 하므로 명시합니다.

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
// 오류 이미지에 있던 '.../dist/types' 경로는 잘못된 경로입니다. 아래가 올바른 타입 import 방식입니다.
import { type ThemeProviderProps } from "next-themes/dist/types" 

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}