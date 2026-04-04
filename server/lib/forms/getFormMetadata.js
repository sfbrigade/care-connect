import { FORM_REGISTRY as sharedForms } from '@care-connect/shared/forms';

export async function getFormMetadata () {
  const forms = {};
  for (const [formId, { componentName, ...sharedMeta }] of Object.entries(sharedForms)) {
    const { metadata } = await import(`#lib/forms/dist/${componentName}.js`);
    forms[formId] = { componentName, ...sharedMeta, ...metadata };
  }
  return forms;
}
