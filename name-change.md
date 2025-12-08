# Plan: Rename LESC to RESET

## Overview
This document outlines the comprehensive plan to rename LESC (Law Enforcement Sobering Center) to RESET throughout the entire codebase. This includes URLs, routes, component names, display text, and configuration.

---

## Phase 1: Directory and File Structure

### Client-side
- [ ] Rename directory: `client/apps/lesc/` → `client/apps/reset/`
- [ ] Rename files:
  - `LESCRoutes.jsx` → `RESETRoutes.jsx`
  - `LESCHeader.jsx` → `RESETHeader.jsx`
  - `LESCMobileNavbar.jsx` → `RESETMobileNavbar.jsx`
  - `LESCFacility.jsx` → `RESETFacility.jsx`
  - `LESCCard.jsx` → `RESETCard.jsx`
  - `LESCFacility.stories.jsx` → `RESETFacility.stories.jsx`
  - `LESCCard.stories.jsx` → `RESETCard.stories.jsx`

### Server-side
- [ ] Rename directory: `server/apps/lesc/` → `server/apps/reset/`
- [ ] Rename test directory: `server/test/routes/api/lesc/` → `server/test/routes/api/reset/`

---

## Phase 2: URL Path Changes

### Frontend Routes
- [ ] `client/src/App.jsx`: Change route path `/lesc/*` → `/reset/*`
- [ ] `client/src/AppRedirectsConfig.js`: Update `AUTH_PROTECTED_PATHS` from `/lesc/*` → `/reset/*`
- [ ] `client/src/Home.jsx`: Update navigation link from `/lesc` → `/reset`
- [ ] `client/src/Header.jsx`: Update navigation links
- [ ] `client/src/MobileNavbar.jsx`: Update navigation links
- [ ] `client/src/Login.jsx`: Update path detection logic
- [ ] All component files: Update internal navigation links (`/lesc/*` → `/reset/*`)

### API Routes
- [ ] `server/app.js`: Change API prefix `/api/lesc` → `/api/reset`
- [ ] `server/apps/reset/api/index.js`: Update route prefix if defined
- [ ] `client/core/Api.js`: Update all API method paths:
  - `lesc.availability()` → `reset.availability()`
  - `lesc.holds.*` → `reset.holds.*`
  - `lesc.checkin.*` → `reset.checkin.*`

---

## Phase 3: Location Detection and App Type

### Backend Location Registry
- [ ] `server/core/api/locations/registry.js`:
  - Update `LOCATIONS` object: `LESC` → `RESET`
  - Change `appType: 'lesc'` → `appType: 'reset'`
  - Change `subdomains: ['lesc']` → `subdomains: ['reset']`
  - Change `paths: ['/lesc']` → `paths: ['/reset']`

### Client Location Utils
- [ ] `client/core/utils/location.js`:
  - Update subdomain check: `subdomain === 'lesc'` → `subdomain === 'reset'`
  - Update path check: `pathname.startsWith('/lesc')` → `pathname.startsWith('/reset')`
  - Change location name: `'LESC'` → `'RESET'`
  - Change appType: `appType: 'lesc'` → `appType: 'reset'`
  - Update `getAppRoutes()` switch: `case 'lesc':` → `case 'reset':`

---

## Phase 4: Component and Variable Names

### Import/Export Updates
- [ ] `client/src/App.jsx`:
  - Change import: `LESCRoutes` → `RESETRoutes`
  - Change import: `LESCHeader` → `RESETHeader`
  - Change import: `LESCMobileNavbar` → `RESETMobileNavbar`
  - Update component references in JSX
  - Update conditional logic: `appType === 'lesc'` → `appType === 'reset'`

- [ ] `client/src/Header.jsx`: Update app name detection logic
- [ ] `client/src/Login.jsx`: Update app name detection logic
- [ ] All component files: Update component names and references

---

## Phase 5: String Literals and Display Text

### Display Names
- [ ] Search and replace all string literals:
  - `'LESC'` → `'RESET'`
  - `"LESC"` → `"RESET"`
  - `'lesc'` → `'reset'` (where appropriate for display)
  - `"lesc"` → `"reset"` (where appropriate for display)

### Configuration Files
- [ ] `client/apps/reset/config.js`:
  - `name: 'LESC'` → `name: 'RESET'`
  - Update `displayName` to new description
  - Update `description`
  - `routes.prefix: '/lesc'` → `routes.prefix: '/reset'`

- [ ] `server/apps/reset/config.js`: Same updates

### Comments and Documentation
- [ ] Update comments referencing LESC
- [ ] `ARCHITECTURE.md`: Update all LESC references
- [ ] `BUILD.md`: Update LESC references
- [ ] `DEPLOYMENT.md`: Update LESC references
- [ ] `qr-code-transfer-plan.md`: Update LESC references
- [ ] `CareConnect - LESC - PRD.md`: Consider renaming file

---

## Phase 6: Backend Logic Updates

### Facility Filtering
- [ ] `server/core/api/facilities/index.js`:
  - `appType === 'lesc'` → `appType === 'reset'`
  - Update service type filtering comments

### Service Type Code (Database)
- [ ] `server/bin/seed-service-types.js`: Check if service type code needs updating
- [ ] Determine if database migration is needed for service type codes
- [ ] If stored in DB, create migration script

---

## Phase 7: QR Code and Transfer URLs

### QR Code Generation
- [ ] `server/apps/reset/api/holds/qr.js`: Update URL generation to use `/reset/` instead of `/lesc/`
- [ ] `client/apps/reset/components/HoldQRCode.jsx`: Update if URLs are hardcoded

### QR Code Parsing
- [ ] `client/apps/reset/components/CheckIn.jsx`: Update QR code parsing logic
- [ ] `client/apps/reset/components/Transfer.jsx`: Update QR code parsing logic
- [ ] Check all components that parse QR codes for `/lesc/` references

---

## Phase 8: Test Files

### Test Updates
- [ ] `server/test/routes/api/reset/**/*.test.js`:
  - Update route paths in test descriptions
  - Update API endpoint paths: `/api/lesc/*` → `/api/reset/*`
  - Update assertions and test data
  - Update variable names and comments

- [ ] `server/test/structure/*.test.js`: Update any LESC references
- [ ] `server/test/routes/api/facilities.test.js`: Update LESC filtering tests

---

## Phase 9: Cross-References

### DIDO App Updates
- [ ] `client/apps/dido/components/Home.jsx`: Update facility filtering that excludes LESC
- [ ] `server/core/api/facilities/index.js`: Update DIDO filtering logic if it excludes LESC service type

### Admin Routes
- [ ] `client/src/Admin/**/*.jsx`: Update any LESC references
- [ ] Check admin components for hardcoded LESC links

---

## Phase 10: Search and Replace Checklist

### Case-Sensitive Replacements
- [ ] `LESC` → `RESET` (component names, display text)
- [ ] `lesc` → `reset` (URLs, paths, appType values)
- [ ] `/lesc` → `/reset` (route paths)
- [ ] `/api/lesc` → `/api/reset` (API paths)
- [ ] `LESCRoutes` → `RESETRoutes`
- [ ] `LESCHeader` → `RESETHeader`
- [ ] `LESCMobileNavbar` → `RESETMobileNavbar`
- [ ] `LESCFacility` → `RESETFacility`
- [ ] `LESCCard` → `RESETCard`

### Careful Replacements (avoid false positives)
- [ ] `appType === 'lesc'` → `appType === 'reset'`
- [ ] `appType: 'lesc'` → `appType: 'reset'`
- [ ] `location.appType === 'lesc'` → `location.appType === 'reset'`
- [ ] Check for "LESC" in comments vs code

---

## Phase 11: Infrastructure Considerations

### DNS/Subdomain
- [ ] If using subdomain routing (`lesc.example.com`), update DNS to `reset.example.com`
- [ ] Update any environment variables or config files referencing subdomain

### Database Migrations
- [ ] Check if service type code "LESC" is stored in database
- [ ] Create migration script if needed
- [ ] Consider backward compatibility for existing data

### Existing QR Codes
- [ ] Determine strategy for existing QR codes (backward compatibility vs breaking change)
- [ ] If breaking: Document migration path for users
- [ ] If compatible: Add logic to handle both `/lesc/` and `/reset/` URLs temporarily

---

## Phase 12: Testing Checklist

### Functional Testing
- [ ] Navigation: All links work correctly
- [ ] Routing: All routes resolve correctly
- [ ] API calls: All API endpoints work
- [ ] Authentication: Login redirects work for RESET app
- [ ] QR codes: Generate and scan QR codes
- [ ] Transfers: Transfer workflow works
- [ ] Check-in: Check-in workflow works
- [ ] Facility filtering: Correct facilities shown/hidden

### Regression Testing
- [ ] DIDO app still works correctly
- [ ] Admin routes still work
- [ ] Home page navigation works
- [ ] Mobile navigation works
- [ ] Header displays correct app name

---

## Execution Order

1. Phase 1: Rename directories/files (use `git mv` to preserve history)
2. Phase 2: Update URL paths (frontend routes first, then API)
3. Phase 3: Update location detection logic
4. Phase 4: Update component names and imports
5. Phase 5: Update string literals and display text
6. Phase 6: Update backend logic
7. Phase 7: Update QR code URLs
8. Phase 8: Update test files
9. Phase 9: Update cross-references
10. Phase 10: Final search/replace pass
11. Phase 11: Infrastructure updates
12. Phase 12: Comprehensive testing

---

## Notes

- Use `git mv` for file renames to preserve history
- Test incrementally after each phase
- Consider creating a feature branch for this work
- Document breaking changes (QR codes, bookmarks, subdomain)
- Update any external documentation or user-facing materials
- Consider a temporary redirect from `/lesc/*` to `/reset/*` if needed for migration

---

## Files Requiring Changes (Summary)

**Critical Path Files:**
- `client/src/App.jsx`
- `client/core/utils/location.js`
- `server/core/api/locations/registry.js`
- `server/app.js`
- `client/core/Api.js`
- `client/src/AppRedirectsConfig.js`

**All Files in:**
- `client/apps/reset/` (entire directory)
- `server/apps/reset/` (entire directory)
- `server/test/routes/api/reset/` (entire directory)

**Estimated Files Changed:** ~66 files based on grep results

