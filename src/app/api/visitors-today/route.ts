import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, increment, Firestore } from "firebase/firestore";
import { getAuth, signInAnonymously, signInWithCustomToken, Auth } from "firebase/auth";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";

declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

function initializeFirebase() {
  if (getApps().length > 0) {
    app = getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    return;
  }

  let configString = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!configString && typeof __firebase_config !== "undefined") {
    configString = __firebase_config;
  }
  if (!configString) {
    console.warn("Firebase config missing; visitors endpoint disabled.");
    return;
  }

  let firebaseConfig: any = null;
  try {
    firebaseConfig = JSON.parse(configString);
  } catch {
    console.warn("Firebase config JSON is invalid; visitors endpoint disabled.");
    return;
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

try {
  initializeFirebase();
} catch {
  // keep null; fail silently but telemetry if enabled
  captureServerError(new Error("Firebase init failed"), { route: "/api/visitors-today", stage: "init" });
}

function todayKeyKST(): string {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getTodayDocRef() {
  if (!auth || !db) throw new Error("Firestore is not initialized.");

  if (auth.currentUser === null) {
    if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
    } else {
      await signInAnonymously(auth);
    }
  }

  const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
  const today = todayKeyKST();
  const docPath = `artifacts/${appId}/public/data/visitor_counts/${today}`;
  return doc(db, docPath);
}

async function getTotalDocRef() {
  if (!auth || !db) throw new Error("Firestore is not initialized.");

  if (auth.currentUser === null) {
    if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
    } else {
      await signInAnonymously(auth);
    }
  }

  const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
  const docPath = `artifacts/${appId}/public/data/visitor_counts/total`;
  return doc(db, docPath);
}

function withHeaders(res: NextResponse, headers?: Headers) {
  headers?.forEach((value, key) => res.headers.set(key, value));
  return res;
}

function requireToken(req: Request) {
  const expected = process.env.PUBLIC_METRICS_TOKEN;
  const publicExpected = process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN;
  if (!expected && !publicExpected) return true;
  const token = req.headers.get("x-metrics-token");
  return (expected && token === expected) || (publicExpected && token === publicExpected);
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`visitors:get:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: limit.headers });
    }
    if (!requireToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!db) {
      // graceful fallback when Firebase is not configured
      const res = NextResponse.json({ count: 0, total: 0, disabled: true });
      return withHeaders(res, limit.headers);
    }
    const todayDocRef = await getTodayDocRef();
    const totalDocRef = await getTotalDocRef();
    const docSnap = await getDoc(todayDocRef);
    const totalSnap = await getDoc(totalDocRef);
    const res = NextResponse.json({
      count: docSnap.exists() ? docSnap.data().count : 0,
      total: totalSnap.exists() ? totalSnap.data().count : 0,
    });
    return withHeaders(res, limit.headers);
  } catch (error: any) {
    captureServerError(error, { route: "/api/visitors-today", method: "GET" });
    return NextResponse.json({ error: `Failed to fetch count: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`visitors:post:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: limit.headers });
    }
    if (!requireToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!db) {
      // graceful fallback when Firebase is not configured
      const res = NextResponse.json({ success: true, disabled: true });
      return withHeaders(res, limit.headers);
    }
    const todayDocRef = await getTodayDocRef();
    const totalDocRef = await getTotalDocRef();
    await setDoc(todayDocRef, { count: increment(1) }, { merge: true });
    await setDoc(totalDocRef, { count: increment(1) }, { merge: true });
    const res = NextResponse.json({ success: true });
    return withHeaders(res, limit.headers);
  } catch (error: any) {
    captureServerError(error, { route: "/api/visitors-today", method: "POST" });
    return NextResponse.json({ error: `Failed to increment count: ${error.message}` }, { status: 500 });
  }
}
