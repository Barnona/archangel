# ARCHANGEL Fire TV client

This directory contains the Fire TV UI source for ARCHANGEL. It is an original implementation and does not copy Amazon sample repositories.

## Development

The source is designed for `react-native-tvos`. Create/configure the native Android project using the matching React Native TV toolchain, then use these `src/` files as the application layer.

Start the API from the repository root:

```bash
npm install
npm run api
```

The API listens on `0.0.0.0:4000` so a physical Fire TV can reach the Windows development machine over the LAN.

### Emulator

`src/config.ts` defaults to:

```text
http://10.0.2.2:4000
```

### Physical Fire TV

1. Find the Windows PC LAN IPv4 address with `ipconfig`.
2. Change `API_BASE` in `src/config.ts` to that address, e.g. `http://192.168.1.20:4000`.
3. Keep the Fire TV and Windows PC on the same network.
4. Allow Node.js/port 4000 through Windows Firewall if prompted.
5. Verify from another device on the same LAN that `http://<PC-IP>:4000/health` returns `{"ok":true}`.

Do not expose port 4000 to the public internet. This development API has no authentication.
