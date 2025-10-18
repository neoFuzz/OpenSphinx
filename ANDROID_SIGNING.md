# Android Release Signing Setup

## Generate Keystore (one-time)

```bash
keytool -genkey -v -keystore release.keystore -alias opensphinx -keyalg RSA -keysize 2048 -validity 10000
```

Save the passwords securely!

## Add GitHub Secrets

Go to your repo → Settings → Secrets and variables → Actions → New repository secret:

1. **KEYSTORE_BASE64**: 
   ```bash
   base64 -w 0 release.keystore
   ```
   Copy the output and paste as secret value

2. **KEYSTORE_PASSWORD**: Your keystore password

3. **KEY_ALIAS**: `opensphinx` (or whatever you used)

4. **KEY_PASSWORD**: Your key password (same as keystore password if not separately set)

## Trigger Build

- Push a tag: `git tag v1.0.0 && git push origin v1.0.0`
- Or manually trigger from Actions tab

The signed APK will be attached to the GitHub release.
