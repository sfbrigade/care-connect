# Ralph Tasks

Tasks for Issue #200 - Narcotics Questions Required Validation:

## Pre-Work
- [x] Read previous research in `agent_docs/issue-200/` (research.md, plan.md, plan-validation.md)

## Previous Loop (Unverified)
A previous loop claimed to complete these - verify against plan in `agent_docs/issue-200/plan.md`:
- [?] Implement narcotics validation in SubjectForm.jsx
- [?] Update Hold.jsx isValid to include narcotics check
- [?] Run linting
- [x] Create draft PR for issue #200

## Remaining (Verification)
- [x] Start Docker environment (`docker compose up -d`) - Running at http://localhost:3333
- [ ] Verify AC1: Cannot advance without narcotics answers
- [ ] Verify AC2: Validation errors displayed
- [ ] Verify AC3: Accordion auto-expands on error (if applicable)
- [ ] Verify AC4: Successful submission with answers
- [ ] Verify AC5: Hold marked incomplete when narcotics missing
- [ ] Verify AC6: Hold complete after answering
- [ ] Verify AC7: Edit flow unchanged for existing holds
- [ ] Run full test suite (`npm test`)
