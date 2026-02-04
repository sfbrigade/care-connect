# How to Validate the Research

## Research Validation Summary                                                                              

The research-validation.md provides verification commands for 11 specific claims:

```
  ┌─────────────────────────────────────────────┬────────────┬─────────────────────────────────────┐
  │                    Claim                    │ Risk Level │         Verification Method         │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ Mantine uncontrolled mode behavior          │ High       │ Read docs / test manually           │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ Input.Wrapper needs explicit error prop     │ High       │ Read Mantine docs                   │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ isNew logic                                 │ High       │ grep "const isNew"                  │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ Two code paths (SubjectForm, NarcoticsForm) │ Medium     │ grep -r "narcoticsSubstance"        │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ Hold.jsx isValid missing narcotics          │ Medium     │ grep -A 10 "const isValid"          │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ No validation in either form                │ Medium     │ grep -A 10 "useForm"                │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ Server accepts null                         │ Low        │ Read server route                   │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ No existing tests                           │ Low        │ find + grep                         │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ No Chip.Group validation pattern            │ Low        │ Cross-reference grep results        │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ DIDO has no narcotics                       │ Low        │ grep -r "narcotic" client/src/dido/ │
  ├─────────────────────────────────────────────┼────────────┼─────────────────────────────────────┤
  │ Navigation flow                             │ Low        │ Read HoldsActive.jsx                │
  └─────────────────────────────────────────────┴────────────┴─────────────────────────────────────┘
```

The three highest-risk items that could invalidate the plan are all about Mantine behavior - worth verifying before implementation.

## Claims Made and How to Verify Each

### 1. Issue #200 is about narcotics validation in subject details view

**Verification:**
```bash
gh issue view 200
```
Or visit the GitHub issue directly and read the title/description.

---

### 2. Two code paths exist for narcotics questions

**Claim:** SubjectForm.jsx and NarcoticsForm.jsx both handle narcotics.

**Verification:**
```bash
grep -r "narcoticsSubstance" client/src/ --include="*.jsx" -l
```

Should return both files. Read each to confirm they both have narcotics form fields.

---

### 3. Neither form has validation

**Claim:** Both forms use `useForm` without a `validate` object.

**Verification:**
```bash
# Check SubjectForm
grep -A 10 "useForm" client/src/lesc/components/SubjectForm.jsx

# Check NarcoticsForm
grep -A 10 "useForm" client/src/lesc/components/NarcoticsForm.jsx
```

Confirm neither has `validate:` in the useForm config.

---

### 4. Error display requires explicit error prop on Input.Wrapper

**Claim:** Mantine's `getInputProps` spread on Chip.Group doesn't pass error to Input.Wrapper.

**Verification:**
- Read Mantine docs: https://mantine.dev/core/input/#inputwrapper
- Or test: add `error="test"` to an Input.Wrapper and confirm it displays

---

### 5. Hold.jsx `isValid` doesn't check narcotics

**Claim:** The `isValid` variable only checks name/DOB/sex/race/behavior, not narcotics.

**Verification:**
```bash
grep -A 10 "const isValid" client/src/lesc/components/Hold.jsx
```

Read the output and confirm narcotics fields are not included.

---

### 6. DIDO facility has no narcotics code

**Claim:** Only LESC is affected by this issue.

**Verification:**
```bash
grep -r "narcotic" client/src/dido/ -i
```

Should return no results.

---

### 7. Server accepts null narcotics values

**Claim:** Server route defaults missing narcotics to null without validation.

**Verification:**
```bash
grep -A 5 "narcoticsSubstance" server/routes/api/deflections/subject.js
```

Look for `data.narcoticsSubstance ?? null` pattern.

---

### 8. No existing tests for SubjectForm or NarcoticsForm

**Claim:** No client-side tests exist for these components.

**Verification:**
```bash
find client/src -name "*.test.*" | xargs grep -l "SubjectForm\|NarcoticsForm" 2>/dev/null
```

Should return no results.

---

### 9. No existing Chip.Group validation pattern in codebase

**Claim:** All 14 forms with validation use TextInput/Textarea, none use Chip.Group.

**Verification:**
```bash
# Find all forms with validation
grep -r "validate:" client/src/ --include="*.jsx" -l

# Then check if any of those files use Chip.Group with validation
for f in $(grep -r "validate:" client/src/ --include="*.jsx" -l); do
  if grep -q "Chip.Group" "$f"; then
    echo "Found Chip.Group with validation in: $f"
  fi
done
```

Should find no files with both.

---

### 10. The isNew logic

**Claim:** `isNew = searchParams.get('isNew') === 'true' || !deflection?.subjectId`

**Verification:**
```bash
grep "const isNew" client/src/lesc/components/SubjectForm.jsx
```

Compare to what I documented.

---

### 11. Navigation flow from Holds to SubjectForm

**Claim:** HoldsActive.jsx navigates to `/holds/:id/subject` when deflection has no subjectId.

**Verification:**
```bash
grep -A 3 "onDetailsClick" client/src/lesc/components/HoldsActive.jsx
```

Confirm the navigation logic matches what I documented.

---

## Meta-Validation: What Could Be Stale?

Research was done at a point in time. Things that could change:
- Line numbers (if anyone edited these files)
- File locations (if files were moved)
- Mantine version behavior (if dependencies updated)

```bash
# Check if files were recently modified
git log --oneline -5 -- client/src/lesc/components/SubjectForm.jsx
git log --oneline -5 -- client/src/lesc/components/NarcoticsForm.jsx
git log --oneline -5 -- client/src/lesc/components/Hold.jsx
```

---

## Highest-Risk Claims

If I had to prioritize what to verify:

1. **Mantine uncontrolled mode behavior** - Core assumption for the fix
2. **Input.Wrapper error prop requirement** - If wrong, errors won't display
3. **isNew logic** - If wrong, validation could fire unexpectedly

Everything else is lower risk and can be verified during implementation.
