# Release signing (Android / Fire TV)

ARCHANGEL release builds must use a dedicated private release keystore. The repository Android debug keystore is for local development only and must never be used to distribute an APK.

## 1. Create a keystore once

Run in PowerShell with JDK 17 available:

```powershell
keytool -genkeypair -v -keystore "$env:USERPROFILE\archangel-release.jks" -alias archangel-release -keyalg RSA -keysize 3072 -validity 10000
```

Choose a strong keystore password and key password. Keep the keystore and passwords in a secure backup. Losing the keystore can prevent future updates signed as the same app identity. Never commit the keystore or passwords to Git.

## 2. Configure the current PowerShell session

Use the exact path where you saved the keystore. These environment variables are read by fire-os/android/app/build.gradle.

```powershell
$env:ARCHANGEL_RELEASE_STORE_FILE = "$env:USERPROFILE\archangel-release.jks"
$secureStorePassword = Read-Host "Keystore password" -AsSecureString
$env:ARCHANGEL_RELEASE_STORE_PASSWORD = [System.Net.NetworkCredential]::new("", $secureStorePassword).Password
$env:ARCHANGEL_RELEASE_KEY_ALIAS = "archangel-release"
$secureKeyPassword = Read-Host "Key password" -AsSecureString
$env:ARCHANGEL_RELEASE_KEY_PASSWORD = [System.Net.NetworkCredential]::new("", $secureKeyPassword).Password
```

Environment variables persist for this PowerShell session only. Do not paste passwords into source files, shell scripts committed to Git, issue comments, or logs. For CI, use encrypted repository secrets and decode a base64 keystore into a temporary runner file.

## 3. Build and verify

```powershell
cd D:\archangel\fire-os\android
.\gradlew.bat app:assembleRelease
```

The release task intentionally fails if any signing variable is missing or the keystore path does not exist. Debug builds remain available without release signing variables.

Find the APK at `fire-os/android/app/build/outputs/apk/release/app-release.apk`.

Verify the signature using Android SDK Build Tools:

```powershell
apksigner verify --verbose --print-certs .\app\build\outputs\apk\release\app-release.apk
```

Record the signer certificate SHA-256 fingerprint in a secure release record. Verify that release APKs are not signed by the Android debug certificate. Keep a backup of the keystore and its credentials separate from the source repository.

## Security notes

- Release builds disable app debugging and cleartext traffic via release manifest placeholders and enable R8/resource shrinking.
- This protects the app package; it does not replace HTTPS on the backend, server-side authentication/authorization, or deployment-level WAF/DDoS controls.
- Never ship a release APK with API provider credentials embedded in the client.