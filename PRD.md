---
title: "CareConnect Product Requirements Document (Working Draft)"
description: "A working draft outlining the CareConnect platform — a digital tool to streamline bed and service placements for outreach teams, treatment providers, and administrators."
last_updated: 2025-11-07
layout: default
nav_order: 1
---

# CareConnect Product Requirements Document (Working Draft)

_Last updated: November 2025_

---

## Table of Contents
1. [Overview](#1-overview)  
2. [Background / Problem Statement](#2-background--problem-statement)  
3. [Success Metrics](#3-success-metrics)  
4. [Users & Roles](#4-users--roles)  
5. [User Stories](#5-user-stories)  
6. [Admission Flow](#6-admission-flow)  
7. [MVP](#7-mvp)  
8. [Potential Entity Attributes](#8-potential-entity-attributes)  
9. [Potential Treatment Center Capacity Update Methods](#9-potential-treatment-center-capacity-update-methods)  
10. [Other Resources](#10-other-resources)

---

## 1. Overview
The project aims to create a centralized digital tool that connects street outreach teams, treatment providers, and administrators to streamline the process of reserving and approving client placements (beds, services, facilities).

> **NOTE:** This document often avoids mentioning specific departments and teams at the moment due to lack of familiarity with the terms and lines of responsibility. This needs to be cleaned up.

---

## 2. Background / Problem Statement
Street outreach teams struggle to find shelter beds for willing clients due to fragmented requirements, reservation systems across numerous providers, and limited availability.  
Because of the challenges involved in convincing clients to accept beds, **time is of the essence.**  

The hypothesis is that reducing friction and increasing speed in this process will increase the number of clients using shelters.

Additionally, **system-wide capacity measurements** are useful for administrators and policymakers.

---

## 3. Success Metrics

<details>
<summary><strong>Click to expand Success Metrics</strong></summary>

### More Efficient Processes
- Reduced average time to placement (from client encounter to confirmed bed hold)
- Reduced average intake time at DIDO site
- More than 60% of DIDO sites participating in the CareConnect system

### Improved Health Outcomes
- Increased percentage of clients successfully placed (confirmed bed hold to completed intake)
- Increased bed utilization (ratio of beds occupied to beds available at any given time)

### Improved Staff Experience
- Reduced number of calls or texts required per placement
- More than 70% of NST staff using CareConnect in a given week
- More than 80% of NST staff perceiving less administrative friction in placement
</details>

---

## 4. Users & Roles

| **Role** | **Description** | **Key Actions** |
| --------- | ---------------- | ---------------- |
| **Outreach Worker** | On-the-ground outreach team member | Submit service/bed request forms, view status updates |
| **Treatment Provider** | Manages facility or resource availability | Review and approve/deny incoming requests, update capacity |
| **Administrator** | Oversees entire system | Monitor system-wide availability, manage permissions, report metrics |

---

## 5. User Stories

**Sortable version:** [CareConnect Backlog](#)

<details>
<summary><strong>Click to expand User Stories</strong></summary>

| **ID** | **Role** | **User Story** | **Priority** |
| ------- | -------- | -------------- | ------------- |
| AD4 | Administrator | As an administrator, I'd like to be able to anonymously track user flows and metrics in the system. | P1 |
| OR6 | Outreach Worker | See which DIDO sites are near me, so that I can know where my client could go. | P1 |
| OR7 | Outreach Worker | Filter DIDO sites by offerings, so that I can determine which might be best for my client. | P1 |
| OR8 | Outreach Worker | Filter DIDO sites by geography, so that I can determine a fit based on distance or region. | P1 |
| OR11 | Outreach Worker | Use my relatively late model iPhone or Android phone to access site without data entry or scrolling. | P1 |
| OR12 | Outreach Worker | See what DIDO sites are open now. | P1 |
| OR2 | Outreach Worker | Qualify a client: As an Outreach Worker, I want to collect the information needed to qualify a client, so that I can submit a complete application. | P2 |
| AD1 | Administrator | System-wide view: As an administrator, I need a view of all the beds in the system. | P2 |
| AD2 | Administrator | Real-time synchronization: As a system, I need to support real-time updates between Street Team and Provider dashboards, so all users see the latest data. | P2 |
| AD3 | Administrator | Load available Treatment providers and amenities: As an administrator, I need to load a list of treatment providers for the Outreach workers to use. | P2 |
| OR1 | Outreach Worker | Reserve a bed or service: As an Outreach Worker, I want to reserve a bed (e.g., SRO, ASC, UX addiction, etc.) so that I can secure placement for a client. | P2 |
| OR10 | Outreach Worker | See which sites have general availability near me right now, so that I know I can make a solid offer to a client. | P2 |
| OR3 | Outreach Worker | Review application history: As an Outreach Worker, I want to review my history of applications so I can track the status of my submitted requests. | P2 |
| OR9 | Outreach Worker | Filter DIDO sites by amenities, so that I can better persuade my client. | P2 |
| TP1 | Treatment Provider | Update available beds: As a Treatment Provider, I want to be able to update the available beds at my facility. (Cadence TBD) | P2 |
| TP2 | Treatment Provider | Review and act on incoming requests: As a Treatment Provider, I want to receive and review client applications, so that I can approve or deny them promptly. | P2 |
| TP3 | Treatment Provider | Review application history: As a Treatment Provider, I want to review my history of applications so I can track all requests I've reviewed. | P2 |
| TP4 | Treatment Provider | Manage notifications and availability: As a Treatment Provider, I want to update my facility’s bed or service availability, so Street Teams see accurate information. | P2 |
| OR4 | Outreach Worker | Receive application status updates: As an Outreach Worker, I want to receive real-time updates on a client’s application so I know when it’s been accepted or denied. | P3 |
| OR5 | Outreach Worker | Mobile-first and voice input: As a user, I need a mobile-first interface with optional voice/speech input, so I can operate in the field without typing. | P3 |

</details>

---

## 6. Admission Flow

We’re using this mental model of the admission flow:

| **Step** | **Name** | **Description** |
| --------- | -------- | ---------------- |
| 1 | Eligibility | Establish if client is eligible for Treatment Provider |
| 2 | Admissibility | Can client be admitted (may be on blacklist or other issues) |
| 3 | Intake | Admit client to Provider — forms, medical exams, etc. |

---

## 7. MVP
- All **P1** user stories above

---

## 8. Potential Entity Attributes

<details>
<summary><strong>Click to expand Entity Attributes</strong></summary>

### Treatment Centers
- Name  
- Location  
- Contact Info  
- Available beds  
- Reserved beds  
- Eligibility criteria:  
  - Age  
  - Gender  
  - Ambulatory  
  - Mobility Devices allowed  
  - ADL (Activities of Daily Living) Independent  
  - Housing status  
  - Neighborhood  
  - Sexual orientation  
  - Race  
  - Language  
  - Pets  
  - Belongings  
- Services offered:  
  - MH (Mental Health) Acute  
  - SUD (Substance Use Disorder) WM (Withdrawal Management)  
  - SUD (Substance Use Disorder) Subacute  
  - Acute Alcohol Intoxication  
  - Acute Drug (not Alcohol) Intoxication  
  - Respite  
- Exclusion list  
- Update method  

### Clients
- Identifier  
- Name  
- Description  
- Pets  
- Qualifications  
- Services needed  

### Street Outreach Team Members
- Name  
- Team  
- Contact info  
- Platform (phone/tablet/etc)

</details>

---

## 9. Potential Treatment Center Capacity Update Methods
- Integration with existing management system  
- API  
- Screen capture/processing via browser extension  
- Manual updates  
- Automated text message  
- Whiteboard with camera/image processing  
- Automated phone call  
- Manual phone call  

---

## 10. Other Resources
- DPH DIDO Miro Board  
- MOI Miro Board  

---
