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
5. Inngest function loads invite from DB via `#prisma/client.js`, wraps in `new Invite(data)`, loads facility if needed via `new Facility(data)`, then calls `invite.sendInviteEmail(facility)`
6. On failure, Inngest retries automatically (3 attempts with exponential backoff)

## Components

### 1. Docker: Inngest Dev Server

New service in `compose.yml`:
- Image: `inngest/inngest:latest`
- Port 8288 exposed for the dashboard UI
- On the `care-connect` network

Environment for the `inngest` service:
```yaml
environment:
  - INNGEST_DEV=1
```

The dev server auto-discovers the serve endpoint when the Fastify app registers with it.

### 2. Docker: Server container env additions

Add to the `server` service in `compose.override.yml`:
```yaml
environment:
  - INNGEST_DEV=1
  - INNGEST_BASE_URL=http://inngest:8288
```

`INNGEST_BASE_URL` tells the Inngest client where to send events over the Docker network. `INNGEST_DEV=1` puts the client in dev mode (no signing keys needed).

### 3. npm package: `inngest`

Added to `server/package.json` dependencies. Provides the client, serve adapter, and function definition APIs.

### 4. Inngest client: `server/lib/inngest.js`

Initializes the Inngest client with app ID `"care-connect"`. Exported for use by the plugin and function definitions.

### 5. Inngest plugin: `server/plugins/inngest.js`

A Fastify plugin (using `fastify-plugin`) that:
- Registers the Inngest serve endpoint at `/api/inngest` (handles both GET for discovery and POST for function execution)
- Decorates the Fastify instance with `fastify.inngest` so route handlers can call `fastify.inngest.send()`

This follows the project's existing plugin pattern (see `prisma.js` which decorates `fastify.prisma`).

### 6. Inngest function: `server/inngest/sendInviteEmail.js`

- Listens for `"invite/send-email"` events
- Event data: `{ inviteId: string, facilityId?: string }`
- Imports `prisma` from `#prisma/client.js` directly (same pattern as `prisma.js` plugin)
- Loads invite record, wraps in `new Invite(data)`
- If `facilityId` provided, loads facility record, wraps in `new Facility(data)` to get `baseURL`
- Calls `invite.sendInviteEmail(facility)`
- Uses Inngest default retry behavior (3 attempts, exponential backoff)

### 7. Route handler changes

Files modified:
- `server/routes/api/invites/create.js` — replace `await invite.sendInviteEmail(facility)` with `await fastify.inngest.send(...)`
- `server/routes/api/invites/bulk.js` — replace per-invite `sendInviteEmail` call with `await fastify.inngest.send([...events])` (single batch call with array of events for all created invites)
- `server/routes/api/invites/resend.js` — replace `await invite.sendInviteEmail(facility)` with `await fastify.inngest.send(...)`

### 8. Environment variables

- **Development:** `INNGEST_DEV=1` and `INNGEST_BASE_URL=http://inngest:8288` on the server container
- **Production:** Will need `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` configured (out of scope)

## Behavioral changes

### Bulk endpoint semantics

The bulk endpoint currently catches email sending errors per-invite and reports them in the `errors` array. With async emails:
- `inngest.send()` only enqueues the event — it does not throw if the email later fails
- The `errors` array will only contain DB-level failures (duplicate checks, create failures)
- Email delivery failures are handled by Inngest retries, not surfaced in the HTTP response

This is intentional. The response description changes from "Creates multiple Invites and sends them via email" to "Creates multiple Invites and queues invite emails for sending." The client does not need changes — invites are still created and emails are still sent, just asynchronously.

### Create and resend endpoints

These currently block until the email is sent. After the change, they return immediately after DB operations. If email sending fails, Inngest retries automatically. The response shape does not change.

## Scope

**In scope:**
- Inngest dev server in Docker Compose
- Inngest client and plugin in Fastify
- One Inngest function: `invite/send-email`
- Updating three route handlers: create, bulk, resend

**Out of scope:**
- Password reset emails (stay synchronous for now)
- Email delivery status tracking (no schema changes)
- Production Inngest deployment configuration

## Testing

- **Route tests:** Mock `fastify.inngest.send()` to verify events are dispatched with correct data. Existing assertions on `nodemailerMock.mock.getSentMail()` in route tests will be replaced with assertions on the inngest send mock.
- **Inngest function tests:** Test the function handler directly by calling it with mock event data and a mock step object. Uses existing `nodemailer-mock` to verify email content.
- Existing test infrastructure (testcontainers, nodemailer-mock) remains unchanged.

## Development URLs

After setup, the Inngest dashboard is available at http://localhost:8288.
