# Implementation Plan: Issue #200 - Narcotics Questions Required

## The Problem

**Issue:** "In the subject details view, do not allow the user to proceed without completing the narcotics questions."

**Current behavior:**
1. User creates a new hold
2. User goes to Subject form (Step 1 of 3)
3. User fills in name, DOB, etc. but leaves narcotics questions unanswered
4. User clicks "Next: deflection details"
5. Form submits successfully, user advances to Step 2
6. **Bug:** Narcotics questions were skipped despite being marked required (*)

**Desired behavior:**
- Form should NOT submit until both narcotics questions are answered
- Error messages should appear under the unanswered fields

## Why This Plan Solves The Problem

### The Mechanism

Mantine's `useForm` hook provides a `validate` option. When the user calls `form.onSubmit(handler)`:

1. Mantine runs all validation functions
2. If any return an error string, the handler is **not called**
3. Errors are stored in `form.errors` object
4. Component re-renders, showing errors via `Input.Wrapper error` prop

### Tracing Through The Fix

**Before (current code):**
```
User clicks "Next" → form.onSubmit() → No validation → mutateAsync() runs → Navigate to Step 2
```

**After (with fix):**
```
User clicks "Next" → form.onSubmit() → validate() runs →
  If narcoticsSubstance === null → return 'Required' → form.errors populated → NO navigation
  If both answered → return null → mutateAsync() runs → Navigate to Step 2
```

### Edge Cases Handled

| Scenario | isNew | Narcotics Section | Validation Runs? | Outcome |
|----------|-------|-------------------|------------------|---------|
| New hold, narcotics unanswered | true | Visible | Yes | Blocked, shows error |
| New hold, narcotics answered | true | Visible | Yes | Passes, advances |
| Edit existing subject | false | Hidden | No (skipped) | Passes, saves |
| Edit subject, legacy null narcotics | false | Hidden | No (skipped) | Passes, saves |

The key insight: validation is **conditional on `isNew`**. We only validate narcotics when the narcotics section is visible.

---

## Scope

**In scope:**
- Add client-side validation to SubjectForm.jsx
- Display validation errors

**Out of scope (mention in PR):**
- `Hold.jsx` `isValid` check doesn't include narcotics
- `NarcoticsForm.jsx` has same gap
- Server-side validation

---

## Files to Modify

1. `client/src/lesc/components/SubjectForm.jsx`
   - Add `useRef` to imports (line 1)
   - Add `isNewRef` ref declaration
   - Add ref update after `isNew` computation
   - Add `validate` function to `useForm`
   - Add `error` props to Input.Wrapper components

---

## Implementation Steps

### Step 0: Add `useRef` to imports

**Location:** `SubjectForm.jsx` line 1

**Current code:**
```javascript
import { useEffect, useState } from 'react';
```

**New code:**
```javascript
import { useEffect, useRef, useState } from 'react';
```

---

### Step 1: Add a ref to track `isNew` for validation

**Location:** `SubjectForm.jsx` - add after line 40 (after `const { t } = useTranslation();`)

**Add this code:**
```javascript
// Ref to track isNew for validation - avoids stale closure issues in uncontrolled mode
const isNewRef = useRef(true);
```

**Why a ref?** Per [Mantine's uncontrolled mode docs](https://mantine.dev/form/uncontrolled/), closures can be stale. A ref always provides the current value when accessed.

---

### Step 2: Update the ref when `isNew` changes

**Location:** `SubjectForm.jsx` - add after line 63 (after `const isNew = ...`)

**Add this code:**
```javascript
isNewRef.current = isNew;
```

This ensures the ref always has the current `isNew` value before any validation runs.

---

### Step 3: Add conditional validation to useForm

**Location:** `SubjectForm.jsx` lines 43-51

**Current code:**
```javascript
const form = useForm({
  mode: 'uncontrolled',
  initialValues,
  transformValues: (values) => ({
    ...values,
    narcoticsSubstance: values.narcoticsSubstance !== null ? values.narcoticsSubstance === 'true' : null,
    narcoticsParaphernalia: values.narcoticsParaphernalia !== null ? values.narcoticsParaphernalia === 'true' : null,
  }),
});
```

**New code:**
```javascript
const form = useForm({
  mode: 'uncontrolled',
  initialValues,
  validate: (values) => ({
    // Only validate narcotics when section is visible (isNew === true)
    // Use ref to avoid stale closure in uncontrolled mode
    narcoticsSubstance: isNewRef.current && values.narcoticsSubstance === null ? 'Required' : null,
    narcoticsParaphernalia: isNewRef.current && values.narcoticsParaphernalia === null ? 'Required' : null,
  }),
  transformValues: (values) => ({
    ...values,
    narcoticsSubstance: values.narcoticsSubstance !== null ? values.narcoticsSubstance === 'true' : null,
    narcoticsParaphernalia: values.narcoticsParaphernalia !== null ? values.narcoticsParaphernalia === 'true' : null,
  }),
});
```

**Why `isNewRef.current` instead of `isNew` directly:**
- Mantine's uncontrolled mode can have stale closures
- `useRef` provides a mutable container that always returns current value
- The ref is updated on every render (Step 2), before user can submit
- When validation runs, `isNewRef.current` reflects the true current state

**Why this handles edge cases:**
- When `isNew === false` (editing existing subject), validation returns `null` (no error)
- Even if narcotics values are `null` in legacy data, no error because `isNewRef.current` is `false`

### Step 4: Add error prop to first narcotics Input.Wrapper

**Location:** `SubjectForm.jsx` line 232

**Change:** Add `error={form.errors.narcoticsSubstance}` attribute

```jsx
<Input.Wrapper
  label={<>Possesses a controlled substance<span>*</span></>}
  error={form.errors.narcoticsSubstance}
>
```

**Why needed:** `form.getInputProps()` spreads onto `Chip.Group`, but `Chip.Group` doesn't render errors. `Input.Wrapper` does, but needs explicit `error` prop.

### Step 5: Add error prop to second narcotics Input.Wrapper

**Location:** `SubjectForm.jsx` line 245

**Change:** Add `error={form.errors.narcoticsParaphernalia}` attribute

```jsx
<Input.Wrapper
  label={<>Possesses narcotics paraphernalia<span>*</span></>}
  error={form.errors.narcoticsParaphernalia}
>
```

---

## Verification: Does This Actually Work?

### Must verify before implementing:

1. **Does the ref approach work for accessing `isNew`?**
   - The ref is updated on every render before user can interact
   - When validation runs, `isNewRef.current` should have correct value
   - **Test:** Add `console.log('isNewRef:', isNewRef.current)` inside validate function
   - **Why we're confident:** Refs are the standard React pattern for this exact problem

2. **Does `form.errors.narcoticsSubstance` exist and display correctly?**
   - After failed validation, `form.errors` should contain the field errors
   - `Input.Wrapper` with `error` prop should display red text below the field
   - **Test:** Temporarily hardcode `error="test"` on Input.Wrapper, verify it displays

3. **Does validation prevent form submission?**
   - Mantine's `onSubmit` should NOT call the handler if validation fails
   - **Test:** Add `console.log('submitted')` in mutation, verify it doesn't fire when validation fails

---

## Manual Testing Checklist

1. **New hold - validation blocks:**
   - Create new hold → Subject form → Fill demographics, skip narcotics → Click "Next"
   - ✓ Form does NOT submit
   - ✓ Error messages appear under both narcotics fields

2. **New hold - validation passes:**
   - Create new hold → Subject form → Fill all fields including narcotics → Click "Next"
   - ✓ Form submits
   - ✓ Navigates to Step 2 (Deflection details)

3. **Edit existing - no validation:**
   - Go to existing hold with subject → Click "Edit subject"
   - ✓ Narcotics section is NOT visible
   - Change something → Click "Save subject details"
   - ✓ Form submits (no narcotics validation)

4. **Error clears on selection:**
   - Trigger validation error → Select "Yes" or "No"
   - ✓ Error message disappears immediately

---

## PR Template

```markdown
## Summary
Adds client-side validation to require narcotics questions before advancing from Subject form (Step 1).

**Changes:**
- Added `validate` function to `useForm` that checks narcotics fields when `isNew === true`
- Added `error` props to `Input.Wrapper` components for error display

## Why this works
Uses a ref (`isNewRef`) to track whether we're creating a new hold. When user clicks "Next":
1. Mantine runs validation
2. Validator checks `isNewRef.current` (always current, no stale closure issues)
3. If `isNewRef.current && value === null`, returns 'Required' error
4. Form submission is blocked, error displays
5. When editing existing subject (`isNewRef.current === false`), validation is skipped

## Test plan
- [ ] New hold: Cannot advance without answering both narcotics questions
- [ ] New hold: Error messages display under narcotics fields
- [ ] Edit existing subject: No validation (narcotics section hidden)
- [ ] Errors clear when user makes selection

## Out of scope
- `Hold.jsx` `isValid` doesn't include narcotics (separate issue needed)
- `NarcoticsForm.jsx` has same validation gap (can use same pattern)
- Server-side validation

Closes #200
```

---

## Rollback Plan

If issues discovered:
1. Revert commit, or
2. Remove `validate` key from useForm config

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ~~Validate function doesn't see current `isNew`~~ | ~~Low~~ | ~~High~~ | ~~Solved by using ref~~ |
| Error display doesn't work | Low | Medium | Test with hardcoded error first |
| Breaks existing edit flow | Medium | High | Test edit flow explicitly |
| Performance (validate on every render) | Very Low | Low | Mantine optimizes this internally |
| useRef not imported | Very Low | Low | Linter will catch this |
