# ARCHANGEL Fire TV client

This directory contains the Fire TV UI source for ARCHANGEL. It is an original implementation and does not copy Amazon sample repositories.

## Development

The source is designed for `react-native-tvos`. Create/configure the native Android project using the matching React Native TV toolchain, then use these `src/` files as the application layer.

Start the API from the repository root:

```bash
npm install
npm run api
```

For an Android emulator, `src/config.ts` uses `10.0.2.2`. For a physical Fire TV, replace that value with the Windows PC's LAN IP and ensure port 4000 is reachable on the local network.
