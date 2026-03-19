# Inngest Integration for Async Invite Emails

## Problem

Invite emails are sent synchronously within HTTP request handlers (`create.js`, `bulk.js`, `resend.js`). This blocks the response until SMTP completes. The bulk endpoint is worst — it loops and sends emails sequentially. If SMTP is slow or fails, the entire request fails.

## Solution

Add Inngest as an async job system. Move invite email sending to an Inngest function triggered by events. Route handlers fire events and return immediately.

## Architecture

```
┌──────────────┐     inngest.send()     ┌──────────────────┐
│ Fastify Route │ ──────────────────────> │ Inngest Dev Server│
│ (create/bulk/ │                         │ (Docker container)│
│  resend)      │                         │ :8288 dashboard   │
└──────────────┘                         └────────┬─────────┘
                                                  │ HTTP POST
                                                  v
                                         ┌──────────────────┐
                                         │ Fastify /api/     │
                                         │ inngest endpoint  │
                                         │ (serve handler)   │
                                         └────────┬─────────┘
                                                  │
                                                  v
                                         ┌──────────────────┐
                                         │ "invite/send-     │
                                         │  email" function   │
                                         │ (calls mailer)    │
                                         └──────────────────┘
```

**Flow:**
1. Route handler creates/validates invite in DB
2. Route handler calls `inngest.send({ name: "invite/send-email", data: { inviteId, facilityId } })`
3. Route handler returns HTTP response immediately
4. Inngest dev server receives event, calls back to Fastify serve endpoint
5. Inngest function loads invite from DB, calls `invite.sendInviteEmail(facility)`
6. On failure, Inngest retries automatically (3 attempts with exponential backoff)

## Components

### 1. Docker: Inngest Dev Server

New service in `compose.yml`:
- Image: `inngest/inngest:latest`
- Port 8288 exposed for the dashboard UI
- On the `care-connect` network
- Configured to discover the Fastify serve endpoint

### 2. npm package: `inngest`

Added to `server/package.json` dependencies. Provides the client, serve adapter, and function definition APIs.

### 3. Inngest client: `server/lib/inngest.js`

Initializes the Inngest client with app ID `"care-connect"`. Used by both the serve endpoint and route handlers to send events.

### 4. Inngest serve endpoint: `server/routes/api/inngest.js`

A Fastify route that Inngest calls to execute functions. Uses `serve()` from the Inngest Fastify adapter. Registers all Inngest functions.

### 5. Inngest function: `server/inngest/sendInviteEmail.js`

- Listens for `"invite/send-email"` events
- Event data: `{ inviteId: string, facilityId?: string }`
- Loads the Invite from DB via Prisma
- Loads the Facility if `facilityId` is provided
- Calls `invite.sendInviteEmail(facility)`
- Uses Inngest default retry behavior (3 attempts, exponential backoff)

### 6. Route handler changes

Files modified:
- `server/routes/api/invites/create.js` — replace `await invite.sendInviteEmail(facility)` with `await inngest.send(...)`
- `server/routes/api/invites/bulk.js` — replace per-invite `sendInviteEmail` call with `inngest.send(...)` for each created invite
- `server/routes/api/invites/resend.js` — replace `await invite.sendInviteEmail(facility)` with `await inngest.send(...)`

### 7. Environment variables

- `INNGEST_DEV=1` on the server container (dev mode, no signing keys needed)
- No `INNGEST_EVENT_KEY` or `INNGEST_SIGNING_KEY` required in development
- Production will need these configured when deploying with Inngest Cloud or a self-hosted server

## Scope

**In scope:**
- Inngest dev server in Docker Compose
- Inngest client and serve endpoint in Fastify
- One Inngest function: `invite/send-email`
- Updating three route handlers: create, bulk, resend

**Out of scope:**
- Password reset emails (stay synchronous for now)
- Email delivery status tracking (no schema changes)
- Production Inngest deployment configuration

## Testing

- **Route tests:** Mock `inngest.send()` to verify events are dispatched with correct data. No actual email sending in route tests.
- **Inngest function tests:** Test the function directly by calling it with mock event data. Uses existing `nodemailer-mock` to verify email content.
- Existing test infrastructure (testcontainers, nodemailer-mock) remains unchanged.
