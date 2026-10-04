# ARCHANGEL — Friction Log

## Metadata

| Field | Value |
|---|---|
| Project | ARCHANGEL — The Intelligence Layer for Fire TV |
| Repository | `Barnona/archangel` |
| Log file | `docs/FRICTION_LOG.md` |
| Started | 2026-09 (development history captured from the project work) |
| Log updated | 2026-10-04 |
| Platform | Fire OS / Android TV emulator / React Native TV |
| Primary development environment | Windows 11, PowerShell, Android Studio, Node.js, npm, ADB |
| Current product direction | Fire TV intelligence/discovery layer |
| Current modules | Home, App Discovery, App Details, Pulse, AdLens, Request Network, Profile |
| Current major data constraint | Curated verified catalog; no claimed Amazon Appstore-wide catalog API |
| Purpose of this log | Record user/developer friction, expected vs actual behaviour, root cause, resolution, evidence, and effort |

---

# 1. What ARCHANGEL is trying to achieve

ARCHANGEL is being developed as an **intelligence layer for Fire TV** rather than as another content-streaming application.

The intended loop is:

`Viewer → ARCHANGEL → discovery / diagnostics / requests → developer signal → better Fire TV ecosystem`

The main product areas are:

1. **App Discovery Intelligence** — search, understand intent, compare applications, identify missing apps and alternatives.
2. **AdLens** — explain observable app monetization and advertising signals without claiming system-level ad-control privileges.
3. **Pulse** — diagnose network and TV experience issues.
4. **Request Network** — let viewers request missing applications and aggregate demand.
5. **Concierge AI** — natural-language assistance across the ARCHANGEL experience.
6. **Future Amazon integrations** — official APIs/capabilities requested from Amazon where ARCHANGEL cannot legitimately access the required platform data or entitlement system.

A core design principle is:

> **When the platform does not expose a capability, ARCHANGEL should expose the limitation clearly and request an official integration rather than bypassing the platform.**

---

# 2. Friction log

> **Timing note:** Only durations explicitly measured during development are treated as exact. Most earlier troubleshooting sessions were not formally timed, so those entries are marked **Not formally timed** rather than inventing precision.

| Timestamp / period | Area | Expected | What actually happened | Friction | Evidence | How it was solved | Time taken to solve |
|---|---|---|---|---|---|---|---|
| 2026-09 development | Android/React Native TV setup | Fire TV React Native project should build on Windows | Native Android/TV project required additional configuration and compatibility work | Fire TV/TV React Native setup is more constrained than ordinary Android React Native | Build/terminal output from development session | Generated a standard RN Android project, adapted it for `react-native-tvos`, added TV manifest declarations, banner, launcher configuration and Fire TV-specific setup | Not formally timed |
| 2026-09-24 7:25 PM (IST) | Android emulator | `adb` and `emulator` commands should be available | ADB was available but `emulator` was initially not on PATH | Android SDK command-line tools were only partially available from PowerShell | `emulator: The term 'emulator' is not recognized as a name of a cmdlet, function, script file, or executable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.` | Corrected Android SDK/emulator PATH configuration and created/started an Android 12 API 31 x86_64 AVD | 10 minutes |
| 2026-09-24 7:40 PM (IST) | Java / Gradle | Gradle should build with installed Java | Java 25 caused an incompatible class-file/major-version failure | Android/Gradle toolchain was using a newer JDK than the project supported | `Starting a Gradle Daemon (subsequent builds will be faster) FAILURE: Build failed with an exception. What went wrong: BUG! exception in phase 'semantic analysis' in source unit 'BuildScript' Unsupported class file major version 69` | Located Adoptium JDK 17 and configured Gradle/Java environment to use it | 20 minutes |
| 2026-09-24 7:52 PM (IST) | Native build | Debug APK should build | First full native build took a long time but eventually succeeded | Large React Native/Gradle dependency graph and native compilation | `BUILD SUCCESSFUL in 1h 27m 27s 58 actionable tasks: 58 executed` | Completed `app:assembleDebug`; successful build produced the debug APK | 1h 27m 27s |
| 2026-09 development | App launch | Installed APK should start ARCHANGEL | App launched but initially required the development JavaScript bundle | React Native TV app was not using a packaged JS bundle during development | React Native “Unable to load script” error screen | Started Metro, verified port 8081, used ADB reverse for the emulator, and relaunched the application | Not formally timed |
| 2026-09/10-01 | Backend | `npm run api` should start the API | Backend failed because `express` was missing | Backend dependency installation was incomplete | PowerShell module-not-found error | Restored backend dependencies and added the required Express package to the backend dependency set | Not formally timed |
| 2026-09/10-01 | Backend | API should start once | Server had duplicate `app.listen` behaviour | Duplicate server-start code caused backend startup problems | Backend console output | Removed duplicate listener; server now listens once on port 4000 | Not formally timed |
| 2026-09/10-01 | App Details | Selecting an app should load its details | App Details initially failed against the API | Frontend/backend response contract did not yet match the expected detail structure | Fire TV emulator error state during testing | Corrected the App Details backend response and frontend handling | Not formally timed |
| 2026-09/10-01 | Request Network | Submitting an app request should create a valid request | Generic request handling initially failed for some input paths | Request input normalization/validation was incomplete | Emulator/API testing output | Normalized request parsing and fixed the generic request path | Not formally timed |
| 2026-10-02 | Home TV navigation | Moving focus to lower Home options should scroll the screen | Lower options could receive focus without the page moving sufficiently | TV focus navigation and ordinary mobile-style layout were not enough for the full Home content | Emulator video/screenshot during navigation testing | Converted Home to a focus-aware `ScrollView` with `scrollsChildToFocus`; kept the footer inside scrollable content | Not formally timed |
| 2026-10-02 | AdLens | AdLens should appear as a real Fire TV module | Initial AdLens implementation only existed as the basic module/screen | No app-level evidence/detail flow yet | AdLens emulator screen | Added AdLens to Home and implemented the first profile list and system-ad boundary messaging | Not formally timed |
| 2026-10-03 | Discover TV focus | SEARCH / ASK ARCHANGEL / REQUEST APP should become black when focused | React Native TV `Pressable` focus styling did not reliably produce the requested visual state | TV focus state was not behaving consistently through the style callback | Emulator screenshots/video showing buttons staying red | Replaced implicit focus styling with explicit `onFocus` / `onBlur` React state | Not formally timed |
| 2026-10-03 | Discover TV focus | Final focused buttons should have black background and readable text | Earlier implementation changed the background but visual result still did not match | Focus styling was being applied inconsistently | Emulator screenshot/video | Added explicit focus state and consolidated the button styles; later removed duplicate `requestFocused` state | Not formally timed |
| 2026-10-03 | Git synchronization | Local project should pull the latest GitHub changes | `git pull` aborted because local `DiscoverScreen.tsx` changes would be overwritten | Local working tree differed from remote | PowerShell `git pull` error output | Identified the conflicting file; recommended preserving or restoring the local change before pulling instead of using `git reset --hard` | Not formally timed |
| 2026-10-03 | AdLens detail | Selecting an AdLens profile should open an app-specific detail page | Emulator showed `Cannot GET /adlens/prime-video` | Frontend had been updated before the running backend process had loaded the new Express route | **Visual evidence: emulator showed HTML Express error: `Cannot GET /adlens/prime-video`** | Added/verified `GET /adlens/:appId`, API client method, navigation state and detail screen; backend must be restarted after route changes | Not formally timed |
| 2026-10-03 | AdLens detail navigation | AdLens profile cards should be selectable with the TV remote | Profiles were initially informational/non-focusable | TV application needs explicit focus targets | AdLens emulator UI | Converted profile cards to focusable `Pressable` controls and connected them to the detail route | Not formally timed |
| 2026-10-03 | AdLens Back control | Focused `← ADLENS` button should have black background with readable white text | Background changed to black but the text remained black | Focused text color was not tied to the same explicit TV focus state | **Visual evidence: emulator/video showed black button with black `← ADLENS` text** | Added explicit back-button focus state using `onFocus` / `onBlur` and switched focused text to white | Not formally timed |
| 2026-10-03 | AdLens filtering | Users should be able to inspect advertising states without an arbitrary score | All profiles were shown together | Evidence states needed a clearer way to inspect the catalog | AdLens emulator UI | Added filters: ALL, AD-SUPPORTED, NO KNOWN ADS, UNKNOWN | Not formally timed |
| 2026-10-03 | AdLens filter focus | Focused filter should remain readable | Focused filter could become dark-on-dark depending on active/focused combination | Focus and selection were two separate visual states | Emulator UI testing | Added focused text contrast handling | Not formally timed |
| 2026-10-03 | AdLens subscriptions | Subscription-based apps should expose relevant monetization context | Subscription was only represented as a monetization field | A subscription does not necessarily mean an ad-free tier | AdLens detail UI | Added a **SUBSCRIPTION SIGNAL** section explicitly stating that ARCHANGEL does not currently verify whether a subscription tier removes advertising | Not formally timed |

---

# 3. Important friction patterns

## 3.1 TV focus is a first-class engineering problem

Several UI problems came from treating Fire TV/Android TV focus like ordinary touch/mobile interaction.

Repeated issues:

- `Pressable` focus styles did not always render as expected.
- Focused controls needed explicit state.
- Focused text and focused background must be designed together.
- Scroll containers must cooperate with TV focus.
- Lower controls must remain visible when remote navigation reaches them.

**Decision:**

For important TV controls, prefer explicit:

`onFocus → state → focused style`

and

`onBlur → state → normal style`

rather than assuming mobile-style `Pressable` styling will always be sufficient.

---

## 3.2 Backend changes require process lifecycle awareness

The AdLens detail problem demonstrated:

> Code existing in GitHub does not mean the currently running backend process has loaded that code.

Example:

`/adlens/:appId` existed in the repository, but the emulator still received:

`Cannot GET /adlens/prime-video`

The actual resolution was to ensure the backend process was restarted after the route was introduced.

**Decision:**

For every backend route change:

1. Save code.
2. Restart API process.
3. Test endpoint directly.
4. Then test through the Fire TV UI.

---

## 3.3 ARCHANGEL must not invent platform capabilities

The catalog problem is a product-level friction rather than just a coding problem.

ARCHANGEL currently does **not** have an official Amazon-wide application catalog API.

Therefore the system uses:

`curated-verified-cache`

and explicitly exposes:

`amazonAppstoreApi.status = not_available`

This led to the documented Amazon Appstore Catalog API feature request.

The same principle now applies to subscriptions:

- ARCHANGEL can identify a subscription monetization signal.
- ARCHANGEL cannot currently claim that the subscription is ad-free.
- ARCHANGEL cannot claim arbitrary third-party subscription entitlement access.
- Future Amazon integration must be official and authenticated.

---

# 4. Visual evidence policy

The friction log intentionally does **not** fabricate screenshots.

Evidence currently available from the development history includes:

- React Native **“Unable to load script”** error screen.
- Fire TV/Android TV emulator navigation screenshots/videos.
- Discover button focus-state screenshots.
- AdLens `Cannot GET /adlens/prime-video` emulator error.
- AdLens focused `← ADLENS` contrast issue.
- PowerShell/Gradle/ADB diagnostic output.

Most of these were shown during development conversations but are **not currently stored as image files in the repository**.

For future entries, visual evidence should preferably be stored as:

`docs/evidence/YYYY-MM-DD/<short-name>.png`

and referenced directly from this log.

Example:

`![AdLens route error](./evidence/2026-10-03/adlens-route-error.png)`

---

# 5. Current friction-to-feature evolution

A useful pattern from the project is that several friction points directly produced product improvements.

| Friction | Product/engineering improvement |
|---|---|
| Missing Amazon-wide catalog | Official Appstore Catalog API feature request |
| Missing app discovered by AI | Request Network integration |
| TV focus styling unreliable | Explicit TV focus-state architecture |
| Home lower options not visible | Focus-aware scrolling |
| Ad data incomplete | UNKNOWN signal instead of fabricated rating |
| Subscription does not imply ad-free | Explicit Subscription Signal |
| System ads cannot be controlled | Clear AdLens system-ad boundary |
| Detail route unavailable in running API | Backend route verification/restart workflow |
| Small static AdLens list | Focusable profiles + detail pages + filters |

---

# 6. Current state

### Completed

- Fire TV/Android TV React Native foundation
- Light/red ARCHANGEL visual system
- Home screen
- TV focusable navigation
- App Discovery
- AI App Discovery
- Missing-app detection
- Alternatives
- App Details
- Request Network
- Demand aggregation
- Pulse foundation
- AdLens overview
- AdLens app profiles
- AdLens detail pages
- AdLens filters
- Subscription signal
- Amazon Appstore API feature request
- MIT license
- Project architecture/documentation

### Active development

**AdLens**

Next planned increments:

1. Evidence/source panel
2. “Why this signal?” explanation
3. Verification metadata presentation
4. Historical ad/monetization changes
5. Better profile filtering and focus navigation
6. Subscription Intelligence

### Future platform requests

1. **Amazon Appstore application catalog API**
2. **Amazon subscription / entitlement integration**, including official discovery of ad-free subscription options where exposed

---

# 7. Friction log operating rule

Every significant friction from this point onward should record:

`Timestamp → Expected → Actual → Friction → Evidence → Root cause → Solution → Time taken`

This log is intended to document not only bugs, but also **product-discovery friction**: situations where the original assumption about Fire TV, Amazon APIs, TV navigation, or user behaviour turned out to be incorrect.

---

## Last updated

**2026-10-04 — AdLens development phase**
