# Getting Started with [Fastify-CLI](https://www.npmjs.com/package/fastify-cli)

This project was bootstrapped with Fastify-CLI.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

To start the app in dev mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm start`

For production mode

### `npm run test`

Run the test cases.

### `npm run loadtest:list`

Lists the available concurrency/load scenarios.

### `npm run loadtest -- --scenario <name>`

Runs the Node-based concurrency harness against a live local server. By default it targets
`http://localhost:3000`, uses the seeded local users, provisions an isolated `LOADTEST RESET`
facility, and exits non-zero if the tracked bed-count invariants drift.

The full scenario inventory and implementation checklist lives in
`server/loadtest/PLAN.md`.

Common flags:

- `--scenario <scenario-name>|all`
- `--vus 8`
- `--iterations 5`
- `--target-available 1`
- `--base-url http://localhost:3000`
- `--password abcd1234`

Example:

```bash
npm run loadtest -- --scenario create-bed-race --vus 12 --iterations 10
```

Scenarios:

- Baseline bed allocation:
  `create-bed-race`, `cancel-deflection-race`, `incident-create-race`
- Deflection transition races:
  `safety-check-vs-admit`, `admit-vs-intake-complete`, `release-vs-exit`,
  `release-vs-exit-to-jail`, `release-vs-record-death`, `exit-vs-record-death`,
  `exit-to-jail-vs-record-death`, `cancel-vs-reopen`, `transfer-vs-cancel`,
  `transfer-vs-facility-close`
- Facility admin races:
  `facility-close-vs-deflection-create`, `facility-close-vs-incident-create`,
  `facility-close-vs-facility-reopen`, `facility-close-vs-reopen`
- Bed-type / chair-count races:
  `bed-type-shrink-vs-deflection-create`, `bed-type-shrink-vs-incident-create`,
  `bed-type-shrink-vs-reopen`, `bed-type-update-vs-facility-close`,
  `bed-type-update-vs-bed-type-update`
- Terminal-state matrix:
  `awaiting-intake-terminal-race`, `ready-for-intake-terminal-race`,
  `admitted-terminal-race`, `in-chair-terminal-race`, `released-terminal-race`
- Incident lifecycle races:
  `incident-cancel-vs-deflection-create`, `incident-cancel-vs-transfer`,
  `incident-left-vs-deflection-cancel`, `incident-arrived-vs-transfer`
- Duplicate-submit checks:
  `duplicate-release`, `duplicate-exit`, `duplicate-facility-close`,
  `duplicate-bed-type-update`

Useful commands:

```bash
# See every available scenario name
npm run loadtest:list

# Run one targeted race repeatedly
npm run loadtest -- --scenario facility-close-vs-deflection-create --vus 8 --iterations 10

# Run the full suite
npm run loadtest -- --scenario all --iterations 3
```

### `npm run build:forms`

Compiles the server-side React form components (`server/lib/forms/*.jsx`) into CommonJS bundles
under `server/lib/forms/dist/`. This directory is gitignored.

**The server will not start without this step.** The forms route plugin imports the compiled
bundles at startup (`server/routes/api/forms/index.js`), so if `dist/` is empty the process will
crash before accepting any requests.

`npm run dev` and `npm run build` both run this automatically. You only need to run it manually
if you start the server directly (e.g. `fastify start`) or after editing a form source file
without restarting via `dev`.

## Learn More

To learn Fastify, check out the [Fastify documentation](https://fastify.dev/docs/latest/).
