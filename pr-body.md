**Title**  
Update Care User Home to match Intake Staff design, restore scan flow wiring, and harden scan/manual entry behavior

**Summary**  
This PR updates the Care User home view to align with the Intake Staff Figma design and addresses follow-up UX/behavior fixes from review.

**Commit Relationship**  
This PR is a follow-up to commit **"Added client details and filters (#123)"** and extends that work by enforcing Care-specific data visibility server-side.

**PR Summary (for commit "Added client details and filters (#123)")**  
- Adds server-side redaction for Care users so subject responses only include first name, last name, DOB, sex/gender, and race values.
- Applies the redaction path across deflection endpoints (`list`, `get`, and mutation responses) to prevent direct API bypass.
- Adds read authorization checks for `GET /api/deflections/:id` consistent with existing role semantics.
- Preserves non-Care behavior so SFSO/SFPD users continue receiving full subject field access.
- Expands API tests to verify:
  - Care redaction on list/get/admit responses
  - Non-Care users still receive non-redacted fields

**What changed**  
- Reworked `Care` home layout to match design:
  - Rounded segmented tabs (`In custody` / `Not in custody`)
  - Section headers/counts/descriptions and caret controls
  - Card presentation updates for medical intake records
  - Timestamp placement and bottom action area styling
- Added section dividers (including below the last record section)
- Implemented expand/collapse behavior for section carets
- Restored caret visibility for zero-count sections
- Ensured `In-chair: 0` does not render a `None` label
- Removed unintended black bottom bar
- Pinned **Scan transfer code** action to viewport bottom using fixed footer + spacer
- Restored **Scan transfer code** button wiring in Care:
  - Reconnected modal open/close and query invalidation on success
- Updated Care scan modal behavior/copy and toast handling
- Hardened scanner lifecycle to prevent blank/manual-entry transition issues:
  - More robust scanner stop/clear cleanup
  - Unique scanner DOM ids per instance

**Toast behavior in Care scan flow**  
Implemented/confirmed handling for:
- `Intake started` (single person)
- `Intake started for [count] persons` (multi-person response payloads)
- `Intake already started` (409 conflict)
- `Transfer code not recognized` (invalid/non-network error)
- `Connection problem` (network error)

**Files touched (key)**  
- `client/src/lesc/components/care/Care.jsx`
- `client/src/lesc/components/care/CareCard.jsx`
- `client/src/lesc/components/care/ScanAdmitCodeModal.jsx`
- `client/src/components/ScanCodeModal.jsx`
- `client/src/components/QRScanner.jsx`
- `client/src/Api.js`

**Validation**  
- ESLint passes for all updated files.

---

**Additional Summary (for commit "Marking intake complete (#62)")**  
- Adds a confirmation modal in Care when Intake Staff taps **Complete intake**.
- Implements two explicit outcomes for intake confirmation:
  - **Yes, intake completed**: person transitions to `IN_CHAIR`.
  - **No, intake not completed**: person transitions to `FAILED_INTAKE` and returns to Custody review flow.
- Adds server route `POST /api/deflections/:id/intake-complete` to handle these transitions transactionally.
- Keeps chair inventory behavior consistent with existing model:
  - Chair counts are adjusted on **admit/release** routes, not on intake-complete confirmation.
- Updates Custody In custody view so `FAILED_INTAKE` records appear under **Pending Safety Checks**.
- Updates failed-intake card presentation to match design intent:
  - Inline red status label: **Intake not completed**.
  - Indigo outline only during highlight window (3 seconds) when moved back.
  - **Legal release** action is available from the card.
- Adds Custody toast for newly returned failed-intake records:
  - `Intake not completed. Person X moved back. Please review their status before release or exit.`
- Expands server route tests to cover `intake-complete` outcomes (`IN_CHAIR` and `FAILED_INTAKE`).

**Additional Files Touched (key)**  
- `client/src/lesc/components/care/Care.jsx`
- `client/src/lesc/components/care/CareCard.jsx`
- `client/src/lesc/components/care/CompleteIntakeModal.jsx`
- `client/src/lesc/components/custody/Custody.jsx`
- `client/src/lesc/components/custody/CustodyCard.jsx`
- `client/src/Api.js`
- `server/routes/api/deflections/intake-complete.js`
- `server/routes/api/deflections/list.js`
- `server/routes/api/deflections/release.js`
- `server/test/routes/api/deflections.test.js`

**Additional Validation**  
- ESLint passes on changed client/server files.
- Full server test suite could not be executed in this environment due to missing container runtime for Testcontainers.

---

**Additional Summary (for commit "Records physical exit (#63)")**
- Added Care exit workflow actions on In-chair cards:
  - `Start exit` for new exit flow
  - `Complete exit` after exit details are saved (draft state)
- Added a new Care exit review screen at `care/:id/exit` with required fields:
  - Exit destination
  - SF residency status
  - Housing status
  - Connection to care
  - Final "Person has physically left RESET?" confirmation (Yes/No)
- Implemented button state/label behavior in exit review:
  - `Save and continue` (default/disabled until required fields + final choice)
  - `Save exit details` when final choice is `No`
  - `Confirm exit` when final choice is `Yes`
- Added confirm-exit modal flow (Figma-aligned copy/styling):
  - `No, keep them onsite` returns to form without changes
  - `Yes, confirm exit` completes the exit
- Added server endpoint `POST /api/deflections/:id/exit-details`:
  - Persists exit detail fields while person remains `IN_CHAIR`
  - Writes corresponding `DeflectionUpdate` entries
- Added server endpoint `POST /api/deflections/:id/exit`:
  - Transitions `IN_CHAIR -> EXITED`
  - Sets `exitedAt` / `exitedById`
  - Persists exit detail fields
  - Writes `DeflectionUpdate`
  - Updates chair availability (`occupied - 1`, `available + 1`)
- Added success toasts per design copy:
  - Exit details saved (person still onsite)
  - Exit recorded (person moved to Not in custody / Exited facility)
- Updated Care `Not in custody` tab to use three sections:
  - `Still onsite`
  - `Exited facility`
  - `Transferred to jail`
- Ensured newly exited records appear under `Exited facility` and receive a temporary blue highlight border for 3 seconds.
- Standardized temporary highlight behavior:
  - Blue card border shows only during highlight window
  - Border clears after ~3 seconds
- Removed empty-state `None` labels from Care sections.
- Disabled section caret controls when section item count is zero (caret remains visible but disabled).

**Additional Files Touched (key)**
- `client/src/lesc/components/care/Care.jsx`
- `client/src/lesc/components/care/CareCard.jsx`
- `client/src/lesc/components/care/CareExitDetails.jsx`
- `client/src/lesc/components/care/ConfirmExitModal.jsx`
- `client/src/lesc/routes/LESCRoutes.jsx`
- `client/src/Api.js`
- `server/routes/api/deflections/exit-details.js`
- `server/routes/api/deflections/exit.js`

**Additional Validation**
- `npm run lint:check --workspace client` passes.
- `npm run lint:check --workspace server` passes.

---

**Additional Summary (for commit "Adds exit flow entry point from person card (#63)")**
- Added a sticky action footer to Care person detail view (`/care/:id`) with:
  - `Start exit` primary action
  - Overflow (`...`) action button
- Wired `Start exit` from person detail to the existing exit-question flow route:
  - Navigates to `/care/:id/exit?from=detail`
- Implemented source-aware back/cancel behavior in the exit form:
  - If opened from person detail (`from=detail`), cancel/back returns to `/care/:id`
  - Existing Care-home entry behavior remains unchanged
- Added and refined confirm-exit modal presentation to match design intent:
  - Proper container padding token (`padding-xl` / 20px)
  - Circular close icon button sizing (fixed 40x40)
  - Destructive secondary action style aligned to design
  - Updated warning copy:
    - `This step can’t be undone. The person’s details will no longer be visible to you in CareConnect.`
- Updated Care home not-in-custody layout to 3 sections:
  - `Still onsite`
  - `Exited facility`
  - `Transferred to jail`
- Ensured newly exited person cards appear in `Exited facility` and receive temporary blue highlight (~3s)
- Updated Care card action visibility:
  - Hide `View details` for people transferred to jail (`EXITED` + `exitDestinationId=jail`)
- Removed redundant empty-state labels in Care sections (`None`)
- Disabled section collapse/expand caret when section count is zero (caret remains visible)
- Added client unit tests covering key flow logic:
  - view-details visibility rules
  - not-in-custody section grouping
  - caret disable rule
  - exit-form back route resolution
  - care-detail footer state (start-exit path + overflow disabled state)
  - exit success payload (highlight + redirect + toast payload)

**Additional Files Touched (key)**
- `client/src/lesc/components/care/Care.jsx`
- `client/src/lesc/components/care/CareCard.jsx`
- `client/src/lesc/components/care/CareExitDetails.jsx`
- `client/src/lesc/components/care/ConfirmExitModal.jsx`
- `client/src/lesc/components/custody/CustodyDetailContent.jsx`
- `client/src/lesc/components/care/careFlowUtils.js`
- `client/src/lesc/components/custody/careDetailFooterUtils.js`
- `client/src/lesc/components/care/careFlow.test.js`

**Additional Validation**
- `npm test --workspace client` passes.
- `npm run lint:check --workspace client` passes.

---

**Additional Summary (related to commit "Documenting release - happy path (#64)")**
- Implemented SFSO legal release happy-path flow entry from Custody home person cards:
  - `Legal release` now opens a dedicated release-questions view.
  - Home card now shows `Legal release` for both `FAILED_INTAKE` and `IN_CHAIR` people in custody.
- Added legal release questions screen at `custody/:id/legal-release` with Figma-aligned structure:
  - Title/subtitle copy
  - `849(b) narrative` section
  - `Edit narrative` action
  - Release reason choices: `Sobered`, `Medical issue`, `Other (please specify)`
  - `Cancel` + `Confirm release` actions
- Narrative handling:
  - Reused existing persisted deflection narrative field (`behavior`) for 849(b) narrative storage/access.
  - Added inline edit mode and server persistence through existing deflection update API.
- Confirm-release behavior:
  - `Confirm release` is disabled until `Sobered` is selected.
  - On submit, attempts legal release and returns to Custody home with one of three toasts:
    - Success: `Person legally released` + `849(b) record finalized. Please print the release certificate.`
    - Conflict/already released: `This person is already legally released.`
    - Network error: `Couldn't save release` + `Please check your connection and try again.`
- Post-release home card action update:
  - Released cards show `Print certificate` (replacing legal-release action in released state).
- Added person-details footer actions for SFSO custody detail view (matching Care footer pattern) for current scope:
  - When person is `IN_CHAIR` and in custody, sticky footer shows overflow + blue CTA `Start legal release`.
  - CTA opens release questions via `?from=detail` source flag.
- Source-aware cancel/back routing for legal release:
  - If release questions were launched from person details (`from=detail`), back and cancel return to `/custody/:id`.
  - Otherwise, back/cancel return to `/custody`.
- Typography/styling fixes applied per design requests:
  - 849(b) narrative title/text/edit link set to 16px tokenized text.
  - Legal release title/subtitle sizing adjusted to 20px/24px; subtitle line-height set to 32px.
  - Removed hover highlight pill effect from `Edit narrative` and kept it left-aligned.
  - Updated global chip label typography defaults to align with requested 16px/400/Roboto/text-color, while keeping dynamic chip line-height behavior.

**Additional Files Touched (key)**
- `client/src/lesc/components/custody/CustodyCard.jsx`
- `client/src/lesc/components/custody/Custody.jsx`
- `client/src/lesc/components/custody/CustodyDetailContent.jsx`
- `client/src/lesc/components/custody/LegalReleaseQuestions.jsx`
- `client/src/lesc/routes/LESCRoutes.jsx`
- `client/src/components/Chip.module.css`
- `client/src/Api.js`

**Additional Validation**
- `npm run lint:check --workspace client` passes.

---

**Additional Summary (applies to commit "Action footers for release (#64)")**
- Added a status-driven action footer for SFSO/Custody person detail view across in-custody states:
  - States covered: `AWAITING_INTAKE`, `FAILED_INTAKE`, `READY_FOR_INTAKE`, `ADMITTED`, `IN_CHAIR`
  - Footer includes:
    - Main blue CTA button
    - Overflow (`...`) action button
- Implemented primary CTA behavior by person status:
  - `AWAITING_INTAKE`:
    - CTA title: `Complete safety check`
    - Wiring: existing safety-check completion flow
  - `READY_FOR_INTAKE`, `ADMITTED`, `IN_CHAIR`:
    - CTA title: `Start legal release`
    - Wiring: legal release questions flow (`/custody/:id/legal-release?from=detail`)
- Implemented overflow menu with status-dependent items:
  - For `AWAITING_INTAKE`: `Start legal release`, `Record exit to jail`, `Record death`
  - For `READY_FOR_INTAKE`, `ADMITTED`, `IN_CHAIR`: `Record exit to jail`, `Record death`
  - `Record exit to jail` and `Record death` are scaffolded menu actions (currently show warning toasts; dedicated flows not yet implemented).
- Styled overflow menu icons to match design token:
  - Icon color set to `gray-5` (`#ADB5BD`) per Figma guidance.
- Expanded legal release questions flow for conditional exit handling:
  - `Medical issue` path:
    - Adds explanatory text
    - Adds required `Exit destination` question (`Hospital`, `Other`)
    - Confirm label becomes `Confirm release and exit`
    - Success uses `Exit recorded` toast copy
    - Backend now transitions to exited (`released + exited`) and stores exit destination
  - `Other (please specify)` path:
    - Adds required `Other release reason` text field
    - Adds required `Other release destination` text field
    - Adds helper text: `For “Other”, add a reason and destination. This release will also mark the person as exited from RESET.`
    - Confirm label becomes `Confirm release and exit`
    - Confirm remains disabled until both fields have text
    - Success uses same `Exit recorded` toast as medical
    - Backend stores both fields and transitions person to exited (`released + exited`)
- Updated custody home card actions for release entry:
  - In `READY_FOR_INTAKE`, card now shows `Start legal release` and routes to legal release flow.
  - `Legal release` action remains available in `FAILED_INTAKE` and `IN_CHAIR`.

**Additional Files Touched (key)**
- `client/src/lesc/components/custody/CustodyDetailContent.jsx`
- `client/src/lesc/components/custody/CustodyCard.jsx`
- `client/src/lesc/components/custody/LegalReleaseQuestions.jsx`
- `client/src/Api.js`
- `server/routes/api/deflections/release.js`
- `server/models/deflection.js`
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260303103000_add_other_release_reason_to_deflection/migration.sql`
- `server/prisma/migrations/20260303113000_add_other_release_destination_to_deflection/migration.sql`

**Additional Validation**
- `npm run lint:check --workspace client` passes.
- `npm run lint:check --workspace server` passes.

---

**Additional Summary (applies to commits "Records death in facility or custody (#295)" and "Records exit to jail no release (#293)")**

- Implemented a full **Record death** flow from SFSO/Custody person details overflow:
  - Added Figma-matched confirmation modal.
  - On confirm, persists death server-side and routes user back to custody home with success toast.
  - Added server endpoint to persist death outcome by current status:
    - `RELEASED` -> `DEATH_IN_FACILITY`
    - in-custody statuses -> `DEATH_IN_CUSTODY`
  - Persists audit/update records and adjusts hold/chair availability counts as appropriate.
  - Added enum + migration support for new death statuses.
  - Death records are excluded from custody/not-in-custody operational lists.

- Implemented **Exit to jail (no legal release)** flow from SFSO/Custody person details overflow:
  - Added Figma-matched confirmation modal with jail destination implied.
  - Added custody endpoint for direct jail exit from `READY_FOR_INTAKE`.
  - Persists `EXITED` with `exitDestinationId = jail` without setting legal-release fields.
  - Releases associated hold capacity and updates bed/chair counts accordingly.
  - On confirm, shows success toast and moves user to `Released` tab, with `Transferred to jail` section expanded/scrolled and card highlight handoff.

- Updated Released/Not-in-custody grouping and section presentation:
  - Added explicit `Transferred to jail` section grouping (`EXITED + jail`).
  - Added Figma subtitle copy for this section:
    - `Exited without legal release. Visible for 24 hours.`

- Unified action-footer visuals across Field/Custody/Care:
  - Applied shared gradient background style:
    - `linear-gradient(180deg, rgba(248, 249, 250, 0.00) 0%, #F8F9FA 100%)`

- Added/updated coverage:
  - Route tests for `record-death` and `exit-to-jail` persistence + state/count transitions and conflict cases.

---

**Additional Summary (applies to commit "SFPD action footer styling and wiring (action-footers)")**

- Implemented state-driven action footer behavior on SFPD person details view to match the design rules:
  - When person details are incomplete:
    - Show primary blue `Finish details` button (routes into complete-details flow).
    - Show secondary `Cancel hold` button (existing cancel-hold flow wiring).
  - When person details are complete and person is awaiting arrival:
    - Show only `Cancel hold`.
  - When SFPD has marked arrived and person is ready for custody transfer:
    - Show only `Cancel hold`.
  - When custody transfer is complete:
    - Hide action footer buttons.

- Updated SFPD action footer layout to use sticky/fixed footer treatment consistent with other flows, including shared gradient styling and spacer behavior to avoid content overlap.

- Kept existing cancel-hold modal/incident-cancel escalation wiring intact; changes are focused on footer visibility, button structure, and CTA routing.

---

**Additional Summary (applies to commit "SFSO action footer styling and wiring (action-footers)")**

- Implemented a status-driven action footer for SFSO/Custody person details, with explicit per-state button and overflow behavior:
  - `AWAITING_INTAKE`:
    - Primary: `Complete safety check` (wired to safety-check completion)
    - Overflow shown with: `Start legal release`, `Record exit to jail`, `Record death`
  - `READY_FOR_INTAKE`:
    - Primary: `More actions` (menu trigger)
    - No separate overflow button
    - Menu: `Start legal release`, `Record exit to jail`, `Record death`
  - `ADMITTED`:
    - Primary: `More actions` (menu trigger)
    - No separate overflow button
    - Menu: `Start legal release`, `Record exit to jail`, `Record death`
  - `IN_CHAIR`:
    - Primary: `Start legal release` (wired)
    - Overflow shown with: `Record exit to jail`, `Record death`
  - `RELEASED`:
    - Primary: `Print release certificate` (placeholder/no wiring yet)
    - Overflow shown with: `Record exit to jail`, `Record death`
  - `EXITED`:
    - Primary: `Print release certificate` (placeholder/no wiring yet)
    - No overflow button

- Wired overflow actions to live flows:
  - `Record exit to jail` -> exit-to-jail confirmation/modal + persistence flow
  - `Record death` -> record-death confirmation/modal + persistence flow
  - `Start legal release` -> legal release flow

- Updated `More actions` primary styling to match Figma treatment:
  - Outline variant (not filled)
  - Indigo border/text
  - Leading `•••` icon

- Included released/exited states in custody footer eligibility and preserved sticky action-footer structure/spacer behavior.

---

**Additional Summary (applies to commit "Care action footer styling and wiring (action-footers)")**

- Implemented status-driven action footer behavior for Medical/Care person details view:
  - `ADMITTED` (in medical intake):
    - Primary: `Complete intake`
    - Wiring: complete-intake flow (`intake-complete` mutation via confirmation modal)
    - No overflow/secondary buttons
  - `IN_CHAIR` (awaiting legal release):
    - No action footer buttons
  - `RELEASED` with no saved exit details:
    - Primary: `Start exit`
    - Wiring: exit questions flow (`/care/:id/exit?from=detail`)
    - No overflow/secondary buttons
  - `RELEASED` with saved exit details but no final physical exit:
    - Primary: `Finish exit`
    - Wiring: exit questions flow (`/care/:id/exit?from=detail`)
    - No overflow/secondary buttons
  - `EXITED` (physical exit recorded):
    - No action footer buttons

- Removed Care detail overflow-action usage in footer and shifted to explicit single-CTA behavior per state.

- Added/updated utility logic to detect draft/persisted exit detail state and drive the correct CTA label (`Start exit` vs `Finish exit`).

- Updated care flow unit tests to assert the new Care footer state model and action mode outputs.

---

**Additional Summary (for commit "Person cards for SFSO (action-footers)")**
- Updated SFSO Custody person-card action visibility to match status-specific design behavior.
- Enforced per-status action matrix:
  - `AWAITING_INTAKE`: `View details` + `Mark complete`
  - `FAILED_INTAKE`: `Intake not completed` top label + `View details` + `Legal release`
  - `READY_FOR_INTAKE`: QR transfer code + `View details` only
  - `ADMITTED` / `IN_CHAIR` / `RELEASED`: `View details` only
  - `EXITED`: no action buttons
- Kept existing action wiring for supported flows:
  - `Mark complete` -> safety check completion mutation
  - `View details` -> custody person details route
  - `Legal release` -> legal release route
- Removed status-inconsistent actions from custody cards:
  - Removed `Legal release` for `IN_CHAIR`
  - Removed `Print certificate` from person cards in this scope
- Added component tests for SFSO custody card state/action behavior to prevent regressions.

**Additional Files Touched (key)**
- `client/src/lesc/components/custody/CustodyCard.jsx`
- `client/src/lesc/components/custody/CustodyCard.test.jsx`
- `client/src/test/setupTests.js`
- `client/vite.config.js`

**Additional Validation**
- `npm run test --workspace client -- src/lesc/components/custody/CustodyCard.test.jsx` passes.
- `npm run lint:check --workspace client -- src/lesc/components/custody/CustodyCard.jsx src/lesc/components/custody/CustodyCard.test.jsx src/test/setupTests.js vite.config.js` passes.

---

**Additional Summary (for commit "Person cards for medical staff (action-footers)")**
- Updated Care/medical-staff home person-card actions to follow status-specific behavior:
  - `ADMITTED` (in medical intake): `View details` + `Complete intake`
  - `IN_CHAIR`: `View details` only
  - `RELEASED` (not exited, no saved exit details): `View details` + `Start exit`
  - `RELEASED` (exit details saved): `View details` + `Finish exit`
  - `EXITED`: no buttons
- Corrected card action wiring for release/exit states:
  - Exit CTA now appears on `RELEASED` (not `IN_CHAIR`)
  - Exit CTA routes to `care/:id/exit?from=detail` for consistent back-navigation behavior
- Added persisted-exit-detail awareness so `Finish exit` appears when exit details already exist on the deflection record (not only local draft state).
- Fixed Care exit API status mismatch causing `409 Conflict` when saving/confirming exit after legal release:
  - `POST /api/deflections/:id/exit-details` now accepts onsite statuses `IN_CHAIR` and `RELEASED`
  - `POST /api/deflections/:id/exit` now accepts `IN_CHAIR` and `RELEASED`
  - Bed/chair inventory updates on exit now run only when transitioning from `IN_CHAIR`, preventing double-decrement when already `RELEASED`
- Fixed not-in-custody section classification for jail exits:
  - `Transferred to jail` now applies to `EXITED` records with `exitDestinationId='jail'` and no legal release timestamp (`releasedAt` absent)
  - Aligns with section intent: “Exited without legal release”
- Updated Care exit form destination options:
  - Removed `Jail` from Care exit destination question.

**Additional Files Touched (key)**
- `client/src/lesc/components/care/CareCard.jsx`
- `client/src/lesc/components/care/Care.jsx`
- `client/src/lesc/components/care/careFlowUtils.js`
- `client/src/lesc/components/care/CareExitDetails.jsx`
- `client/src/lesc/components/care/CareCard.test.jsx`
- `client/src/lesc/components/care/careFlow.test.js`
- `client/src/lesc/components/custody/Custody.jsx`
- `server/routes/api/deflections/exit-details.js`
- `server/routes/api/deflections/exit.js`

**Additional Validation**
- `npm run test --workspace client -- src/lesc/components/care/careFlow.test.js src/lesc/components/care/CareCard.test.jsx src/lesc/components/custody/CustodyCard.test.jsx` passes.
- `npm run lint:check --workspace client -- src/lesc/components/care/CareCard.jsx src/lesc/components/care/Care.jsx src/lesc/components/care/careFlowUtils.js src/lesc/components/care/careFlow.test.js src/lesc/components/care/CareCard.test.jsx src/lesc/components/care/CareExitDetails.jsx src/lesc/components/custody/Custody.jsx` passes.
- `npm run lint:check --workspace server -- routes/api/deflections/exit-details.js routes/api/deflections/exit.js` passes.
- Full server test suite could not be executed in this environment due to missing container runtime for Testcontainers.

---

**Additional Summary (for commit "Status chips for SFPD user (status-chips)")**
- Added status chips to SFPD (Field) person detail view and placed them at the top of the detail content area.
- Implemented explicit SFPD status-chip mapping logic for hold/person detail state:
  - `Details incomplete` when hold exists but required incident/person details are incomplete
  - `Awaiting arrival` when details are complete and officer has not indicated arrival
  - `Ready for custody transfer` when `ONSITE_AWAITING_TRANSFER`
  - `Custody transferred` for post-transfer custody pipeline statuses
  - `Canceled` when hold status is `CANCELLED`
  - `Expired` when hold status is `EXPIRED` (or active hold elapsed before transfer)
- Added a dedicated status-chip component for consistent rounded pill treatment and tone-based styling.
- Updated chip tone/color behavior to match design feedback:
  - `Canceled` and `Expired` use error-light styling
  - `Awaiting arrival` and `Ready for custody transfer` both use indigo-light styling

**Additional Files Touched (key)**
- `client/src/lesc/components/Deflection.jsx`
- `client/src/lesc/components/DeflectionStatusChip.jsx`
- `client/src/lesc/components/deflectionStatusChipUtils.js`
- `client/src/lesc/components/deflectionStatusChipUtils.test.js`

**Additional Validation**
- `npm run test --workspace client -- src/lesc/components/deflectionStatusChipUtils.test.js` passes.
- `npm run lint:check --workspace client -- src/lesc/components/Deflection.jsx src/lesc/components/DeflectionStatusChip.jsx src/lesc/components/deflectionStatusChipUtils.js src/lesc/components/deflectionStatusChipUtils.test.js` passes.

---

**Additional Summary (for commit "Status chips for SFSO user (status-chips)")**
- Added status chips to SFSO/Custody person detail view and placed them at the top of the detail content area.
- Implemented explicit custody status-chip mapping for SFSO detail states:
  - `AWAITING_INTAKE` -> `Pending safety check`
  - `READY_FOR_INTAKE` -> `Ready for medical intake`
  - `ADMITTED` -> `In medical intake`
  - `IN_CHAIR` -> `Awaiting legal release`
  - `FAILED_INTAKE` -> `Refused admission`
  - `RELEASED` -> `Legally released`
  - `EXITED` -> `Physical exit recorded`
- Applied chip styles/tone mapping per UX direction:
  - Indigo-light for pending/ready/in-medical-intake/awaiting-legal-release chips
  - Error-light for refused-admission chip
  - Success-light for legally-released and physical-exit-recorded chips
- Reused the shared status-chip renderer to keep pill shape and typography consistent across user roles.

**Additional Files Touched (key)**
- `client/src/lesc/components/custody/CustodyDetailContent.jsx`
- `client/src/lesc/components/custody/custodyStatusChipUtils.js`
- `client/src/lesc/components/custody/custodyStatusChipUtils.test.js`

**Additional Validation**
- `npm run test --workspace client -- src/lesc/components/custody/custodyStatusChipUtils.test.js` passes.
- `npm run lint:check --workspace client -- src/lesc/components/custody/CustodyDetailContent.jsx src/lesc/components/custody/custodyStatusChipUtils.js src/lesc/components/custody/custodyStatusChipUtils.test.js` passes.

---

**Additional Summary (for commit "Status chips for medical staff user (status-chips)")**
- Added status chips to Care/medical-staff person detail view and placed them at the top of the detail content area.
- Implemented explicit Care status-chip mapping for medical-staff detail states:
  - `ADMITTED` -> `In medical intake`
  - `IN_CHAIR` -> `Awaiting legal release`
  - `RELEASED` with exit questionnaire not started -> `Ready for exit`
  - `RELEASED` with exit questionnaire completed/saved -> `Still onsite`
  - `EXITED` -> `Physical exit recorded`
- Aligned chip tone/style behavior to design intent:
  - Indigo-light for `In medical intake`, `Awaiting legal release`, `Ready for exit`, and `Still onsite`
  - Success-light for `Physical exit recorded`
- Reused existing care footer-state logic (`Start exit` vs `Finish exit`) to drive `Ready for exit` vs `Still onsite`, keeping chip state consistent with Care action-footer behavior and persisted/saved exit-detail state.

**Additional Files Touched (key)**
- `client/src/lesc/components/custody/CustodyDetailContent.jsx`
- `client/src/lesc/components/custody/careStatusChipUtils.js`
- `client/src/lesc/components/custody/careStatusChipUtils.test.js`

**Additional Validation**
- `npm run test --workspace client -- src/lesc/components/custody/careStatusChipUtils.test.js src/lesc/components/custody/custodyStatusChipUtils.test.js src/lesc/components/deflectionStatusChipUtils.test.js` passes.
- `npm run lint:check --workspace client -- src/lesc/components/custody/CustodyDetailContent.jsx src/lesc/components/custody/careStatusChipUtils.js src/lesc/components/custody/careStatusChipUtils.test.js` passes.

---

**Additional Summary (for commit "SFPD person cards updated to match designs (sfpd-person-card-updates)")**
- Aligned SFPD hold/person cards in Active and History views to the referenced Figma designs:
  - Empty active hold card keeps `Cancel` + `Add details` actions and timer treatment.
  - Active person card with incomplete details shows inline red `Details incomplete` and `Finish details`.
  - Active person cards with details use `View details` and preserve QR behavior (active/locked state handled by transfer readiness).
  - History person cards now follow status-only presentation with no footer actions/timer.
- Updated history status lines to match design copy/tone:
  - `Completed at [time]` (teal)
  - `Canceled at [time]` (yellow)
  - `Expired at [time]` (yellow)
- Added completed-state rendering support in hold/person card component using existing deflection timestamps.
- Applied the footer opacity fix for person detail views so action controls are fully opaque while keeping the footer background gradient semi-transparent:
  - Moved translucent gradient to a layered background pseudo-element.
  - Added footer-scoped overrides to keep `Button` surfaces opaque for `destructive`, `secondary`, `light`, and `outline` variants.
  - Added footer-scoped opaque background for overflow `ActionIcon` outline buttons.

**Additional Files Touched (key)**
- `client/src/lesc/components/Hold.jsx`
- `client/src/App.css`
- `client/src/components/Button.module.css`

**Additional Validation**
- `npm run lint:check --workspace client -- src/lesc/components/Hold.jsx` passes.
- `npm run lint:check --workspace client` passes.

---

**Additional Summary (for commit "Adds personal property return flow and unit tests (#65)")**
- Added a custody-only personal property return flow for legally released people before they are exited.
- Added a new secondary status chip on custody person details when applicable:
  - `Awaiting property return`
- Added `Record property return` entry-point action in the person-details sticky footer, positioned above `Print release certificate`.
- Added a dedicated property return screen at `custody/:id/property-return` with:
  - Title/subtitle guidance text
  - Property image (if present)
  - Property volume and description (if present)
  - `Was this property returned to the person?` yes/no question
  - Conditional reason collection for `No`:
    - `Abandoned`, `Destroyed`, `Other (please specify)`
    - Required `Other reason` text input when `Other` is selected
  - `Cancel` and `Confirm` actions with validation-driven disabled state
- Added server endpoint `POST /api/deflections/:id/property-return` (custody-only) to persist property-return outcomes.
- Added backend validation/guardrails for property return updates:
  - Must be `RELEASED`
  - Must have associated property
  - Must not already have property return recorded
  - `No` requires reason; `Other` requires detail text
- Added explicit conflict codes from backend for client behavior:
  - `ALREADY_RECORDED`
  - `NOT_LEGALLY_RELEASED`
  - `NO_ASSOCIATED_PROPERTY`
- Added post-confirm behavior on custody person details:
  - Success toast: `Property return update recorded` + `Saved to this person's exit record`
  - Auto-expand + scroll to property section
  - Status line in property section:
    - `Property returned to the person`
    - `Property not returned (<reason>)`
- Added requested error toast behavior for property return updates:
  - Already returned: `This property was already returned` (no body)
  - Network/other failure: `Property return update failed` + `Please try again later.`
- Updated footer layout/gradient handling for the additional entry button:
  - Top action centered relative to the print action row
  - Gradient/spacer height increased when property-return action is visible

**Additional Files Touched (key)**
- `client/src/lesc/components/custody/CustodyDetailContent.jsx`
- `client/src/lesc/components/custody/RecordPropertyReturn.jsx`
- `client/src/lesc/components/custody/propertyReturnUtils.js`
- `client/src/lesc/routes/LESCRoutes.jsx`
- `client/src/Api.js`
- `server/routes/api/deflections/property-return.js`
- `server/models/deflection.js`
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260304133000_add_property_return_fields/migration.sql`

**Additional Tests**
- Added server route tests for `POST /api/deflections/:id/property-return` covering:
  - Success (`returned=true`)
  - Success (`returned=false` with `OTHER` reason)
  - `409 ALREADY_RECORDED`
  - `422` validation for missing reason/otherReason
  - `409 NOT_LEGALLY_RELEASED`
  - `409 NO_ASSOCIATED_PROPERTY`
- Added client unit tests for property-return logic helper utilities:
  - entry-point visibility gating
  - confirm-button enablement rules
  - property status text formatting
  - error-to-toast mapping

**Additional Validation**
- `npm run lint:check --workspace client` passes for updated files.
- `npm run lint:check --workspace server` passes for updated files.
- `npm test --workspace client -- src/lesc/components/custody/propertyReturnUtils.test.js` passes.
- Full server test execution remains blocked in this environment due to missing container runtime required by Testcontainers.

---

**Additional Summary (for commit "Fixed routing and UI errors in v3 stories (v3-misc-fixes)")**
- Fixed duplicate legal-release action in SFSO person detail footer for `FAILED_INTAKE` records:
  - Removed `Start legal release` from overflow menu when primary CTA is already `Start legal release`.
- Updated SFSO home top tab label:
  - Changed second tab from `Released` to `Not in custody`.
- Fixed SFSO home crash (`Maximum update depth exceeded`) caused by accordion section state initialization:
  - Added guard to prevent no-op repeated state updates for in-custody open sections.
- Fixed direct exit-to-jail conflict errors for eligible SFSO statuses:
  - Expanded `POST /api/deflections/:id/exit-to-jail` eligibility to include:
    - `AWAITING_INTAKE` (pending safety check)
    - `READY_FOR_INTAKE`
    - `FAILED_INTAKE` (rejected from medical intake)
  - Updated bed/chair inventory behavior by source status:
    - `AWAITING_INTAKE` / `READY_FOR_INTAKE`: release hold (`holds - 1`, `available + 1`)
    - `FAILED_INTAKE`: release occupied chair (`occupied - 1`, `available + 1`)
- Added navigation/UX handoff for completed safety checks on SFSO home:
  - Auto-open `Ready for Medical Intake` section
  - Scroll to that section
  - Preserve temporary blue highlight on moved person card
- Fixed React console warning from invalid inline pseudo-style keys:
  - Removed unsupported `&:focus` / `&:focus-visible` style-object entries from custody confirmation modals and restored default accessible focus behavior.

**Additional Files Touched (key)**
- `client/src/lesc/components/custody/CustodyDetailContent.jsx`
- `client/src/lesc/components/custody/Custody.jsx`
- `client/src/lesc/components/custody/StatusAccordion.jsx`
- `client/src/lesc/components/custody/CustodyCard.jsx`
- `client/src/lesc/components/custody/CustodyCard.test.jsx`
- `client/src/lesc/components/custody/ExitToJailModal.jsx`
- `client/src/lesc/components/custody/RecordDeathModal.jsx`
- `server/routes/api/deflections/exit-to-jail.js`
- `server/test/routes/api/deflections.test.js`

**Additional Validation**
- `npm run lint:check --workspace client` passes for updated client files.
- `npm run lint:check --workspace server` passes for updated server files.
- `npm test --workspace client -- src/lesc/components/custody/CustodyCard.test.jsx` passes.
- Full server test execution remains blocked in this environment due to missing container runtime required by Testcontainers.
