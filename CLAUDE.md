# Care Connect

Multi-facility crisis response management system for San Francisco first responders.

## Tech Stack

- **Frontend**: React 19, Vite, Mantine 8, React Router 7, TanStack Query
- **Backend**: Fastify, Prisma, PostgreSQL, Zod
- **Infrastructure**: Docker Compose, MinIO (S3), Mailcatcher (dev email)

## Project Structure

```
care-connect/
├── client/                 # React SPA (npm workspace)
│   └── src/
│       ├── components/     # Shared UI components
│       ├── dido/           # DIDO facility app
│       ├── lesc/           # LESC facility app
│       ├── Admin/          # Admin interface
│       ├── Api.js          # Axios API client
│       └── AppTheme.js     # Mantine theme config
├── server/                 # Fastify API (npm workspace)
│   ├── routes/api/         # File-based routing (autoload)
│   ├── plugins/            # Fastify middleware
│   ├── models/             # Zod schemas
│   └── prisma/schema.prisma
└── compose.yml
```

## Commands

```bash
# Development (via Docker)
docker compose up
docker compose exec server bash -l   # Enter container

# From inside container or locally
npm test                    # All tests
npm test -w client          # Client only (Vitest)
npm test -w server          # Server only (node:test + Testcontainers)
npm run lint                # Lint with auto-fix
```

## Multi-Facility Architecture

The app serves DIDO and LESC facilities from a single codebase:
- Server: `plugins/facility.js` detects subdomain (lesc.* vs default)
- Client: `FacilityContext` renders facility-specific components

## Testing

- **Server**: `node:test` with Testcontainers (PostgreSQL, MinIO). Fixtures in `/server/test/fixtures/db/*.yml`
- **Client**: Vitest with Playwright. Run `npm run storybook -w client` for component docs

See `/server/test/helper.js` for test utilities (`build`, `authenticate`, `upload`).

## UI System

Uses Mantine with custom theme. Primary color is `indigo.6`. Custom variants in CSS Modules (`/client/src/components/*.module.css`).
