"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
// 🚨 이 부분이 핵심적인 변경점입니다. 🚨
// 이전의 불안정한 import 구문을 삭제하고, 아래에서 직접 타입을 추론하여 사용합니다.

// ThemeProviderProps 타입을 직접 추론해서 가져옵니다.
// 이렇게 하면 라이브러리 내부 구조가 바뀌어도 코드가 깨지지 않습니다.
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}