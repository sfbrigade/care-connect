import { test } from 'node:test';
import * as assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PII_FIELDS } from '../../models/subject.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('PII_FIELDS matches @pii annotations in schema.prisma', async () => {
  const schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Extract the Subject model block
  const subjectMatch = schema.match(/model Subject \{([\s\S]*?)\n\}/);
  assert.ok(subjectMatch, 'Subject model not found in schema.prisma');
  const subjectBlock = subjectMatch[1];

  // Find all fields preceded by /// @pii on the previous line
  const lines = subjectBlock.split('\n');
  const annotatedFields = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '/// @pii' && i + 1 < lines.length) {
      const fieldMatch = lines[i + 1].trim().match(/^(\w+)/);
      if (fieldMatch) {
        annotatedFields.push(fieldMatch[1]);
      }
    }
  }

  assert.deepStrictEqual(
    annotatedFields.sort(),
    [...PII_FIELDS].sort(),
    `@pii annotations in schema.prisma do not match PII_FIELDS constant.\n` +
    `In schema but not in PII_FIELDS: ${annotatedFields.filter(f => !PII_FIELDS.includes(f)).join(', ') || 'none'}\n` +
    `In PII_FIELDS but not in schema: ${PII_FIELDS.filter(f => !annotatedFields.includes(f)).join(', ') || 'none'}`
  );
});
