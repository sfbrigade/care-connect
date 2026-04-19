# Care Connect

## Contributing

Please read CONTRIBUTING.md for information on how to contribute to this project.

## One-time Setup

1. Clone the repo to a "local" directory (on your computer), then change
   into the directory.

   ```
   git clone https://github.com/sfbrigade/care-connect.git
   cd care-connect
   ```

2. Install Docker Desktop: https://www.docker.com/products/docker-desktop
   1. Windows users see notes below...

3. Open a command-line shell, change into your repo directory, and execute these commands:

   ```
   docker compose pull
   docker compose up
   ```

   It will take a while the first time you run these commands to download the "images" to
   run the web application code in Docker "containers". When you see messages that look
   like this, the server is running:

   ```
   server-1       | 5:31:23 PM client.1 |    VITE v4.3.9  ready in 327 ms
   server-1       | 5:31:23 PM client.1 |    ➜  Local:   http://localhost:3333/
   ```

4. Now you should be able to open the web app in your browser at: http://localhost:3333/

5. Open a new tab or window of your shell, change into your repo directory as needed, and execute this command:

   ```
   docker compose exec server bash -l
   ```

   This will log you in to the running server container, as if you were connecting to a different machine over the Internet.
   Once you're logged in, you will be in a new shell for the container where you can run the following command.
   You'll want to execute this command to "log in" to the running container before running any
   command line tools or scripts that operate on the server. Run the following the first time you log in:

   ```
   cd server
   npx prisma migrate deploy
   npx prisma db seed
   ```

   The first command creates the database and applies all migrations. The second command populates it with development data.

   This will populate the database with a complete setup for development, including an admin user that you can use to log in to the web app.

   The development admin user credentials are:
   - Email: admin@careconnectsf.org
   - Password: abcd1234

   SFPD test user credentials are:
   - Email: sfpd@careconnectsf.org
   - Password: abcd1234

   SFSO test user credentials are:
   - Email: sfso@careconnectsf.org
   - Password: abcd1234

6. To stop the server, press CONTROL-C in the window with the running server.
   If it is successful, you will see something like this:

   ```
   Killing care-connect_db_1           ... done
   Killing care-connect_server_1       ... done
   Killing care-connect_mailcatcher_1  ... done
   ```

   If it is not successful, you may see something like this:

   ```
   ERROR: Aborting.
   ```

   If you get an error, the server may still be running on your computer. To force it to stop,
   run the following command and wait for the output to report DONE:

   ```
   docker compose stop
   Stopping care-connect_db_1          ... done
   Stopping care-connect_server_1      ... done
   Stopping care-connect_mailcatcher_1 ... done
   ```

7. That's it! After all this setup is complete, the only command you need to run to get
   started again is the `docker compose up` command.

## Development Tools

This project includes components with helpful developer tools, such as the following:

1. Mailcatcher

   The Docker Compose configuration includes the Mailcatcher development mail server. Email sent from the
   server will be captured by this mail server and can be viewed on the web at:

   http://localhost:1080

   NO live emails will be sent over the Internet.

2. Prisma Studio

   The Prisma library includes a web interface for browsing the contents of the development database at:

   http://localhost:5555

3. Scalar API Documentation Renderer

   The Scalar library automatically generates web-based API documentation for the server based on the
   Swagger/OpenAPI schema definitions included with each route, viewable at:

   http://localhost:3333/api/reference

4. Minio

   The Docker Compose configuration includes the Minio object storage server as a local development
   simulation of AWS S3. You can browse the contents of the storage server at:

   http://localhost:9001

   Username and password are: minioadmin/minioadmin

5. Background Jobs (pg-boss)

   The server uses [pg-boss](https://github.com/timgit/pg-boss) for async background jobs, backed by the same PostgreSQL database. Jobs are enqueued from the Fastify server and processed by a separate worker process.

   **How it works:**
   - **Enqueuing:** Route handlers enqueue jobs via `fastify.jobs.send(queueName, data)`. For example, invite emails are enqueued as `'invite-email'` jobs when an invite is created, resent, or bulk-created.
   - **Processing:** A standalone worker process (`server/worker.js`) picks up jobs and runs the corresponding handler. In development, the worker is started automatically via `Procfile.dev` with `--watch` for auto-reload.
   - **Failure handling:** Queues are configured with retry limits and dead letter queues. Jobs that exhaust all retries are routed to a dead letter queue (e.g. `invite-email-dead-letter`) and logged with structured JSON for alerting.

   **Key files:**

   | File                         | Purpose                                                               |
   | ---------------------------- | --------------------------------------------------------------------- |
   | `server/lib/pgBoss.js`       | Shared factory for creating pg-boss instances                         |
   | `server/plugins/pgBoss.js`   | Fastify plugin — decorates `fastify.jobs` with a `send()` method      |
   | `server/worker.js`           | Standalone worker process — creates queues and registers job handlers |
   | `server/jobs/inviteEmail.js` | Job handler for sending invite emails                                 |

   **Adding a new job:**
   1. Create a handler in `server/jobs/yourJob.js` that exports a default async function accepting `(data)`.
   2. In `server/worker.js`, import the handler, create a queue with `boss.createQueue('your-job', { ... })`, and register it with `boss.work('your-job', handler)`. Add a dead letter queue if you want failure logging.
   3. Enqueue from any route handler with `fastify.backgroundJobs.send('your-job', { ...payload })`.

   **Testing:** The pg-boss plugin is disabled during tests (`PGBOSS_ENABLED=false` in the test helper), so the Fastify server won't attempt to connect to PostgreSQL for job queuing. Instead, the test helper spies on `app.backgroundJobs.send()` calls, which are captured in `app.backgroundJobs._sent` for assertions. Job handler functions (like `inviteEmail.js`) can be tested directly by passing a mock Prisma client.

6. pg-boss Admin Dashboard

   A web-based monitoring dashboard for pg-boss job queues. Browse queue status, inspect failed jobs,
   and view performance metrics at:

   http://localhost:8671

## Mobile Testing with ngrok

Some features (like QR code scanning) require camera access, which browsers only allow over HTTPS. To test on a mobile device, you can use [ngrok](https://ngrok.com/) to create a public HTTPS tunnel to your local dev server.

1. [Sign up for a free ngrok account](https://dashboard.ngrok.com/signup) and install the CLI.

2. Claim a free static domain from the [ngrok dashboard](https://dashboard.ngrok.com/domains) (e.g. `your-name.ngrok-free.app`).

3. Restart the dev server (`docker compose up`), then start the tunnel:

   ```
   ngrok http 3333 --url your-name.ngrok-free.app
   ```

4. Open the ngrok URL on your phone to test camera and other mobile features.

## Analytics

This starter includes optional PostHog product analytics instrumentation on the React client.

- Configure `VITE_POSTHOG_KEY` (required) and `VITE_POSTHOG_HOST` (optional, defaults to `https://app.posthog.com`) in `server/.env`. The values are copied into the client bundle at build time.
- Install the PostHog browser SDK in the client workspace if you have not already run `npm install`: `npm install posthog-js --workspace client`.
- When the env variables are present, the SPA automatically initializes PostHog on the client, identifying signed-in users by their user ID (and falling back to email) and tracking page views.
- Leave `VITE_POSTHOG_KEY` blank to disable analytics entirely.

## CareConnect

CareConnect tooling lives inside this repository. After bringing up the Docker stack (`docker compose up`), use the following commands from the repo root to seed local data:

1. **Geocode clinics**

   Ensure `AWS_LOCATION_ACCESS_KEY_ID` and `AWS_LOCATION_SECRET_ACCESS_KEY` are defined in `server/.env`. Enter the server container and run the geocode command:

   ```
   cd server
   npm run geocode:facilities
   ```

   Common options:
   - `--dry-run` — log the proposed coordinates without saving
   - `--force` — overwrite existing latitude/longitude values
   - `--limit=10` — geocode only the first N facilities (useful for testing)

## Testing

### Full Integration Testing (PostgreSQL + Docker)

For complete integration tests with PostgreSQL and MinIO, enter the server container and run the test command:

```bash
cd server
npm test
```

**Note:** If tests terminate unexpectedly, you may have dangling/orphan containers running. Use `docker ps` to list and check running containers.

### Testing the Client

To test the client as it will be deployed to the server (rather than running in the Vite dev server), log in to a running server container and run a build (`npm run build`), then access the client through the server at: http://localhost:3000

### Server-side form components

PDF generation for forms (647(f), 849(b), Certificate of Release) uses React components that are
compiled ahead of time by esbuild into `server/lib/forms/dist/`. This directory is gitignored.
**The server will not start if this directory is empty.**

`docker compose up` and `npm run dev` both build it automatically. If you ever start the server
manually outside of those commands, run this first (from inside the container):

```bash
npm run build:forms -w server
```

### Accessibility Testing

Two Playwright scripts run [axe-core](https://github.com/dequelabs/axe-core) against the app and fail on any WCAG 2.1 A/AA violation. Run them from the repo root (outside the server container):

- **Shallow audit** (21 stateless pages, ~2 minutes):

  ```
  npm run test:a11y
  ```

- **Deep audit** (17 stateful pages across SFPD/SFSO/Care roles, ~4 minutes):

  ```
  npm run test:a11y:deep
  ```

Both scripts assume:
- Docker is running (`docker compose up -d`) — the test setup resets the database to its seed state before each run
- The dev server is reachable at http://localhost:3333
- Playwright's Chromium browser is installed locally — this is a one-time setup per machine, not tracked in `package.json` because Playwright installs browsers into a user-level cache rather than `node_modules`. Run:

  ```
  npx playwright install chromium
  ```

After each run, a JSON report is written to `e2e/accessibility-report.json` or `e2e/accessibility-report-deep.json` summarizing all violations found, including any that were excluded from the pass/fail gate.

**What it checks:** axe-core rules tagged `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`. This tests compliance with WCAG level AA.

**Color contrast exclusion:** The scripts currently treat `color-contrast` violations as non-blocking while the design team finalizes color decisions. The violations still appear in the JSON reports for review. Once color fixes ship, this exclusion will be removed and the gate will enforce the full ruleset.

**Making the audits blocking in CI:** These scripts are intended to become part of CI once the color-contrast exclusion is removed. At that point the audits can run as a required check on pull requests so that accessibility regressions are caught before merge. Until then, run the scripts locally before pushing a11y-sensitive changes.

**Adding pages:** edit the `routes` arrays in `e2e/accessibility-audit.spec.js` or `e2e/accessibility-audit-deep.spec.js`.

### Linting and Formatting

To lint and format your code:

- **From Docker container**: Log in to a running container and run `npm run lint`

## Shell Command Quick Reference

- Every directory and file on your computer has a _path_ that describes its location in storage. Special path symbols include:
  - The current _working directory_ you are in: `.`
  - The _parent_ of the current working directory: `..`
  - Your _home_ directory: `~`
  - The _root_ directory: `/` (Mac, Linux) or `\` (Windows)
    - The same symbol is used as a _separator_ when specifying multiple directories in a path
    - If the path _starts_ with the separator, it means the path starts at the _root_
      - For example: `/Users/myusername/Documents`
      - This is called an _absolute_ path
    - If the path _does not start_ with the separator, it means the path starts at the current _working directory_
      - For example, if the current _working directory_ is: `/Users`  
        then the same path as the previous example is: `myusername/Documents`
      - This is called a _relative_ path
    - A path can also start with any of the above special path symbols
      - For example, on Mac the same path as the previous example is: `~/Documents`

- To _print the working directory_ (i.e. to see the full path of the directory you are currently in):

  ```
  pwd
  ```

- To _list_ the files in the working directory:

  ```
  ls -l
  ```

- To _change_ the working directory:

  ```
  cd path
  ```

- To _make_ a new directory inside the working directory:

  ```
  mkdir newpath
  ```

- To create a new _empty file_ inside the working directory:

  ```
  touch filename.ext
  ```

## git Command Quick Reference

- To check the _status_ of the files in your local repo (i.e. what's been added or changed):

  ```
  git status
  ```

- To _add all_ the changed files to the next commit:

  ```
  git add .
  ```

  To _add specific file(s)_ to the next commit:

  ```
  git add path/to/file1.ext path/to/file2.ext path/with/wildcard/*
  ```

- To _commit_ the added files with a message:

  ```
  git commit -m "My description of what's changed"
  ```

- To _push_ the commit to the remote repo:

  ```
  git push
  ```

- To _pull_ any new commits from the remote repo:

  ```
  git pull
  ```

## Docker Command Quick Reference

- To start all the containers:

  ```
  docker compose up
  ```

- To log in to the running server container:

  ```
  docker compose exec server bash -l
  ```

- To stop all the containers, in case things didn't shutdown properly with CTRL-C:

  ```
  docker compose stop
  ```

- To run the server container without starting everything using the up command:

  ```
  docker compose run --rm server bash -l
  ```

- To re-build the server container:

  ```
  docker compose build server
  ```

## Windows Docker Notes

- On some PC laptops, a hardware CPU feature called virtualization is disabled by default, which is required. To enable it, reboot your computer into its BIOS interface (typically by pressing a key like DELETE, ESC, or F1 during the boot process), and look for an option to enable it. It may be called something like _Intel Virtualization Technology_, _Intel VT_, _AMD-V_, or some similar variation.

  https://support.microsoft.com/en-us/windows/enable-virtualization-on-windows-11-pcs-c5578302-6e43-4b4b-a449-8ced115f58e1

- Install the Windows Subsystem for Linux (WSL) and make sure to check "Use WSL 2 instead of Hyper-V" when installing Docker Desktop for Windows.

  https://learn.microsoft.com/en-us/windows/wsl/install  
  https://docs.docker.com/desktop/install/windows-install/

- Use Microsoft Terminal to open a command-line shell running in your WSL distribution (typically Ubuntu), and use the git command line to _clone this project into your Linux filesystem_. If you attempt to run this project in Docker from the Windows file system, performance will be degraded and file change detection will not work. Editors like VSCode can edit files in the Linux filesystem of WSL.

## License

Care Connect
Copyright © 2026 SF Civic Tech

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
