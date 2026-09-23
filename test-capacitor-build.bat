@echo off
REM Test full Capacitor build process locally

echo === Installing dependencies ===
call npm install --workspaces
if errorlevel 1 goto :error

echo.
echo === Setting environment variables ===
set KEYSTORE_FILE=release.keystore
set KEYSTORE_PASSWORD=lqjIuaF7nbKOWdZ87X10
set KEY_ALIAS=opensphinx
set KEY_PASSWORD=lqjIuaF7nbKOWdZ87X10
set VITE_SERVER_URL=https://api.opensphinx.online
set VITE_ADMOB_BANNER_POSTGAME=ca-app-pub-9936804554559347/3040021526
set VITE_ADMOB_BANNER_LOBBY=ca-app-pub-9936804554559347/7978139586
set ADMOB_APP_ID=ca-app-pub-9936804554559347~4067772592
set VITE_ADMOB_INTERSTITIAL=ca-app-pub-9936804554559347/3040021526

echo.
echo === Building client ===
call npm run build --workspace client
if errorlevel 1 goto :error

echo.
echo === Removing existing Android platform ===
if exist client\android rmdir /s /q client\android

echo.
echo === Adding Android platform ===
cd client
call npx cap add android
if errorlevel 1 goto :adderror
cd ..

echo.
echo === Generating icons ===
cd client
call npx capacitor-assets generate --android
if errorlevel 1 goto :iconerror
cd ..

echo.
echo === Syncing Capacitor ===
cd client
call npx cap sync android
if errorlevel 1 goto :syncerror
cd ..

echo.
echo === Adding AdMob App ID to AndroidManifest ===
powershell -Command "$content = Get-Content client\android\app\src\main\AndroidManifest.xml -Raw; if ($content -notmatch 'com.google.android.gms.ads.APPLICATION_ID') { $content = $content -replace '(</application>)', ('        <meta-data' + [Environment]::NewLine + '            android:name=""com.google.android.gms.ads.APPLICATION_ID""' + [Environment]::NewLine + '            android:value=""' + $env:ADMOB_APP_ID + '""/>' + [Environment]::NewLine + '    $1'); Set-Content client\android\app\src\main\AndroidManifest.xml $content; echo 'AdMob App ID added' } else { echo 'AdMob App ID already exists' }"

echo.
echo === Adding AD_ID permission to AndroidManifest ===
powershell -Command "$content = Get-Content client\android\app\src\main\AndroidManifest.xml -Raw; if ($content -notmatch 'com.google.android.gms.permission.AD_ID') { $content = $content -replace '(</manifest>)', ('    <uses-permission android:name=""com.google.android.gms.permission.AD_ID"" />' + [Environment]::NewLine + '$1'); Set-Content client\android\app\src\main\AndroidManifest.xml $content; echo 'AD_ID permission added' } else { echo 'AD_ID permission already exists' }"

echo.
echo === Copying keystore ===
if exist release.keystore (
    copy release.keystore client\android\app\release.keystore
    echo ✅ Keystore copied
) else (
    echo WARNING: release.keystore not found in root directory
)

echo.
echo === Adding signing config to build.gradle ===
cd client\android\app
powershell -Command "$content = Get-Content build.gradle -Raw; $content = $content -replace '(?s)(android \{)', ('$1' + [Environment]::NewLine + '    signingConfigs {' + [Environment]::NewLine + '        release {' + [Environment]::NewLine + '            storeFile file(System.getenv(\"KEYSTORE_FILE\") ?: \"release.keystore\")' + [Environment]::NewLine + '            storePassword System.getenv(\"KEYSTORE_PASSWORD\")' + [Environment]::NewLine + '            keyAlias System.getenv(\"KEY_ALIAS\")' + [Environment]::NewLine + '            keyPassword System.getenv(\"KEY_PASSWORD\")' + [Environment]::NewLine + '        }' + [Environment]::NewLine + '    }'); Set-Content build.gradle $content"
powershell -Command "$content = Get-Content build.gradle -Raw; $content = $content -replace '(?s)(buildTypes \{[^\r\n]*[\r\n]+[^\r\n]*release \{)', ('$1' + [Environment]::NewLine + '            signingConfig signingConfigs.release'); Set-Content build.gradle $content"
cd ..\..\..

echo.
echo === Building Release APK ===
cd client\android
call gradlew.bat assembleRelease --stacktrace
if errorlevel 1 goto :builderror
cd ..\..

echo.
echo === Build outputs ===
if exist client\android\app\build\outputs\apk (
    dir /s /b client\android\app\build\outputs\apk\*.apk
) else (
    echo No APK outputs found
)

echo.
echo === SUCCESS ===
pause
exit /b 0

:error
cd ..
echo.
echo === FAILED at dependency/build step ===
pause
exit /b 1

:adderror
cd ..
echo.
echo === FAILED at Android platform add ===
pause
exit /b 1

:iconerror
cd ..
echo.
echo === FAILED at icon generation ===
pause
exit /b 1

:syncerror
cd ..
echo.
echo === FAILED at Capacitor sync ===
pause
exit /b 1

:builderror
cd ..\..
echo.
echo === FAILED at APK build ===
pause
exit /b 1
