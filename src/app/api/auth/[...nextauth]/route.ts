export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;