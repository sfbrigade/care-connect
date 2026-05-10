import { matches } from '@mantine/form';

// Copied from zod 4's default email regex (`node_modules/zod/v4/core/regexes.js`)
// so client-side validation matches the server's `z.string().email()` check.
// Notably permits apostrophes in the local part — see issue #754.
const EMAIL_REGEX = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export function isEmail (error) {
  return matches(EMAIL_REGEX, error);
}
