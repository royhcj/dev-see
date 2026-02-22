# Log Viewer UI Design

## Overview

The log viewer is the core user interface component of dev-see. It displays captured API logs and their details in a clear, organized manner. The design follows a two-pane layout: a list view on the left showing log items, and a detailed view on the right showing the full content of the selected item.

---

## Layout Architecture

### Two-Pane Design

```
┌─────────────────────────────────────────────────┐
│  dev-see                                   [−][□][×] │
├──────────┬────────────────────────────────────┤
│          │                                    │
│ App      │  Detailed Log View                 │
│ Switcher │  (Request or Response)             │
│          │                                    │
├──────────┤                                    │
│          │                                    │
│ Log Item │                                    │
│ List     │                                    │
│          │                                    │
│          │                                    │
└──────────┴────────────────────────────────────┘
```

- **Left Panel**: App switcher + Log item list
- **Right Panel**: Detailed view of selected log item

---

## App Switcher

### Purpose
Allows users to filter logs by the originating application.

### Design
- **Dropdown or segmented selector** at the top of the left panel
- Apps are identified by a string ID (e.g., `com.example.myapp`, `com.yourcompany.flutter-app`)
- Displays all currently-connected apps that have sent logs
- Selecting an app filters the log list to show only that app's logs
- Option to view "All Apps" at once

### Data
- App ID (string identifier)
- App Name (optional, for display)
- Log count per app (optional, for context)

---

## Log Item List (Left Panel)

### Purpose
Shows a scrollable, chronological list of API calls for quick browsing and selection.

### Log Item Display
Each item in the list shows:

1. **API Endpoint** - The URL path and query parameters (e.g., `/api/users?page=1`)
2. **Log Time** - Timestamp of when the request was made (e.g., `14:32:45.123`)
3. **Request Body Preview** - First line of the request body (POST/PUT body or query params)
   - Truncated to fit in one line
   - Trailing `...` when content is longer than available space
   - Empty/omitted if no body present

### Visual Indicators (Optional Enhancements)
- **HTTP Method Badge** - Small colored indicator for method type:
  - GET: Blue
  - POST: Green
  - PUT: Orange
  - DELETE: Red
  - PATCH: Purple
  - Other: Gray
- **Status Code** - HTTP response status code with color coding:
  - 2xx: Green
  - 3xx: Blue
  - 4xx: Yellow
  - 5xx: Red
- **Duration** - Response time in milliseconds (optional)
- **Time Gap Separator** - Render a separator line between adjacent log items when they are `>= 5 seconds` apart based on timestamp difference

### Sorting
- Default: Newest logs at the top
- Scrollable: Latest logs appear at the top as they arrive

### Selection
- Click to select a log item
- Selected item is highlighted
- Right panel updates to show full details

---

## Detailed View (Right Panel)

### Tabs Structure
Two tabs: **Request** and **Response**

#### Tab 1: Request Details

**Fields displayed:**
1. **HTTP Method** - GET, POST, PUT, DELETE, PATCH, etc.
2. **Endpoint URL** - Full URL including protocol, domain, path, and query parameters
3. **Request Headers** - Key-value pairs (collapsible section)
   - `Content-Type`, `Authorization`, `User-Agent`, etc.
   - Sensitive headers (Authorization, Cookie) can be masked/hidden
4. **Request Body** - Full request body
   - If JSON: Pretty-printed with syntax highlighting
   - If form data: Key-value display
   - If plain text: Raw text with wrapping
   - If binary: Display as hex or "Binary data" indicator
5. **Log Time** - When the request was made (timestamp with millisecond precision)

#### Tab 2: Response Details

**Fields displayed:**
1. **HTTP Method** - Echo of the request method (for context)
2. **Endpoint URL** - Echo of the requested URL
3. **HTTP Status Code** - Status code with reason phrase (e.g., `200 OK`, `404 Not Found`)
   - Color-coded background based on status range
4. **Response Time** - Time elapsed from request to response (e.g., `234ms`)
5. **Response Headers** - Key-value pairs (collapsible section)
   - `Content-Type`, `Content-Length`, `Cache-Control`, etc.
6. **Response Body** - Full response content
   - **If JSON**: Beautiful, formatted JSON viewer with:
     - Syntax highlighting
     - Collapsible/expandable tree structure
     - Line numbers (optional)
     - Copy-to-clipboard for individual values
   - **If HTML**: Raw HTML display or simple preview
   - **If plain text**: Raw text with wrapping
   - **If binary**: Binary indicator or base64 display

### Search/Highlight
- Within the details view, search for keywords in headers or body

---

## Interaction Patterns

### Log Selection
1. Click a log item in the left panel
2. Right panel immediately shows request details (default tab)
3. Click "Response" tab to see response

### Copy to Clipboard
- Click icon or use keyboard shortcut to copy:
  - Full URL
  - Request body
  - Response body
  - Individual header values
  - JSON tree nodes

### Keyboard Shortcuts
- **↑/↓**: Navigate between log items
- **Cmd+C**: Copy selected content
- **Cmd+F**: Search within current view
- **Escape**: Clear selection (optional)

---

## Data Model

### Request Object
```
{
  id: string (unique identifier)
  appId: string (app identifier)
  method: string ("GET", "POST", etc.)
  url: string (full URL)
  headers: object (key-value pairs)
  body: string (raw request body or null)
  timestamp: number (Unix timestamp in ms)
}
```

### Response Object
```
{
  requestId: string (links to request)
  statusCode: number
  statusMessage: string
  headers: object (key-value pairs)
  body: string (raw response body)
  duration: number (milliseconds)
  timestamp: number (Unix timestamp in ms)
}
```

---

## Styling Considerations

### Colors & Themes
- Dark theme by default (easier on the eyes for debugging sessions)
- Light theme option available
- High contrast for readability

### JSON Syntax Highlighting
- Keys: Blue
- Strings: Green
- Numbers: Orange
- Booleans: Purple
- Null: Gray

### Status Code Colors
- 2xx (Success): Green
- 3xx (Redirect): Blue
- 4xx (Client Error): Yellow/Orange
- 5xx (Server Error): Red

---

## Performance Considerations

- Virtual scrolling for the log list (render only visible items)
- Lazy load response body content (only parse/render when clicked)
- Limit JSON tree expansion depth by default
- Debounce search input

---

## Future Extensibility

This log viewer is designed to handle **API logs only in Phase 1**, but the architecture supports extension to other log types:

### Potential Future Log Types
- **Console Logs** - App console output (stdout, stderr)
- **Database Queries** - SQL queries and responses
- **Analytics Events** - Custom app events and tracking
- **Lifecycle Events** - App lifecycle, navigation, screen transitions
- **Performance Metrics** - Memory usage, FPS, render times
- **Crash Reports** - Exceptions and stack traces

### Extension Points
1. **App Switcher** - Can filter by log type in addition to app
2. **Log Item List** - Can display different fields based on log type
3. **Detail Panel** - Can show different tabs for different log types
4. **Search** - Can be extended to search log-type-specific fields

The data model and UI components are designed to be generic enough to accommodate these extensions without major refactoring.

---

## Accessibility

- Keyboard navigation (arrow keys, Tab)
- Screen reader support for log items and details
- High contrast mode option
- Reasonable font sizes and spacing
