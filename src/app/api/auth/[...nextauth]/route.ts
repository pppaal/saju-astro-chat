export const runtime = "nodejs";
console.log("DB_URL_PREFIX", process.env.DATABASE_URL?.slice(0, 120));

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };