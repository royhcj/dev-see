# dev-see Documentation Index

This index catalogs the design specifications and planning documents for the dev-see project.

## Current Implementation (Phase 1)

### [overview.md](./overview.md)
High-level overview of Phase 1: the minimal viable product focused on a Mac desktop application for viewing API logs in real-time.

**Covers:**
- Project scope and goals
- Functional & non-functional requirements
- High-level architecture diagram
- User flow and workflows
- Deliverables and success metrics
- Timeline estimates and technical decisions

### [tech-stack.md](./tech-stack.md)
Detailed technical architecture and technology choices for Phase 1.

**Covers:**
- Stack overview (Tauri, Svelte, Fastify)
- Desktop app setup (Tauri configuration, backend integration)
- Frontend structure (Svelte components, reactive stores, Tailwind)
- Backend API (Fastify server, in-memory ring buffer, WebSocket)
- Project structure and monorepo layout
- Developer workflow and build process
- Performance targets and security considerations

### [log-server-design.md](./log-server-design.md)
Backend server architecture and API specification.

**Covers:**
- Fastify server architecture and data flow
- HTTP POST `/api/logs` endpoint specification
- WebSocket `/ws` streaming protocol
- In-memory ring buffer storage
- Data models and validation
- Error handling and security
- Performance considerations
- Testing strategies
- Future enhancements

### [log-viewer-design.md](./log-viewer-design.md)
UI/UX design specification for the core log viewer component.

**Covers:**
- Two-pane layout architecture
- App switcher for filtering logs
- Log item list with visual indicators
- Detailed request/response view with tabs
- Data models for API logs
- Styling and theme considerations
- Performance optimizations (virtual scrolling, lazy loading)
- Future extensibility for other log types

## Future Planning

See [future-plan/](./future-plan/) for planned extensions beyond Phase 1, including:
- Phase 2+ architecture and features
- Mobile SDK roadmap
- Database and persistence strategies
- Team collaboration features

---

**Last updated:** 2026-02-12
