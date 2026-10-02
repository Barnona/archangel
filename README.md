# ARCHANGEL

Intelligence layer for Fire TV. Hackathon build, original code.

## Current catalog architecture

ARCHANGEL deliberately separates **catalog ingestion** from **discovery intelligence**.

Current state:
- `shared/src/catalog.seed.json` is a small curated, verified cache for the working demo.
- `/catalog/status` exposes catalog source, version, coverage, and counts.
- Discovery ranks only records that ARCHANGEL currently knows.
- No part of the app claims that this cache is the complete Amazon Appstore.

Future state:
- Add an authorized Amazon Appstore catalog provider behind the same normalized `AppProfile` model.
- Keep discovery, alternatives, demand analytics, and the Fire TV UI unchanged.
- Prefer an official Amazon API/feed if Amazon makes one available to developers.
- Do not scrape or reverse-engineer private Appstore endpoints.

## Windows setup (project on D:, IDEs on C:)

1. Put this folder at `D:\\archangel` (keep the path short).
2. Install Node.js LTS, JDK 17, Android Studio (SDK + an Android TV emulator image).
3. Optional, to keep caches off C: (set as user environment variables):
   - `GRADLE_USER_HOME=D:\\gradle`
   - `ANDROID_AVD_HOME=D:\\android-avd`
   - `npm config set cache D:\\npm-cache`
4. In `D:\\archangel` run `git init`, then `npm install`.
5. Start the API: `npm run api`.

## Test the API

    curl "http://localhost:4000/health"
    curl "http://localhost:4000/catalog/status"
    curl "http://localhost:4000/apps/categories"
    curl "http://localhost:4000/apps?q=stream"
    curl -X POST http://localhost:4000/requests -H "Content-Type: application/json" -d "{\"appName\":\"Some App\"}"
    curl http://localhost:4000/requests/demand
