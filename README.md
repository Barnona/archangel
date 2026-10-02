# ARCHANGEL

**The Intelligent Layer for Fire TV**

ARCHANGEL is a Fire TV intelligence and discovery application that connects viewers, applications, developers, and device-level experience signals through one interface.

The project is being developed for the **Amazon Developer Build, Ship, Shape — Fire TV track**.

> **Status:** Working prototype — App Discovery finalized; AdLens, Pulse, and Sideload Sentinel are the next development modules.

---

## Core idea

ARCHANGEL is designed as an intelligence layer rather than a replacement for Fire TV system software.

- **App Discovery Intelligence** — natural-language application discovery, ranking, alternatives, and missing-app requests.
- **App Request Network** — converts missing-app requests into aggregated developer-demand signals.
- **AdLens** — planned monetization/ad-experience intelligence; it will not claim system-wide ad-blocking privileges.
- **Pulse** — planned Fire TV experience diagnostics.
- **Sideload Sentinel** — planned APK/package readiness and compatibility analysis for legitimate development/testing.
- **ARCHANGEL Concierge** — the AI layer that interprets natural-language requests and connects them to the verified catalog.

---

## Architecture

```text
                         ┌─────────────────────────┐
                         │        FIRE TV          │
                         │   React Native TV UI    │
                         └────────────┬────────────┘
                                      │ HTTP/JSON
                                      ▼
                         ┌─────────────────────────┐
                         │      ARCHANGEL API      │
                         │       Express.js        │
                         ├─────────────────────────┤
                         │ Catalog / Discovery     │
                         │ AI Concierge            │
                         │ App Requests            │
                         │ Demand Aggregation      │
                         └───────┬─────────┬───────┘
                                 │         │
                    ┌────────────┘         └──────────────┐
                    ▼                                     ▼
          ┌───────────────────┐                 ┌──────────────────┐
          │ Catalog / Shared   │                 │ AI Providers     │
          │ AppProfile models  │                 │ Gemini / Bedrock │
          │ catalog.seed.json  │                 └──────────────────┘
          └───────────────────┘
```

### Repository structure

```text
archangel/
│
├── backend/
│   ├── server.js                 # Express API
│   ├── ai.js                     # AI provider selection
│   ├── providers/
│   │   ├── gemini.js             # Gemini/Gemma discovery
│   │   └── bedrock.js            # Amazon Bedrock discovery
│   ├── data/requests.json        # Local app-request persistence
│   └── .env.example
│
├── fire-os/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── lib/api.ts            # API client
│   │   ├── components/           # TV-focused reusable UI
│   │   └── screens/              # Home, Discover, Requests, Pulse, etc.
│   ├── android/                  # Android/Fire TV build project
│   └── package.json
│
├── shared/
│   └── src/
│       ├── types.ts              # Shared TypeScript models
│       └── catalog.seed.json     # Curated verified demo catalog
│
├── docs/
│   ├── ARCHITECTURE.md
│   └── AMAZON_APPSTORE_API_FEATURE_REQUEST.md
│
├── package.json
├── LICENSE
└── README.md
```

---

## App Discovery architecture

```text
User request
    │
    ▼
Normalize input
    │
    ├── Direct catalog match ──► SPECIFIC_APP
    │                              │
    │                              ▼
    │                         Open app profile
    │
    └── No direct match
           │
           ▼
       AI intent analysis
           │
     ┌─────┼──────────┬───────────┐
     ▼     ▼          ▼           ▼
 CAPABILITY CONTENT MISSING_APP AMBIGUOUS
     │     │          │
     └─────┴──────────┴──────────────►
                  │
                  ▼
          Verified alternatives
                  │
                  ▼
        Request missing application
```

The AI is constrained by the catalog:

1. It cannot invent an application ID.
2. Exact matches are validated against Fire OS catalog records.
3. Alternatives are filtered against the catalog.
4. Generic phrases such as `some movies` or `music` are not converted into fake application names.
5. A named application absent from the current catalog becomes a **MISSING_APP** request.
6. AI confidence is constrained to the `0–1` range and displayed as a percentage.

---

## Catalog architecture

ARCHANGEL deliberately separates **catalog ingestion** from **discovery intelligence**.

```text
curated-verified-cache
        │
        ▼
catalog.seed.json
        │
        ▼
normalized AppProfile
        │
        ├── Search
        ├── AI discovery
        ├── Alternatives
        └── App requests
```

The current catalog is a **small verified demo cache**, not a claim of complete Amazon Appstore coverage.

The API exposes catalog metadata through `GET /catalog/status`.

If Amazon provides an authorized Appstore-wide application catalog API/feed in the future, it can be added as another ingestion provider while keeping the normalized `AppProfile` model and downstream discovery system intact.

ARCHANGEL does **not** scrape, reverse-engineer, or bypass private Amazon Appstore endpoints.

---

## AI architecture

The backend supports two selectable providers.

### Gemini / Gemma

```env
AI_PROVIDER=gemini
GEMINI_MODEL=gemma-4-31b-it
GEMINI_FALLBACK_MODEL=gemma-4-26b-a4b-it
```

The primary model is attempted first. If it fails, the configured fallback model is attempted.

### Amazon Bedrock

```env
AI_PROVIDER=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
AWS_BEARER_TOKEN_BEDROCK=
```

Provider selection is isolated in `backend/ai.js`, so the Fire TV client does not need to know which AI provider is active.

---

## Development environment

The current working development environment is Windows.

### Required

- Node.js **20+**
- npm
- JDK **17**
- Android Studio
- Android SDK / platform tools
- Android TV emulator or a Fire TV device
- Git

Amazon documents React Native support for Fire TV and Android Studio/Android TV emulator development.

### Recommended Windows paths

```text
D:\archangel
D:\gradle
D:\android-avd
D:\npm-cache
```

Optional cache configuration:

```powershell
setx GRADLE_USER_HOME D:\gradle
setx ANDROID_AVD_HOME D:\android-avd
npm config set cache D:\npm-cache
```

---

## Installation

```bash
git clone https://github.com/Barnona/archangel.git
cd archangel
npm install
cd fire-os
npm install
cd ..
```

Create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

For Gemini/Gemma, add the API key to `backend/.env`.

Do not commit `.env` or API keys.

---

## Running the backend

From the repository root:

```bash
npm run api
```

The API listens on `http://localhost:4000` and binds to `0.0.0.0` for LAN development.

---

## Running the Fire TV app

Start Metro in a separate terminal:

```powershell
cd D:\archangel\fire-os
npm start
```

For the Android TV emulator, `fire-os/src/config.ts` uses `http://10.0.2.2:4000` to reach the Windows host.

Start the emulator from Android Studio or:

```powershell
emulator -avd Television_1080p
adb devices
```

Build the debug APK:

```powershell
cd D:\archangel\fire-os\android
.\gradlew.bat app:assembleDebug
```

Install it:

```powershell
adb install -r "D:\archangel\fire-os\android\app\build\outputs\apk\debug\app-debug.apk"
```

Launch it:

```powershell
adb shell monkey -p com.archangelnative 1
```

Amazon documents ADB as a development/testing mechanism for installing and running Fire TV applications.

---

## Physical Fire TV workflow

1. Start the backend.
2. Start Metro if using a development bundle.
3. Find the Windows PC LAN IP.
4. Change `fire-os/src/config.ts` from `http://10.0.2.2:4000` to `http://<WINDOWS-PC-LAN-IP>:4000`.
5. Connect the Fire TV through ADB.
6. Verify with `adb devices -l`.
7. Build and install the debug APK.
8. Launch ARCHANGEL.

For production, replace the local HTTP endpoint with an authenticated HTTPS service.

---

## API testing workflow

With the backend running:

### Health
```powershell
curl http://localhost:4000/health
```

### Catalog status
```powershell
curl http://localhost:4000/catalog/status
```

### Categories
```powershell
curl http://localhost:4000/apps/categories
```

### Standard discovery
```powershell
curl "http://localhost:4000/apps/discover?q=movies"
```

### AI discovery
```powershell
curl -X POST http://localhost:4000/ai/app-discovery -H "Content-Type: application/json" -d '{"request":"I want to watch Netflix"}'
```

Expected:

`Netflix` → **SPECIFIC_APP** → `exactMatch = netflix`

Missing application test:

```powershell
curl -X POST http://localhost:4000/ai/app-discovery -H "Content-Type: application/json" -d '{"request":"I want to watch Crunchyroll"}'
```

Expected: **MISSING_APP** followed by the request flow.

Generic request test:

```powershell
curl -X POST http://localhost:4000/ai/app-discovery -H "Content-Type: application/json" -d '{"request":"I want to watch some movies"}'
```

Expected: **CONTENT/CAPABILITY** behavior with no fake application name.

### App request
```powershell
curl -X POST http://localhost:4000/requests -H "Content-Type: application/json" -d '{"appName":"Crunchyroll","note":"Requested through ARCHANGEL"}'
```

### Demand aggregation
```powershell
curl http://localhost:4000/requests/demand
```

---

## End-to-end testing checklist

### Backend
- [ ] `/health` returns `ok: true`
- [ ] Catalog status loads
- [ ] Catalog search works
- [ ] Category filtering works
- [ ] AI status identifies the active provider
- [ ] Specific application requests resolve correctly
- [ ] Missing applications create request signals
- [ ] Generic requests do not create fake app names
- [ ] Alternatives exist only in the verified catalog

### Fire TV UI
- [ ] Home screen loads
- [ ] D-pad focus works
- [ ] Search works
- [ ] Category filters work
- [ ] ASK ARCHANGEL works
- [ ] AI result panel opens/closes
- [ ] Exact app opens its profile
- [ ] Missing app can be requested
- [ ] Alternative app profiles open
- [ ] Request Network works
- [ ] Back navigation works
- [ ] No Metro/API connection errors

### Build
- [ ] Debug APK builds successfully
- [ ] APK installs through ADB
- [ ] App launches from the TV launcher
- [ ] API connection works from the target environment
- [ ] No secrets are included in the repository

---

## Current module status

| Module | Status |
|---|---|
| Fire TV shell | Working |
| Light/red TV UI | Working |
| App catalog | Working |
| Standard app search | Working |
| AI App Discovery | **Finalized** |
| App alternatives | Working |
| Missing App requests | Working |
| Demand aggregation | Working |
| AdLens | Next |
| Pulse | Planned |
| Sideload Sentinel | Planned |
| Concierge integration | Planned |
| Vega OS client | Not started |

---

## Design boundaries

ARCHANGEL is an application-layer intelligence system. It does not currently claim privileged control over Fire TV system processes, system-owned remote buttons, protected system state, system-wide advertising controls, unauthorized APK installation, or security/Appstore restrictions.

Diagnostics and ad intelligence will therefore be implemented around capabilities legitimately available to an application.

---

## Roadmap

```text
                    ARCHANGEL
                        │
             ┌──────────┴──────────┐
             │                     │
        CONCIERGE AI          FIRE TV INTELLIGENCE
             │                     │
      ┌──────┼──────┐       ┌──────┼────────┐
      │      │      │       │      │        │
   DISCOVER ADLENS REQUEST  PULSE SIDELOAD
      │      │      │       │      │        │
      ▼      ▼      ▼       ▼      ▼        ▼
    Apps    Ads   Demand   Health  APK   Compatibility
```

**Next development phase: AdLens.**

---

## License

ARCHANGEL is released under the **MIT License**. See [LICENSE](LICENSE).

The MIT license permits use, modification, distribution, and private/commercial use subject to its conditions, including preservation of the copyright notice.