# Deployment & Testing Plan

## Multi-App Architecture Overview

This application uses a **multi-app platform architecture** that supports multiple location-specific app instances from a shared codebase:

- **Core Platform** (`client/core/`, `server/core/`): Shared components, utilities, API routes, and authentication
- **DIDO App** (`client/apps/dido/`, `server/apps/dido/`): Default app for facility browsing and mapping
  - Accessible at: `/dido/*` or via subdomain (`dido.example.com`, `www.example.com`)
  - Uses core facilities API
- **LESC App** (`client/apps/lesc/`, `server/apps/lesc/`): Location-specific app for availability and intake
  - Accessible at: `/lesc/*` or via subdomain (`lesc.example.com`)
  - Has app-specific API routes (`/api/lesc/*`)

**Routing:**
- Path-based: `/dido/*` → DIDO app, `/lesc/*` → LESC app
- Subdomain-based: `dido.example.com` → DIDO, `lesc.example.com` → LESC (production)
- Root path (`/`) returns 404 - users must access apps via specific paths or subdomains

## Prerequisites

1. **Docker Desktop** installed and running
   - Download from: https://www.docker.com/products/docker-desktop
   - Ensure Docker is running before proceeding

2. **Node.js** (v22.19.0 or compatible)
   - Check version: `node --version`
   - Should be v22.19.0 or higher

3. **Git** (for cloning if needed)

## Step 1: Environment Setup

### 1.1 Create Environment File

```bash
cd /Users/tnegrin/projects/civic-tech/experiments/care-connect
cp server/example.env server/.env
```

The `.env` file will be created with default values. You can edit it later if needed.

### 1.2 Verify Docker is Running

```bash
docker ps
```

Should show Docker is running (may be empty, that's fine).

## Step 2: Start Development Environment

### 2.1 Pull Docker Images

```bash
docker compose pull
```

This downloads the required Docker images (PostgreSQL, Mailcatcher, Minio).

### 2.2 Start All Services

```bash
docker compose up
```

This starts:
- **PostgreSQL** database (port 5432)
- **Mailcatcher** email server (ports 1025, 1080)
- **Minio** object storage (ports 9000, 9001)
- **Server** container with Fastify + Vite dev server

Wait for output showing:
```
full-stack-starter-server-1 | VITE v7.x.x ready in XXX ms
full-stack-starter-server-1 | ➜  Local:   http://localhost:3333/
```

### 2.3 Access the Application

- **DIDO App**: http://localhost:3333/dido/
- **LESC App**: http://localhost:3333/lesc/
- **Root Path**: http://localhost:3333/ (returns 404 - use specific app paths)
- **API Server**: http://localhost:3000/
- **API Documentation**: http://localhost:3333/api/reference
- **Prisma Studio**: http://localhost:5555 (run `npm run prisma:studio -w server` in container)
- **Mailcatcher**: http://localhost:1080
- **Minio Console**: http://localhost:9001 (login: minioadmin/minioadmin)

**Note:** The application uses a multi-app architecture:
- **DIDO**: App for facility browsing and mapping (accessible at `/dido/*` or via subdomain)
- **LESC**: Location-specific app for availability and intake (accessible at `/lesc/*` or via subdomain)
- Both apps share core platform components and API routes
- Root path (`/`) returns 404 - users must access apps via specific paths

### 2.4 Create Admin User (First Time Only)

In a new terminal:

```bash
docker compose exec server bash -l
```

Then inside the container:

```bash
bin/create-admin.js YourFirstName YourLastName your.email@example.com yourpassword
```

Exit the container:

```bash
exit
```

## Step 3: Running Tests

### 3.1 Structure Tests (Multi-App Architecture Verification)

These tests verify the directory structure and migration:

```bash
# Run all structure tests
node --test server/test/structure/phase*.test.js

# Run specific phase tests
node --test server/test/structure/phase1.test.js
node --test server/test/structure/phase2.test.js
node --test server/test/structure/phase3.test.js
node --test server/test/structure/phase4.test.js
node --test server/test/structure/phase5.test.js
node --test server/test/structure/phase6.test.js
```

### 3.2 Unit Tests (API Route Tests)

**Fast Local Testing with SQLite (Recommended for Development)**

Tests run much faster using SQLite instead of Docker containers:

```bash
# Install dependencies first (if not already installed)
npm install

# Run all server tests with SQLite (fast, no Docker required)
cd server
npm test

# Or run specific test files
npm test -- test/routes/api/auth.test.js
npm test -- test/routes/api/users.test.js
npm test -- test/routes/api/invites.test.js
npm test -- test/routes/api/passwords.test.js
npm test -- test/routes/api/feedback.test.js
```

**Note:** Tests that require S3/MinIO storage (like `assets.test.js` and parts of `users.test.js`) will be skipped unless MinIO is enabled:

```bash
# Run tests with MinIO support (requires Docker)
npm run test:minio
```

**PostgreSQL + Docker Testing (For CI or Full Integration Tests)**

For tests that require PostgreSQL-specific features or full Docker setup:

```bash
# Run tests with PostgreSQL and MinIO (requires Docker)
npm run test:postgres

# Or run from Docker container
docker compose exec server bash -l
npm run test:postgres
npm test -- test/routes/api/assets.test.js
```

**Option B: Run from Docker container (recommended)**

```bash
# Enter the server container
docker compose exec server bash -l

# Inside container, run tests
npm test

# Or run specific test files
npm test -- test/routes/api/auth.test.js
```

### 3.3 Test Categories

1. **Structure Tests** (`server/test/structure/`):
   - Phase 1-6: Verify multi-app architecture migration
   - No dependencies required, run with `node --test`

2. **API Route Tests** (`server/test/routes/api/`):
   - `auth.test.js` - Authentication (login, register, logout)
   - `users.test.js` - User management
   - `invites.test.js` - Invite system
   - `assets.test.js` - File uploads (requires MinIO)
   - **Default**: Uses SQLite for fast local testing (no Docker required)
   - **PostgreSQL mode**: Use `npm run test:postgres` for full Docker/PostgreSQL testing
   - **MinIO mode**: Use `npm run test:minio` for tests requiring S3 storage
   - **Docker mode**: Requires Docker running, Testcontainers will spin up test DB/storage

## Step 4: Verify Application Functionality

### 4.1 Test DIDO App

1. Open http://localhost:3333/dido/
2. Should show facility browsing interface (Home component)
3. Should display map and facility list

**Verify root path returns 404:**
1. Open http://localhost:3333/
2. Should show 404 page (not DIDO app)

### 4.2 Test LESC App (Path-based)

1. Open http://localhost:3333/lesc/
2. Should redirect to http://localhost:3333/lesc/availability
3. Should show LESC availability interface

### 4.3 Test Multi-App Routing

Verify that both apps are properly isolated:
- `/dido/*` routes to DIDO app
- `/lesc/*` routes to LESC app
- `/` returns 404 (no default app)
- Each app loads its own components and routes

### 4.4 Test Subdomain-based Routing (requires local DNS)

For subdomain testing, you'll need to configure local DNS:

**macOS/Linux:**
```bash
# Edit /etc/hosts
sudo nano /etc/hosts

# Add:
127.0.0.1 dido.localhost
127.0.0.1 lesc.localhost
127.0.0.1 localhost
```

Then access:
- **DIDO**: http://dido.localhost:3333/ (or http://localhost:3333/)
- **LESC**: http://lesc.localhost:3333/

**Note:** Subdomain routing works in production with proper DNS/reverse proxy setup. The application detects location from either subdomain or URL path.

### 4.5 Test API Endpoints

```bash
# Test core API (shared by both apps)
curl http://localhost:3000/api/facilities

# Test LESC-specific API
curl http://localhost:3000/api/lesc/availability

# Test auth (should require credentials)
curl http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test"}'
```

**API Structure:**
- **Core API** (`/api/*`): Shared routes used by all apps (auth, facilities, users, invites, passwords, feedback, assets)
- **LESC API** (`/api/lesc/*`): LESC-specific routes (availability, holds, intake, checkin)
- **DIDO API**: Uses core facilities API (no app-specific routes)

## Step 5: Development Workflow

### 5.1 Making Changes

1. Edit files in your editor
2. Changes are automatically detected:
   - **Client**: Vite hot-reloads (check browser console)
   - **Server**: Fastify auto-reloads (check terminal output)

### 5.2 Viewing Logs

```bash
# View all container logs
docker compose logs -f

# View specific service logs
docker compose logs -f server
docker compose logs -f db
```

### 5.3 Database Access

**Prisma Studio (Web UI):**
```bash
docker compose exec server bash -l
npm run prisma:studio -w server
```
Then open http://localhost:5555

**Direct Database Access:**
```bash
docker compose exec db psql -U postgres -d app
```

### 5.4 Stopping Services

```bash
# Stop all services (Ctrl+C in docker compose up terminal)
# Or in another terminal:
docker compose stop

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (clears database)
docker compose down -v
```

## Step 6: Troubleshooting

### 6.1 Port Already in Use

If ports 3000, 3333, 5432, etc. are already in use:

```bash
# Find what's using the port
lsof -i :3333
lsof -i :3000

# Stop conflicting services or modify compose.override.yml ports
```

### 6.2 Database Connection Issues

```bash
# Check if database container is running
docker compose ps

# Restart database
docker compose restart db

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d db
docker compose exec server bash -l -c "npm run dev -w server"
```

### 6.3 Test Failures

**Structure tests failing:**
- Check that all migration phases completed
- Verify directory structure exists
- Run: `node --test server/test/structure/phase*.test.js`

**API tests failing:**
- Ensure Docker is running
- Check Testcontainers can create containers
- Verify no port conflicts
- Check test database isn't locked: `docker ps` (look for testcontainers)

**Clean up test containers:**
```bash
# List all containers
docker ps -a

# Remove test containers
docker ps -a | grep testcontainers | awk '{print $1}' | xargs docker rm -f
```

### 6.4 Build Issues

```bash
# Clean install
rm -rf node_modules client/node_modules server/node_modules
npm install

# Rebuild in container
docker compose exec server bash -l
npm install
npm run build -w client  # Builds both DIDO and LESC apps with shared core chunks
npm run prisma:generate -w server
```

**Multi-App Build Notes:**
- The build process creates optimized bundles with shared core chunks
- Both DIDO and LESC apps are built together
- Core platform code is split into shared chunks for better performance
- Each app loads its own route components lazily

## Production Deployment Considerations

### Reverse Proxy Configuration

For production deployment with subdomain routing, configure your reverse proxy (nginx, Caddy, etc.) to:

1. **Route subdomains to the application:**
   - `dido.example.com` → application server
   - `lesc.example.com` → application server
   - `www.example.com` → application server (defaults to DIDO)
   - `example.com` → application server (defaults to DIDO)

2. **Pass Host header** so the application can detect the subdomain:
   ```nginx
   proxy_set_header Host $host;
   proxy_set_header X-Forwarded-Host $host;
   ```

3. **Path-based routing also works** if subdomains aren't configured:
   - `/dido/*` → DIDO app
   - `/lesc/*` → LESC app
   - `/` → 404 (no default app)

### Environment Variables

Ensure these are set in production:
- `DATABASE_URL`: Production database connection string
- `VITE_SITE_TITLE`: Site title for the application
- `VITE_FEATURE_REGISTRATION`: Enable/disable registration
- Other environment-specific variables from `server/example.env`

### Build for Production

```bash
# Build client (creates optimized production bundles)
npm run build -w client

# Generate Prisma client
npm run prisma:generate -w server

# Run migrations
npm run prisma:migrate:deploy -w server
```

## Quick Reference Commands

```bash
# Start everything
docker compose up

# Start in background
docker compose up -d

# Stop everything
docker compose stop

# View logs
docker compose logs -f server

# Enter server container
docker compose exec server bash -l

# Run structure tests
node --test server/test/structure/phase*.test.js

# Run unit tests (from container)
docker compose exec server bash -l -c "npm test"

# Create admin user
docker compose exec server bash -l -c "bin/create-admin.js First Last email@example.com password"

# Access database
docker compose exec db psql -U postgres -d app

# Prisma Studio
docker compose exec server bash -l -c "npm run prisma:studio -w server"
```

## Testing Checklist

- [ ] Docker Desktop is running
- [ ] `docker compose up` starts all services
- [ ] Application accessible at http://localhost:3333/
- [ ] DIDO app loads at http://localhost:3333/dido/
- [ ] LESC app loads at http://localhost:3333/lesc/
- [ ] Root path (/) returns 404 page
- [ ] Both apps are properly isolated (no route conflicts)
- [ ] Structure tests pass: `node --test server/test/structure/phase*.test.js`
- [ ] Unit tests pass: `docker compose exec server bash -l -c "npm test"`
- [ ] Admin user can be created
- [ ] Core API endpoints respond correctly (`/api/facilities`, `/api/auth/*`, etc.)
- [ ] LESC API endpoints respond correctly (`/api/lesc/availability`, etc.)
- [ ] Database accessible via Prisma Studio

