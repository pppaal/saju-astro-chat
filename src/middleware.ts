import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

// 개발 환경에서만: Gemini 1.5 호출을 발견하면 바로 차단하고 스택을 찍어 위치를 특정
if (process.env.NODE_ENV !== "production") {
  const origFetch = global.fetch as any;
  // @ts-ignore
  global.fetch = async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : String(input?.url || "");
    if (/generativelanguage\.googleapis\.com\/.*gemini-1\.5/i.test(url)) {
      const err = new Error("[BLOCKED] Legacy Gemini 1.5 call: " + url);
      console.error(err.stack || String(err));
      throw err;
    }
    return origFetch(input, init);
  };
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};