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

The location configuration is defined in `server/core/api/locations/registry.js`:

```javascript
export const LOCATIONS = {
  DIDO: {
    subdomains: ['dido'],
    paths: ['/dido'],
    appType: 'dido',
  },
  LESC: {
    subdomains: ['lesc'],
    paths: ['/lesc'],
    appType: 'lesc',
  },
};
```

### Routing Methods

The platform supports three methods for routing requests to the correct application:

#### 1. Subdomain-Based Routing
- **DIDO**: `dido.example.com`
- **LESC**: `lesc.example.com`
- **Detection**: Server extracts subdomain from `Host` header
- **Client**: Browser extracts subdomain from `window.location.hostname`

#### 2. Path-Based Routing
- **DIDO**: `example.com/dido/*`
- **LESC**: `example.com/lesc/*`
- **Detection**: Server extracts path from request URL
- **Client**: Browser extracts path from `window.location.pathname`

#### 3. Referer Header (API Requests)
- **Use Case**: API requests like `/api/facilities` don't include app paths
- **Detection**: Server extracts app path from `Referer` header
- **Example**: Request to `/api/facilities` with `Referer: http://localhost:3000/dido/facilities` → detected as DIDO

### How Subdomain and Path Routing Interact

Subdomain and path routing work together with a **priority-based fallback system**:

#### Detection Priority (Server-Side)

The server checks routing methods in this order:

1. **Subdomain** (highest priority)
   - Checks `Host` header: `dido.example.com` → DIDO
   - If subdomain matches, **path is ignored** for detection purposes
   - Example: `dido.example.com/lesc/availability` → Detected as **DIDO** (subdomain wins)

2. **Path** (fallback)
   - Only checked if no subdomain match
   - Checks URL path: `/lesc/availability` → LESC
   - Example: `example.com/lesc/availability` → Detected as **LESC** (path used)

3. **Referer Header** (API only)
   - Only for API requests without app paths
   - Checks `Referer` header for app path
   - Example: Request to `/api/facilities` with `Referer: http://localhost:3000/dido/facilities` → Detected as **DIDO**

#### Detection Priority (Client-Side)

The client follows the same priority:

1. **Subdomain** (checked first)
   - Extracts from `window.location.hostname`
   - Example: `dido.localhost:3000` → DIDO

2. **Path** (fallback)
   - Only checked if no subdomain match
   - Extracts from `window.location.pathname`
   - Example: `localhost:3000/dido` → DIDO

#### Practical Examples

**Example 1: Staging environment hosting both apps**
```
URL: lesc-dev.careconnectsf.org/lesc
Host header: "lesc-dev.careconnectsf.org"
Subdomain: "lesc-dev" (doesn't match configured subdomains: "dido" or "lesc")
Path: "/lesc" → Matches LESC path

Result: Detected as LESC (path-based routing used as fallback)

URL: lesc-dev.careconnectsf.org/dido
Host header: "lesc-dev.careconnectsf.org"
Subdomain: "lesc-dev" (doesn't match configured subdomains)
Path: "/dido" → Matches DIDO path

Result: Detected as DIDO (path-based routing used as fallback)
```

**Why this works**: The staging subdomain `lesc-dev` doesn't match any configured location subdomains (`dido` or `lesc`), so subdomain detection returns `null`. The system then falls back to path-based detection, which matches `/lesc` or `/dido`. This allows a single staging domain (`lesc-dev.careconnectsf.org`) to host both apps via path-based routing, without requiring separate subdomains for each app.

**Example 2: Accessing different app path from subdomain**
```
URL: lesc.careconnectsf.org/dido
Host header: "lesc.careconnectsf.org"
Subdomain: "lesc" → Matches LESC location
Path: "/dido" → Would match DIDO if subdomain didn't match

Detection Result: Detected as LESC (subdomain wins, path ignored for location detection)

Routing Result: 
- App is set to LESC (LESCRoutes component loaded)
- Path "/dido" is passed to LESCRoutes
- LESCRoutes has no route matching "/dido"
- Result: 404 Not Found (or blank page)
```

**Why this happens**: Subdomain detection takes priority. Even though the path suggests DIDO, the `lesc` subdomain matches first, so the app is detected as LESC. The `/dido` path is then passed to `LESCRoutes`, which has no matching route (it only has routes like `/availability`, `/holds`, etc.), resulting in a 404.

**Note**: To access the DIDO app from `lesc.careconnectsf.org`, users would need to navigate to `dido.careconnectsf.org` (the correct subdomain) or use a path-based URL if accessing from a domain without a matching subdomain.

#### Why This Design?

1. **Subdomain Priority**: In production, subdomains are the primary routing method (cleaner URLs, better for CDN/SSL)
2. **Path Fallback**: Allows development/testing without DNS configuration
3. **Flexibility**: Supports both routing methods simultaneously
4. **API Compatibility**: Referer header ensures API requests work regardless of routing method

#### Justification for Keeping Both Methods

While production uses subdomains exclusively (`dido.careconnectsf.org`, `lesc.careconnectsf.org`), the platform maintains both subdomain and path-based routing for the following reasons:

**Development & Testing**
- **No DNS Configuration Required**: Developers can test locally using path-based routing (`localhost:3000/dido`) without configuring local DNS or `/etc/hosts` entries
- **Faster Iteration**: Path-based routing allows immediate testing without DNS propagation delays
- **CI/CD Compatibility**: Automated tests can run without subdomain configuration

**Production Flexibility**
- **Subdomain Primary**: Production uses subdomains (`dido.careconnectsf.org`, `lesc.careconnectsf.org`) for cleaner URLs and better SEO
- **Path Fallback**: If subdomain routing fails (DNS issues, misconfiguration), path-based routing provides redundancy
- **Migration Path**: Allows gradual migration from path-based to subdomain-based routing without breaking existing links

**Code Simplicity**
- **Single Codebase**: One codebase handles both routing methods, reducing maintenance overhead
- **Priority System**: Subdomain detection takes precedence, so there's no ambiguity when both are present
- **No Breaking Changes**: Existing path-based URLs continue to work even after subdomain deployment

**API Request Handling**
- **Referer Header**: API requests (`/api/facilities`) don't include app paths, so the Referer header detection ensures correct filtering regardless of routing method used
- **Consistent Behavior**: Whether accessed via `dido.careconnectsf.org/api/facilities` or `careconnectsf.org/dido/api/facilities`, the API correctly identifies the app context

In summary, keeping both methods provides development convenience while maintaining production flexibility, all with minimal code complexity.

#### Important Notes

- **Subdomain always wins**: If a subdomain matches, the path is ignored for location detection
- **Path still matters**: Even with subdomain routing, the path determines which route within the app loads
- **No conflict**: Both methods can coexist - subdomain determines the app, path determines the route within that app
- **Development**: Use path-based routing (`localhost:3000/dido`) when subdomains aren't configured
- **Production**: Use subdomain-based routing (`dido.example.com`) for cleaner URLs

### Root Path Behavior

**Important**: The root path (`/`) returns a **404 Not Found**. There is no default application or backward compatibility.

- `/` → 404 Not Found
- `/dido` → DIDO app
- `/lesc` → LESC app

## Server-Side Location Detection

### Detection Flow

1. **Subdomain Check**: Extract subdomain from `Host` header
2. **Path Check**: Extract path from request URL
3. **Referer Check** (API only): Extract path from `Referer` header
4. **Return**: Location object with `location`, `appType`, and `method`, or `null` if no match

### Location Object Structure

```javascript
{
  location: 'DIDO' | 'LESC',
  appType: 'dido' | 'lesc',
  method: 'subdomain' | 'path' | 'referer'
}
```

### Implementation

Location detection happens in the `server/core/api/locations/index.js` plugin, which:
- Runs on every request via Fastify `onRequest` hook
- Sets `request.location`, `request.appType`, and `request.locationMethod`
- Sets these to `null` if no location is detected (results in 404)

## Client-Side Location Detection

### Detection Flow

The client uses `client/core/utils/location.js` to detect the current application:

1. **SSR Check**: Returns `null` if `window` is undefined (server-side rendering)
2. **Subdomain Check**: Extract subdomain from `window.location.hostname`
3. **Path Check**: Extract path from `window.location.pathname`
4. **Return**: Location object matching server structure, or `null` if no match

### Usage in React Components

```javascript
import { getLocation } from '../core/utils/location';

function MyComponent() {
  const location = getLocation();
  
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

**Routes**: `/dido/*`
- Home (`/dido/`)
- Facilities (`/dido/facilities`)
- Admin routes (`/dido/admin/*`)

**Facility Filtering**:
- Shows **all facilities EXCEPT** those with `LESC` service type
- Admin routes show all facilities (no filtering)

**UI Components**:
- `DIDOHeader`: Navigation with Home, Admin Facilities, Admin menu
- `DIDOMobileNavbar`: Mobile navigation (no hamburger menu)

### LESC App

**Routes**: `/lesc/*`
- Availability (`/lesc/`)
- Holds (`/lesc/holds`)
- History (`/lesc/history`)
- Admin routes (`/lesc/admin/*`)

**Facility Filtering**:
- Shows **only** facilities with `LESC` service type
- Admin routes show all facilities (no filtering)

**UI Components**:
- `LESCHeader`: Navigation with Availability, Holds, History
- `LESCMobileNavbar`: Mobile navigation with hamburger menu linking to Holds and Facilities

**API Endpoints**:
- `GET /api/lesc/availability`: Bed availability for LESC facilities
- `GET /api/lesc/holds`: Active bed holds
- `POST /api/lesc/holds`: Create new bed hold
- `POST /api/lesc/holds/:id/extend`: Extend hold expiration
- `POST /api/lesc/holds/:id/cancel`: Cancel hold
- `POST /api/lesc/checkin`: Create check-in record

## Facility Filtering Logic

### Backend Filtering

Facility filtering happens in `server/core/api/facilities/index.js`:

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

**Location**: `server/apps/lesc/lib/holds.js`

Shared utility function for auto-expiring bed holds:

```javascript
export async function autoExpireHolds(prisma, now = new Date()) {
  // Updates ACTIVE/EXTENDED holds with expiresAt <= now to EXPIRED
}
```

**Used by**:
- `server/apps/lesc/api/availability.js`
- `server/apps/lesc/api/holds/index.js`

### Date/Time Utilities

**Location**: `client/core/utils/dateTime.js`

Shared date/time formatting functions:
- `formatTimeRemaining`: Time until expiration
- `formatTimeUntil`: Time until a specific date
- `formatTime`: Format time with AM/PM
- `formatCreatedAt`: Format creation timestamp

## File Structure

```
care-connect/
├── client/
│   ├── apps/
│   │   ├── dido/
│   │   │   ├── components/     # DIDO-specific components
│   │   │   ├── routes/         # DIDO routes
│   │   │   └── config.js       # DIDO configuration
│   │   └── lesc/
│   │       ├── components/     # LESC-specific components
│   │       ├── routes/          # LESC routes
│   │       └── config.js        # LESC configuration
│   ├── core/
│   │   ├── components/         # Shared components
│   │   ├── utils/
│   │   │   ├── location.js     # Client location detection
│   │   │   └── dateTime.js     # Date/time utilities
│   │   └── Api.js              # API client
│   └── src/
│       └── App.jsx              # Main app router
└── server/
    ├── apps/
    │   └── lesc/
    │       ├── api/             # LESC API routes
    │       └── lib/
    │           └── holds.js      # Shared hold utilities
    ├── core/
    │   └── api/
    │       ├── locations/
    │       │   ├── registry.js  # Location configuration
    │       │   └── index.js     # Location detection plugin
    │       └── facilities/
    │           └── index.js      # Facility API with filtering
    └── routes/
        └── root.js              # Root route handler (SSR)
```

## Testing

### Location Sync Test

**File**: `server/test/structure/location-sync.test.js`

Ensures client-side location detection (`client/core/utils/location.js`) stays in sync with server-side location registry (`server/core/api/locations/registry.js`).

### Facility Filtering Test

**File**: `server/test/routes/api/facilities.test.js`

Tests facility filtering logic for:
- LESC app (subdomain and Referer detection)
- DIDO app (subdomain and Referer detection)
- Admin/shared routes (no filtering)

## Development

### Running Locally

1. **Start services**: `docker compose up`
2. **Access applications**:
   - DIDO: `http://localhost:3000/dido`
   - LESC: `http://localhost:3000/lesc`
   - Root: `http://localhost:3000/` → 404

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
- `example.com/dido/*` → DIDO app (path-based fallback)
- `example.com/lesc/*` → LESC app (path-based fallback)

### Reverse Proxy (Nginx Example)

```nginx
# Subdomain routing
server {
    server_name dido.example.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}

server {
    server_name lesc.example.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}

# Path-based routing fallback
server {
    server_name example.com;
    location /dido {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
    location /lesc {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

## Adding a New Application

To add a third application (e.g., "SHELTER"), follow these steps:

### Step 1: Update Location Registry

**File**: `server/core/api/locations/registry.js`

Add the new location to the `LOCATIONS` object:

```javascript
export const LOCATIONS = {
  DIDO: {
    subdomains: ['dido'],
    paths: ['/dido'],
    appType: 'dido',
  },
  LESC: {
    subdomains: ['lesc'],
    paths: ['/lesc'],
    appType: 'lesc',
  },
  SHELTER: {  // New app
    subdomains: ['shelter'],
    paths: ['/shelter'],
    appType: 'shelter',
  },
};
```

### Step 2: Update Client Location Detection

**File**: `client/core/utils/location.js`

Add detection logic for the new app:

```javascript
// Check for SHELTER subdomain
if (subdomain === 'shelter') {
  return {
    location: 'SHELTER',
    appType: 'shelter',
    method: 'subdomain',
  };
}

// Check path
if (pathname.startsWith('/shelter')) {
  return {
    location: 'SHELTER',
    appType: 'shelter',
    method: 'path',
  };
}
```

### Step 3: Create App Directory Structure

Create the app-specific directories:

```bash
mkdir -p client/apps/shelter/components
mkdir -p client/apps/shelter/routes
mkdir -p server/apps/shelter/api  # If app needs API routes
```

### Step 4: Create App Configuration

**File**: `client/apps/shelter/config.js`

```javascript
export default {
  name: 'SHELTER',
  routes: {
    prefix: '/shelter',
  },
};
```

### Step 5: Create App Routes

**File**: `client/apps/shelter/routes/SHELTERRoutes.jsx`

```javascript
import { Routes, Route } from 'react-router';
import Home from '../components/Home';

export default function SHELTERRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Add more routes as needed */}
    </Routes>
  );
}
```

### Step 6: Create App-Specific Components

**File**: `client/apps/shelter/components/SHELTERHeader.jsx`

```javascript
import { Header } from '@mantine/core';
import { Link } from 'react-router';

export default function SHELTERHeader() {
  return (
    <Header height={60} px="md">
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <Link to="/shelter">SHELTER</Link>
        {/* Add navigation links */}
      </div>
    </Header>
  );
}
```

**File**: `client/apps/shelter/components/SHELTERMobileNavbar.jsx`

```javascript
import { Navbar } from '@mantine/core';
import { Link } from 'react-router';

export default function SHELTERMobileNavbar({ opened, onClose }) {
  return (
    <Navbar hidden={!opened} width={{ base: '100%' }}>
      <Navbar.Section>
        <Link to="/shelter" onClick={onClose}>Home</Link>
        {/* Add navigation links */}
      </Navbar.Section>
    </Navbar>
  );
}
```

### Step 7: Update Main App Router

**File**: `client/src/App.jsx`

Add lazy imports:

```javascript
const SHELTERRoutes = lazy(() => import('../apps/shelter/routes/SHELTERRoutes'));
const SHELTERHeader = lazy(() => import('../apps/shelter/components/SHELTERHeader'));
const SHELTERMobileNavbar = lazy(() => import('../apps/shelter/components/SHELTERMobileNavbar'));
```

Update the route selection logic:

```javascript
const AppRoutes = useMemo(() => {
  if (!location) return null;
  
  switch (location.appType) {
    case 'lesc':
      return LESCRoutes;
    case 'dido':
      return DIDORoutes;
    case 'shelter':  // New case
      return SHELTERRoutes;
    default:
      return null;
  }
}, [location]);
```

Update header and mobile navbar selection:

```javascript
const HeaderComponent = useMemo(() => {
  if (!location) return null;
  
  switch (location.appType) {
    case 'lesc':
      return LESCHeader;
    case 'dido':
      return DIDOHeader;
    case 'shelter':  // New case
      return SHELTERHeader;
    default:
      return null;
  }
}, [location]);

const MobileNavbarComponent = useMemo(() => {
  if (!location) return null;
  
  switch (location.appType) {
    case 'lesc':
      return LESCMobileNavbar;
    case 'dido':
      return DIDOMobileNavbar;
    case 'shelter':  // New case
      return SHELTERMobileNavbar;
    default:
      return null;
  }
}, [location]);
```

Add route for the new app:

```javascript
<Routes>
  {/* Existing routes */}
  <Route path="/shelter/*" element={<AppRoutes />} />
</Routes>
```

### Step 8: Add Facility Filtering (If Needed)

**File**: `server/core/api/facilities/index.js`

If the new app needs facility filtering, update the filtering logic:

```javascript
const shelterServiceType = (appType === 'shelter' || appType === 'dido' || appType === 'lesc')
  ? await fastify.prisma.serviceType.findUnique({
      where: { code: 'SHELTER' },
      select: { id: true },
    })
  : null;

if (appType === 'shelter') {
  // SHELTER app: Only show facilities with SHELTER service type
  if (shelterServiceType) {
    whereClause = {
      services: {
        some: {
          serviceTypeId: shelterServiceType.id,
        },
      },
    };
  } else {
    return reply.send([]);
  }
} else if (appType === 'dido') {
  // DIDO app: Exclude facilities with LESC service type
  // (may also want to exclude SHELTER if needed)
  if (lescServiceType) {
    whereClause = {
      services: {
        none: {
          serviceTypeId: lescServiceType.id,
        },
      },
    };
  }
}
```

### Step 9: Add App-Specific API Routes (Optional)

**File**: `server/apps/shelter/api/index.js`

```javascript
export default async function (fastify, opts) {
  fastify.register(import('./beds/index.js'), { prefix: '/beds' });
  // Add more routes as needed
}
```

**File**: `server/app.js`

Register the new app's API routes:

```javascript
fastify.register(import('./apps/shelter/api/index.js'), { prefix: '/api/shelter' });
```

### Step 10: Update Tests

**File**: `server/test/structure/location-sync.test.js`

The location sync test will automatically pick up the new location from the registry, but verify it works:

```bash
node --test server/test/structure/location-sync.test.js
```

### Step 11: Test the New App

1. **Path-based access**: `http://localhost:3000/shelter`
2. **Subdomain-based access**: `http://shelter.localhost:3000` (if configured)
3. **Verify routing**: Ensure routes load correctly
4. **Verify filtering**: If facility filtering was added, test it works


