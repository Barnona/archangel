# Sideload Sentinel — security model and validation guide

## What the in-app inspector does

- Restricts inspection to a filename inside ARCHANGEL's app-specific Downloads folder; path separators and traversal names are rejected.
- Rejects empty files, files over 1 GiB, unreadable files, malformed ZIP containers, ZIPs with no `AndroidManifest.xml`, and manifests that Android cannot parse.
- Reads package name, version, minimum/target SDK, declared permissions, device API, and signer-certificate fingerprints exposed by Android `PackageManager`.
- Computes SHA-256 over the exact APK bytes currently inspected.
- Emits explicit fields for signature verification, hash-reference status, compatibility warnings, and malware scanning.

## Security semantics

| Signal | Meaning | Does not mean |
|---|---|---|
| `fileSha256` | Fingerprint of the bytes inspected | The bytes match a trusted release unless compared with an independently trusted reference hash |
| `signerCertificateSha256` | Fingerprint(s) of certificate data exposed by Android metadata | A valid APK signing block, trusted publisher, or safe application |
| `signatureStatus` | Certificate was extracted or was unavailable | Cryptographic signature verification |
| `cryptographicSignatureVerified` | Remains `false` in the on-device metadata inspection | Sentinel has run `apksigner` |
| `requestedPermissions` | Permissions declared in the manifest | Permissions granted or currently used by the application |
| `malwareScanPerformed` / `securityScanStatus` | `false` / `NOT_SCANNED` | Malware detection or a safety verdict |

Android SDK `apksigner` is the supported verification path in this repository. The `apksig` project describes its verifier as checking whether signatures are expected to verify across Android platform versions and documents the `apksigner verify` command: https://android.googlesource.com/platform/tools/apksig/. It is deliberately run from the development computer rather than represented as an on-device malware scanner.

## Verify a real APK on Windows

Install Android SDK Build Tools through Android Studio SDK Manager, or ensure `apksigner` is on `PATH`. Then run at the repository root:

```powershell
.\scripts\verify-apk.ps1 -ApkPath .\path\to\app.apk
```

When an independently trusted SHA-256 is available from the publisher or a trusted release channel, compare it too:

```powershell
.\scripts\verify-apk.ps1 -ApkPath .\path\to\app.apk -ExpectedSha256 <64-character-trusted-sha256>
```

The script prints the APK SHA-256, the signature verifier exit code/output, and whether the supplied reference hash matches. Exit codes: `0` signature verifies and the optional reference hash matches; `1` signature verification failed; `2` invalid input; `3` `apksigner` unavailable; `4` trusted reference hash mismatch.

**Interpretation:** A successful signature verification shows that the APK content verifies under the embedded signing certificate for the checked Android platform range. It does not establish that the signer is a reputable publisher or that the app is malware-free. Compare the signer certificate digest to an independently trusted publisher value before treating the identity as expected.

## Emulator validation matrix

Run these checks on the Android TV emulator after building/installing the current branch. Keep the test APKs isolated from personal or production devices.

| Case | Preparation | Expected result |
|---|---|---|
| Valid signed APK | Copy a known-good, signed test APK into the app-specific import folder | Metadata loads; SHA-256 and declared permissions render; signature remains explicitly `NOT VERIFIED` in the app until the desktop verifier is run |
| Non-APK extension | Place a `.txt` or `.zip` file in the folder | It is not listed by the `.apk` browser |
| Random text renamed `.apk` | Copy a small text file as `not-really.apk` | Inspection fails with a readable invalid ZIP/APK message; no app crash |
| Empty `.apk` | Create a zero-byte file named `empty.apk` | Inspection fails with the empty-file explanation |
| ZIP without manifest | Create a ZIP containing an ordinary text file, rename it `no-manifest.apk` | Inspection fails with an `AndroidManifest.xml` explanation |
| Truncated APK | Copy a test APK and truncate/corrupt its ZIP end records | Inspection fails with a readable malformed/corrupt archive or manifest error |
| Manifest present but invalid | Use a test fixture containing an invalid/empty manifest entry | Inspection rejects the package instead of showing a successful metadata result |
| Large file | Use a sparse/test fixture over the 1 GiB cap only if storage allows | Inspection fails before reading the entire file |
| Signature tampering | Make a copy of a signed test APK and modify signed content | `scripts/verify-apk.ps1` returns nonzero; app itself still labels signature verification as not performed |
| Known hash match/mismatch | Run verifier with a trusted SHA-256, then with one changed digit | Matching hash succeeds; mismatched hash exits with code `4` |
| Unreadable/missing file | Remove the file between listing and selecting it, or use an inaccessible test fixture | A concise file-access error appears; the UI stays usable |
| Permission display | Inspect a fixture with common and sensitive declared permissions | Each permission is marked as declared-only and has a category/rationale; no claim is made that it is granted or used |

### Copying a fixture to the emulator

Use a test package only. For a package named `com.archangelnative`, the native module reads its app-specific external Downloads directory:

```powershell
adb shell mkdir -p /sdcard/Android/data/com.archangelnative/files/Download
adb push .\fixtures\sample.apk /sdcard/Android/data/com.archangelnative/files/Download/
adb shell am force-stop com.archangelnative
adb shell monkey -p com.archangelnative 1
```

Open **Sideload Sentinel → Browse Imported APKs → Refresh APK List**. The Android app-specific path can vary by device/OS storage implementation; check the package directory on the target emulator if `adb push` fails.

## Test reporting

Do not mark this matrix as passed based only on adding the code. Record the emulator/API version, fixture hash, observed outcome, and screenshot for each executed case. Signature verification and hash-reference comparison should be recorded separately from any malware-analysis result. ARCHANGEL does not presently perform malware scanning.