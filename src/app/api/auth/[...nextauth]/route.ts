// 파일 경로: app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  // App Router에서는 session strategy를 명시할 필요가 거의 없습니다.
  // 필요하다면 여기에 콜백 등을 추가할 수 있습니다.
  secret: process.env.NEXTAUTH_SECRET,
});

// App Router에서는 GET과 POST 요청을 이렇게 export 해야 합니다.
export { handler as GET, handler as POST };