# ARCHANGEL architecture (scaffold stage)

- `shared/`   data models + seed catalog (placeholder entries - replace with verified data)
- `backend/`  Express API: GET /apps, GET /apps/:id, POST /requests, GET /requests/demand
- `fire-os/`  React Native TV app (generated with react-native-tvos, then src/ copied in)
- `vega/`     not started - Vega tools need macOS or Ubuntu

Rule: every device-level feature must be verified on the target platform before it is claimed in the demo.
