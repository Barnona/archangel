# ARCHANGEL architecture

- `shared/`   data models + normalized catalog records
- `backend/`  Express API: catalog status, discovery intelligence, app requests, demand aggregation
- `fire-os/`  React Native TV app
- `vega/`     not started - Vega tools need macOS or Ubuntu

## Catalog Engine v1

```
Source
  ↓
Catalog ingestion / verification
  ↓
Normalized AppProfile
  ↓
ARCHANGEL Catalog Store
  ↓
Discovery / Alternatives / Requests
  ↓
Fire TV UI
```

### Current source

`curated-verified-cache` is the current demo source. It is intentionally small and is not presented as the full Amazon Appstore.

### Future Amazon integration

Amazon's public developer documentation currently exposes Appstore SDKs and Fire TV content/discovery integrations, but this project does not rely on an undocumented Appstore-wide application enumeration endpoint.

If Amazon provides an authorized application catalog API/feed in the future, add it as a new ingestion provider and normalize its records into `AppProfile`. The downstream UI and ranking system should not need to change.

### Platform rule

Every device-level capability must be verified on the target platform before it is claimed in the demo.
