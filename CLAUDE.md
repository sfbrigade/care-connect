# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Care Connect is a multi-tenant platform serving facility-specific interfaces (DIDO and LESC) from a single codebase. Built by SF Civic Tech in partnership with the City and County of San Francisco. Licensed under AGPL-3.0.

- **DIDO** (Drop-in/Drop-off): Facility browsing and mapping for drop-in centers
- **LESC** (Law Enforcement Sobering Center): Bed availability, hold management, and intake tracking

## Common Commands

### Development (Docker-based)
```bash
docker compose up                          # Start all services (app at http://localhost:3333)
docker compose exec server bash -l         # Shell into the running server container
```

### Linting
```bash
npm run lint                               # Lint + fix all workspaces
npm run lint --workspace client            # Lint + fix client only
npm run lint --workspace server            # Lint + fix server only
npm run lint:check                         # Check only (no fix)
```

### Testing
```bash
# Client tests (Vitest)
npm test --workspace client                # Run all client tests
npx vitest run path/to/file.test.js        # Run a single client test (from client/)
npx vitest path/to/file.test.js            # Run in watch mode (from client/)

# Server tests (Node test runner, requires Docker for testcontainers)
npm test --workspace server                # Run all server tests
# From inside the server container:
cd server && npm test                      # Run all server tests
npm test -- test/routes/api/auth.test.js   # Run a single server test
```

### Build
```bash
npm run build                              # Build both client and server
npm run build --workspace client           # Build client (dist/client/ + dist/server/)
npm run build --workspace server           # Generate Prisma client
```

### Database (from inside server container)
```bash
npx prisma migrate deploy                  # Apply migrations
npx prisma db seed                         # Seed development data
npm run prisma:studio                      # Launch Prisma Studio (http://localhost:5555)
```

### Storybook
```bash
npm run storybook --workspace client       # Start Storybook on port 6006
```

## Architecture

### Monorepo Structure
- **`client/`** — React 19 SPA with SSR, built with Vite + SWC
- **`server/`** — Fastify v5 API server with Prisma ORM on PostgreSQL

npm workspaces manages both packages. The root `package.json` delegates to workspace scripts.

### Multi-Tenant Facility Routing
Facility type is detected via subdomain in production (`lesc.example.com`) or a manual selector in development (localhost). The server plugin `server/plugins/facility.js` sets `request.facility` on every request by matching the `Host` header subdomain against the `Facility.subdomain` column.

On the client, `FacilityContext` holds the current facility. `AppRoutes.jsx` conditionally renders:
- No facility → `DIDORoutes` (default facility browsing)
- `facility.type === 'LESC'` → `LESCRoutes` (hold management UI)

### Client Architecture

**Provider hierarchy** (App.jsx):
`QueryClientProvider` → `MantineProvider` → `ModalsProvider` → `ToastProvider` → `AuthContextProvider` → `FacilityContextProvider` → `FacilitySelector` → `AppLayout`

**Key patterns:**
- **State**: React Context (auth, facility, toast) + React Query v5 for server state. No Redux/Zustand.
- **UI**: Mantine v8 component library with Tabler Icons. Theme config in `AppTheme.js`.
- **Forms**: `@mantine/form` with Zod v4 validation schemas.
- **API client**: `client/src/Api.js` — Axios instance with namespaced methods (e.g., `Api.holds.create(data)`). Auto-redirects to `/login` on 401.
- **Routing**: React Router v7. Admin routes are lazy-loaded.
- **SSR**: `entry-server.jsx` renders on the server; `entry-client.jsx` hydrates in the browser. Static context injected via `window.STATIC_CONTEXT`.
- **i18n**: i18next with HTTP backend, locale files served from `/locales`.
- **Vite aliases**: `@` → `/src`, `components` → `/src/components`.

**Facility-specific code lives in separate directories:**
- `client/src/dido/` — DIDO components and routes
- `client/src/lesc/` — LESC components and routes
- `client/src/components/` — Shared components

### Server Architecture

**Framework**: Fastify v5 with auto-loaded plugins and routes.

- **Plugins** (`server/plugins/`): Auth (session-based via `@fastify/secure-session`), facility detection, Prisma client, pagination, Swagger/OpenAPI.
- **Routes** (`server/routes/api/`): RESTful endpoints for facilities, incidents, deflections, holds, users, invites, auth, feedback, assets, etc.
- **Auth decorators**: `requireUser`, `requireAdmin`, `requireRole` — provided by the auth plugin.
- **Validation**: Zod schemas with `fastify-zod-openapi` for both validation and OpenAPI doc generation.
- **Database**: PostgreSQL with Prisma v6. Schema at `server/prisma/schema.prisma`.
- **Server imports**: Use Node.js subpath imports (`#lib/*.js`, `#models/*.js`, `#prisma/*.js`, `#test/*.js`).
- **Testing**: Node.js built-in test runner with `@testcontainers/postgresql` for integration tests.

### Key Data Models (Prisma)
- **Facility**: Has a `type` (DIDO/LESC), `subdomain`, `status`, bed types, and services
- **BedType**: Tracks capacity, occupied, available, and holds counts per facility
- **Incident**: LESC-specific — tracks arrival/departure events at a facility
- **Deflection**: Tracks subjects through a lifecycle (detained → transferred → admitted → released/exited)
- **Hold**: Time-limited bed reservation with expiration and extension support
- **User**: Has roles (FIELD, CUSTODY, CARE), belongs to an Organization with Unit and Title
- **Subject**: Person being tracked through deflections (PII: name, DOB, etc.)

### Dev Services (Docker Compose)
| Service | URL |
|---------|-----|
| App | http://localhost:3333 |
| API (direct) | http://localhost:3000 |
| API Docs (Scalar) | http://localhost:3333/api/reference |
| Prisma Studio | http://localhost:5555 |
| Mailcatcher | http://localhost:1080 |
| Minio Console | http://localhost:9001 (minioadmin/minioadmin) |

### Dev Credentials (seeded)
- Admin: `admin@careconnectsf.org` / `abcd1234`
- SFPD: `sfpd@careconnectsf.org` / `abcd1234`
- SFSO: `sfso@careconnectsf.org` / `abcd1234`

## Code Style

- **JavaScript** (not TypeScript) — `.jsx` for React components, `.js` for everything else
- **ESLint** with `neostandard` preset: semicolons required, no Prettier
- **Client env vars**: Prefix with `VITE_` to expose to browser bundle
- **Feature flags**: `VITE_FEATURE_REGISTRATION` controls registration route availability
