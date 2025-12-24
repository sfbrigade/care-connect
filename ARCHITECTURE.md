# Multi-App Platform Architecture

## Overview

Care Connect is a multi-app platform that serves multiple location-specific applications from a single codebase. Each application has its own routes, UI components, and data filtering logic, while sharing core functionality like authentication, user management, and database access.

## Applications

### DIDO (Drop in, Drop off)
- **Purpose**: Drop in centers
- **Location Code**: `DIDO`
- **App Type**: `dido`

### LESC (Law Enforcement Sobering Center)
- **Purpose**: Sobering center bed availability and hold management
- **Location Code**: `LESC`
- **App Type**: `lesc`

## Routing & Domain Configuration

### Location Registry

The location configuration is defined in `server/plugins/locations/registry.js`:

```javascript
export const LOCATIONS = {
  DIDO: {
    subdomains: ['dido'],
    appType: 'dido',
  },
  LESC: {
    subdomains: ['lesc'],
    appType: 'lesc',
  },
};
```

### Routing Methods

#### Subdomain-Based Routing
- **DIDO**: `dido.example.com`
- **LESC**: `lesc.example.com`
- **Detection**: Server extracts subdomain from `Host` header

#### Important Notes

- **Development**: When running on localhost, the client will present a selector to choose between the application types.

### Implementation

Location detection happens in the `server/plugins/locations/index.js` plugin, which:
- Runs on every request via Fastify `onRequest` hook
- Sets `request.location`, `request.appType`, and `request.locationMethod`
- Sets these to `null` if no location is detected (results in 404)

## Client-Side Location Detection

### Detection Flow

The client uses `client/src/LocationContext.js` to detect the current application.


### Usage in React Components

```javascript
import { useLocationContext } from '@/LocationContext';

function MyComponent() {
  const { location } = useLocationContext();
  
  if (!location) {
    return <NotFound />; // Root path or unknown location
  }
  
  if (location.appType === 'dido') {
    return <DIDOComponent />;
  }
  
  if (location.appType === 'lesc') {
    return <LESCComponent />;
  }
}
```

## Application-Specific Features

### DIDO App

**Routes**: 
- Home (`/`)
- Admin routes (`/admin/*`)

**Facility Filtering**:
- Shows **all facilities EXCEPT** those with `LESC` service type
- Admin routes show all facilities (no filtering)

### LESC App

**Routes**:
- Holds (`/holds`)
- History (`/history`)
- Admin routes (`/admin/*`)

**Facility Filtering**:
- Shows **only** facilities with `LESC` service type
- Admin routes show all facilities (no filtering)

**API Endpoints**:
- `GET /api/lesc/availability`: Bed availability for LESC facilities
- `GET /api/lesc/holds`: Active bed holds
- `POST /api/lesc/holds`: Create new bed hold
- `POST /api/lesc/holds/:id/extend`: Extend hold expiration
- `POST /api/lesc/holds/:id/cancel`: Cancel hold
- `POST /api/lesc/checkin`: Create check-in record

## Facility Filtering Logic

### Backend Filtering

Facility filtering happens in `server/routes/api/facilities/index.js`:

```javascript
// LESC app: Only facilities with LESC service type
if (appType === 'lesc') {
  whereClause = {
    services: {
      some: {
        serviceTypeId: lescServiceType.id,
      },
    },
  };
}

// DIDO app: Exclude facilities with LESC service type
else if (appType === 'dido') {
  whereClause = {
    services: {
      none: {
        serviceTypeId: lescServiceType.id,
      },
    },
  };
}

// Admin/shared routes: Show all facilities (no filter)
// (appType === null)
```

### Service Type Codes

- **`LESC`**: Law Enforcement Sobering Center service type
- Used for filtering facilities per application
- Only `LESC` code is used (not `SOBERING`)

## Shared Utilities

### Auto-Expire Holds

**Location**: `server/lib/lesc/lib/holds.js`

Shared utility function for auto-expiring bed holds:

```javascript
export async function autoExpireHolds(prisma, now = new Date()) {
  // Updates ACTIVE/EXTENDED holds with expiresAt <= now to EXPIRED
}
```

**Used by**:
- `server/routes/api/lesc/availability/list.js`
- `server/routes/api/lesc/holds/*.js`

### Date/Time Utilities

**Location**: `client/src/utils/dateTime.js`

Shared date/time formatting functions:
- `formatTimeRemaining`: Time until expiration
- `formatTimeUntil`: Time until a specific date
- `formatTime`: Format time with AM/PM
- `formatCreatedAt`: Format creation timestamp

## File Structure

```
care-connect/
├── client/
│   └── src/
│       ├── components/         # Shared components
│       ├── dido/
│       │   ├── components/     # DIDO-specific components
│       │   ├── routes/         # DIDO routes
│       └── lesc/
│       │   ├── components/     # LESC-specific components
│       │   ├── routes/         # LESC routes
│       ├── utils/
│       │   ├── location.js     # Client location detection
│       │   └── dateTime.js     # Date/time utilities
│       ├── Api.js              # API client
│       └── App.jsx             # Main app router
└── server/
    ├── lib/
    │   └── lesc/
    │           └── holds.js    # LESC hold utilities
    ├── plugins/
    │   └── locations/
    │       ├── registry.js     # Location configuration
    │       └── index.js        # Location detection plugin
    └── routes/
        └── api/
        │   ├── lesc/           # LESC API routes
        │   ├── locations/
        │   │   ├── registry.js # Location configuration
        │   │   └── index.js    # Location detection plugin
        │   └── facilities/
        │       └── index.js    # Facility API with filtering
        └── root.js             # Root route handler (SSR)
```

## Testing

### Facility Filtering Test

**File**: `server/test/routes/api/facilities.test.js`

Tests facility filtering logic for:
- LESC app (subdomain and Referer detection)
- DIDO app (subdomain and Referer detection)
- Admin/shared routes (no filtering)

## Development

### Running Locally

1. **Start services**: `docker compose up`
2. **Access applications**: `http://localhost:3333/`

### Environment Variables

- `SESSION_SECRET`: Required for session management
- `DATABASE_URL`: PostgreSQL connection string
- `MINIO_ENDPOINT`: S3-compatible storage endpoint
- `MINIO_ACCESS_KEY`: MinIO access key
- `MINIO_SECRET_KEY`: MinIO secret key

## Deployment Considerations

### Subdomain Configuration

For production, configure DNS and reverse proxy:

- `dido.example.com` → DIDO app
- `lesc.example.com` → LESC app
