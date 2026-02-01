# Platform Architecture

## Overview

Care Connect is a platform that serves different facility-specific interfaces from a single codebase. Each facility type has its own routes, UI components, and data filtering logic, while sharing core functionality like authentication, user management, and database access.

## Facility Types

### DIDO (Drop in, Drop off)
- **Purpose**: Drop in centers
- **Type Code**: `DIDO`

### LESC (Law Enforcement Sobering Center)
- **Purpose**: Sobering center bed availability and hold management
- **Type Code**: `LESC`

## Routing & Domain Configuration

### Routing Methods

#### Subdomain-Based Routing
- **LESC**: `reset.example.com` for the RESET facility
- **Detection**: Server extracts subdomain from `Host` header

#### Important Notes

- **Development**: When running on localhost, the client will present a selector to choose between the facilities or none- the root domain, which for now shows the DIDO list/map interface.

### Implementation

Location detection happens in the `server/plugins/facility.js` plugin, which:
- Runs on every request via Fastify `onRequest` hook
- Sets `request.facility` to the facility with a matching subdomain, or `null` if no facility with a matching subdomain is detected

## Client-Side Location Detection

### Detection Flow

The client uses `client/src/FacilityContext.js` to manage the current facility if any.


### Usage in React Components

```javascript
import { useFacilityContext } from '@/FacilityContext';

function MyComponent() {
  const { facility } = useFacilityContext();
  
  if (!facility) {
    return <NotFound />; // Root path or unknown location
  }
  
  if (facility.type === 'DIDO') {
    return <DIDOComponent />;
  }
  
  if (facility.type === 'LESC') {
    return <LESCComponent />;
  }
}
```

## Shared Utilities

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
    │   └── facility.js         # Facility detection plugin
    │
    └── routes/
        └── api/
        │   ├── lesc/*          # LESC API routes
        │   └── facilities/*    # Facilities API
        │   └── holds/*         # Holds API
        └── root.js             # Root route handler (SSR)
```

## Testing

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

For production, point a wildcard subdomain to the server

- `*.example.com` → Care Connect app
