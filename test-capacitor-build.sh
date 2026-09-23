#!/bin/bash
# Test full Capacitor build process locally

set -e

echo "=== Installing dependencies ==="
npm install --workspaces

echo ""
echo "=== Setting environment variables ==="
export KEYSTORE_FILE=release.keystore
export KEYSTORE_PASSWORD=lqjIuaF7nbKOWdZ87X10
export KEY_ALIAS=opensphinx
export KEY_PASSWORD=lqjIuaF7nbKOWdZ87X10
export VITE_SERVER_URL=https://api.opensphinx.online
export VITE_ADMOB_BANNER_POSTGAME=ca-app-pub-9936804554559347/3040021526
export VITE_ADMOB_BANNER_LOBBY=ca-app-pub-9936804554559347/7978139586
export ADMOB_APP_ID=ca-app-pub-9936804554559347~4067772592
export VITE_ADMOB_INTERSTITIAL=ca-app-pub-9936804554559347/3040021526

echo ""
echo "=== Building client ==="
npm run build --workspace client

echo ""
echo "=== Removing existing Android platform ==="
rm -rf client/android

echo ""
echo "=== Adding Android platform ==="
cd client
npx cap add android
cd ..

echo ""
echo "=== Generating icons ==="
cd client
npx capacitor-assets generate --android
cd ..

echo ""
echo "=== Syncing Capacitor ==="
cd client
npx cap sync android
cd ..

echo ""
echo "=== Adding AdMob App ID to AndroidManifest ==="
if ! grep -q "com.google.android.gms.ads.APPLICATION_ID" client/android/app/src/main/AndroidManifest.xml; then
    sed -i.bak "s|</application>|        <meta-data\n            android:name=\"com.google.android.gms.ads.APPLICATION_ID\"\n            android:value=\"$ADMOB_APP_ID\"/>\n    </application>|" client/android/app/src/main/AndroidManifest.xml
    echo "AdMob App ID added"
else
    echo "AdMob App ID already exists"
fi

echo ""
echo "=== Adding AD_ID permission to AndroidManifest ==="
if ! grep -q "com.google.android.gms.permission.AD_ID" client/android/app/src/main/AndroidManifest.xml; then
    sed -i.bak "s|</manifest>|    <uses-permission android:name=\"com.google.android.gms.permission.AD_ID\" />\n</manifest>|" client/android/app/src/main/AndroidManifest.xml
    echo "AD_ID permission added"
else
    echo "AD_ID permission already exists"
fi

echo ""
echo "=== Copying keystore ==="
if [ -f release.keystore ]; then
    cp release.keystore client/android/app/release.keystore
    echo "Keystore copied"
else
    echo "WARNING: release.keystore not found in root directory"
fi

echo ""
echo "=== Adding signing config to build.gradle ==="
cd client/android/app
sed -i.bak '/android {/a\
    signingConfigs {\
        release {\
            storeFile file(System.getenv("KEYSTORE_FILE") ?: "release.keystore")\
            storePassword System.getenv("KEYSTORE_PASSWORD")\
            keyAlias System.getenv("KEY_ALIAS")\
            keyPassword System.getenv("KEY_PASSWORD")\
        }\
    }' build.gradle

sed -i.bak '/buildTypes {/!b;n;c\        release {\n            signingConfig signingConfigs.release' build.gradle
cd ../../..

echo ""
echo "=== Making gradlew executable ==="
chmod +x client/android/gradlew

echo ""
echo "=== Building Release APK ==="
cd client/android
./gradlew assembleRelease --stacktrace
cd ../..

echo ""
echo "=== Build outputs ==="
find client/android/app/build/outputs/apk -name "*.apk" 2>/dev/null || echo "No APK outputs found"

echo ""
echo "=== SUCCESS ==="
