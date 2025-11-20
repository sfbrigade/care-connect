# CareConnect – Law Enforcement Sobering Center

## Product Requirements Document

## Executive Summary

San Francisco's Department of Public Health, Sheriff's Department, and Police Department are jointly standing up a new Law Enforcement Sobering Center (LESC) to improve outcomes and reduce jail diversion for individuals detained under §647(f) RWS. Today, law enforcement officers lack a reliable way to check bed availability for detainees, reserve space, and complete a smooth, compliant and auditable handoff to LESC staff. This gap creates missed diversion opportunities with potentially harmful consequences for individuals, adds operational burden for officers and deputies, and adds costs for the City.

CareConnect addresses this need by providing a unified tool that supports officers, intake staff, and detained individuals from initial diversion, through transport, custody transfer, and final release from the LESC. The system gives law enforcement officers fast visibility into real-time and forecasted bed availability, enables simple and reliable bed reservations, and provides Sheriff's Deputies and intake staff with tools to safely receive subjects, track property, and complete required §647(f) and §849(b) documentation. By delivering a sequence of minimum valuable prototypes—starting with lightweight availability and booking and culminating in full intake, custody transfer, release, and closure handling—the City gains usable value at every step while incrementally building toward a complete, auditable, and operationally resilient diversion workflow.

## Business Context

San Francisco Department of Public Health (DPH), Sheriff's Department (SHF), and Police Department (POL) are collaborating to improve outcomes for publicly intoxicated individuals detained under §647(f) RWS by diverting them to a planned Law Enforcement Sobering Center (LESC) for sobering and treatment. The CareConnect application is supporting the diversion process.

## Users & Stakeholders

### Law Enforcement Officer (LEO)

The Law Enforcement Officer (LEO) may work for either SFPD, CHP, or another law enforcement entity. The LEO is tasked with making the initial assessment that an individual's public intoxication merits diversion to the LESC. The LEO must then detain, transport, and transfer custody of the person, and appropriately document the process using a 647(f) form.

### Sheriff's Deputy (SD)

The Sheriff's Deputy (SD) is stationed at the LESC. They are required to track the entry of subjects and their personal property who are brought to the LESC, and facilitate the transfer of custody to the LESC. They must check to ensure the subject is safe to enter. They are required to track the exit of subjects (and their personal property) who are sober or are otherwise released and appropriately document the release via an 849(b) form.

### Intake staff (IS)

The Intake Staff (IS) are medically trained triage nurses, medical assistants, or other qualified staff working for the LESC Contractor, who are stationed at the LESC. They need to make a medical assessment of the subject and complete other intake tasks to fully accept an intoxicated individual into the LESC.

### DPH administration

The DPH administration oversees the medical operations of the LESC.

### Law enforcement leadership

Law enforcement leadership plan and runs deployments of LEOs and SDs in the field and to the LESC, and jointly oversee the administrative operations of the LESC.

## Problem / Opportunity Statement

The City currently lacks a system for Law Enforcement Officers (LEOs) to use to check and reserve facility beds in real time, leading to potential inefficiencies and missed diversion opportunities. The City lacks a system for low friction, compliant and auditable handoff from LEOs to the Sheriff's Deputy (SD) and Intake Staff (IS) at the Law Enforcement Sobering Center (LESC), potentially leading to more burden on staff and weaker performance management. Existing practices for checking and confirming beds within DPH facilities are diverse, high friction and if implemented would burden staff and reduce efficiency.

With the LESC not yet open and a new operating contractor coming on board, there is an opportunity to design and build a tool that supports the entire deflection process, from detention through to transfer of custody, and eventual release of the sobered individual.

## Scope

### In Scope

High level features scoped for inclusion:

1. **Availability**

   - Current bed availability in real-time
   - Forecasted bed availability in real-time
   - Bed tracking to facilitate bed availability reporting
   - Live updating as holds are made, extended, or canceled; and as individuals are formally admitted or discharged

2. **Reservability**

   - One-click hold: Hold a bed for one or more arrested individuals, for a limited period
   - One-click cancel: Cancel a hold if needed (from both LEO and LESC sides)
   - One-click extend: Extend a hold if needed
   - Fast site closure: Cancel existing holds, block beds, and communicate to LEOs

3. **Hand-off**

   - Property tracking: track property brought with individuals to the LESC
   - Fast hand-off: Streamline intake with simple, automated hand-off procedures and reporting
   - Auditability: Provide clear detention, release, and chain of custody reporting (automatically generating §647(f) and §849(b) paperwork) and support performance management with automated check point tracking

### Out of scope

- Any formal reporting or paperwork facilitation other than §647(f) or §849(b)
- Warrant or safety checks
- Transport logistics and vehicle tracking
- Medical record or other medical information management
- Medical triage and intake
- CRM for detained subjects, beyond what is necessary to support basic check in/out and tracking within the system

## Success Metrics & Outcomes

Success for the CareConnect application is defined as follows:

- **Speed:** LEOs take no more than 15 seconds in any given interaction with the CareConnect system to accomplish each key task, and no more than 5 minutes for all interactions with CareConnect across a deflection event.
- **Simplicity:** Minimal training required for any user of the system.
- **Auditability:** Automatic, comprehensive, compliant documentation of deflection events.
- **Desirability:** More than 80% favorable ratings in testing.

## User Workflows

Workflows are fully documented in this Miro board (pw: moicareconnect), and the technology-focused components are described below in text. Elements requiring interaction with a CareConnect interface or backend software are flagged "[CC]".

### 1. Entry points

- Law enforcement leadership plans operation or staffing: Leadership uses CareConnect to check forecasted bed availability at the LESC. [CC]
- Law Enforcement Officer (LEO) receives a general call about public intoxication,
  - LEO encounters an individual or individuals who are publicly intoxicated and cannot take care of themselves or are obstructing a sidewalk
  - LEO decides detention and transport to the LESC is appropriate

### 2. Preparing for deflection

1. For each deflection subject, LEO identifies the individual (First and last name, date of birth) and records them in CareConnect [CC]
2. LEO confirms no active warrants
3. LEO determines the number of beds needed, which is the lesser of all deflection candidates or the available transport capacity
4. LEO uses CareConnect to check bed availability at the LESC [CC]
   - If beds are available, LEO uses CareConnect to hold the appropriate number of beds [CC]
   - If less than the desired number of beds are available, LEO holds any available beds; for any individuals without a bed, LEO unarrests or arranges transport to jail [CC]
5. LEO documents the presentation/behavior of the deflected individuals, to justify the 647(f) RWS arrest [CC]
6. LEO tags property (less than 10 gallon limit) and records property in CareConnect [CC]

### 3. Transport

1. LEO travels with subjects
2. If a medical emergency or other event occurs during transport, LEO may need to pause transport and divert any affected individuals elsewhere
   - LEO uses CareConnect to update their bed hold requests [CC]
   - CareConnect extends bed holds if transport phase lasts more than 30 minutes [CC]

### 4. LESC intake

1. LEO presents subjects to Sheriff's Deputy (SD)
   - SD uses CareConnect to record entry of subjects and property to LESC [CC]
   - SD conducts safety checks [CC]
   - SD approves subjects for LESC intake [CC]
2. LEO presents subjects to Intake Staff (IS)
   - IS uses CareConnect to confirm acceptance of subjects [CC]

### 5. Finalized transfer of custody

1. LEO/IS use CareConnect to acknowledge transfer of custody [CC]
2. LEO exits facility

### 6. Subject released and exits LESC

1. IS uses CareConnect to indicate subject is being released [CC]
2. SD releases personal property to subject and documents release in CareConnect [CC]
3. SD provides paper copy of 849(b) to subject before release [CC]
4. Arresting LEO is notified of release and cause [CC]
5. Subject is released from LESC and exits facility

### 7. Subject released but remains at LESC

1. SD releases personal property to subject and documents release in CareConnect [CC]

### 8. Other potential workflow events

- LESC is temporarily closed: IS or SD use CareConnect to flag closure of LESC [CC]
  - All users receive notification of LESC closure [CC]
- An unexpected event means LESC staff need to cancel a bed hold and notify the responsible LEO [CC]

## Functional Requirements

### 1: Planning

| #   | Story/task                                                                 | Justification                                    | Acceptance Criteria                                                                                                 | P# |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -- |
| 1.1 | As a law enforcement lead, I can see forecasted bed availability for the next 24 hours | So that I can plan my team's shift or an upcoming operation | Generate bed availability forecast for specified time period, based on prior data<br>Enable user to view LESC forecasted bed availability every hour for up to 24 hours from now | 4  |
| 1.2 | As a law enforcement officer (LEO), I can log in to the CareConnect app | So that the app has all my identifying information and can reduce duplicate data entry | Authenticate the officer<br>Prompt for CAD number, contact number, unit, badge number, and agency<br>Create LEO unique ID in backend database and store LEO identifying information<br>Return LEO UID to CareConnect<br>All authentication support functions | 2  |

*P# = prototype number*

### 2: Encountering and arresting a subject

| #   | Story/task                                            | Justification                                    | Acceptance Criteria                                                                                                 | P# |
| --- | ----------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -- |
| 2.1 | As a LEO, I can initiate an operation                 | So that I can group my subjects together in the same operation | Enable user to create/start operation<br>Create UOID<br>Return UOID to frontend                                     | 2  |
| 2.2 | As a LEO, I can record identifying information on one or more subjects | So that the subjects can be identified throughout the deflection event | Enable user to record first name, last name, DOB, and identifiers<br>Send subject ID fields, LEO UID to backend<br>Create 647(f) placeholder for each subject, with subject IDs; populate with available information | 2  |
| 2.3 | System: Create unique operation ID                    | To group each subject's deflection into a single event | Auto-generate ID                                                                                                    | 1  |
| 2.4 | As a LEO, I can check current available beds         | So that I can decide how many subjects I can transport to the LESC | Enable user to see current "hard" bed availability (beds neither occupied nor with a hold)                         | 1  |
| 2.5 | As a LEO, I can request to hold a specified number of beds for up to an hour | So that I have time to bring the subjects to the LESC, and have certainty beds will be available when I get there | Enable user to request to hold a specific number of beds<br>Notify user with confirmation<br>Update inventory with holds | 1  |
| 2.6 | As a LEO, I can document the arrestable behavior of the subjects | So that there is an audit trail justifying the arrest | For each subject, enable user to generate/edit a narrative that describes arrestable behavior<br>Attach documentation to existing 647(f) placeholder for each subject | 2  |
| 2.7 | As a LEO, I can document personal property for a subject | So that there is an audit trail for any personal property being brought to the LESC | Enable user to take a photo or otherwise document the personal property<br>Create a personal property addendum to a subject's deflection and attach documentation<br>Automatically suggest to user when personal property may exceed LESC limits (10 gallons)<br>Automatically generate a description of the personal property and attach to record<br>Create a unique ID for the personal property and store in association with subject's deflection | 2  |

### 3: Transporting the subject

| #   | Story/task                                    | Justification                                    | Acceptance Criteria                                                                                                 | P# |
| --- | --------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -- |
| 3.1 | As a LEO, I can see existing operations, subjects, and bed holds | So that I can quickly and easily see my current operation and all relevant details | Enable user to see current operation<br>Enable user to see subjects involved in operation<br>Enable user to view all details on subjects<br>Support bed hold and bed hold options (cancel, extend) | 2  |
| 3.2 | As a LEO, I can extend a hold                 | So that I have time to deal with any unexpected issues along the way | Enable user to extend one or more existing holds by 30 minutes<br>Enable user to receive confirmation that the hold was extended | 1  |
| 3.3 | As a LEO, I can cancel a hold                 | So that I can update the LESC if things change along the way | Enable user to cancel a hold<br>Cancel hold in database<br>Enable user to receive confirmation that the hold was canceled | 1  |
| 3.4 | System: Auto-extend a hold when transport time first expires | To give LEO a chance to deal with unexpected situations | Enable user to see updates in current deflection event view<br>When hold time expires the first time, extend the hold by 30 minutes<br>Notify the requesting LEO that hold was automatically extended | 2  |
| 3.5 | System: Auto-cancel a hold                    | To ensure bed inventory isn't unnecessarily blocked | Treat manual extension requests as a first hold, for purposes of auto-extension<br>≥ P2: when hold time expires the second time, extend the hold by 30 minutes<br>≥ P1: Notify the requesting LEO that hold was automatically canceled<br>> P1: Update 647(f) as DNF and archive | 1  |

### 4: Transferring custody of the subject

| #   | Story/task                                                                 | Justification                                    | Acceptance Criteria                                                                                                 | P# |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -- |
| 4.1 | As a LEO, I can check the subject in for safety check                    | So that I can get approval from the Sheriff's Deputy (SD) to proceed to medical intake | Enable user to show subject IDs to SD                                                                              | 3  |
| 4.2 | As a SD, I can receive the subject                                        | So that I can indicate that I am aware of the subject's presence and am preparing to vet them for intake | Enable user to scan or otherwise register the subject ID as presented by LEO<br>Enable user to receive confirmation that subject ID was scanned<br>Enable LEO to receive confirmation that SD has accepted subject<br>Update 647(f) record and add intake timestamp | 3  |
| 4.3 | System: Generate 849(b) placeholder when SD confirms acceptance of subject from LEO | To ensure a complete audit trail                 | Generate placeholder form in database and populate with available information                                       | 4  |
| 4.4 | As a SD, I can confirm that subject has completed a safety check and is good to proceed to medical intake | To ensure a complete audit trail                 | Enable user to confirm that subject is safe and ready for medical assessment<br>Update subject deflection record with safety check and timestamp | 3  |
| 4.5 | As a LEO, I can transfer custody to the IS                                | So that I can return to the field                | Show subject IDs to intake staff<br>Enable LEO to receive confirmation that IS has taken custody<br>Update subject deflection record in database with custody transfer and timestamp | 3  |
| 4.6 | As an Intake Staff (IS), I can login to CareConnect                       | So that I can complete functions in CareConnect that require authentication | Authenticate IS<br>Authentication support functions                                                                 | 3  |
| 4.7 | As an IS, I can indicate that full intake is completed                    | To ensure a complete audit trail                 | Enable user to confirm that the subject has gone through LESC intake<br>Update subject record in database with full intake, and timestamp<br>Convert bed hold in database into bed occupancy<br>647(f) finalized, archived and made available in a City-accessible datastore as requested by law enforcement leadership | 3  |

### 5: discharging the subject

| #   | Story/task                                                      | Justification                                    | Acceptance Criteria                                                                                                 | P# |
| --- | --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -- |
| 5.1 | As an IS, I can record a subject as having left the LESC       | So that I can ensure the audit trail is complete and open up bed | Enable user to manually indicate subject discharge from the LESC, and reason for discharge<br>In database, update bed status from unavailable to available | 4  |
| 5.2 | As a SD, I can formally document the subject has been released  | To allow the individual to leave the facility, if they desire | Enable user to indicate the individual is released<br>849(b) archived and made available in a City-accessible datastore | 4  |
| 5.3 | As a SD, I can track release of personal property back to the subject | So that I can ensure return of personal property is properly documented | Enable user to document the release of personal property back to the subject                                        | 4  |
| 5.4 | As a SD, I can review and print the 849(b)                     | So that I can provide the subject with a legally required, compliant 849(b) certificate of release | Enable user to print a 849(b)                                                                                     | 4  |
| 5.5 | As a LEO, I can get updated when a subject was released and left the facility, or was released and stayed at the facility | So that I can get a sense of subsequent outcomes from my work, and be ready to respond with further actions if needed | Enable user to receive a notification when a subject has been released and left facility, or has been released but is staying at facility | 4  |

### 6: Other events

| #   | Story/task                                                      | Justification                                    | Acceptance Criteria                                                                                                 | P# |
| --- | --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -- |
| 6.1 | As an IS, I can communicate when the LESC is temporarily not accepting subjects | So that I am not having to deal with arriving deflections | Enable user to mark LESC as closed, indicate reason, and potential duration of closure<br>Notify any LEOs who had previously had bed holds<br>For closure, cancel all holds and set vacancies to zero | 4  |
| 6.2 | As an IS, I can communicate when the LESC has re-opened after a closure | So that normal operations can be resumed efficiently | Enable user to mark LESC as open                                                                                   | 4  |
| 6.3 | System: handle LESC opening and closing in bed inventory         | To smoothly transition opening states and ensure inventory is updated | For opening, notify previous holders at closure, open up vacancies previously available at closure                | 4  |
| 6.4 | System: update bed forecasts in accordance with closure          | To ensure bed inventory is updated               | Update forecasts                                                                                                    | 4  |
| 6.5 | As a LEO, I can know the LESC is temporarily closed            | So that I can make the right decision at time of arrest, and avoid any wasted trips or paperwork | Enable user to receive notification when the LESC is closed<br>Enable user to view the reasons and timing for the closure | 4  |
| 6.6 | As an IS, I can cancel a bed hold and communicate this to the LEO who made the hold | So that the LEO can make alternative arrangements | Enable user to view updated bed forecasts and availability<br>Enable user to cancel a bed hold<br>Deliver notification to LEO who made the hold | 4  |
| 6.7 | As an admin user, I can download performance data                | So that I can check the performance of the system relative to expectations and report out | Enable user to export all entities and events in machine- and human-readable formats                              | 4  |

## Technical requirements

- Application must run on City cloud infrastructure
- Application must appropriately authenticate, handling both City and Contractor users
- Application must handle concurrent use by 10-15 users
- Application must run on Apple or Android mobile devices
- Application must not store any PHI or PII information except as required to complete and store 647(f) and 849(b) content

## Timeline & Roadmap

### Prototype Phasing

| Prototype                                          | Dates        |
| -------------------------------------------------- | ------------ |
| P1 – Availability & Booking                        | Nov 18–Dec 6 |
| P2 – Subject ID; property tracking; 647(f) narrative; transport durability | Dec 9–Jan 10 |
| P3 – Safety; custody transfer; intake tracking    | Jan 13–Feb 7 |
| P4 – Release; 849(b); closures and notifications   | Feb 10–Mar 1 |

### Prototype Details

#### Prototype 1 — Availability & Booking Only (Nov 18–Dec 6)

Prototype 1 is a lightweight, frictionless booking tool. LEOs can open a simple interface, instantly see real-time availability, and place/extend/cancel holds. This unlocks operational value by enabling predictable diversion without any data collection overhead.

**Value proposition:** Give LEOs and leadership a fast, dependable way to see bed availability and place/extend/cancel simple holds.

**Included Stories**

**Availability**
- 2.4 - View current available beds

**Booking**
- 2.5 - Create holds
- 3.2 - Extend hold
- 3.3 - Cancel hold
- 3.5 - Backend cancellation
- 3.7 - Auto-cancel expired hold

#### Prototype 2 — Subjects, Narrative, and Transport Holds (Dec 9–Jan 10)

Officers can create subjects in the system, justify the detention, and update bed-holds during transport. This produces a complete and auditable detention to transport chain, while avoiding the complexity of intake or release. App access is now authenticated.

**Core Value:** Introduce the minimally required identity and documentation features so that diversion events can be tracked and justified, removing the paperwork burden from LEOs. Adds tools to adjust holds to allow for unexpected events during transport.

**Included Stories**

**Identity & deflection setup**
- 1.2 - LEO login
- 2.1 – Create operation
- 2.2 - Create subject identity

**Detention documentation**
- 2.6 - Document subject behavior

**Transport durability**
- 3.1 - View operations, subjects, deflections and holds
- 3.4 - Auto-extend after first expiry

**Property**
- 2.7 - Property record + photo

#### Prototype 3 — Safety Check and Custody Transfer (Jan 13–Feb 7)

The core operational workflow now works end-to-end: SD can screen subject and IS can take custody via CareConnect.

**Core Value:** The full handoff into the LESC. Officers can deliver subjects; SD and IS can accept them; bed occupancy updates correctly; 647(f) closes.

**Included Stories**

**Safety check**
- 4.1 - LEO presents subject
- 4.2 - SD receives subject
- 4.4 - SD confirms safety

**Custody transfer**
- 4.5 - LEO executes transfer
- 4.6 - IS login and authentication
- 4.7 - IS confirms full intake

**Release documentation placeholder**
- 4.3 - Generate 849(b) placeholder

#### Prototype 4 — Release, 849(b), Center Closure, Notifications (Feb 10–Mar 1)

Completes the lifecycle: subjects can be discharged, beds re-opened, 849(b)s finalized and printed, property returned, and LEOs notified. Center closures are handled safely and cleanly. Bed forecasts are available to all users. At this point, the system is complete as specified.

**Core Value:** Full lifecycle closure + operational stability features. Completing the release process and supporting temporary center closures.

**Included Stories**

**Release**
- 5.1 - IS records discharge
- 5.2 - Document release
- 5.3 - Property return
- 5.4 - Print 849(b)
- 5.5 - Notify LEO on release

**Center Closure**
- 6.1 - Mark LESC closed
- 6.2 - Mark LESC reopened
- 6.3 - Handle opening/closing in inventory
- 6.4 - Forecast updates
- 6.5 - Alerts to LEO
- 6.6 - Cancel hold and notify LEO

**Other**
- 1.1 - Forecasted bed availability
- 6.7 - Data export

## Full Workplan

### Phase 1: Discovery & Prototyping (Oct 29 2025 – Mar 1 2026)

**Objectives**

1. Complete design research and confirm requirements for each prototype scope.
2. Onboard design and engineering resources.
3. Build, test, and iterate on four discrete minimum valuable prototypes in sequence:
   a. P1: Availability & Booking Only
   b. P2: Subjects, Narrative, Transport Durability
   c. P3: Safety Check, Medical Check, Custody Transfer
   d. P4: Release, 849(b), Center Closure, Notification
4. Conduct recurring field tests with SHF, SFPD, and DPH.
5. Produce integrated learnings and prepare for Beta.

**Sprints**

- **Sprint 1 (Oct 29 – Nov 14):** Finalize PRD and workplan with stakeholders; Onboard design and engineering team
- **Sprint 2 (Nov 13 – Nov 26):** P1 development; P1 user testing
- **Sprint 3 (Dec 2 – Dec 13):** Stabilize P1; Implement revisions and polish P1; Prototype 2 development; P2 internal testing; Schedule P2 user testing
- **Sprint 4 (Dec 16 – Dec 20):** P2 user testing; Implement revisions and polish P2; Stabilize P2
- **Sprint 5 (Jan 6 – Jan 17):** P3 development; P3 Internal testing; Schedule P3 user testing
- **Sprint 6 (Jan 20 – Jan 31):** P3 user testing; Refine and polish P3; Prototype 4 development
- **Sprint 7 (Feb 3 – Feb 14):** P4 internal testing; Schedule P4 user testing; Integration work across prototypes
- **Sprint 8 (Feb 17 – Mar 1):** P4 user testing; Refinements and stabilization; Integrated testing of P1–P4; Final synthesis of Phase 1; Training with Contractor team; Produce Beta readiness checklist

### Phase 2: Beta & Scale (Starting March 3 2026)

**Objectives**

1. Integrate with LESC operations
2. Continue training
3. Fixes and updates
4. Develop engineering transition plan

## Risk Management

**Key Risks:**

**Limited development capacity**
- Mitigation: emphasize lightweight approaches; de-risk with tight scoping and phased prototyping; engage MOI volunteer capacity; leverage departmental resources where possible.

**Departmental partners not able to test**
- Mitigation: look for proxy tests; establish regular lightweight testing cadence.

**Sobering Center contractor partner pushback**
- Mitigation: feed requirements into contracting; build trust via phased approach.

**Unexpected process complexities**
- Mitigation: take opportunities to simplify processes as LESC planning continues; de-scope when necessary.

**Scope creep**
- Mitigation: emphasis on lean prototyping; extensive user feedback on pain points.

## Appendices

### Detailed User & Stakeholder profiles

#### Law Enforcement Officer (LEO)

The Law Enforcement Officer may work for either SFPD, CHP, or another law enforcement entity. They are trained, armed law enforcement officers, familiar with standard arrest and unarrest procedures, and used to following standard protocols and orders within a paramilitary power structure. The LEO is tasked with arresting, transporting, and transferring custody of someone who is publicly intoxicated ("subject"). They must navigate subjects with behavioral and mental health challenges, who may have weapons, or may be congregating in groups. The LEO may be operating at any hour of the day or night, in any street environment. They need to stay safe, focus on the subject, stay compliant with standard operating procedures, ensure their actions are documented, and meet operating efficiency targets. They would prefer to minimize paperwork or tasks unrelated to the arrest and transport of their subject. They are familiar with mobile and desktop web or native interfaces and carry at least one smartphone.

#### Sheriff's Deputy (SD)

The Sheriff's Deputy is stationed at the LESC (LESC) site, which is a safe, well lit, indoors space. They are trained, armed law enforcement officers, familiar with standard arrest and unarrest procedures, and used to following standard protocols and orders within a paramilitary power structure. They are required to track the entry of subjects who are arrested and brought to the LESC, to facilitate the transfer of custody. They need to check to ensure the subject is safe to enter the LESC, which may include checking for weapons or assessing the subject's behavior to make sure they are not a danger to themselves or others. They are required to track the exit of subjects who are sober or are otherwise released. They need to stay compliant with standard operating procedures and ensure their actions are documented. They would prefer to minimize paperwork. They will carry at least one smartphone and have access to a laptop.

#### Intake staff (IS)

The Intake Staff are medically trained triage nurses or medical assistants who are stationed at the LESC. They need to make an initial medical assessment of the subject and agree to accept them into the LESC. They are accustomed to medical-administrative tasks, and have access to their smartphone and a laptop or desktop. They need to stay compliant with LESC intake protocols, ensure their decisions and actions are documented, and stay safe.

#### DPH administration

The DPH administration oversees the medical operations of the LESC. As social and medical workers, they desire to divert (when legal) as many publicly intoxicated people as possible from jail to the LESC. They are focused on providing immediate care for the subject and connecting them to further substance abuse treatment when possible. They wish to keep the utilization of the LESC's beds as high as possible.

#### SFPD leadership

The SFPD leadership is concerned with supporting tactical and strategic goals for diversion and supporting overall City and Mayoral priorities. They need to maximize the capacity of their officers to arrest and divert subjects to the LESC. They expect their officers to follow standard protocols, remain compliant with all departmental and legal requirements, and wish to minimize the paperwork burden where possible.

#### Sheriff's Department leadership

The Sheriff's leadership is concerned with supporting tactical and strategic goals for diversion and supporting overall City and Mayoral priorities. They need to minimize burden on their officer's stationed at the LESC. They expect their officers to follow standard protocols, remain compliant with all departmental and legal requirements, and wish to minimize the paperwork burden where possible.

### Information architecture

#### Entities and Relationships (draft)

- **User:** ID, Affiliation, Deflection events (1 to many, DeflectionEvent)
- **Subject:** ID, First name, Last name, DOB, Statuses (1 to many, SubjectStatus)
- **SubjectStatus:** Status ID, Status (Pending / In Transit / In Custody / Released), Time started, Time ended
- **SubjectDeflection:** Placement ID, Subject (1 to 1, Subject), 647f (1 to 1, 647fRecord), 849b (1 to 1, 849bRecord), Bed hold (1 to 1, Hold), Property (1 to 1, Property), Events (1 to many, DeflectionEvent)
- **DeflectionEvent:** Event ID, Event type, Timestamp
- **Bed:** Bed ID, Status (Occupied, Held, Available, Other unavailable)
- **BedHold:** Hold ID, bed (1 to 1, Bed), Start time, End time
- **Property:** Property ID
- **Operation:** Operation ID, Location, Subject deflections (1 to many, SubjectDeflection)
- **647fRecord:** First name, Last name, DOB, Presentation notes
- **849bRecord:** First name, Last name, DOB

#### Possible views in CareConnect

1. **Operations View**
   - Forecasted bed availability
   - Live bed availability
   - Bed holds and actual occupancy counts
   - In-transit subjects
   - Active intakes & releases
   - LESC status
   - 647(f) records
   - 849(b) records

2. **LEO View**
   - Forecasted bed availability
   - Live bed availability
   - Subject record creation
   - Bed holds: create, extend, cancel
   - Start/end transport
   - Property tracking
   - LESC closure notification

3. **Sheriff's Deputy (SD) View**
   - Intake/release confirmation
   - 849(b) narrative
   - Property custody tracking
   - Safe to enter (custody transfer)
   - Print 849(b)

4. **Intake Staff (IS) View**
   - Live bed availability and LESC status information
   - Bed holds: extend, cancel
   - Subject release tools
   - LESC closure/open tools

5. **Admin / system**
   - Role management (LEO, SD, IS, Admin)
   - Timestamps and audit trail
   - Notifications (Closure, Release, Hold expiry)
   - §647(f) and §849(b) archives
   - Objects and events export

### Architectural & Technical Considerations

#### Proposed system architecture

TBC

#### Integration points, API dependencies, data models

TBC

#### Constraints

TBC

