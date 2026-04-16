---
name: Offline Capabilities
description: IndexedDB cache for photos, ID mapping for offline ponto/vehicle, retry with backoff, Background Sync
type: feature
---
## Architecture

### ID Mapping (local → server)
- When ponto_in or vehicle_checkout is created offline, a `_local_id` field is added to the operation data
- On sync, the server-generated ID is mapped: `{ localId → serverId }` stored in localStorage (`engemase_local_to_server_ids`)
- Dependent operations (ponto_out, vehicle_checkin) resolve the real ID from this map before executing UPDATE
- Map is cleared after full successful sync

### Photo Storage
- ALL offline photos (vehicles, ponto, tools) are stored in IndexedDB via `useOfflinePhotos`
- localStorage JSON operations only contain metadata — no base64 photo data
- Photos are uploaded during sync via `syncGenericPhotos` (ponto/tools) and `syncPhotosForOperation` (vehicles)

### Retry with Error Categorization
- `PendingOperation` has `retryCount`, `lastError`, `permanent_failure` fields
- Recoverable errors (network, 5xx, 429): retry up to 5 times with exponential backoff (2s→30s)
- Permanent errors (400, 404, 409, 422): moved to `failedOperations` shown in OfflineIndicator with dismiss option
- `isSyncing` ref prevents concurrent sync runs

### Background Sync
- SW listens for `sync` event with tag `sync-pending`
- On trigger, SW sends `TRIGGER_SYNC` message to all clients
- main.tsx relays as `sw-trigger-sync` CustomEvent, OfflineContext listens and triggers sync
- Fallback: `online` event listener still works for browsers without Background Sync API

### Cache Age Display
- `useOfflineStorage` exposes `savedAt` timestamp and `getAgeLabel()` helper
- Returns human-readable labels: "Agora mesmo", "5 min atrás", "3h atrás", "2d atrás"

### addPendingOperation Return Value
- Now returns the operation ID (string) so callers can use it for IndexedDB photo association
