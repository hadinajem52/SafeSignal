# Law Enforcement Interface (LEI) Specification

## Overview
The Law Enforcement Interface (LEI) is a specialized extension of the Moderator Dashboard designed for police and emergency responders. While moderators focus on verifying information quality, LE officers focus on **operational response** and **case resolution**.

---

## 🔐 Access Control
- **Role Required:** `law_enforcement` (or `admin`)
- **Visibility:** Can see Verified and Escalated reports.
- **Exclusivity:** Only LE users can move a report to a "Closed" or "Resolved" final state with an official outcome.

---

## 📋 Core Features

### 1. Operational Dashboard
A real-time view of actionable incidents.
- **Filter:** Show only `verified` or `investigating` status.
- **Sort:** By Severity (Critical/High first) and Time.
- **Map View:** Tactical map showing active incidents with unit status markers.

### 2. Incident Detail View (Enhanced)
LE officers see a richer view than moderators:
- **Full Evidence Package:**
  - High-res photos/videos
  - Exact GPS coordinates (with street view integration)
  - Reporter identity (Name, Phone, Trust Score) - *even if marked anonymous to public*
- **Intelligence Context:**
  - History of incidents in this location (hotspot data)
  - Moderator Notes (internal verification comments)
- **Chain of Custody:**
  - **Action Log:** Read-only timeline of who reported, who verified, and when.

### 3. Status Management
LE officers control the operational lifecycle of an incident:

| Status | Description |
| :--- | :--- |
| **Pending Action** | Incident is verified but no unit assigned. |
| **Dispatched** | Units are en route to the location. |
| **On Scene** | Officers have arrived. |
| **Investigating** | Active investigation ongoing (for long-running issues). |
| **Closed** | Final terminal state (requires Outcome). |

### 4. Case Closure & Outcomes
LE users are the **only** role allowed to definitively close a safety incident. closing requires selecting a specific outcome:

| Outcome | Description |
| :--- | :--- |
| ✅ **Resolved** | Situation handled peacefully / returned to normal. |
| 🚓 **Arrest Made** | Suspect(s) apprehended. |
| ⚠️ **False Alarm** | Officer responded but found no issue / bad intel. |
| 📄 **Report Filed** | Official police report generated. *Requires entering Case ID*. |

---

## 🛠️ Data Model Extensions

### New Database Enums
**Incident Statuses:**
- `dispatched`
- `on_scene`
- `investigating`
- `police_closed` (Distinct from generic 'resolved')

**Outcomes (New Column: `closure_outcome`):**
- `resolved_handled`
- `arrest_made`
- `false_alarm`
- `report_filed`

**Outcome Metadata (New Column: `closure_details` JSONB):**
- `case_id` (String, optional)
- `officer_notes` (String)
- `responding_officer_id` (Link to User ID)

---

## 🔄 Workflow Example

1. **Citizen** submits "Assault in Progress" (Status: `submitted`)
2. **Moderator** sees high severity, calls reporter, confirms. Verified. (Status: `verified`)
3. **LE Officer** sees `verified` assault on dashboard.
4. **LE Officer** clicks **"Dispatch Unit"**. (Status: `dispatched`)
5. **LE Officer** updates **"On Scene"** 5 mins later. (Status: `on_scene`)
6. Suspect arrested. Officer clicks **"Close Case"**.
   - Selects Outcome: **Arrest Made**
   - Enters Note: "Suspect taken into custody, victim safe."
   - Status becomes: `police_closed`
7. **Public Map** updates to show "Resolved - Arrest Made" (building public trust).
