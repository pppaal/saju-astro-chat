import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, increment, Firestore } from "firebase/firestore";
import { getAuth, signInAnonymously, signInWithCustomToken, Auth } from "firebase/auth";

// --- Type Declarations for Global Variables ---
declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;
// ---------------------------------------------

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

// --- Robust Firebase Initialization Logic ---
// This function runs once when the server starts.
function initializeFirebase() {
    // Prevents re-initialization
    if (getApps().length > 0) {
        app = getApp();
        db = getFirestore(app);
        auth = getAuth(app);
        return;
    }

    try {
        // Step 1: Try to get config from the local .env.local file first.
        let configString = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;

        // Step 2: If not found, fall back to the global variable (for production).
        if (!configString) {
            configString = typeof __firebase_config !== 'undefined' ? __firebase_config : undefined;
        }

        // Step 3: If no config is found at all, throw an error.
        if (!configString) {
            throw new Error("Firebase config is not available in environment variables or global scope.");
        }
        
        const firebaseConfig = JSON.parse(configString);
        
        // Step 4: Initialize the app with the found config.
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        console.log("✅ Firebase Initialized Successfully.");

    } catch (error) {
        console.error("🔥 FATAL: Firebase initialization failed.", error);
        // If initialization fails, app, db, and auth will remain null.
    }
}

// Run the initialization logic when the server starts.
initializeFirebase();
// ------------------------------------------


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
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const today = todayKeyKST();
    
    const docPath = `artifacts/${appId}/public/data/visitor_counts/${today}`;
    
    return doc(db, docPath);
}

export async function GET() {
    if (!db) {
        return NextResponse.json({ error: "Server error: Firestore is not configured." }, { status: 500 });
    }
    try {
        const todayDocRef = await getTodayDocRef();
        const docSnap = await getDoc(todayDocRef);

        if (docSnap.exists()) {
            return NextResponse.json({ count: docSnap.data().count });
        } else {
            return NextResponse.json({ count: 0 });
        }
    } catch (error: any) {
        console.error("Error fetching visitor count:", error);
        return NextResponse.json({ error: `Failed to fetch count: ${error.message}` }, { status: 500 });
    }
}

export async function POST() {
    if (!db) {
        return NextResponse.json({ error: "Server error: Firestore is not configured." }, { status: 500 });
    }
    try {
        const todayDocRef = await getTodayDocRef();
        
        await setDoc(todayDocRef, { 
            count: increment(1) 
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error incrementing visitor count:", error);
        return NextResponse.json({ error: `Failed to increment count: ${error.message}` }, { status: 500 });
    }
}

