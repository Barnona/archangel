# ARCHANGEL Friction Log

## Metadata

| Field | Value |
|---|---|
| Project | ARCHANGEL — The Intelligence Layer for Fire TV |
| Repository | `Barnona/archangel` |
| Log file | `docs/FRICTION_LOG.md` |
| Started | 2026-09 (development history captured from the project work) |
| Log updated | 2026-10-04 6:18 PM (IST) |
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

| Timestamp / period | Area | Expected | What actually happened | Friction | Evidence | How it was solved | Time taken to solve |
|---|---|---|---|---|---|---|---|
| 2026-09-28 7:23 AM (IST) | Android/React Native TV setup | Fire TV React Native project should build on Windows | Native Android/TV project required additional configuration and compatibility work | Fire TV/TV React Native setup is more constrained than ordinary Android React Native | | Generated a standard RN Android project, adapted it for `react-native-tvos`, added TV manifest declarations, banner, launcher configuration and Fire TV-specific setup | 25 minutes |
| 2026-09-28 7:25 PM (IST) | Android emulator | `adb` and `emulator` commands should be available | ADB was available but `emulator` was initially not on PATH | Android SDK command-line tools were only partially available from PowerShell | `emulator: The term 'emulator' is not recognized as a name of a cmdlet, function, script file, or executable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.` | Corrected Android SDK/emulator PATH configuration and created/started an Android 12 API 31 x86_64 AVD | 10 minutes |
| 2026-09-28 7:40 PM (IST) | Java / Gradle | Gradle should build with installed Java | Java 25 caused an incompatible class-file/major-version failure | Android/Gradle toolchain was using a newer JDK than the project supported | `Starting a Gradle Daemon (subsequent builds will be faster) FAILURE: Build failed with an exception. What went wrong: BUG! exception in phase 'semantic analysis' in source unit 'BuildScript' Unsupported class file major version 69` | Located Adoptium JDK 17 and configured Gradle/Java environment to use it | 20 minutes |
| 2026-09-28 7:52 PM (IST) | Native build | Debug APK should build | First full native build took a long time but eventually succeeded | Large React Native/Gradle dependency graph and native compilation | `BUILD SUCCESSFUL in 1h 27m 27s 58 actionable tasks: 58 executed` | Completed `app:assembleDebug`; successful build produced the debug APK | 1h 27m 27s |
| 2026-09-28 9:07 PM (IST)| App launch | Installed APK should start ARCHANGEL | App launched but initially required the development JavaScript bundle | React Native TV app was not using a packaged JS bundle during development | ![Error Evidence](./Evidence-Screenshot/Evidence_AppLaunch.png) | Started Metro, verified port 8081, used ADB reverse for the emulator, and relaunched the application | 1 hour |
| 2026-09-29 7:33 AM (IST) | Backend | `npm run api` should start the API | Backend failed because `express` was missing | Backend dependency installation was incomplete | ![Error Evidence](./Evidence-Screenshot/Evidence_BackendError.png) | Restored backend dependencies and added the required Express package to the backend dependency set | 20 minutes |
| 2026-09-29 8:02 PM (IST) | Backend | API should start once | Server had duplicate `app.listen` behaviour | Duplicate server-start code caused backend startup problems | `app.listen(PORT, HOST, () => { app.listen(PORT, HOST, () => {` | Removed duplicate listener; server now listens once on port 4000 | 3 minutes |
| 2026-09-29 8:20 PM (IST) | App Details | Selecting an app should load its details | App Details initially failed against the API | Frontend/backend response contract did not yet match the expected detail structure | ![Error Evidence](./Evidence-Screenshot/Evidence_AppDetailsError.png) | Corrected the App Details backend response and frontend handling | 47 minutes |
| 2026-10-01 7:56 PM (IST) | Request Network | Submitting an app request should create a valid request | Generic request handling initially failed for some input paths | Request input normalization/validation was incomplete | ![Error Evidence](./Evidence-Screenshot/Evidence_RequestError.png) | Normalized request parsing and fixed the generic request path | 52 minutes |
| 2026-10-01 9:01 PM (IST) | Home TV navigation | Moving focus to lower Home options should scroll the screen | Lower options could receive focus without the page moving sufficiently | TV focus navigation and ordinary mobile-style layout were not enough for the full Home content | ![Error Evidence](./Evidence-Screenshot/Evidence_HomeTV.png) | Converted Home to a focus-aware `ScrollView` with `scrollsChildToFocus`; kept the footer inside scrollable content | 17 minutes |
| 2026-10-02 7:16 AM (IST) | AdLens | AdLens should appear as a real Fire TV module | Initial AdLens implementation only existed as the basic module/screen | No app-level evidence/detail flow yet | ![Evidence](./Evidence-Screenshot/Evidence_AdLensInit.png) | Added AdLens to Home and implemented the first profile list and system-ad boundary messaging | 1 day |
| 2026-10-03 7:05 AM (IST) | Discover TV focus | SEARCH / ASK ARCHANGEL / REQUEST APP should become black when focused | React Native TV `Pressable` focus styling did not reliably produce the requested visual state | TV focus state was not behaving consistently through the style callback | | Replaced implicit focus styling with explicit `onFocus` / `onBlur` React state | 34 minutes |
| 2026-10-03 7:37 PM (IST) | Discover TV focus | Final focused buttons should have black background and readable text | Earlier implementation changed the background but visual result still did not match | Focus styling was being applied inconsistently | | Added explicit focus state and consolidated the button styles; later removed duplicate `requestFocused` state | 23 minutes |
| 2026-10-03 8:18 PM (IST) | Git synchronization | Local project should pull the latest GitHub changes | `git pull` aborted because local `DiscoverScreen.tsx` changes would be overwritten | Local working tree differed from remote | `error: Your local changes to the following files would be overwritten by merge: fire-os/src/screens/DiscoverScreen.tsx Please commit your changes or stash them before you merge. Aborting Updating files: 100% (33/33), done. Merge with strategy ort failed.` | Identified the conflicting file; recommended preserving or restoring the local change before pulling instead of using `git reset --hard` | 14 minutes |
| 2026-10-03 8:33 PM (IST) | AdLens detail | Selecting an AdLens profile should open an app-specific detail page | Emulator showed `Cannot GET /adlens/prime-video` | Frontend had been updated before the running backend process had loaded the new Express route | ![Error Evidence](./Evidence-Screenshot/Evidence_AdDetailError.png) | Added/verified `GET /adlens/:appId`, API client method, navigation state and detail screen; backend must be restarted after route changes | 15 minutes |
| 2026-10-03 8:56 PM (IST) | AdLens detail navigation | AdLens profile cards should be selectable with the TV remote | Profiles were initially informational/non-focusable | TV application needs explicit focus targets |  | Converted profile cards to focusable `Pressable` controls and connected them to the detail route | 5 minutes |
| 2026-10-03 9:04 PM (IST) | AdLens Back control | Focused `← ADLENS` button should have black background with readable white text | Background changed to black but the text remained black | Focused text color was not tied to the same explicit TV focus state | ![Error Evidence](./Evidence-Screenshot/Evidence_AdLensBackError.png) | Added explicit back-button focus state using `onFocus` / `onBlur` and switched focused text to white | 7 minutes |
| 2026-10-03 9:12 PM (IST) | AdLens filtering | Users should be able to inspect advertising states without an arbitrary score | All profiles were shown together | Evidence states needed a clearer way to inspect the catalog | ![Evidence](./Evidence-Screenshot/Evidence_AdLensFilter.png) | Added filters: ALL, AD-SUPPORTED, NO KNOWN ADS, UNKNOWN | 20 minutes |
| 2026-10-03 9:12 PM (IST) | AdLens filter focus | Focused filter should remain readable | Focused filter could become dark-on-dark depending on active/focused combination | Focus and selection were two separate visual states | ![Error Evidence](./Evidence-Screenshot/Evidence_AdLensFilterUI.png) | Added focused text contrast handling | 20 minutes |
| 2026-10-03 9:33 PM (IST) | AdLens subscriptions | Subscription-based apps should expose relevant monetization context | Subscription was only represented as a monetization field | A subscription does not necessarily mean an ad-free tier | ![Evidence](./Evidence-Screenshot/Evidence_AdLensSubs.png) | Added a **SUBSCRIPTION SIGNAL** section explicitly stating that ARCHANGEL does not currently verify whether a subscription tier removes advertising | 25 minutes |
| 2026-10-04 11:58 AM (IST) | AdLens detail | Add AdLens evidence panel | Showing generated detail of evidence and verification and why this signal? | This separates what ARCHANGEL knows from how ARCHANGEL interprets the signal | ![Evidence](./Evidence-Screenshot/Evidence_AdLensEvid.png) | Added a panel for `curated-verified-cache` | 11 minutes |
| 2026-10-04 12:10 PM (IST) | AdLens verification date | Verification metadata should reflect the current catalog verification cycle | Existing profiles still displayed 2026-10-01 after the verification cycle was moved to 2026-10-04 | Catalog lastVerified values were stale relative to the new verification date | ![Evidence](./Evidence-Screenshot/Evidence_AdLensVerif.png) | Updated all catalog lastVerified values from 2026-10-01 to 2026-10-04; AdLens evidence now reports the updated date | 3 minutes |
| 2026-10-04 2:40 PM (IST) | ARCHANGEL Metro / Android TV runtime | Existing debug APK should load its JavaScript bundle from the running Metro server | App initially showed "Unable to load script" even though Metro was running | Root cause investigation established that the development runtime needed Metro connectivity verification; Metro itself was healthy, ADB reverse was active, the emulator was connected, and the APK was confirmed debuggable. The app recovered after restarting/relaunching the development runtime | ![Error Evidence](./Evidence-Screenshot/Evidence_LoadError.png) | Restarted Metro/app development runtime and verified the emulator-to-Metro path; ARCHANGEL loaded successfully again | 20 minutes |
| 2026-10-04 3:10 PM (IST) | AdLens Subscription Intelligence | Subscription apps should expose monetization context without implying that a subscription is automatically ad-free | The first UI only showed a generic subscription signal and could not distinguish a detected subscription model from verified ad-free-tier information | Subscription model data alone is insufficient evidence for an ad-free claim; the current catalog has no authoritative subscription-offer or entitlement source |  | Added explicit SubscriptionIntelligence fields for model, ad-free tier status, offer status, verification and evidence; exposed them through the backend and replaced the generic UI signal with a structured Subscription Intelligence panel | 12 minutes |
| 2026-10-04 3:25 PM (IST) | AdLens Subscription Intelligence filtering & presentation | Users should be able to inspect subscription-based apps directly from the main AdLens screen and distinguish subscription status from ad-free verification | Subscription intelligence existed only inside individual app detail pages, requiring users to open profiles one by one | The overview exposed advertising-state filters but had no subscription-oriented navigation, summary metric, or visible distinction between subscription and ad-free verification | ![Evidence](./Evidence-Screenshot/Evidence_AdLensSubFil.png) | Added a SUBSCRIPTION APPS metric, SUBSCRIPTION filter, and subscription/ad-free status indicators to AdLens profile rows; preserved UNKNOWN when no authoritative ad-free evidence exists | 8 minutes |
| 2026-10-04 7:30 PM (IST) | AdLens historical monetization intelligence | Current AdLens state should remain distinguishable from historical evidence and change tracking | There was no persistent snapshot model or timeline, so ARCHANGEL could show the current signal but not explain what changed over time | Historical claims require stored snapshots; catalog changes must not be presented as app monetization changes without evidence | ![Evidence](./Evidence-Screenshot/Evidence_AdLensMonit.png) | Added persistent monetization snapshots, change detection labelled as DATA SIGNAL CHANGED, a history API, and an initial-baseline timeline that does not fabricate prior history | 5 minutes |

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

This led to the documented feature request for the Amazon Appstore Catalog API.

The same principle now applies to subscriptions:

- ARCHANGEL can identify a subscription monetization signal.
- ARCHANGEL cannot currently claim that the subscription is ad-free.
- ARCHANGEL cannot claim arbitrary third-party subscription entitlement access.
- Future Amazon integration must be official and authenticated.

---

# 4. Current friction-to-feature evolution

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

# 5. Current state

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

1. Historical ad/monetization changes
2. Better profile filtering and focus navigation
3. Subscription Intelligence
4. Historical ad/monetization changes
5. Better profile filtering and focus navigation
6. Subscription Intelligence

### Future platform requests

1. **Amazon Appstore application catalog API**
2. **Amazon subscription / entitlement integration**, including official discovery of ad-free subscription options where exposed

---

# 6. Friction log operating rule

Every significant friction from this point onward should record:

`Timestamp → Expected → Actual → Friction → Evidence → Root cause → Solution → Time taken`

This log is intended to document not only bugs but also **product-discovery friction**: situations where the original assumptions about Fire TV, Amazon APIs, TV navigation, or user behaviour proved incorrect.

---

## Last updated

**2026-10-04 — AdLens Evidence, Verification, Runtime Recovery, Subscription Intelligence & Historical Monetization phase**
