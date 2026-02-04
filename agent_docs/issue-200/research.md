# Issue #200 Research: Required Narcotics Questions

## Issue Summary
**Title:** Narcotics questions are required - do not allow user to advance without completion
**Status:** OPEN (Bug)

## The Bigger Picture

The UI says "Fields marked * must be completed before you can **transfer custody**." This suggests a multi-layered validation system:

| Layer | Location | Current State |
|-------|----------|---------------|
| Form validation | SubjectForm.jsx | **Missing** - no validate object |
| QR code gating | Hold.jsx `isValid` | **Missing narcotics** - only checks name/DOB/sex/race/behavior |
| Server validation | (transfer route) | **Not implemented** - /transfer/:id doesn't exist |

## Code Paths for Narcotics

| Component | Route | Purpose |
|-----------|-------|---------|
| `SubjectForm.jsx` | `/holds/:id/subject` | Step 1 - subject + narcotics entry |
| `NarcoticsForm.jsx` | `/holds/:id/narcotics` | Editing narcotics on existing hold |
| `Hold.jsx` | (component) | Displays `isValid` status and QR code |

## The Bugs (Three Parts)

### Bug 1: No Form Validation
```javascript
// SubjectForm.jsx:43-51 - NO validate object
const form = useForm({
  mode: 'uncontrolled',
  initialValues,
  transformValues: (values) => ({ ... }),
});
```

### Bug 2: Error Display Won't Work
Even with validation, errors won't show. `Input.Wrapper` needs explicit `error` prop:
```jsx
// Current (broken):
<Input.Wrapper label={...}>
  <Chip.Group {...form.getInputProps('narcoticsSubstance')}>

// Required (fixed):
<Input.Wrapper label={...} error={form.errors.narcoticsSubstance}>
```

### Bug 3: `isValid` Missing Narcotics Check
```javascript
// Hold.jsx:46-51 - NARCOTICS NOT CHECKED
const isValid = !!deflection?.subject?.firstName &&
  !!deflection?.subject?.lastName &&
  !!deflection?.subject?.dateOfBirth &&
  !!deflection?.subject?.sex &&
  !!deflection?.subject?.race &&
  !!deflection?.behavior; // TODO: check property, move this logic somewhere reusable
```

The TODO comment suggests this is known incomplete. Should include:
```javascript
deflection?.narcoticsSubstance !== null &&
deflection?.narcoticsParaphernalia !== null
```

## Files to Modify

1. **`client/src/lesc/components/SubjectForm.jsx`** (primary per issue)
   - Add `validate` object
   - Add `error` props to Input.Wrappers

2. **`client/src/lesc/components/NarcoticsForm.jsx`** (same pattern)

3. **`client/src/lesc/components/Hold.jsx`** (related fix)
   - Add narcotics to `isValid` check

## Implementation Challenges

### Challenge 1: Conditional Validation
Narcotics section only renders when `isNew === true`. The `isNew` value:
```javascript
const isNew = searchParams.get('isNew') === 'true' || !deflection?.subjectId;
```
- Depends on async `deflection` data
- Form initializes before data loads
- Validation function needs access to this state

### Challenge 2: No Existing Pattern
No validated Chip.Group examples in codebase. All 14 forms with validation use TextInput/Textarea.

### Challenge 3: Edge Case - Editing Old Data
If user edits a subject where narcotics was never answered (legacy data):
- `isNew` would be `false` (subject exists)
- Narcotics section wouldn't render
- But narcotics fields still in form state as `null`
- Validation might fail unexpectedly

### Challenge 4: No Server Safety Net
Server accepts null narcotics values. No validation at API level.

## Recommended Fix

### SubjectForm.jsx
```jsx
const form = useForm({
  mode: 'uncontrolled',
  initialValues,
  validate: {
    narcoticsSubstance: (value, values, path) => {
      // Only validate if narcotics section is shown (new hold)
      const isNewHold = !deflection?.subjectId;
      if (isNewHold && value === null) return 'Required';
      return null;
    },
    narcoticsParaphernalia: (value) => { /* same pattern */ },
  },
  transformValues: ...
});

// JSX - add error props:
<Input.Wrapper
  label={<>Possesses a controlled substance<span>*</span></>}
  error={form.errors.narcoticsSubstance}
>
```

### Hold.jsx
```javascript
const isValid = !!deflection?.subject?.firstName &&
  !!deflection?.subject?.lastName &&
  !!deflection?.subject?.dateOfBirth &&
  !!deflection?.subject?.sex &&
  !!deflection?.subject?.race &&
  !!deflection?.behavior &&
  deflection?.narcoticsSubstance !== null &&
  deflection?.narcoticsParaphernalia !== null;
```

## Testing Checklist

- [ ] New hold: can't advance past Step 1 without narcotics answers
- [ ] New hold: error messages display correctly
- [ ] Edit subject: narcotics section doesn't appear, no validation errors
- [ ] Edit narcotics form: can't save without both answers
- [ ] Hold card: shows "Details incomplete" when narcotics missing
- [ ] Hold card: QR code locked when narcotics missing

## Open Questions

1. Should `isValid` fix be in same PR or separate issue?
2. Should server-side validation be added?
3. Exact error message wording?
4. What about legacy data without narcotics answers?
