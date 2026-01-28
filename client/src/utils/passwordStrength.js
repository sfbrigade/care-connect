export function getPasswordStrengthScore (password) {
  if (typeof password !== 'string') return 0;

  const value = password.trim();
  if (value.length === 0) return 0;

  // Score is 0..4 to align with existing UI (25% increments).
  let score = 1;

  if (value.length >= 12) {
    score += 1; // Meets minimum length guidance

    const words = value.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSymbol = /[^A-Za-z0-9\s]/.test(value);
    const classesCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

    // Reward either passphrases (multiple words) or character variety.
    if (wordCount >= 3 || classesCount >= 3) score += 1;

    // Extra credit for length or higher complexity.
    if (value.length >= 16 || wordCount >= 4 || classesCount === 4) score += 1;
  }

  return Math.max(0, Math.min(4, score));
}

