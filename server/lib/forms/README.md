# Forms

This directory contains the server-side form definitions and PDF generation logic.

## Directory structure

```
lib/forms/
  index.js              # Barrel: exports FORMS map keyed by form ID
  formEmailJobs.js      # Queue helpers for emailing form sets (release, incident, self-5150)
  liveEmailForms.js     # LIVE_EMAIL_FORM_IDS — forms that trigger real-time emails
  storeFormPdf.js       # Upserts a generated PDF into deflectionDocument via Prisma + DeflectionDocument asset
  README.md

  cert/                 # Certificate of Release (fillable PDF + optional React narcotics-notice page)
  849b/                 # SFSO 849(b) Report (fillable PDF)
  647f/                 # SFPD 647(f) Report (fillable PDF)
  5150/                 # DHCS-1801 5150 Application (fillable PDF)
    index.js            # Default export: flat form object ({ ...metadata, generatePdf, transformData })
    metadata.js         # Form metadata (title, canGenerate, deflectionInclude, etc.)
    generate.js         # transformData(deflection) → plain data obj; generatePdf(data) → Buffer
    fill<id>.js         # Declarative spec mapping camelCase data keys → PDF field names; calls fillPdf
    template.pdf        # Fillable PDF template
    livePdf.js          # (849b, 5150 only) validate/generate/store helpers called by routes

  shared/
    fillPdf.js          # Core pdf-lib utility: loads template, fills all field types, bakes appearances
    FormContainer.jsx   # React document shell (standalone HTML or embedded <div>)
    formComponents.jsx  # Shared React primitives
    formUtils.js        # Date/time formatting utilities and name helpers
    pdf-forms.css       # Shared print stylesheet included by FormContainer
    fonts/              # Shared font files (e.g. MeowScript for signatures)
    renderReactForm.js  # Chromium-based rendering pipeline (React → HTML → PDF via puppeteer-core)

  dist/                 # esbuild output — compiled JS from JSX sources (gitignored)
    FormContainer.js
    NarcoticsNotice.js
```

## Form types

All four forms are **fillable PDF** forms: `generate.js` reads `template.pdf`, fills fields via `shared/fillPdf.js`, and returns a `Buffer`.

`cert` additionally appends a React-rendered narcotics notice page (compiled to `dist/NarcoticsNotice.js`) when the deflection has narcotics or paraphernalia recorded. The notice is rendered to a PDF by headless Chromium and merged with `pdf-lib`.

## Form object shape

Each form's `index.js` exports a single default object with the following fields, sourced from `metadata.js` and `generate.js`:

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Display name |
| `description` | `(name: string) => string` | Short description shown in the UI |
| `downloadFilename` | `(id: number) => string` | Suggested filename for download |
| `canGenerate` | `(deflection) => true \| { message }` | Returns `true` if the form can be generated, or an object with a user-facing `message` if not |
| `deflectionInclude` | `object` | Prisma `include` clause for fetching the deflection |
| `transformData` | `(deflection) => object` | Extracts a plain data object from a deflection (used by background jobs and live-PDF routes) |
| `generatePdf` | `(data) => Promise<Buffer>` | Generates the PDF from a pre-transformed data object and returns a `Buffer` |

`lib/forms/index.js` exports a `FORMS` object keyed by form ID (`cert`, `849b`, `647f`, `5150`) where each value is one of these flat form objects.

## PDF fill pipeline

Each form follows this two-step pattern:

1. **`transformData(deflection)`** — extracts and formats the fields the form needs from a raw Prisma deflection record.
2. **`generatePdf(data)`** — reads `template.pdf`, delegates to the form's `fill<id>.js` which holds a declarative `spec` mapping camelCase data keys to PDF field names, then calls `shared/fillPdf.js`.

`shared/fillPdf.js` handles all pdf-lib field types (`text`, `checkbox`, `dropdown`, `booleanPair`, `radio`, `enumCheckbox`, `array`, `composite`), bakes printable appearances, and resets each field's DA string to font-size 0 so users can still edit with auto-sizing in Acrobat/Chrome.

## Live PDF helpers

`849b/livePdf.js` and `5150/livePdf.js` expose `validate*`, `generateLive*`, and `storeLive*` functions called directly by API routes when a single form needs to be generated and stored on demand (outside of the background email job).

`storeFormPdf.js` upserts a `deflectionDocument` record via Prisma and writes the PDF buffer to the file asset via `DeflectionDocument.setAsset`.

## Email job helpers

`formEmailJobs.js` exports three queue helpers:

- **`queueReleaseFormsEmail`** — queues `647f`, `849b`, `cert`, `5150` with the `release-forms` email template.
- **`queue849bIncidentEmail`** — queues `849b` with the `incident-forms` email template.
- **`queue5150SelfEmail`** — queues `5150` with the `self-5150` email template.

`liveEmailForms.js` exports `LIVE_EMAIL_FORM_IDS` (currently `849b`), which flags forms whose generated PDFs should trigger real-time email delivery rather than waiting for the release batch.

## Adding a new form

1. Create a new folder `lib/forms/<id>/`.
2. Add `metadata.js` exporting a `metadata` object with `title`, `description`, `downloadFilename`, `canGenerate`, and `deflectionInclude`.
3. Add `fill<id>.js` with a declarative `spec` and a thin `fill<id>(pdfBytes, data)` function that calls `fillPdf` from `shared/fillPdf.js`.
4. Add `generate.js` exporting:
   - `transformData(deflection)` — maps Prisma data to the camelCase keys in your spec.
   - `generatePdf(data)` — reads `template.pdf`, calls `fill<id>`, returns a `Buffer`.
   - For a React form: write a JSX component, add it as an esbuild entry point in `server/esbuild.forms.js`, then call `renderFormToPdf` from `shared/renderReactForm.js`.
5. Add `index.js`:
   ```js
   import { metadata } from './metadata.js';
   import { generatePdf, transformData } from './generate.js';
   export default { ...metadata, generatePdf, transformData };
   ```
6. Register the form in `lib/forms/index.js` under its form ID.
7. Register the form in `client/src/forms/formRegistry.js` (import metadata, add a `component` if it has a React preview).

## React form rendering pipeline

JSX form components cannot run directly in Node — they must first be compiled to plain JS by esbuild (`server/esbuild.forms.js`), which outputs into `lib/forms/dist/`.

Currently only two JSX files are compiled: `shared/FormContainer.jsx` and `cert/NarcoticsNotice.jsx`.

At runtime, `renderReactForm.js` dynamically imports `dist/FormContainer.js` (with a cache-busting timestamp so `--watch` builds are picked up without a server restart), wraps the form component in `FormContainer` in standalone mode, renders it to a static HTML string via `react-dom/server`, then prints it to PDF using headless Chromium via `puppeteer-core`.

To rebuild the dist files:
```sh
node server/esbuild.forms.js
# or, during development:
node server/esbuild.forms.js --watch
```

## Client-side previews

The client imports metadata directly from each form's `metadata.js` file and, for React forms, the raw JSX component. Vite handles JSX compilation on the client side so no separate build step is needed for previews.
