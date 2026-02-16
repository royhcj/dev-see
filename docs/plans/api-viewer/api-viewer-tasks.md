# API Spec Viewer Implementation Tasks

> Based on: `docs/plans/api-viewer/api-viewer-plan.md`
> Last updated: 2026-02-15

## 0. Setup and Baseline

- [x] Confirm current log viewer behavior in `apps/ui/src/App.svelte` is unchanged before starting.
- [x] Create component directory `apps/ui/src/components/spec/`.
- [x] Create OpenAPI utility directory `apps/ui/src/lib/openapi/`.
- [x] Create HTTP utility directory `apps/ui/src/lib/http/`.
- [x] Create security utility directory `apps/ui/src/lib/security/`.
- [x] Add/verify dependencies in `apps/ui/package.json` for YAML parsing and markdown sanitization.
- [x] Install dependencies from workspace root and verify `pnpm --filter ui dev` starts.

## 1. Phase 1: App Shell and Top Tabs

- [ ] Add top-level tab state (`logs` | `spec`) in `apps/ui/src/App.svelte`.
- [ ] Create `apps/ui/src/components/TopTabs.svelte` with `API Log Viewer` and `API Spec Viewer`.
- [ ] Render `TopTabs` above main content and keep `API Log Viewer` as default.
- [ ] Create `apps/ui/src/components/spec/SpecViewer.svelte` container component.
- [ ] Render existing log viewer layout only when `logs` tab is active.
- [ ] Render `SpecViewer` only when `spec` tab is active.
- [ ] Verify switching tabs does not break WebSocket log streaming behavior.

## 2. Phase 2: Spec Loading and Store Model

- [ ] Create `apps/ui/src/stores/spec-viewer.svelte.ts` with state for source, loading, error, parsed doc, and selected endpoint.
- [ ] Add store state for spec metadata: title, version, description.
- [ ] Add store state for endpoint index grouped by tag with `Untagged` fallback.
- [ ] Add Try-It-Out draft state in store (base URL, params, headers, body, content type, last response).
- [ ] Create `apps/ui/src/components/spec/SpecSourceBar.svelte` with URL input and file upload.
- [ ] Create `apps/ui/src/lib/openapi/parse.ts` for JSON/YAML parsing and OpenAPI 3.x shape validation.
- [ ] Create `apps/ui/src/lib/openapi/normalize.ts` to derive endpoint nav items and tag groups.
- [ ] Wire `SpecSourceBar` actions to store load/parse workflow.
- [ ] Persist last loaded spec in memory for current session only.
- [ ] Implement invalid-spec error state with clear parse/validation messages.
- [ ] Implement empty state when no spec is loaded.

## 3. Phase 3: Endpoint Navigation (Left Pane)

- [ ] Create `apps/ui/src/components/spec/EndpointNav.svelte`.
- [ ] Render collapsible tag sections with expanded/collapsed state.
- [ ] Render endpoint rows with method badge, path, and optional summary.
- [ ] Implement endpoint search by path, summary, and operationId.
- [ ] Debounce endpoint search input by 150ms.
- [ ] Wire endpoint click to selected operation state in store.
- [ ] Add keyboard support for endpoint navigation (arrow keys and Enter).
- [ ] Add `Cmd/Ctrl+K` shortcut to focus endpoint search.
- [ ] Add virtualization strategy for large specs (>300 operations).
- [ ] Ensure selected endpoint updates the right pane state.

## 4. Phase 4: Endpoint Details, Schemas, and Response Docs

- [ ] Create `apps/ui/src/components/spec/EndpointDetail.svelte`.
- [ ] Add sticky sub-navigation sections: Overview, Parameters, Request Body, Responses, Try It Out.
- [ ] Implement deep-link handling with `#op/{operationId}` and method+path fallback.
- [ ] Render method and resolved path for selected operation.
- [ ] Render summary and description with markdown support.
- [ ] Render `operationId`, `tags`, and deprecated indicator.
- [ ] Add server/base URL selector with precedence: operation-level servers first, then global servers.
- [ ] Add manual base URL override input.
- [ ] Render structured parameter sections for path, query, header, and cookie params.
- [ ] Add request headers section showing resolved outgoing headers.
- [ ] Render request body section with content-type tabs.
- [ ] Support request content types: `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`.
- [ ] Add example payload editor and generated payload preview per selected content type.
- [ ] Create `apps/ui/src/components/spec/SchemaTree.svelte` for expandable schema display.
- [ ] Create `apps/ui/src/lib/openapi/schema.ts` for schema traversal and `$ref` resolution helpers.
- [ ] Create `apps/ui/src/lib/openapi/examples.ts` for `example`, `examples`, and fallback sample generation.
- [ ] Render response documentation by status code with description.
- [ ] Render response headers schema, content types, body schemas, and examples.
- [ ] Auto-expand one `2xx` response by default when available.
- [ ] Show explicit placeholder when request body/schema is not defined in spec.

## 5. Phase 5: Try-It-Out Request Execution

- [ ] Create `apps/ui/src/components/spec/TryItPanel.svelte`.
- [ ] Add `Try It Out` mode toggle to enable/disable editing.
- [ ] Add editable inputs for path/query/header/cookie parameters.
- [ ] Add editable request body input bound to selected content type.
- [ ] Create `apps/ui/src/lib/http/request-builder.ts`.
- [ ] Implement URL construction: `baseUrl + resolvedPath + queryString`.
- [ ] Validate required path/query/header parameters before send.
- [ ] Validate path parameter substitution is complete before send.
- [ ] Encode request body per selected content type before send.
- [ ] Implement auth helpers for Bearer token, Basic auth, and API key (header/query).
- [ ] Ensure auth secrets are not persisted to disk.
- [ ] Execute request with browser `fetch`.
- [ ] Implement timeout handling with default 30s and UI-configurable value.
- [ ] Render response status, status text, and duration.
- [ ] Render response headers and body with content-type-aware formatting.
- [ ] Add raw payload toggle for response body.
- [ ] Create `apps/ui/src/lib/http/curl.ts` and generate copyable cURL from request.
- [ ] Treat non-2xx responses as completed responses, not execution failures.
- [ ] Add explicit error handling for network failure, timeout, and CORS guidance.

## 6. Phase 6: UX, Accessibility, Security, and Performance

- [ ] Create `apps/ui/src/lib/security/sanitize.ts` and sanitize markdown/HTML descriptions before render.
- [ ] Ensure scripts in spec descriptions/examples are not executed.
- [ ] Mask auth credentials by default in UI request views and cURL preview.
- [ ] Add explicit reveal control for masked credentials.
- [ ] Show warning when request target is non-HTTPS (except localhost).
- [ ] Add ARIA labels for tab controls, method badges, and collapsible sections.
- [ ] Ensure keyboard navigation works for endpoint list and form inputs.
- [ ] Ensure method is shown as text, not color-only.
- [ ] Add visible focus styles for all interactive controls.
- [ ] Memoize parsed spec and derived endpoint index.
- [ ] Lazy-render deep schema trees with collapsed default nodes.
- [ ] Verify large spec behavior remains responsive with search and navigation.
- [ ] Update `apps/ui/src/styles/global.css` for new components and accessibility focus styles.

## 7. Phase 7: Tests

- [ ] Add unit tests for `apps/ui/src/lib/openapi/parse.ts` covering valid/invalid JSON and YAML.
- [ ] Add unit tests for `apps/ui/src/lib/openapi/normalize.ts` covering tag grouping and untagged fallback.
- [ ] Add unit tests for `apps/ui/src/lib/openapi/schema.ts` covering `$ref` resolution.
- [ ] Add unit tests for `apps/ui/src/lib/openapi/examples.ts` covering example precedence and fallback generation.
- [ ] Add unit tests for `apps/ui/src/lib/http/request-builder.ts` covering URL assembly, param validation, auth, and body encoding.
- [ ] Add unit tests for `apps/ui/src/lib/http/curl.ts` covering generated command output.
- [ ] Add unit tests for search debounce and filtering logic.
- [ ] Add component tests for tab switching in `apps/ui/src/App.svelte`.
- [ ] Add component tests for endpoint selection -> detail pane update.
- [ ] Add component tests for Try-It-Out send flow and response render states.
- [ ] Add tests for empty and error states (invalid spec, network, timeout, CORS guidance).
- [ ] Run `pnpm --filter ui test` and fix failures.

## 8. Final Acceptance Validation

- [ ] Validate top tabs exist in correct order with `API Log Viewer` default.
- [ ] Validate one OpenAPI 3.x JSON file loads successfully.
- [ ] Validate one OpenAPI 3.x YAML file loads successfully.
- [ ] Validate left pane grouping by tags with method + path rows.
- [ ] Validate endpoint selection updates full right-pane details.
- [ ] Validate request params/headers/body and schema docs render correctly.
- [ ] Validate Try-It-Out executes and shows status, headers, and body.
- [ ] Validate generated cURL is copyable.
- [ ] Validate invalid spec, network failure, and CORS guidance states are clear.
- [ ] Run `pnpm --filter ui build` and verify successful production build.
- [ ] Perform manual regression check that existing log viewer still works as before.
