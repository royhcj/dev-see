# API Spec Viewer Implementation Plan

> Last updated: 2026-02-15

## Overview

This plan implements the API Spec Viewer defined in `docs/api-viewer-design.spec` and keeps current API log viewer behavior unchanged. The implementation is frontend-only inside `apps/ui`, with no server changes required for v1.

## v1 Scope

- Add top-level tabs: `API Log Viewer` (default) and `API Spec Viewer`.
- Load OpenAPI 3.x from URL and local JSON/YAML file.
- Render endpoint navigation and endpoint details in a two-pane layout.
- Implement Try-It-Out request execution, response display, and cURL generation.
- Cover required UX, accessibility, security, empty/error states, and acceptance criteria from the spec.

## Out of Scope (v1)

- OpenAPI 2.0 support.
- Persisted request history across app restarts.
- Mock server/virtualization.
- Full parity with all RapiDoc features.

## Implementation Strategy

Ship in small phases with working increments:

1. App shell and tab integration.
2. Spec loading/parsing and normalized viewer state.
3. Endpoint navigation and operation selection.
4. Operation detail rendering, schemas, and documented responses.
5. Try-It-Out execution flow and cURL generation.
6. Accessibility, security hardening, error states, and performance.
7. Test coverage and acceptance verification.

## Proposed Files

Create:

- `apps/ui/src/components/TopTabs.svelte`
- `apps/ui/src/components/spec/SpecViewer.svelte`
- `apps/ui/src/components/spec/SpecSourceBar.svelte`
- `apps/ui/src/components/spec/EndpointNav.svelte`
- `apps/ui/src/components/spec/EndpointDetail.svelte`
- `apps/ui/src/components/spec/SchemaTree.svelte`
- `apps/ui/src/components/spec/TryItPanel.svelte`
- `apps/ui/src/stores/spec-viewer.svelte.ts`
- `apps/ui/src/lib/openapi/parse.ts`
- `apps/ui/src/lib/openapi/normalize.ts`
- `apps/ui/src/lib/openapi/schema.ts`
- `apps/ui/src/lib/openapi/examples.ts`
- `apps/ui/src/lib/http/request-builder.ts`
- `apps/ui/src/lib/http/curl.ts`
- `apps/ui/src/lib/security/sanitize.ts`

Update:

- `apps/ui/src/App.svelte`
- `apps/ui/src/styles/global.css`
- `apps/ui/package.json` (dependencies for YAML parsing and markdown sanitization)

## Phase Plan

## Phase 1: App Shell + Top Tabs

Tasks:

- Add top-level tab state in `App.svelte` with default `logs`.
- Create `TopTabs.svelte` and mount above current two-pane content.
- Keep existing log viewer layout and behavior unchanged under `logs`.
- Add `SpecViewer.svelte` mount path under `spec`.

Done when:

- App opens on `API Log Viewer`.
- Switching to `API Spec Viewer` shows a placeholder/empty state container.

## Phase 2: OpenAPI Loading + Store Model

Tasks:

- Build `spec-viewer.svelte.ts` store with:
  - Source/loading/error state.
  - Parsed document metadata (`title`, `version`, `description`).
  - Endpoint index grouped by tag (default `Untagged`).
  - Selection state and Try-It-Out draft values.
- Implement `SpecSourceBar.svelte` with URL input + file upload.
- Parse JSON and YAML, validate OpenAPI 3.x shape, and report friendly parse/validation errors.
- Keep loaded spec in memory for current session.

Done when:

- Valid JSON and YAML OpenAPI 3.x files load successfully.
- Invalid spec shows clear parse/validation error message and location hint.

## Phase 3: Endpoint Navigation (Left Pane)

Tasks:

- Implement `EndpointNav.svelte`:
  - Tag group collapse/expand.
  - Endpoint rows with method badge, path, optional summary.
  - Search across path + summary + operationId.
- Add endpoint selection and highlight.
- Add debounce (150ms) for search.
- Add keyboard support for selection (arrow keys) and quick search (`Cmd/Ctrl+K`).
- Add virtualization fallback for large specs (>300 operations).

Done when:

- Left pane groups endpoints by tag and supports fast search/selection.
- Selected endpoint updates right pane consistently.

## Phase 4: Endpoint Detail + Schema/Response Docs (Right Pane)

Tasks:

- Implement `EndpointDetail.svelte` sections:
  - Overview, Parameters, Request Body, Responses, Try It Out.
  - Sticky section nav and deep links (`#op/{operationId}`; fallback method+path key).
- Render operation metadata:
  - Method + resolved path, summary/description, operationId, tags, deprecated indicator.
  - Server/base URL selector (operation-level servers first, then global) plus manual override.
- Implement `SchemaTree.svelte`:
  - Expandable nodes, type/format, required markers, enum/default/description.
  - `$ref` resolution through normalized schema map.
  - Example rendering from `example`, `examples`, or generated fallback.
- Render documented responses:
  - Status + description, headers schema, content types, body schema and examples.
  - Auto-expand a `2xx` response by default if present.

Done when:

- Right pane fully renders operation details from spec definitions.
- Schema and response views match spec requirements for readability and structure.

## Phase 5: Try-It-Out Execution

Tasks:

- Implement `TryItPanel.svelte` with mode toggle (`Try It Out`), editable params/headers/body, and `Send`.
- Implement request-building helpers in `request-builder.ts`:
  - `baseUrl + resolvedPath + queryString`.
  - Path substitution validation.
  - Required param checks.
  - Body encoding by selected content type.
  - Auth helpers: Bearer, Basic, API key (header/query).
- Execute with `fetch` and configurable timeout (default 30s).
- Render response block with status, duration, headers, parsed/raw body, and content type.
- Implement copyable generated cURL in `curl.ts`.
- Ensure non-2xx responses are shown as valid completed executions.

Done when:

- User can successfully execute requests and inspect complete response details.
- cURL output is visible and copyable.

## Phase 6: UX, Accessibility, Security, and Error States

Tasks:

- Sanitize markdown/html descriptions before rendering.
- Mask auth credentials in UI logs/cURL preview until explicitly revealed.
- Show non-HTTPS warning (excluding localhost).
- Implement empty/error states:
  - No spec loaded.
  - Invalid spec.
  - Missing request body/schema.
  - Network/CORS/timeout guidance.
- Accessibility pass:
  - ARIA labels for tabs, method badges, collapsibles.
  - Keyboard navigation through endpoint list and forms.
  - Focus-visible styling and method text not color-only.

Done when:

- Security and accessibility requirements in the spec are implemented and manually verified.

## Phase 7: Testing + Acceptance Verification

Tasks:

- Add unit tests for:
  - Spec parsing/validation and endpoint normalization.
  - Search filtering and debounce behavior.
  - Request construction and cURL generation.
  - Timeout/error mapping (network, CORS guidance path).
- Add component tests for:
  - Tab switching.
  - Left-nav selection updating right pane.
  - Try-It-Out send flow and response rendering.
- Run manual acceptance checklist against Section 14 of the spec.

Done when:

- All critical tests pass and each acceptance criterion is demonstrated.

## Acceptance Checklist Mapping

1. Top tabs order and default tab.
2. Loads valid OpenAPI 3.x JSON and YAML.
3. Left pane shows grouped endpoints with `METHOD + path`.
4. Endpoint click updates right pane.
5. Right pane shows headers, params, request body, and schemas.
6. Try-It-Out sends request and shows status/headers/body.
7. cURL is generated and copyable.
8. Invalid spec/network/CORS errors are clear and actionable.

## Risks and Mitigations

- Risk: `$ref` resolution complexity for large/nested schemas.
  - Mitigation: Normalize and cache resolved refs in store/lib utilities.
- Risk: Large specs degrade nav and schema rendering performance.
  - Mitigation: Debounced search, nav virtualization, lazy schema expansion.
- Risk: Browser CORS limitations may be interpreted as app failure.
  - Mitigation: Explicit CORS troubleshooting guidance in execution errors.
- Risk: Unsafe description content in third-party specs.
  - Mitigation: Strict markdown sanitization and no script execution.

## Definition of Done

- API Spec Viewer behavior matches `docs/api-viewer-design.spec`.
- Existing API Log Viewer remains functional and default on app open.
- Acceptance criteria pass with automated tests for core logic plus manual UI verification.
