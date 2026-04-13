# Forms

This directory contains the server-side form definitions and PDF generation logic.

## Directory structure

```
lib/forms/
  index.js              # Barrel: exports FORMS map keyed by form ID
  README.md

  cert/                 # Certificate of Release
  849b/                 # SFSO 849(b) Report
  647f/                 # SFPD 647(f) Report
    index.js            # Default export: flat form object ({ ...metadata, generatePdf })
    metadata.js         # Form metadata (title, canGenerate, deflectionInclude, etc.)
    generate.js         # generatePdf(deflection, user) → Buffer

  shared/
    FormContainer.jsx   # React document shell (standalone HTML wrapper for Chromium)
    formComponents.jsx  # Shared React primitives (Header, Row, Field, etc.)
    formUtils.js        # Date/time formatting utilities
    fonts/              # Shared font files (e.g. MeowScript for signatures)
    renderReactForm.js  # Chromium-based rendering pipeline

  dist/                 # esbuild output — compiled JS from JSX sources (gitignored)
```

## Form types

There are two kinds of forms:

**Fillable PDF forms** (`cert`, `849b`) use a pre-built PDF template. `generate.js` reads the template, fills fields with `pdf-lib`, and returns a `Buffer`.

**React (JSX) forms** (`647f`) are React components rendered to HTML by `FormContainer`, then printed to PDF by headless Chromium via `renderFormToPdf`.

Some forms combine both: `cert` fills a PDF template and optionally appends a React-rendered narcotics notice page.

## Form object shape

Each form's `index.js` exports a single default object with the following fields, sourced from `metadata.js` and `generate.js`:

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Display name |
| `generateLabel` | `string` | Button label in the UI |
| `description` | `(name: string) => string` | Short description shown in the UI |
| `downloadFilename` | `(id: number) => string` | Suggested filename for download |
| `canGenerate` | `(deflection) => true \| { message }` | Returns `true` if the form can be generated, or an object with a user-facing `message` if not |
| `deflectionInclude` | `object` | Prisma `include` clause for fetching the deflection |
| `generatePdf` | `(deflection, user?) => Promise<Buffer>` | Generates the PDF and returns a `Buffer` |

`lib/forms/index.js` exports a `FORMS` object keyed by form ID (`cert`, `849b`, `647f`) where each value is one of these flat form objects.

## Adding a new form

1. Create a new folder `lib/forms/<id>/`.
2. Add `metadata.js` exporting a `metadata` object with all fields above except `generatePdf`.
3. Add `generate.js` exporting `generatePdf(deflection, user)`.
   - For fillable PDFs: use `pdf-lib` to fill a `template.pdf` in the same folder.
   - For React forms: write a JSX component, add it as an esbuild entry point in `server/esbuild.forms.js`, then call `renderFormToPdf` from `shared/renderReactForm.js`.
4. Add `index.js`:
   ```js
   import { metadata } from './metadata.js';
   import { generatePdf } from './generate.js';
   export default { ...metadata, generatePdf };
   ```
5. Register the form in `lib/forms/index.js` under its form ID.
6. Register the form in `client/src/forms/formRegistry.js` (import metadata, add a `component` if it has a React preview).

## React form rendering pipeline

JSX form components cannot run directly in Node — they must first be compiled to plain JS by esbuild (`server/esbuild.forms.js`), which outputs into `lib/forms/dist/`.

At runtime, `renderReactForm.js` dynamically imports `dist/FormContainer.js` (with a cache-busting timestamp so `--watch` builds are picked up without a server restart), wraps the form component in `FormContainer` in standalone mode, renders it to a static HTML string via `react-dom/server`, then prints it to PDF using headless Chromium via `puppeteer-core`.

To rebuild the dist files:
```sh
node server/esbuild.forms.js
# or, during development:
node server/esbuild.forms.js --watch
```

## Client-side previews

The client imports metadata directly from each form's `metadata.js` file and, for React forms, the raw JSX component. Vite handles JSX compilation on the client side so no separate build step is needed for previews.
