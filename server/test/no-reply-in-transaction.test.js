import { test } from 'node:test';
import * as assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROUTES_DIR = path.resolve('routes');
const TRANSACTION_START = '$transaction(async (tx) => {';
const REPLY_IN_TRANSACTION = /reply\.(code|send|status)\s*\(/;

function findViolations (dir, violations = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findViolations(fullPath, violations);
      continue;
    }
    if (!entry.isFile() || !fullPath.endsWith('.js')) {
      continue;
    }

    const text = fs.readFileSync(fullPath, 'utf8');
    let start = 0;
    while ((start = text.indexOf(TRANSACTION_START, start)) !== -1) {
      let index = start + TRANSACTION_START.length;
      let depth = 1;
      while (index < text.length && depth > 0) {
        const ch = text[index++];
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }

      const body = text.slice(start, index);
      if (REPLY_IN_TRANSACTION.test(body)) {
        violations.push(path.relative(process.cwd(), fullPath));
      }
      start = index;
    }
  }
  return violations;
}

test('route transactions do not write HTTP responses inside Prisma transaction callbacks', () => {
  const violations = findViolations(ROUTES_DIR);
  assert.deepStrictEqual(violations, []);
});
