# Android App Setup with Capacitor

## Why Capacitor?
Capacitor wraps your existing React web app into a native Android app. No need to rewrite in React Native - your entire codebase works as-is with Three.js, Socket.IO, and all existing features.

## Prerequisites
- Node.js 20+
- Android Studio installed
- Java JDK 17+

## Setup Steps

### 1. Install Capacitor Dependencies
```bash
cd client
npm install @capacitor/core @capacitor/cli @capacitor/android
```
This installs the core Capacitor framework and Android platform support.

### 2. Initialize Capacitor
```bash
npx cap init
```
You'll be prompted for:
- **App name**: OpenSphinx
- **App ID**: online.opensphinx.game (reverse domain format)
- **Web directory**: dist (where Vite builds to)

### 3. Build Your Web App
```bash
npm run build
```
This creates the production build in the `dist` folder that Capacitor will package.

### 4. Add Android Platform
```bash
npx cap add android
```
Creates the `android/` folder with a complete Android Studio project.

### 5. Generate App Icons
```bash
npm install -D @capacitor/assets
```
Place your logo (1024x1024 PNG or SVG) at `client/resources/icon.png`, then:
```bash
npx capacitor-assets generate --iconBackgroundColor '#ffffff'
```
This generates all required Android icon sizes automatically.

### 6. Install AdMob Plugin
```bash
npm install @capacitor-community/admob
npx cap sync
```
Installs the AdMob plugin and syncs it to the Android project.

### 7. Configure AdMob
Create `client/capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.opensphinx.game',
  appName: 'OpenSphinx',
  webDir: 'dist',
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-9936804554559347~YOUR_APP_ID', // Get from AdMob console
      testingDevices: ['YOUR_DEVICE_ID'], // Optional: for testing
    },
  },
};

export default config;
```

Add AdMob ad unit IDs to `client/.env`:
```bash
VITE_ADMOB_BANNER_LOBBY=ca-app-pub-9936804554559347/YOUR_BANNER_ID
VITE_ADMOB_BANNER_POSTGAME=ca-app-pub-9936804554559347/YOUR_BANNER_ID
```

### 8. Open in Android Studio
```bash
npx cap open android
```
This opens the Android project in Android Studio.

### 9. Build APK
In Android Studio:
1. Wait for Gradle sync to complete
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. APK will be in `android/app/build/outputs/apk/debug/`

## How It Works

**AdMobWrapper Component**: Automatically detects platform
- **Web**: Uses AdSense (existing setup)
- **Android**: Uses AdMob (native ads)
- Same component, different ad networks

**Updates**: After changing web code:
```bash
npm run build
npx cap sync
```
Then rebuild in Android Studio.

## Troubleshooting

**Error: "invalid source release: 21"**

Your JDK version doesn't support Java 21. Edit `client/android/app/build.gradle`:
```gradle
compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
}
```

## Automated Builds with GitHub Actions

See `ANDROID_SIGNING.md` for setting up automated signed release builds via GitHub Actions. The workflow:
- Triggers on version tags (`v1.0.0`)
- Builds and signs the APK
- Attaches to GitHub releases

## Getting AdMob IDs
1. Go to https://apps.admob.com
2. Create Android app
3. Create banner ad units
4. Copy IDs to `.env` and `capacitor.config.ts`
