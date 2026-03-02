**Title**  
Update Care User Home to match Intake Staff design, restore scan flow wiring, and harden scan/manual entry behavior

**Summary**  
This PR updates the Care User home view to align with the Intake Staff Figma design and addresses follow-up UX/behavior fixes from review.

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
