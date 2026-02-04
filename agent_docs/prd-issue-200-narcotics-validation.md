# PRD: Narcotics Questions Required Validation

**Issue:** [#200](https://github.com/sfgov/care-connect/issues/200)
**Type:** Bug Fix

---

## Problem Statement

In the Subject Details view (Step 1 of the hold creation flow), users can advance to the next step without completing the narcotics questions. These questions are visually marked as required but no validation actually enforces this.

The narcotics questions are:
1. "Possesses a controlled substance" (Yes/No)
2. "Possesses narcotics paraphernalia" (Yes/No)

---

## Current Behavior

- Users can click "Next: deflection details" without answering the narcotics questions
- The form submits successfully with unanswered questions
- Users can complete the entire hold creation flow without ever answering
- Holds can be transferred without narcotics information

---

## Required Behavior

1. When creating a new hold, the form must **block submission** if narcotics questions are unanswered
2. Validation error messages must appear next to unanswered narcotics questions
3. If the narcotics section is collapsed when validation fails, it must **auto-expand** to show the errors
4. A hold should be considered **incomplete** until narcotics questions are answered
5. Editing an existing hold that already has narcotics answers should NOT require re-answering

---

## Acceptance Criteria

All acceptance criteria must be verified by navigating to the running application in a browser.

### AC1: Cannot Advance Without Answers

**Given** I am on the Subject Details form for a new hold (`/holds/{id}/subject?isNew=true`)
**And** I have filled in all other required fields (first name, last name, DOB, sex, race)
**When** I click "Next: deflection details" without answering the narcotics questions
**Then** the form does NOT submit and I remain on the same page

### AC2: Validation Errors Displayed

**Given** I attempt to submit the Subject Details form without narcotics answers
**Then** I see error messages indicating the narcotics questions are required

### AC3: Accordion Auto-Expands on Error

**Given** the narcotics questions section is collapsed
**When** I attempt to submit without answering them
**Then** the section automatically expands to reveal the validation errors

### AC4: Successful Submission With Answers

**Given** I have filled in all required fields including both narcotics questions
**When** I click "Next: deflection details"
**Then** the form submits and I navigate to the Deflection Details step

### AC5: Hold Marked Incomplete

**Given** a hold exists where narcotics questions were not answered
**When** I view the holds list at `/holds`
**Then** the hold card shows "Details incomplete" status
**And** the QR code appears locked/faded
**And** the button says "Finish Details" rather than "View Details"

### AC6: Hold Complete After Answering

**Given** I complete the narcotics questions for a previously incomplete hold
**When** I return to the holds list
**Then** the hold no longer shows "Details incomplete"
**And** the QR code is fully visible
**And** transfer functionality is available

### AC7: Edit Flow Unchanged

**Given** I am editing an existing hold that already has narcotics answers
**When** I save changes to other subject fields
**Then** the form saves successfully without re-validation of narcotics

---

## Browser Verification Instructions

After implementation, use agent-browser to verify each acceptance criterion by navigating to:

**Base URL:** `http://localhost:5173`

### Verification Flow

1. **Navigate to holds list:** Go to `/holds`
2. **Create a new hold:** Use the create incident/hold functionality
3. **Open subject form:** Click "Add Details" on the new hold to reach `/holds/{id}/subject?isNew=true`
4. **Test AC1-AC4:** Fill required fields, attempt submission without narcotics, verify errors, then complete and verify navigation
5. **Test AC5-AC6:** Check holds list for incomplete status, complete the hold, verify status change
6. **Test AC7:** Edit an existing complete hold's subject info and verify it saves

Each verification step must show the expected behavior in the actual browser interface.

---

## Definition of Done

- [x] Code implementation complete (SubjectForm.jsx validation + Hold.jsx isValid check)
- [x] Code passes linting (`npm run lint`)
- [x] **Draft PR** created referencing `[Closes #200]`
- [ ] All acceptance criteria pass when verified via browser navigation
- [ ] Existing tests pass (`npm test`)

---

## Current Status

**A draft PR already exists but has NOT been browser-tested.**

A previous agent loop attempted this work but was unable to perform browser testing because Docker wasn't running.

### What Exists
- Draft PR on branch `200-narcotics-validation`
- Some changes to `SubjectForm.jsx` and `Hold.jsx` (needs verification)

### What's Unknown
- Whether the implementation actually followed the research and plan
- Whether the code changes are correct

### What's Left
- Start the development environment
- Review what was actually implemented vs. what the plan specified
- Verify all acceptance criteria (AC1-AC7) in an actual browser
- Run the test suite

---

## Pre-Work: Read Previous Research

**IMPORTANT:** Before testing, read all files in `agent_docs/issue-200/`:
- `research.md` - Original codebase analysis and bug identification
- `plan.md` - Detailed implementation plan the loop was supposed to follow
- `plan-validation.md` - How to validate the implementation
- `research-validation.md` - Additional validation research

This context explains the intended approach. Compare what was actually implemented against what the plan specified.

---

## Starting the Development Environment

Before browser verification, you must bring up the project:

```bash
# Start all services (PostgreSQL, MinIO, server, client)
docker compose up -d

# Wait for services to be healthy, then verify
docker compose ps
```

The app will be available at: **http://localhost:5173**

If you need to run commands inside the container:
```bash
docker compose exec server bash -l
```

---

## Completion Promise

<promise>IN_PROGRESS</promise>
