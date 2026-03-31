/**
 * Shared form registry — single source of truth for form IDs and
 * client-facing metadata (title, labels, download filenames).
 *
 * Both the client and server import from here to stay in sync.
 * Server-specific metadata (deflectionInclude, dataSchema, transformData,
 * requiresRelease) lives in each server form file.
 */
export const FORM_REGISTRY = {
  cert: {
    componentName: 'FormCoR',
    title: 'Certificate of Release',
    generateLabel: 'Generate Certificate of Release',
    description: (name) => `SF Sheriff's Dept Certificate of Release for ${name}`,
    downloadFilename: (id) => `cert-${id}.pdf`,
  },
  '849b': {
    componentName: 'Form849b',
    title: 'SFSO 849(b) Report',
    generateLabel: 'Generate SFSO 849(b) Report',
    description: (name) => `SFSO 849(b) Report for ${name}`,
    downloadFilename: (id) => `849b-report-${id}.pdf`,
  },
  '647f': {
  },
};
