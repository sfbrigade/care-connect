/**
 * fillPdf.js
 *
 * Shared utility for filling PDF form templates with pdf-lib.
 *
 * Generates baked appearance streams so filled fields print correctly on
 * renderers that ignore NeedAppearances (e.g. iOS Outlook), while preserving
 * auto-size (font size 0) in the DA string so users can still edit fields
 * in Chrome/Acrobat with shrink-to-fit behavior.
 */

import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';

// PDF field flag for multiline text (bit 13, 1-indexed → bit 12 zero-indexed)
const MULTILINE_FLAG = 1 << 12;

/**
 * Load a PDF, fill fields from a declarative spec, bake appearances, and return bytes.
 *
 * @param {Uint8Array|Buffer} pdfBytes   Raw template PDF bytes.
 * @param {object}            data       Data object (camelCase keys, may be nested).
 * @param {object}            spec       Field specification — see below.
 * @param {object}            [options]  Extra options.
 * @param {Function}          [options.customize]  Called with (form, pdfDoc, font) after
 *                                        standard fields are filled but before appearances
 *                                        are baked. Use for one-off logic like signatures.
 * @param {Function}          [options.finalize]   Called with (form, pdfDoc, font) AFTER
 *                                        appearances are baked (and DA reset), before save.
 *                                        Use for custom widget appearance streams that must
 *                                        survive updateFieldAppearances — e.g. sizing comb
 *                                        fields, which pdf-lib otherwise auto-fits to the box.
 * @returns {Promise<Uint8Array>}        Filled PDF bytes.
 *
 * ## spec shape
 *
 * ```js
 * {
 *   text:         { camelKey: 'PDF Field Name', ... },
 *   checkbox:     { camelKey: 'PDF Field Name', ... },
 *   dropdown:     { camelKey: 'PDF Field Name', ... },
 *   booleanPair:  { camelKey: ['YES_FIELD', 'NO_FIELD'], ... },
 *   radio:        { camelKey: { field, yes, no, na? }, ... },
 *   enumCheckbox: { camelKey: { value: 'FIELD', ... }, ... },
 *   array:        { camelKey: ['FIELD_1', 'FIELD_2', ...], ... },
 *   composite:    [{ fields: [...keys], pdfField: 'NAME', join: ' / ' }, ...],
 * }
 * ```
 */
export async function fillPdf (pdfBytes, data, spec, options = {}) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ── Text fields ──
  if (spec.text) {
    for (const [key, pdfField] of Object.entries(spec.text)) {
      const val = get(data, key);
      if (val != null && val !== '') {
        const field = form.getTextField(pdfField);
        setFieldDA(field, String(val), font);
        setTextField(field, val);
      }
    }
  }

  // ── Checkboxes ──
  if (spec.checkbox) {
    for (const [key, pdfField] of Object.entries(spec.checkbox)) {
      const val = get(data, key);
      if (val === true) form.getCheckBox(pdfField).check();
      else if (val === false) form.getCheckBox(pdfField).uncheck();
    }
  }

  // ── Dropdowns ──
  if (spec.dropdown) {
    for (const [key, pdfField] of Object.entries(spec.dropdown)) {
      const val = get(data, key);
      if (val != null) form.getDropdown(pdfField).select(val);
    }
  }

  // ── Boolean pairs (two checkboxes → one boolean) ──
  if (spec.booleanPair) {
    for (const [key, [yesField, noField]] of Object.entries(spec.booleanPair)) {
      const val = get(data, key);
      if (val === true) { form.getCheckBox(yesField).check(); form.getCheckBox(noField).uncheck(); }
      if (val === false) { form.getCheckBox(yesField).uncheck(); form.getCheckBox(noField).check(); }
    }
  }

  // ── Radio groups ──
  if (spec.radio) {
    for (const [key, { field, yes, no, na }] of Object.entries(spec.radio)) {
      const val = get(data, key);
      if (val === true) form.getRadioGroup(field).select(yes);
      else if (val === false) form.getRadioGroup(field).select(no);
      else if (val === null && na) form.getRadioGroup(field).select(na);
    }
  }

  // ── Enum checkboxes (string value selects one from a group) ──
  if (spec.enumCheckbox) {
    for (const [key, mapping] of Object.entries(spec.enumCheckbox)) {
      const val = get(data, key);
      if (val != null) {
        for (const pdfField of Object.values(mapping)) form.getCheckBox(pdfField).uncheck();
        const target = mapping[val];
        if (target) form.getCheckBox(target).check();
      }
    }
  }

  // ── Array fields (array of values → numbered PDF fields) ──
  if (spec.array) {
    for (const [key, pdfFields] of Object.entries(spec.array)) {
      const arr = get(data, key);
      if (!Array.isArray(arr)) continue;
      for (let i = 0; i < pdfFields.length; i++) {
        if (arr[i] != null && arr[i] !== '') {
          const field = form.getTextField(pdfFields[i]);
          setFieldDA(field, String(arr[i]), font);
          setTextField(field, arr[i]);
        }
      }
    }
  }

  // ── Composite fields (multiple data keys → one PDF field) ──
  if (spec.composite) {
    for (const { fields, pdfField, join: sep } of spec.composite) {
      const parts = fields.map(k => get(data, k)).filter(v => v != null && v !== '');
      if (parts.length) {
        const field = form.getTextField(pdfField);
        const text = parts.join(sep || ' / ');
        setFieldDA(field, text, font);
        setTextField(field, text);
      }
    }
  }

  // ── Custom logic (signatures, timestamp fields, etc.) ──
  if (options.customize) {
    await options.customize(form, pdfDoc, font);
  }

  // ── Bake printable appearances ──
  form.updateFieldAppearances(font);

  // Reset DA to font size 0 on all text fields so viewers auto-size on future edits
  const autoSizeDA = PDFString.of('/Helvetica 0 Tf 0 g');
  for (const field of form.getFields()) {
    if (field.constructor.name === 'PDFTextField') {
      field.acroField.dict.set(PDFName.of('DA'), autoSizeDA);
    }
  }

  // ── Post-bake finalize (custom appearances that must outlive the bake) ──
  if (options.finalize) {
    await options.finalize(form, pdfDoc, font);
  }

  const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'));
  acroForm.delete(PDFName.of('NeedAppearances'));

  return pdfDoc.save();
}

/**
 * Set the DA string on a text field with a calculated font size that fits
 * the text. Single-line fields shrink to fit width; multiline fields use
 * a height-based default.
 */
function setFieldDA (field, text, font) {
  const widgets = field.acroField.getWidgets();
  if (!widgets.length) return;
  const rect = widgets[0].getRectangle();
  const padding = 4;
  const maxHeight = rect.height - padding;
  const heightBasedSize = Math.max(4, Math.min(maxHeight, 12));

  let size = heightBasedSize;
  const isMultiline = field.acroField.hasFlag(MULTILINE_FLAG);
  if (text && !isMultiline) {
    const textWidth = font.widthOfTextAtSize(text, heightBasedSize);
    const fieldWidth = rect.width - padding * 2;
    if (textWidth > fieldWidth) {
      size = Math.max(4, heightBasedSize * (fieldWidth / textWidth));
    }
  }

  const da = PDFString.of(`/Helvetica ${size.toFixed(2)} Tf 0 g`);
  field.acroField.dict.set(PDFName.of('DA'), da);
}

function setTextField (field, value) {
  const text = String(value);
  const maxLength = field.getMaxLength();
  field.setText(maxLength == null ? text : text.slice(0, maxLength));
}

/** Resolve a dot-path like 'booking.warrant' against a nested object. */
function get (obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}
