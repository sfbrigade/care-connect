# Build & Deployment Guide

## Multi-App Architecture

This application uses a multi-app architecture with a shared core platform:

- **Core Platform** (`core/`): Shared API routes, UI components, and utilities
- **DIDO App** (`apps/dido/`): Default app for facility browsing
- **LESC App** (`apps/lesc/`): Law Enforcement Sobering Center app

## Build Process

The build process creates a single SPA (Single Page Application) that dynamically loads app-specific code based on location detection.

### Client Build

```bash
npm run build --workspace client
```

This builds:
- `client/dist/client/` - Client-side bundle (browser)
- `client/dist/server/` - Server-side rendering bundle

The build uses code splitting to create separate chunks for:
- Core platform code (shared)
- DIDO app code (loaded dynamically)
- LESC app code (loaded dynamically)

### Server Build

```bash
npm run build --workspace server
```

This generates the Prisma client and prepares the server for production.

### Full Build

```bash
npm run build
```

Builds both client and server.

## Location-Based Routing

The application supports two routing methods:

1. **Subdomain routing**: `lesc.example.com` → LESC app, `example.com` → DIDO app
2. **Path routing**: `/lesc/*` → LESC app, `/` → DIDO app

### Subdomain Setup

To enable subdomain routing in production, configure your reverse proxy (nginx/traefik) to:
- Route `lesc.yourdomain.com` to the application
- Route `yourdomain.com` (or `www.yourdomain.com`) to the application
- Pass the `Host` header to the application

### Path-Based Routing

Path-based routing works out of the box:
- `/lesc/*` routes to LESC app
- `/*` routes to DIDO app (default)

## Docker Build

The Dockerfile builds the application for production:

```bash
docker compose build server
```

The build process:
1. Installs all dependencies
2. Builds the client application
3. Generates Prisma client
4. Prepares the server for production

## Development

For local development:

```bash
docker compose up
```

This starts:
- Database (PostgreSQL)
- Mailcatcher (development email server)
- Minio (S3-compatible storage)
- Server (Fastify + Vite dev server)

Access:
- Application: http://localhost:3333
- API: http://localhost:3000
- Prisma Studio: http://localhost:5555
- Mailcatcher: http://localhost:1080
- Minio Console: http://localhost:9001

## Production Deployment

1. Set environment variables (see `server/example.env`)
2. Build the Docker image: `docker compose build server`
3. Deploy with appropriate reverse proxy configuration for subdomain routing
4. Ensure location detection works correctly (check `Host` header forwarding)

## Testing Build

To verify the build works:

```bash
npm run build
```

Then test the production build locally:

```bash
npm start --workspace server
```

Access at http://localhost:3000

