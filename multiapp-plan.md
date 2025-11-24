Multi-App Platform Architecture
Overview
Restructure the codebase to support multiple location-specific app instances (DIDO and LESC) from a shared codebase, with subdomain-to-path routing.

Current State
Single React SPA with routes: / (Home/DIDO) and /lesc/* (LESC)
Single Fastify API server with routes under /api/*
Shared components, API client, and authentication
Target Structure
platform/
  ├── core/                    # Shared platform
  │   ├── api/                 # Core API routes (auth, facilities base)
  │   ├── data/               # Prisma schema
  │   └── ui/                 # Shared UI components
  │
  └── apps/
      ├── dido/               # DIDO app
      │   ├── frontend/       # DIDO-specific React components/routes
      │   ├── backend/        # DIDO-specific API routes
      │   └── config.js       # DIDO app configuration
      │
      └── lesc/               # LESC app
          ├── frontend/       # LESC-specific React components/routes
          ├── backend/        # LESC-specific API routes
          └── config.js       # LESC app configuration
Implementation Steps
Phase 1: Create Directory Structure
Create apps/dido/ and apps/lesc/ directories
Create core/ directory structure (api, data, ui)
Set up workspace configuration in root package.json
Tests: Verify directory structure exists, workspace config loads correctly
Phase 2: Extract Core Platform
Move Prisma schema to core/data/prisma/schema.prisma
Extract shared API routes to core/api/:
Auth routes (/api/auth/*)
Base facilities routes (/api/facilities/*)
Users, invites, passwords routes
Extract shared UI components to core/ui/:
Card, StatusBadge, Chip, CategoryIcon, etc.
Shared hooks and utilities
Create shared API client in core/ui/
Tests: 
Unit tests for core API routes (auth, facilities)
Unit tests for shared UI components
Integration tests verifying core routes still work
Phase 3: Migrate DIDO App
Move client/src/Home.jsx and related components to apps/dido/frontend/
Move DIDO-specific API routes to apps/dido/backend/
Create apps/dido/config.js with app metadata
Set up DIDO-specific routing
Tests:
Unit tests for DIDO API routes
Unit tests for DIDO frontend components
Integration tests for DIDO app routing
Phase 4: Migrate LESC App
Move client/src/LESC/* to apps/lesc/frontend/
Move LESC API routes (/api/lesc/*) to apps/lesc/backend/
Create apps/lesc/config.js with app metadata
Set up LESC-specific routing
Tests:
Unit tests for LESC API routes (holds, availability, intake)
Unit tests for LESC frontend components
Integration tests for LESC app routing
Phase 5: Location Routing System
Create location registry in core/api/locations/:
Map subdomains/paths to locations
Map locations to app types (DIDO or LESC)
Add routing middleware in server/app.js:
Detect location from subdomain or path
Route to appropriate app handler
Update frontend routing to support location-based paths
Tests:
Unit tests for location registry (subdomain/path mapping)
Unit tests for routing middleware
Integration tests for subdomain-to-path routing
E2E tests for location-based app routing
Phase 6: Update Build & Deployment
Update build scripts for multi-app structure
Configure Vite/build tools for each app
Update Docker/deployment configs
Test subdomain-to-path mapping
Tests:
Build verification tests for each app
Deployment configuration tests
Key Files to Modify
server/app.js - Add location routing middleware
client/src/App.jsx - Refactor to support app routing
package.json - Add workspace configuration
compose.yml - Update if needed for routing
Migration Strategy
Keep existing functionality working during migration
Migrate one app at a time (start with LESC, then DIDO)
Extract shared code incrementally
Test each phase before moving to next
