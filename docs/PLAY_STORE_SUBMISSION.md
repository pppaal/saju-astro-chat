# Google Play Submission — DestinyPal (Android)

Last audited: 2026-09-01. Covers Android/Google Play only. iOS/App Store is a
separate track — see the "iOS" note at the bottom.

## What already exists in this repo

- `android/` — a Capacitor project (`com.destinypal.app`) that loads the live
  site (`https://destinypal.com`, see `capacitor.config.ts`). It was
  scaffolded but had never been wired up to build: `@capacitor/core` and
  `@capacitor/android` were missing from `package.json`, there were no
  branded launcher icons/splash (stock Capacitor placeholders), and there was
  no release signing config. All three are now fixed in this repo:
  - `package.json` — `@capacitor/core`, `@capacitor/android` deps +
    `@capacitor/assets` devDep added.
  - `scripts/build-android-assets.mjs` (`npm run mobile:assets:build`) renders
    the master brand mark (`scripts/icons/dp-icon.svg`, same source as the PWA
    icons) into `assets/icon.png`, `icon-foreground.png`, `icon-background.png`,
    `splash.png` — re-scaled to Android's adaptive-icon safe zone (Android's
    circular/squircle mask crops more than the PWA maskable spec).
  - `npm run mobile:assets:generate` runs that, then
    `npx capacitor-assets generate --android` to populate
    `android/app/src/main/res/**` (already run once; 136 files generated).
  - `android/app/build.gradle` now reads `android/keystore.properties`
    (gitignored — see below) for release signing, falling back to an
    **unsigned** release build when it's absent so the project still builds
    without secrets present.
- Push notifications today are **web push (VAPID)**, not native FCM/APNs —
  see `src/lib/push/webPush.ts`. The Capacitor `PushNotifications` plugin is
  referenced in `capacitor.config.ts` but nothing in `src/` imports
  `@capacitor/push-notifications` yet, and there's no `google-services.json`.
  Native push is **not required** to ship v1 on Play — the WebView shell
  can still show a background web-push-driven notification through the
  browser layer if the OS/webview surface allows it, but true native FCM
  push (works app-closed, matches iOS later) is a follow-up, not a blocker.

## What you still need to do (outside this repo)

These require your identity, a payment method, and in Apple's case a Mac —
none of that is available to an AI agent, so they're yours to do:

### 1. Create the Google Play Console account

- https://play.google.com/console/signup — **$25 one-time** fee.
- **Important timeline gotcha**: Google now requires new **personal**
  developer accounts to run a **closed testing track with ≥12 testers opted
  in for ≥14 continuous days** before Play Console will let you publish to
  production. Budget ~2–3 weeks from account creation to public launch, not
  a same-day flip. (Organization accounts with a D-U-N-S number are exempt,
  but that's its own multi-week process — not worth it for a solo launch.)
- Recruit the 12 testers now (friends, a Discord/Reddit community, your
  existing web users) so the clock starts as soon as the app is uploaded.

### 2. Generate the release keystore (once, forever)

```bash
keytool -genkey -v -keystore destinypal-release.keystore \
  -alias destinypal -keyalg RSA -keysize 2048 -validity 10000
```

Store the `.keystore` file and its passwords in a password manager — **losing
it means you can never update the app again under the same listing.** Then:

```bash
cp android/keystore.properties.example android/keystore.properties
# edit storeFile to the absolute path of the .keystore you just made,
# and fill in the real passwords/alias
```

`android/keystore.properties` and `*.keystore`/`*.jks` are gitignored — never
commit them.

### 3. Build the release bundle

You'll need Android Studio (or the command-line SDK + JDK 17+) on your own
machine — this sandbox has no Android SDK, so it can prepare config but can't
compile or sign the app.

```bash
npm run mobile:sync:android   # next build + cap sync android
cd android
./gradlew bundleRelease       # outputs app/build/outputs/bundle/release/app-release.aab
```

Enroll in **Play App Signing** when Play Console prompts you on first upload
(recommended default) — Google then re-signs the bundle with its own key and
your keystore becomes the "upload key" only, which is easier to rotate if
ever compromised.

### 4. Play Console listing — data safety form

Map straight from `prisma/schema.prisma` — answer truthfully, this is a
legal declaration:

| Data type                                                            | Collected?                                       | Purpose                                        | Shared?                         |
| -------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- | ------------------------------- |
| Email address (`User.email`, Google OAuth)                           | Yes                                              | Account management, auth                       | No                              |
| Name, profile photo (`User.name/image`)                              | Yes                                              | Account personalization                        | No                              |
| Birth date/time, birth city, lat/long (`UserProfile`, `SavedPerson`) | Yes                                              | App functionality (saju/astrology calculation) | No                              |
| Payment info (Stripe checkout)                                       | Yes — but processed by Stripe, not stored by you | Purchases                                      | Yes (Stripe, payment processor) |
| App activity / interactions (`UserInteraction`, `PageView`)          | Yes                                              | Analytics, app functionality                   | No                              |
| Device push token (`PushSubscription`)                               | Yes                                              | Notifications                                  | No                              |

All of the above should be declared as **encrypted in transit** (HTTPS).
User-initiated account/data deletion — required by Play policy — already
exists (`src/app/profile/components/AccountDangerZone.tsx` +
`src/app/api/me/account/route.ts`), so this is a "yes, here's the in-app
path" answer on the form, not a prerequisite to build.

### 5. Content rating questionnaire

Answer as a general-audience lifestyle/entertainment app. Astrology/tarot
content, no user-generated content shared publicly (chat is 1:1 with the AI),
no gambling mechanics despite "fortune" framing (be ready to explain this if
asked — Play sometimes flags fortune-telling apps for extra review, this is
not a blocker but expect a manual review pass).

### 6. Store listing copy (draft — adjust before publishing)

Reusing the site's own metadata (`src/app/layout.tsx`) for consistency:

**Title (EN, ≤30 chars):** `DestinyPal: AI Saju & Astrology`

**Short description (EN, ≤80 chars):**
`AI reads your Saju + astrology together — daily counsel, tarot, compatibility.`

**Title (KO, ≤30자):** `데스티니팔: AI 사주 · 점성술`

**Short description (KO, ≤80자):**
`AI가 사주와 서양 점성술을 함께 읽어드립니다 — 매일 운세, 타로, 궁합.`

**Full description**: expand from the same metadata description
(`src/app/layout.tsx:106`) plus feature bullets (사주/궁합/타로/운흐름 캘린더);
write this in both languages before submitting — Play supports per-locale
listings (add `ko-KR` and `en-US` at minimum).

**Assets Play requires beyond the APK/AAB:**

- App icon 512×512 — already have `public/icons/icon-512x512.png` (or re-export
  from `assets/icon.png` at 512).
- Feature graphic 1024×500 — not in the repo yet; design this separately (a
  Figma/canva job, not a code change).
- Phone screenshots (min 2, JPEG/PNG, 16:9 or 9:16) — capture from the real
  app once it's running (e.g. via `npm run build && npx cap run android` in
  an emulator, or Chrome DevTools device mode against the live site).
- Privacy policy URL — already live: `https://destinypal.com/policy/privacy`
  (`src/app/policy/privacy/page.tsx`).

### 7. Submit to the closed testing track first

Upload the AAB to **Testing → Closed testing**, add your 12 testers' Gmail
addresses, and let it run the required 14 days before promoting to
production. Use this window to sanity-check the WebView shell on real
devices (back-button behavior, deep links, push permission prompt).

## Known gaps to flag to yourself before/after launch

- **Play's minimum-functionality bar**: an unmodified WebView pointed at your
  website is at higher risk of a manual-review bounce on Play (less strict
  than Apple's 4.2, but not zero-risk) if it looks like a bare wrapper. The
  existing splash/icon branding plus native push permission handling helps;
  consider whether to add at least one native touch (haptics, native share
  sheet, or the Capacitor `App` plugin for back-button handling) before
  submitting.
- **Native push (FCM)** isn't wired — fine for v1, but note it for the
  post-launch roadmap since it's a bigger retention lever than web push on
  a WebView-wrapped app (background/closed-app delivery is more reliable).

## iOS (not started)

No `ios/` platform directory exists yet. Unlike Android, `npx cap add ios`
in this sandbox would only produce an unbuildable skeleton (no Xcode/macOS
here to open, `pod install`, or sign it) — run it in Xcode on your own Mac
once you're ready. Apple's Guideline 4.2 (Minimum Functionality) is stricter
about "just a website in a wrapper" than Google's, so plan on landing at
least one clearly native capability (push, widgets, share extension) before
submitting there. Apple Developer Program is $99/year with identity
verification that can itself take a few days — start that enrollment early
if iOS is next.
