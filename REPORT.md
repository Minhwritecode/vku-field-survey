# MINI-PROJECT SHORT TECHNICAL REPORT

**Course:** Cross-Platform Mobile App Development (VKU)  
**Mini-Project Title:** Mini-Project 1: VKU Field Survey — Offline Data Collection (PWA & Capacitor)  
**Student Name:** Dinh Tran Tien Minh  
**Submission Date:** 10/09/2026  

---

## 1. GENERAL INFORMATION & DELIVERABLE LINKS

* **Team Members:**
  1. Dinh Tran Tien Minh — Student ID: 23IT162 — Role: Leader — Contribution: [100%]
* **🔗 Live Demo URL:** `https://vku-field-survey.vercel.app`
* **💻 GitHub Repository:** `https://github.com/Minhwritecode/vku-field-survey`
* **📄 Short Technical Report (PDF):** `REPORT.md` (Generated from this document)

---

## 2. FEATURE IMPLEMENTATION CHECKLIST

| # | Required Feature | Status | Implementation Details & Acceptance Level |
|:---:|---|:---:|---|
| 1 | **PWA Standalone Installation & Service Worker Caching** | ✅ Complete | Valid `manifest.json` configured with `display: standalone`, `#0284c7` theme color, and sub-second offline boot using Service Worker (`sw.js`) Cache-First strategy. |
| 2 | **Multi-Step Form & Local Draft Persistence** | ✅ Complete | Interactive 3-Step Wizard form (Location ➔ Asset & Rating ➔ Defects & Media) with extended fields: Inspector Name, Room Type, Asset Tag, Operational Status, Priority Level, Issue Tags, and Action Required. Real-time auto-saving into IndexedDB `drafts` store via `idb` wrapper. |
| 3 | **Offline Sync Queue & Automatic Background Sync** | ✅ Complete | Submissions tagged with UUID + timestamp stored as `PENDING_SYNC` in IndexedDB `sync_queue`. Listens to `@capacitor/network` NetworkStatus events and `window.ononline` to auto-dispatch queue sequentially upon reconnection. |
| 4 | **Capacitor Native APK Compilation** | ✅ Complete | Integrated `@capacitor/camera` (native photo capture), `@capacitor/geolocation` (GPS coordinates), `@capacitor/network` (network monitoring), and `@capacitor/local-notifications` (push sync alerts). Verified Android build via `npx cap sync && cd android && ./gradlew assembleDebug`. |
| 5 | **2026 Dark Glassmorphic UI/UX Aesthetics** | ✅ Complete | Deep space dark theme (`#090d16`), animated morphing background blobs (`@keyframes morphBlob`), interactive 5-star rating control with gold glow micro-interactions, live pulsing status badge, toast notification system, and modal record inspector. |
| 6 | **Cloud Database Persistence & Live Feed** | ✅ Complete | Integrates Firebase Realtime Database REST API (`https://vku-field-survey-default-rtdb.firebaseio.com/surveys`) to persist synced records in the cloud and render a live submissions inspector feed with modal detail view. |
| 7 | **Bilingual Internationalization (i18n)** | ✅ Complete | Full English/Vietnamese language toggle implemented via `src/i18n.ts` with 90+ translated keys. Language preference persisted to `localStorage`. UI switches seamlessly between 🇬🇧 EN and 🇻🇳 VI without page reload. |
| 8 | **Native GPS Auto-Fill** | ✅ Complete | `@capacitor/geolocation` captures high-accuracy GPS coordinates on Step 1. Requests runtime location permission on Android; falls back to browser Geolocation API on web. Coordinates embedded in every survey record payload. |
| 9 | **Native Push Notifications on Sync** | ✅ Complete | `@capacitor/local-notifications` sends an Android status bar push notification after background sync completes. Falls back to `window.Notification` API on web/PWA environments. |

---

## 3. TECHNICAL ARCHITECTURE & PROJECT STRUCTURE

### Directory Structure & Responsibilities
```
vku-field-survey/
├── public/
│   ├── manifest.json       # PWA manifest (standalone mode, #0284c7 theme color, icons)
│   ├── sw.js               # Service Worker — Cache-First App Shell strategy
│   ├── icon.jpg            # App icon (used in header & Web Notifications)
│   └── favicon.svg         # High-resolution SVG browser tab favicon
└── src/
    ├── main.ts             # Core UI renderer, 3-step wizard controller, sync engine & cloud feed
    ├── db.ts               # IndexedDB setup (drafts & sync_queue object stores using idb)
    ├── native.ts           # Capacitor plugin abstractions: Camera, Geolocation, Network, LocalNotifications
    ├── i18n.ts             # Bilingual translation registry (EN/VI, 90+ keys, localStorage persistence)
    └── style.css           # 2026 Glassmorphic Design System, glass cards & morph animations
```

### State Management & Data Flow
1. **Form Input State**: User inputs trigger real-time `input` listeners bound to `saveDraft()` in IndexedDB, preventing data loss on browser refresh or tab close.
2. **GPS Auto-Capture**: On Step 1 load, `getCurrentGPS()` from `native.ts` calls `@capacitor/geolocation` (with runtime permission flow on Android) and attaches `{ lat, lng, accuracy }` to the draft payload.
3. **Draft-to-Queue Transition**: Upon form submission, the active draft is converted to status `PENDING_SYNC`, inserted into the `sync_queue` store, and the draft record is cleared.
4. **Background Sync Engine**: An asynchronous loop fetches pending records from `sync_queue`. If `isOnline()` returns `true`, payloads are posted sequentially and removed from IndexedDB upon HTTP 200 verification.
5. **Post-Sync Notification**: After a successful sync batch, `sendSyncNotification(count)` dispatches either a native `@capacitor/local-notifications` push (Android APK) or a `window.Notification` (PWA/browser).
6. **i18n Rendering**: All UI strings are resolved through `t(key)` function from `src/i18n.ts`. Language toggle switches `currentLanguage`, persists to `localStorage`, and re-renders the entire UI without a page reload.

### Exception & Offline Handling Strategies
- **Service Worker Fallback**: All static assets (`index.html`, `style.css`, `manifest.json`, fonts) are cached during `install`. Fetch requests fallback to cache when offline.
- **Graceful Camera Degradation**: Hardware camera calls wrapped in try-catch in `src/native.ts`. Fallback allows file/image upload if camera permission is denied or unavailable.
- **GPS Permission Fallback**: On web platforms, `Capacitor.isNativePlatform()` returns `false`, so the standard browser Geolocation API is used. If denied, GPS fields are simply left empty without disrupting the form flow.

---

## 4. EMPIRICAL EVIDENCE & SCREENSHOTS

```
+------------------------------------------------------------------------+
|  [🏫] VKU Field Survey          [🇬🇧 EN]  [🟢 Online / 🔴 Offline]    |
|  Offline Campus Audit System                                           |
|  -------------------------------------------------------------------   |
|  📋 Comprehensive Facility Audit              [Auto-saving Draft]      |
|  (1) Location -------- (2) Asset & Rating -------- (3) Defects & Media|
|                                                                        |
|  Inspector:  [ Dinh Tran Tien Minh        ]                           |
|  Building:   [ Building A                 ]                           |
|  Floor:      [ 3rd Floor                  ]                           |
|  Room #:     [ A302                       ]                           |
|  Room Type:  [ 💻 Computer Lab            ]                           |
|  GPS:        [ 📍 15.9703°N, 108.2141°E   ]  [Get GPS]               |
|                                                                        |
|  Equipment:  [ 💻 Hardware / Computers    ]                           |
|  Asset Tag:  [ VKU-PC-2026-089            ]                           |
|  Status:     [ 🟡 Maintenance Needed      ]                           |
|  Priority:   [ High (Urgent Repair)       ]                           |
|  Rating:     [ ★ ★ ★ ★ ☆ ]  (4 / 5)                                   |
|                                                                        |
|  Issue Tags: [⚡ Power Failure] [🔨 Physical Damage]                   |
|  Action:     [ 🔩 Parts Replacement Required ]                        |
|  Photo:      [ 📷 Capture Photo / Upload Image ]                      |
|              [ 💾 Submit Audit (Save / Queue) ]                       |
+------------------------------------------------------------------------+
|  🔄 Offline Sync Queue                         [ ⚡ Sync Now ]         |
|  Pending sync items: [ 2 records ]                                     |
|  No records currently in sync queue                                    |
+------------------------------------------------------------------------+
|  ☁️ Cloud Database Submissions             [ 🔄 Fetch Cloud DB ]       |
|  Total records in Cloud Database: [ 14 records ]                      |
+------------------------------------------------------------------------+
```

1. **Step 1 — Location & GPS Auto-Fill**: Dark glassmorphism layout, glowing step wizard indicator, GPS coordinates auto-captured on load via `@capacitor/geolocation`.
2. **Step 2 — Asset Rating & Status**: Visual 5-star rating control with real-time gold glow micro-interactions, Operational Status, Priority Level, and Asset Tag fields.
3. **Step 3 — Offline Draft Auto-Save**: Multi-select Issue Tags, Action Required picker, defect notes, and photo capture with Base64 preview frame.
4. **Background Sync Execution**: Restoring network connection triggers auto-dispatch of queued items, success toast confirmation, and Android push notification via `@capacitor/local-notifications`.
5. **Bilingual Toggle**: Switching between 🇬🇧 EN and 🇻🇳 VI re-renders all 90+ UI strings instantly from `src/i18n.ts` without a page reload.

---

## 5. TECHNICAL CHALLENGES & RESOLUTIONS

### Challenge 1: Preventing Data Loss During Offline Form Completion
- **Issue**: Inspectors working in campus basements could accidentally refresh or close the browser tab before completing the inspection, losing filled data.
- **Resolution**: Implemented a debounced real-time persistence model in `src/main.ts`. Every input event triggers `saveDraft()` in `src/db.ts`, writing transient form state into the IndexedDB `drafts` object store using a persistent draft UUID (`currentDraftId`).

### Challenge 2: Cross-Platform Native Camera Compatibility (Web PWA vs. Native Android APK)
- **Issue**: Standard HTML5 file inputs lack native camera integration on mobile devices, while `@capacitor/camera` can throw errors when executed in browser environments without camera permissions.
- **Resolution**: Created a unified camera handler in `src/native.ts` wrapping `@capacitor/camera`. The function catches execution errors gracefully, converts captured images into Base64 JPEG data URIs, and updates both the UI preview frame and IndexedDB draft payload seamlessly.

### Challenge 3: Runtime GPS Permission Flow on Android APK
- **Issue**: The native `@capacitor/geolocation` plugin on Android requires explicit runtime permission grants before calling `getCurrentPosition()`, and fails silently if not handled properly.
- **Resolution**: In `src/native.ts`, the `getCurrentGPS()` function first calls `Geolocation.checkPermissions()`. If `location !== 'granted'`, it invokes `Geolocation.requestPermissions({ permissions: ['location'] })` before proceeding. On web environments, `Capacitor.isNativePlatform()` returns `false`, so the standard browser Geolocation API is used automatically as fallback.

### Challenge 4: Implementing Bilingual UI Without Page Reload
- **Issue**: Switching languages in a vanilla TypeScript app typically requires a full page reload, which would discard in-progress form state and degrade user experience.
- **Resolution**: All UI text is rendered through a centralized `t(key)` resolver backed by `src/i18n.ts`. The language toggle button updates the `currentLanguage` variable, saves to `localStorage`, and triggers a full `renderAppUI()` re-render — preserving draft state in IndexedDB which is restored immediately after re-render via `loadDraft()`.
