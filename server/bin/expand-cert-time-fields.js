#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { PDFDocument } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE_PATH = resolve(__dirname, '../lib/forms/cert/template.pdf');
const DEFAULT_WIDTH = 42;

const TIME_FIELDS = [
  'Time',
  'Time_2',
];

function parseArgs (argv) {
  const options = {
    templatePath: DEFAULT_TEMPLATE_PATH,
    width: DEFAULT_WIDTH,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--template') {
      options.templatePath = resolve(argv[++i]);
    } else if (arg === '--width') {
      options.width = Number(argv[++i]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(options.width) || options.width <= 0) {
    throw new Error('--width must be a positive number');
  }

  return options;
}

function setWidgetWidth (form, fieldName, width) {
  const field = form.getTextField(fieldName);
  const widgets = field.acroField.getWidgets();

  return widgets.map((widget) => {
    const before = widget.getRectangle();
    const after = { ...before, width };
    widget.setRectangle(after);
    return { fieldName, before, after };
  });
}

const options = parseArgs(process.argv.slice(2));
const templateBytes = await readFile(options.templatePath);
const pdfDoc = await PDFDocument.load(templateBytes);
const form = pdfDoc.getForm();

const changes = TIME_FIELDS.flatMap((fieldName) =>
  setWidgetWidth(form, fieldName, options.width)
);

for (const { fieldName, before, after } of changes) {
  console.log(`${fieldName}: width ${before.width.toFixed(2)} -> ${after.width.toFixed(2)} at x ${before.x.toFixed(2)}, y ${before.y.toFixed(2)}`);
}

if (options.dryRun) {
  console.log('Dry run only; template was not modified.');
} else {
  const updatedBytes = await pdfDoc.save();
  await writeFile(options.templatePath, updatedBytes);
  console.log(`Updated ${options.templatePath}`);
}
