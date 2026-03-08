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
