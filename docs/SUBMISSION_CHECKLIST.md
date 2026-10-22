# ARCHANGEL — Final Submission Checklist

**Submission deadline:** 23 October 2026  
**Release posture:** Feature freeze. Fix only submission-blocking defects; do not add new features.

This checklist is the final release gate for the Amazon Developer Build, Ship, Shape — Fire TV track. Mark an item complete only after checking it against the current local checkout or submission portal.

## 1. Freeze the scope

- [ ] Keep the submission build on the repository's `main` branch; do not create a release branch.
- [ ] Do not add new features after the final smoke/regression pass.
- [ ] Keep the demo focused on the working Fire TV/Android TV experience and its strongest verified flows.
- [ ] Do not make AWS Bedrock availability a submission dependency. Use the provider that is currently working for the demo; describe Bedrock as configured but blocked by AWS account verification until a live invocation succeeds.

## 2. Final repository checks

From `D:\\archangel` in PowerShell:

```powershell
git status --short
git log -1 --oneline
npm install
npm --workspace backend run test:smoke
```

- [ ] Review `git status --short`; do not submit accidental secrets, local data, keystores, APKs, or generated build files.
- [ ] Confirm the intended code and docs are committed and pushed to `main`.
- [ ] Check the GitHub Actions results for the latest commit. Resolve failures that affect the submitted flows.
- [ ] Check that no API keys, AWS credentials, keystore passwords, or private signing material are committed.
- [ ] Ensure README claims match what has actually been implemented and tested. The README has previously contained stale module-status/roadmap wording; review it before submission.

## 3. Backend smoke test

Start the backend in a separate PowerShell terminal:

```powershell
cd D:\\archangel
npm run api
```

In another terminal, run:

```powershell
cd D:\\archangel
npm --workspace backend run test:smoke
```

- [ ] All smoke checks pass.
- [ ] `http://localhost:4000/health` returns a healthy response.
- [ ] `http://localhost:4000/catalog/status` returns catalog status.
- [ ] App discovery distinguishes a known app, a missing app, and a generic content request.
- [ ] Request Network and demand aggregation respond correctly.
- [ ] Pulse reports backend/catalog/provider health.
- [ ] AdLens and App Details render without errors.
- [ ] Confirm the selected AI provider works for the demo; do not claim live Bedrock success unless a real invocation succeeds.

## 4. Fire TV / Android TV regression pass

Use the existing Android TV emulator because no physical Fire TV device is available for validation.

- [ ] Build/install the current debug APK and launch ARCHANGEL.
- [ ] Home screen and all main tabs load without a red screen/render error.
- [ ] D-pad focus is visible and navigable.
- [ ] App search, category filters, exact app profile and alternatives work.
- [ ] Ask ARCHANGEL returns a catalog-grounded response.
- [ ] Missing-app request submits and the Request Network reflects it.
- [ ] AdLens overview, app detail and monetization history open.
- [ ] Pulse full check completes.
- [ ] Sideload Sentinel opens the local APK browser and inspects a test APK; malformed/non-APK inputs fail safely.
- [ ] Back navigation works and there are no Metro/API connection errors.
- [ ] Capture fresh screenshots only after these flows have been checked.

Useful commands:

```powershell
cd D:\\archangel\\fire-os\\android
.\\gradlew.bat app:assembleDebug
adb devices
adb install -r .\\app\\build\\outputs\\apk\\debug\\app-debug.apk
adb shell monkey -p com.archangelnative 1
```

## 5. Release APK and signature

A release APK and its signature must be verified independently of a debug build.

- [ ] Confirm the release keystore remains at `%USERPROFILE%\\archangel-release.jks` and the alias is `archangel-release`.
- [ ] Load the four `ARCHANGEL_RELEASE_*` variables in the current PowerShell session using the secure procedure in [RELEASE_SIGNING.md](./RELEASE_SIGNING.md). Never paste passwords into source control or the submission.
- [ ] Build the release APK:

```powershell
cd D:\\archangel\\fire-os\\android
.\\gradlew.bat app:assembleRelease
```

- [ ] Verify the exact release artifact:

```powershell
$apk = ".\\app\\build\\outputs\\apk\\release\\app-release.apk"
& "$env:LOCALAPPDATA\\Android\\Sdk\\build-tools\\36.1.0\\apksigner.bat" verify --verbose --print-certs $apk
Get-FileHash $apk -Algorithm SHA256
```

- [ ] Confirm verification succeeds and the signer is the dedicated release certificate, not the Android debug certificate.
- [ ] Save the APK SHA-256 hash in the private release notes.
- [ ] Install and launch the release APK on the emulator if time permits. Release configuration can differ from debug (R8, manifest flags, cleartext traffic), so a successful debug run alone is not enough.
- [ ] Keep the keystore and passwords backed up privately. Do not upload them to GitHub or the submission portal.

Expected artifact path: `fire-os/android/app/build/outputs/apk/release/app-release.apk`.

## 6. Demo recording

Produce one clean, short screen recording using the tested emulator build. Keep it within the submission portal's video-duration limit.

Suggested order:
1. **Problem + value proposition (10–15 sec):** ARCHANGEL is an intelligence and discovery layer for Fire TV, not a replacement for Fire OS.
2. **App Discovery (25–35 sec):** search for a known app, show its profile and catalog-grounded alternatives.
3. **Concierge (20–30 sec):** demonstrate a natural-language request and explain the difference between an exact match, a generic content request, and a missing app.
4. **Request Network (15–20 sec):** submit a missing-app request and show demand/opportunity signals.
5. **Fire TV intelligence (25–35 sec):** briefly show Pulse, AdLens evidence transparency, and Sideload Sentinel local APK inspection.
6. **Close (10 sec):** summarize user value and the next platform integration.

- [ ] Record only flows that worked during the final regression pass.
- [ ] Hide API keys, credentials, account identifiers, local file paths containing personal information, and unrelated desktop notifications.
- [ ] Use clear narration or concise captions; do not spend the video on setup, build logs, or AWS troubleshooting.
- [ ] Watch the exported video from beginning to end and verify audio, readability, and duration.

## 7. Submission package

Check the actual submission portal's required fields; do not assume every event asks for the same artifacts.

- [ ] Project name: **ARCHANGEL — The Intelligent Layer for Fire TV**.
- [ ] Public repository: https://github.com/Barnona/archangel
- [ ] Upload/link the verified release APK only if the event accepts or requests an APK.
- [ ] Add the final demo video link/file.
- [ ] Provide a concise description of the problem, target user, core features, and why Fire TV is the target platform.
- [ ] Explain the architecture: React Native TV client, Express API, curated verified catalog, and selectable AI providers.
- [ ] State the tested environment honestly: Android TV emulator; no physical Fire TV device was available for validation.
- [ ] State scope limits honestly: the catalog is a small curated demo cache, AdLens uses available catalog evidence, and Sideload Sentinel is not a malware scanner or guarantee of APK safety.
- [ ] Do not claim live Bedrock operation until the account restriction is cleared and an invocation succeeds.
- [ ] Check every required field, eligibility declaration, asset, and permission before submitting.
- [ ] Submit before the deadline and save the confirmation page/email.

## 8. Final go/no-go rule

**GO** only when the current source is pushed, backend smoke checks pass, the main demo flows have been exercised, and the exact release APK has a verified release signature.

If a non-critical item cannot be completed before the deadline, do not destabilize working code to chase it. Record the limitation and submit the strongest reproducible build. Do not describe an unchecked item as tested.
