import classes from './formStyles.module.css';

export function isBlank (value) {
  return !String(value ?? '').trim();
}

export function getMissingChipClassNames (isMissing) {
  if (!isMissing) return undefined;

  return {
    label: classes.missingChipLabel,
  };
}

export function getRequiredTextInputClassNames (isMissing) {
  if (!isMissing) return undefined;

  return {
    input: classes.requiredInput,
    error: classes.requiredInputError,
  };
}
