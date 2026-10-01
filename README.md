# ARCHANGEL

Intelligence layer for Fire TV. Hackathon build, original code.

## Windows setup (project on D:, IDEs on C:)

1. Put this folder at `D:\archangel` (keep the path short).
2. Install Node.js LTS, JDK 17, Android Studio (SDK + an Android TV emulator image).
3. Optional, to keep caches off C: (set as user environment variables):
   - `GRADLE_USER_HOME=D:\gradle`
   - `ANDROID_AVD_HOME=D:\android-avd`
   - `npm config set cache D:\npm-cache`
4. In `D:\archangel` run `git init`, then `npm install`.
5. Start the API: `npm run api` (http://localhost:4000/health should return `{"ok":true}`).

## Create the Fire OS app (react-native-tvos)

The `fire-os/src` files here are plain React Native and are meant to be dropped into a
project generated from the react-native-tvos template. Check the current template command in
the react-native-tvos README (github.com/react-native-tvos/react-native-tvos), then, from `D:\archangel`:

1. Generate the project into a temporary folder, e.g. `D:\archangel\fire-os-gen`.
2. Move its contents into `fire-os/` (keep `fire-os/src` from this scaffold).
3. Point the app entry (`index.js`) at `src/App.tsx`.
4. Start the emulator, then from `fire-os/` run Metro and the Android build per the template README.

## Test the API

    curl "http://localhost:4000/apps?q=stream"
    curl -X POST http://localhost:4000/requests -H "Content-Type: application/json" -d "{\"appName\":\"Some App\"}"
    curl http://localhost:4000/requests/demand
