@echo off
REM Build Android App Bundle for Google Play Store

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
    echo ERROR: release.keystore not found
    goto :error
)

echo.
echo === Building Release AAB for Google Play ===
cd client\android
call gradlew.bat bundleRelease --stacktrace
if errorlevel 1 goto :builderror
cd ..\..

echo.
echo === Build output ===
if exist client\android\app\build\outputs\bundle\release\app-release.aab (
    echo ✅ AAB created successfully:
    dir client\android\app\build\outputs\bundle\release\app-release.aab
    echo.
    echo === Next Steps ===
    echo 1. Go to Google Play Console: https://play.google.com/console
    echo 2. Select your app
    echo 3. Go to Testing ^> Internal testing
    echo 4. Create new release
    echo 5. Upload: client\android\app\build\outputs\bundle\release\app-release.aab
    echo 6. Add release notes
    echo 7. Review and roll out to internal testing
) else (
    echo ERROR: AAB not found
    goto :error
)

echo.
echo === SUCCESS ===
pause
exit /b 0

:error
echo.
echo === FAILED ===
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
echo === FAILED at AAB build ===
pause
exit /b 1
