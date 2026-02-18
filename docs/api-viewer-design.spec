# API Spec Viewer Design Spec

> Last updated: 2026-02-15

This document defines the frontend design and behavior for adding an **API Spec Viewer** to dev-see. The new viewer loads an OpenAPI document, renders API documentation, and allows users to send requests directly from the UI.

---

## 1. Goals

1. Add a top-level tabbed navigation with `API Log Viewer` (existing) and `API Spec Viewer` (new).
1. Parse and render OpenAPI 3.x documents with endpoint browsing and details.
1. Provide an interactive "Try It Out" workflow so users can fire API requests.
1. Keep UX consistent with existing two-pane viewer pattern.

---

## 2. Non-Goals

1. Full replacement of all RapiDoc features.
1. OpenAPI 2.0 (Swagger 2.0) support in v1 (optional future enhancement).
1. Persisting generated request history across app restarts.
1. Advanced mocking/server virtualization.

---

## 3. Primary User Stories

1. As a developer, I can switch between live API logs and API spec docs from the same app.
1. As a developer, I can browse all endpoints grouped by sections/tags.
1. As a developer, I can inspect request/response schemas and examples for a selected endpoint.
1. As a developer, I can set parameters/body/auth and execute the endpoint directly.
1. As a developer, I can inspect response status, headers, body, and timing after execution.

---

## 4. Information Architecture

### 4.1 App-Level Tabs

Top-level tabs (inside app header or immediately below header):

1. `API Log Viewer` (default tab on app open to preserve existing behavior)
1. `API Spec Viewer`

### 4.2 API Spec Viewer Layout

Use a two-pane layout similar to the log viewer:

```
┌─────────────────────────────────────────────────────────────┐
│ Top Tabs: [API Log Viewer] [API Spec Viewer]               │
├──────────────────────────────┬──────────────────────────────┤
│ Left Pane                    │ Right Pane                   │
│ - Spec source controls       │ - Endpoint summary           │
│ - Section/tag groups         │ - Parameters                 │
│ - Endpoint list              │ - Request body               │
│   (METHOD + path)            │ - Request/response schemas   │
│                              │ - Try It Out + response      │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 5. Functional Requirements

### 5.1 OpenAPI Document Loading

Supported input methods:

1. URL input (`https://.../openapi.json` or `.yaml`)
1. Local file upload (`.json`, `.yaml`, `.yml`)
1. Optional preset list (future-ready; not required for v1)

Behavior:

1. On load, parse and validate OpenAPI 3.x shape.
1. Show clear error state for invalid document.
1. Preserve last loaded spec in memory for the current session.
1. Display spec metadata: `title`, `version`, optional `description`.

### 5.2 Endpoint Navigation (Left Pane)

1. Group endpoints by OpenAPI `tags`.
1. If operation has no tag, place under `Untagged`.
1. Each endpoint row displays an HTTP method badge (`GET`, `POST`, etc.).
1. Each endpoint row displays path (e.g. `/users/{id}`).
1. Each endpoint row displays optional short summary as secondary text.
1. Provide section collapse/expand behavior.
1. Provide endpoint search (path + summary + operationId).
1. Selecting an endpoint updates the right pane.

### 5.3 Endpoint Details (Right Pane)

For selected operation, display:

1. Method + full resolved path
1. Summary + description (Markdown supported, sanitized)
1. `operationId`
1. `tags`
1. `deprecated` indicator (if true)
1. Server/base URL selector using operation-level servers first, then global servers.
1. Manual override of base URL.

### 5.4 Request Definition Display

Show structured request details:

1. Path parameters
1. Query parameters
1. Header parameters (including required/optional)
1. Cookie parameters (if defined)
1. Request headers section (resolved headers to be sent)
1. Request body with content-type tabs for `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data`, and `text/plain`.
1. For each request body content type: schema viewer, example payload editor, and generated payload preview.

### 5.5 Schema Rendering

For both request and response schemas:

1. Render expandable schema tree with type, format, description, required markers, enum values, default values, and `$ref` resolution.
1. Show examples from `example`, `examples`, or schema-derived sample fallback.

### 5.6 Response Documentation Display

1. List all documented responses (status code + description).
1. Per response status, show headers schema (if present), content types, response body schema, and examples.
1. Expand a `2xx` response by default when present; keep others collapsed.

### 5.7 Try It Out (Execute API Request)

User flow:

1. Click `Try It Out` to enable inputs.
1. Edit parameter values, headers, and request body.
1. Click `Send`.
1. UI executes request using `fetch` (browser context).
1. Show execution result with response status, duration (ms), response headers, response body (formatted by content-type), raw payload toggle, and generated copyable cURL.

Validation before send:

1. required path/query/header params must be present
1. path variables must be substituted
1. body parsed/encoded according to selected content type

Error handling:

1. network error state
1. timeout state
1. CORS failure guidance (for browser mode)
1. non-2xx responses still rendered as valid results

---

## 6. UX Requirements (RapiDoc-Inspired)

The viewer should borrow proven patterns from RapiDoc while matching dev-see styling:

1. Method color badges and endpoint-first browsing.
1. Compact left nav + rich right detail panel.
1. "Try It Out" mode toggle and execution panel.
1. Schema and example readability over raw JSON dumping.
1. Copy affordances for path, full URL, cURL, and request/response body.

Additional features for v1:

1. Sticky right-panel sub-navigation with `Overview`, `Parameters`, `Request Body`, `Responses`, and `Try It Out`.
1. Deep-link by operation using URL hash `#op/{operationId}` and fallback method+path key.
1. Keyboard support with `Cmd/Ctrl+K` for endpoint search and arrow keys for endpoint selection.

---

## 7. Data Model (Frontend)

```ts
type ViewerTab = 'logs' | 'spec';

interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, PathItem>;
  components?: Record<string, unknown>;
}

interface EndpointNavItem {
  id: string; // operationId or generated key METHOD path
  method: string; // GET/POST/...
  path: string;
  summary?: string;
  tag: string; // defaults to "Untagged"
  deprecated?: boolean;
}

interface TryItState {
  enabled: boolean;
  baseUrl: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headerParams: Record<string, string>;
  requestBodyText: string;
  contentType?: string;
  lastResponse?: {
    status: number;
    statusText: string;
    durationMs: number;
    headers: Record<string, string>;
    bodyText: string;
    contentType?: string;
  };
}
```

---

## 8. Component-Level Design (Svelte)

Proposed components:

1. `TopTabs.svelte`
1. `spec/SpecViewer.svelte` (container)
1. `spec/SpecSourceBar.svelte` (URL/file load controls)
1. `spec/EndpointNav.svelte`
1. `spec/EndpointDetail.svelte`
1. `spec/SchemaTree.svelte`
1. `spec/TryItPanel.svelte`
1. `stores/spec-viewer.svelte.ts`

Integration plan:

1. Keep existing log viewer components intact.
1. `App.svelte` owns selected top-level tab state.
1. When `logs` tab active, render current layout.
1. When `spec` tab active, render `SpecViewer`.

---

## 9. Request Execution Rules

1. Construct URL: `baseUrl + resolvedPath + queryString`.
1. Replace `{pathParam}` tokens before send.
1. Set `Content-Type` only when body exists and type selected.
1. Support auth helpers for Bearer token, Basic auth, and API key in header/query.
1. Never persist secrets to disk in v1.
1. Timeout default: 30s (configurable in UI).
1. Treat all HTTP statuses as completed responses, not errors.

---

## 10. Performance and Reliability

1. Parse spec once and memoize derived endpoint index.
1. Virtualize left endpoint list when large (>300 operations).
1. Debounce endpoint search input (150ms).
1. Lazy-render schema trees (collapsed by default for deep nodes).
1. Avoid blocking UI during large spec parse (use microtask chunking or worker in future).

---

## 11. Accessibility

1. Full keyboard navigation for endpoint list and form fields.
1. ARIA labels for method badges, tab controls, and collapsible sections.
1. Color is not the only method indicator (show method text always).
1. Focus-visible styles for all interactive elements.

---

## 12. Security Considerations

1. Sanitize Markdown/HTML descriptions from specs before rendering.
1. Do not execute script content from examples/descriptions.
1. Mask auth credentials in UI logs/cURL preview unless explicitly revealed.
1. Warn users when sending requests to non-HTTPS endpoints (except localhost).

---

## 13. Empty/Error States

1. No spec loaded: show instructional empty state with URL/file actions.
1. Invalid spec: show parse error and first relevant location message.
1. Endpoint has no request body/schema: show explicit "Not defined in spec".
1. Endpoint execution not allowed (CORS/network): show actionable explanation and troubleshooting tips.

---

## 14. Acceptance Criteria

1. App has two top tabs with `API Log Viewer` first and `API Spec Viewer` second.
1. API Spec Viewer can load at least one valid OpenAPI 3.x JSON file and one YAML file.
1. Left pane shows endpoints grouped by section/tag, each row displaying `METHOD + path`.
1. Clicking any endpoint updates right pane with operation details.
1. Right pane includes request headers, query/path params, request body inputs, and request/response schemas.
1. Try-It-Out sends a real request and displays response status, headers, and body.
1. Generated cURL is available and copyable.
1. Error states (invalid spec, network failure, CORS issue) are clearly displayed.

---

## 15. Future Enhancements (Post-v1)

1. Swagger 2.0 support.
1. Request history timeline per endpoint.
1. Save/load environments (dev/staging/prod base URLs + auth presets).
1. JSON schema diff view between versions of a spec.
1. Sync "Try It Out" requests into API Log Viewer tab.
