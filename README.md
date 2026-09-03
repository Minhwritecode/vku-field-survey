# 📱 VKU Field Survey — Offline Data Collection (PWA & Capacitor)

> **VKU Mini-Project 1**: An Offline-First Progressive Web Application (PWA) and Native Android App for Campus Facility Inspections at Vietnam-Korea University of Information and Communication Technology (VKU).

![PWA Standalone](https://img.shields.io/badge/PWA-Standalone_Mode-0284c7?style=for-the-badge&logo=pwa)
![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB_Auto--Save-10b981?style=for-the-badge)
![Capacitor](https://img.shields.io/badge/Native-Capacitor_Bridge_v6-7c3aed?style=for-the-badge&logo=android)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Bundler-Vite_8.0-646cff?style=for-the-badge&logo=vite)

---

## 📋 Table of Contents

- [🎯 Overview & Problem Scenario](#-overview--problem-scenario)
- [✨ Core Features](#-core-features)
- [🛠️ Architecture & Tech Stack](#️-architecture--tech-stack)
- [📂 Project Directory Structure](#-project-directory-structure)
- [⚙️ Prerequisites & Setup Instructions](#️-prerequisites--setup-instructions)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Run Local Development Server](#3-run-local-development-server)
  - [4. Build for Production](#4-build-for-production)
- [🤖 Native Android APK Compilation Guide](#-native-android-apk-compilation-guide)
- [🌐 Live Deployment Guide](#-live-deployment-guide)
- [📄 License & Authors](#-license--authors)

---

## 🎯 Overview & Problem Scenario

Campus facility inspectors and student auditors at VKU must conduct on-site audits of classroom equipment (projectors, AC units, PCs, lighting, furniture) in basements and remote campus buildings where Wi-Fi and mobile signals (4G/5G) are unavailable.

**VKU Field Survey** solves this problem by providing an **Offline-First PWA** that operates 100% offline:
1. **Sub-second Offline Boot**: Service Worker caches all App Shell static assets with a Cache-First strategy.
2. **Zero Data Loss**: Form inputs are saved in real-time to browser IndexedDB drafts.
3. **Automatic Synchronization**: Submissions created offline are saved in a `PENDING_SYNC` queue and automatically dispatched sequentially to the server as soon as connection is restored.
4. **Native Mobile App**: Packaged into a native Android APK using Capacitor Bridge with `@capacitor/camera` and `@capacitor/network`.

---

## ✨ Core Features

- ⚡ **Offline-First PWA Standalone**: Valid `manifest.json` (`display: standalone`, `#0284c7` theme color) with offline caching via `sw.js`.
- 🎨 **2026 Dark Glassmorphic UI/UX**: Futuristic dark glass aesthetic (`#090d16`), animated background morphing blobs (`@keyframes morphBlob`), interactive 5-star rating control, and smooth multi-step wizard navigation.
- 📝 **Multi-Step Inspection Wizard**:
  - **Step 1 (Location)**: Building, Floor, Room #.
  - **Step 2 (Inspection)**: Category (Hardware, Projector, AC Unit, Electrical, Furniture) & Visual 5-Star Rating.
  - **Step 3 (Defects & Media)**: Incident notes & Camera Photo capture with preview.
- 💾 **Real-time IndexedDB Persistence**: Automatic draft auto-saving via `idb` library on every keystroke.
- 🔄 **Offline Queue & Background Sync**: Offline submissions tagged with UUID and timestamp; listens to `window.ononline` and network status changes to auto-sync.
- 📱 **Capacitor Native Bridge**: Direct integration with device hardware camera and real-time network connectivity status.

---

## 🛠️ Architecture & Tech Stack

| Component | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, CSS3 (Vanilla Glassmorphism), TypeScript | Core application structure and logic |
| **Bundler & Build** | Vite 8.2 | Fast HMR development server and production bundler |
| **Offline Cache** | Service Worker API (Cache-First) | Sub-second offline app startup |
| **Draft Storage** | IndexedDB (`idb` v8.0) | Local persistence for drafts and sync queue |
| **Native Bridge** | Capacitor v6 (`@capacitor/camera`, `@capacitor/network`) | Native Android APK compilation & device API access |
| **Identifier** | `uuid` v14 | Unique submission tracking |

---

## 📂 Project Directory Structure

```
vku-field-survey/
├── index.html              # HTML5 template with viewport & font configuration
├── package.json            # Dependencies and build scripts
├── tsconfig.json           # TypeScript configuration
├── capacitor.config.ts     # Capacitor app configuration
├── public/
│   ├── manifest.json       # PWA manifest specification (standalone, icons, theme)
│   ├── sw.js               # Service Worker with Cache-First strategy
│   └── favicon.svg         # SVG App Icon
└── src/
    ├── main.ts             # Main application logic, UI renderer & wizard controller
    ├── db.ts               # IndexedDB database initialization, drafts & sync queue API
    ├── native.ts           # Capacitor Camera & Network plugin wrappers
    └── style.css           # 2026 Dark Glassmorphic Design System & Morph Animations
```

---

## ⚙️ Prerequisites & Setup Instructions

### Prerequisites
Before you begin, ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**: Installed and configured

---

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/vku-field-survey.git
cd vku-field-survey
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Run Local Development Server

Start the Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

### 4. Build for Production

Compile TypeScript and build optimized production assets:

```bash
npm run build
```

The compiled assets will be placed in the `dist/` directory.

To preview the production build locally:
```bash
npm run preview
```

---

## 🤖 Native Android APK Compilation Guide

To compile this PWA into an installable Android APK using Capacitor:

### Step 1: Add Android Platform
```bash
npx cap add android
```

### Step 2: Build Project and Sync Web Assets
```bash
npm run build
npx cap sync
```

### Step 3: Open in Android Studio
```bash
npx cap open android
```

### Step 4: Build APK
In Android Studio:
1. Wait for Gradle sync to complete.
2. Navigate to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Once completed, click **locate** to retrieve your compiled `app-debug.apk` file.

---

## 🌐 Live Deployment Guide

### Deploying to Vercel
```bash
npx vercel --prod
```

### Deploying to Cloudflare Pages
```bash
npx wrangler pages deploy dist --project-name=vku-field-survey
```

---

## 📄 License & Authors

Developed for **VKU Mini-Project 1** — Mobile Application Development & Web Engineering.

- **Institution**: Vietnam-Korea University of Information and Communication Technology (VKU)
- **License**: MIT License
