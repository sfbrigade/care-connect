# How to Validate the Implementation Plan

## 1. Verify the Key Assumption (Most Important)

The entire plan hinges on: "Mantine `mode: 'uncontrolled'` only validates rendered fields."

**How to test:**
```bash
docker compose up
docker compose exec server bash -l
```
Then in browser console on the SubjectForm page, temporarily add validation to a field that's always rendered (like `firstName`) and confirm it works. Then check if narcotics validation fires when editing an existing subject (where narcotics section is hidden).

Or just **read the Mantine docs** directly:
- https://mantine.dev/form/use-form/
- https://mantine.dev/form/validation/

## 2. Verify Line Numbers

I cited specific lines. Files change. Open the actual files and confirm:
- `useForm` is at lines 43-51
- First narcotics `Input.Wrapper` is at lines 232-244
- Second is at lines 245-257

```bash
# Quick check
sed -n '43,51p' client/src/lesc/components/SubjectForm.jsx
sed -n '232,257p' client/src/lesc/components/SubjectForm.jsx
```

## 3. Test the Error Display Pattern

I claimed `Input.Wrapper` needs explicit `error` prop. Verify by:
- Check Mantine docs for Input.Wrapper
- Or add `error="test error"` to one Input.Wrapper and see if it renders

## 4. Walk Through the App

Actually use the app to verify my understanding of the flow:
1. Create a new hold
2. Go to subject form
3. Confirm narcotics section appears
4. Go back, click on an existing hold with a subject
5. Confirm narcotics section does NOT appear

This validates the `isNew` logic I documented.

## 5. Check What I Might Have Missed

```bash
# Are there other places that import/use SubjectForm?
grep -r "SubjectForm" client/src/

# Any other narcotics validation anywhere?
grep -r "narcoticsSubstance" client/src/ --include="*.jsx"

# Any form validation patterns I missed?
grep -r "validate:" client/src/lesc/
```

## 6. Ask Claude to Prove It

Ask Claude to:
- Show you the Mantine docs on uncontrolled validation behavior
- Run the grep commands above and show results
- Read a specific section of code you're uncertain about

## The Riskiest Assumption

If I had to pick one thing most likely to be wrong: **the uncontrolled mode behavior**. I inferred it from how the code is structured, but didn't verify against Mantine's actual implementation. If validation runs on all `initialValues` regardless of what's rendered, the plan needs the contingency approach.
