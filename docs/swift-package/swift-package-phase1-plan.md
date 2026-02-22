# Swift Package Phase 1.1/1.2 Plan (Integration Ergonomics + Endpoint Persistence)

> Last updated: 2026-02-21

This plan extends the shipped Phase 1 baseline to reduce integration effort in iOS apps, especially Moya-based apps.

---

## 1. Phase 1.1 Goal

Deliver a Swift SDK update where host apps no longer need to implement:

1. A custom shared logger center.
2. Manual request start-time tracking dictionaries.
3. Their own Moya plugin.

At the same time, keep Moya as an optional dependency and preserve the existing core API compatibility.

## 1.1 Phase 1.2 Goal

Deliver a follow-up SDK update where host apps no longer need to persist DevSee server endpoint state themselves:

1. SDK remembers the last successful connection endpoint (IP + port).
2. SDK restores that endpoint automatically when app restarts.
3. SDK still falls back safely to configured/default URL when remembered value is unavailable or invalid.

---

## 2. Problems Found in Real Integration

1. App code must define and maintain `DevSeeLoggerCenter` itself.
2. App code tracks `startedAt` manually using request-key maps, which is complex and can mismatch for concurrent identical requests.
3. Moya plugin logic is copied per app.
4. `requestBody` is passed redundantly even though body is often present in `URLRequest`.
5. Connection deep-link endpoint is currently process-memory only, so restart loses the last connected server IP/port.

---

## 3. Scope (Phase 1.1)

1. Add `DevSeeLoggerCenter` to the core package.
2. Add package-owned request lifecycle tracking:
   1. `beginRequest(...) -> DevSeeRequestToken`
   2. `logCompleted(token:...)`
3. Add request body fallback behavior:
   1. use explicit `requestBody` if provided.
   2. otherwise use `request.httpBody`.
4. Ship `DevSeeLoggerMoyaPlugin` as first-party adapter.
5. Keep Moya dependency outside the core package.
6. Update README/docs for one-screen integration flow.

## 3.1 Scope (Phase 1.2)

1. Add persisted endpoint store in core package (default backed by `UserDefaults`).
2. Persist endpoint on successful `handleURL(_:)` connection.
3. Restore endpoint during `DevSeeLoggerCenter` bootstrap (`shared` and `configure` path).
4. Apply precedence:
   1. remembered endpoint (if valid)
   2. explicitly configured `serverURL`
   3. package default URL (`http://127.0.0.1:9090`)
5. Keep persistence resilient:
   1. ignore malformed stored values
   2. avoid crashes/throws on read/write failures
6. Update docs to communicate restart behavior clearly.

---

## 4. Out of Scope (Phase 1.1)

1. Full automatic interception (`URLProtocol`, swizzling).
2. Offline queue/retry system.
3. Bonjour or dynamic server discovery changes.
4. Advanced metrics/redirect-chain capture.
5. Non-Moya adapters (Alamofire, gRPC) in the same milestone.
6. Endpoint profile switching UI or multiple remembered endpoints.
7. Cross-device endpoint sync.

---

## 5. Packaging Strategy

1. Core package/product: `DevSeeLogger` (no Moya dependency).
2. Adapter package/product: `DevSeeLoggerMoya` (depends on `DevSeeLogger` + `Moya`).
3. Consumers choose adapter package only when needed.

This keeps binary size and dependency graph clean for non-Moya users.

---

## 6. Implementation Steps

## Step 1: Core API additions (non-breaking)

1. Add `DevSeeLoggerCenter`:
   1. `configure(_:)`
   2. `shared`
   3. `handleURL(_:)`
2. Add `DevSeeRequestToken`.
3. Add request lifecycle APIs to `DevSeeLogger`:
   1. `beginRequest(...)`
   2. `logCompleted(token:...)`
4. Keep existing `log(...)` for backward compatibility.

## Step 2: Request body fallback

1. Update event mapping to resolve request body by precedence:
   1. explicit `requestBody`
   2. `request.httpBody`
   3. `nil`
2. Add tests for all precedence branches.

## Step 3: Moya adapter package

1. Create `DevSeeLoggerMoya` package/product.
2. Add `DevSeeLoggerMoyaPlugin` implementation using center + lifecycle APIs.
3. Avoid direct started-time dictionary logic in app code.
4. Add tests with success/failure Moya responses.

## Step 4: Documentation and migration

1. Add migration guide from custom app plugin to first-party plugin.
2. Add deep-link setup snippet using `DevSeeLoggerCenter.handleURL`.
3. Add minimal integration snippet (core-only and Moya variants).

## Step 5: Connection endpoint persistence (Phase 1.2)

1. Add endpoint persistence abstraction in core package:
   1. host + port serialize/deserialize
   2. default storage via `UserDefaults`
2. On successful deep-link connect:
   1. update in-memory logger configuration
   2. persist endpoint for next launch
3. On bootstrap:
   1. attempt to load remembered endpoint
   2. validate host/port and rebuild server URL
   3. apply precedence/fallback rules
4. Add tests for:
   1. successful persist and restore
   2. invalid stored value fallback
   3. precedence correctness

---

## 7. Acceptance Criteria

1. A Moya app can integrate with:
   1. one package import for core.
   2. one optional package import for Moya adapter.
   3. center configure call at app startup.
   4. plugin registration in Moya provider.
2. Core package has no Moya dependency.
3. Existing `log(...)` callers continue to work.
4. `requestBody` fallback works and is covered by tests.
5. Concurrency tests cover multiple in-flight identical requests.
6. After successful `handleURL(_:)`, endpoint is restored after app restart without app-side persistence code.
7. Invalid remembered endpoint data does not crash and falls back to configured/default URL.

---

## 8. Risks and Mitigation

1. Risk: API surface grows and becomes harder to maintain.
   Mitigation: keep lifecycle APIs narrow and additive.
2. Risk: accidental hard dependency on Moya in core.
   Mitigation: enforce package split and CI check dependency graph.
3. Risk: migration confusion for current adopters.
   Mitigation: publish a short migration table with before/after snippets.
4. Risk: stale remembered endpoint can cause failed sends after network changes.
   Mitigation: preserve deep-link reconnect flow and safe fallback behavior.

---

## 9. Milestone Exit and Next Step

When all acceptance criteria pass:

1. Tag a new SDK release with explicit integration ergonomics notes.
2. Add dedicated CI for both core and Moya adapter tests.
3. Evaluate next adapter priority (Alamofire) from adopter feedback.
