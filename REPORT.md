# MINI-PROJECT SHORT TECHNICAL REPORT

**Course:** Cross-Platform Mobile App Development (VKU)  
**Mini-Project Title:** Mini-Project 1: VKU Field Survey — Offline Data Collection (PWA & Capacitor)  
**Student Name:** Dinh Tran Tien Minh  
**Submission Date:** 03/09/2026  

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
| 2 | **Multi-Step Form & Local Draft Persistence** | ✅ Complete | Interactive 3-Step Wizard form (Location ➔ Inspection ➔ Defect & Photo) with real-time auto-saving into IndexedDB `drafts` store via `idb` wrapper. |
| 3 | **Offline Sync Queue & Automatic Background Sync** | ✅ Complete | Submissions tagged with UUID + timestamp stored as `PENDING_SYNC` in IndexedDB `sync_queue`. Listens to `window.ononline` and network state to auto-dispatch queue sequentially upon reconnection. |
| 4 | **Capacitor Native APK Compilation** | ✅ Complete | Integrated `@capacitor/camera` for native photo capture and `@capacitor/network` for status monitoring. Verified Android build via `npx cap sync`. |
| 5 | **2026 Dark Glassmorphic UI/UX Aesthetics** | ✅ Complete | Deep space dark theme (`#090d16`), animated morphing background blobs (`@keyframes morphBlob`), interactive 5-star rating control, live pulsing status badge, and toast notifications. |
| 6 | **Cloud Database Persistence & Live Feed** | ✅ Complete | Integrates Firebase Realtime Database REST API (`https://vku-field-survey-default-rtdb.firebaseio.com/surveys`) to persist synced records in the cloud and render a live submissions inspector feed. |

---

## 3. TECHNICAL ARCHITECTURE & PROJECT STRUCTURE

### Directory Structure & Responsibilities
```
vku-field-survey/
├── public/
│   ├── manifest.json       # PWA manifest (standalone mode, #0284c7 theme color, icons)
│   ├── sw.js               # Service Worker for Cache-First App Shell caching
│   └── favicon.svg         # High-resolution SVG app icon
└── src/
    ├── main.ts             # Main UI renderer, multi-step wizard controller & sync logic
    ├── db.ts               # IndexedDB setup (drafts & sync_queue object stores using idb)
    ├── native.ts           # Capacitor Camera & Network plugin abstractions
    └── style.css           # 2026 Glassmorphic Design System, glass cards & morph animations
```

### State Management & Data Flow
1. **Form Input State**: User inputs trigger real-time `input` listeners bound to `saveDraft()` in IndexedDB, preventing data loss on browser refresh or tab close.
2. **Draft-to-Queue Transition**: Upon form submission, the active draft is converted to status `PENDING_SYNC`, inserted into the `sync_queue` store, and the draft record is cleared.
3. **Background Sync Engine**: An asynchronous loop fetches pending records from `sync_queue`. If `isOnline()` returns `true`, payloads are posted sequentially and removed from IndexedDB upon HTTP 200 verification.

### Exception & Offline Handling Strategies
- **Service Worker Fallback**: All static assets (`index.html`, `main.ts`, `style.css`, `manifest.json`, fonts) are cached during `install`. Fetch requests fallback to cache when offline.
- **Graceful Camera Degradation**: Hardware camera calls wrapped in try-catch in `src/native.ts`. Fallback allows file/image upload if camera permission is denied or unavailable.

---

## 4. EMPIRICAL EVIDENCE & SCREENSHOTS

```
+-----------------------------------------------------------------------+
|  [V] VKU Field Survey                            [🟢 Online / 🔴 Offline] |
|  -------------------------------------------------------------------  |
|  📋 Campus Facility Inspection                     [Auto-saving Draft] |
|  (1) Location ------ (2) Inspection ------ (3) Defects & Photo        |
|                                                                       |
|  Building:  [ Building A              ]                               |
|  Floor:     [ 3rd Floor               ]                               |
|  Room #:    [ A302                    ]                               |
|                                                                       |
|  Equipment: [ 💻 Hardware / Computers  ]                               |
|  Rating:    [ ★ ★ ★ ★ ★ ]  (5 / 5 Excellent)                          |
|                                                                       |
|  Photo:     [ 📷 Capture Photo Evidence ]                             |
|             [ 💾 Submit Survey (Save / Queue) ]                       |
+-----------------------------------------------------------------------+
|  🔄 Offline Sync Queue                            [ ⚡ Sync Now ]      |
|  Pending sync items: [ 0 records ]                                    |
|  No records currently in sync queue                                   |
+-----------------------------------------------------------------------+
```

1. **Step 1 - Location & Form Wizard**: Shows dark glassmorphism layout, glowing step wizard indicator, and input controls.
2. **Step 2 - Equipment Rating & Category**: Shows visual 5-star rating control with real-time gold glow micro-interactions.
3. **Step 3 - Offline Draft Auto-Save**: Demonstrates offline mode with pulsing red/amber status pill, draft saved notification toast, and photo preview frame.
4. **Step 4 - Background Sync Execution**: Demonstrates restoring network connection, auto-dispatch of queued items, and success toast confirmation.

---

## 5. TECHNICAL CHALLENGES & RESOLUTIONS

### Challenge 1: Preventing Data Loss During Offline Form Completion
- **Issue**: Inspectors working in campus basements could accidentally refresh or close the browser tab before completing the inspection, losing filled data.
- **Resolution**: Implemented a debounced real-time persistence model in `src/main.ts`. Every input event triggers `saveDraft()` in `src/db.ts`, writing transient form state into the IndexedDB `drafts` object store using a persistent draft UUID (`currentDraftId`).

### Challenge 2: Cross-Platform Native Camera Compatibility (Web PWA vs. Native Android APK)
- **Issue**: Standard HTML5 file inputs lack native camera integration on mobile devices, while `@capacitor/camera` can throw errors when executed in browser environments without camera permissions.
- **Resolution**: Created a unified camera handler in `src/native.ts` wrapping `@capacitor/camera`. The function catches execution errors gracefully, converts captured images into Base64 JPEG data URIs, and updates both the UI preview frame and IndexedDB draft payload seamlessly.
