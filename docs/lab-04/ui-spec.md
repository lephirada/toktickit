# TokTickIT — UI & Design System Specification (Sprint 4 / Issue 18)

**Project:** TokTickIT Enterprise IT Helpdesk  
**Sprint:** 4 — Parent-Child Work Structures, Resolution Gates, and Operational Dashboards  
**Design System:** Zen Green Palette  
**Typography Stack:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif  
**Target Viewports & Responsive Breakpoints:**
* **Desktop ($\ge 992$px, baseline capture at $1280 \times 900$px):** Multi-column dashboard grid, dual-pane ticket operational views, fixed top-level navigation.
* **Tablet ($768$px – $991$px, baseline capture at $768 \times 1024$px):** Responsive 2-column card layouts, horizontal scroll wrappers for dense tables, collapsible filter drawer.
* **Mobile ($< 768$px, baseline capture at $375 \times 812$px):** Single-column stacked KPI cards, off-canvas navigation, bottom-anchored modal sheets, strictly zero horizontal page overflow.

---

## 1. Design Tokens & Zen Green Palette

TokTickIT uses the **Zen Green Design System** to foster focused, calm, and productive enterprise workflows while guaranteeing strict WCAG 2.1 AA accessibility ($\ge 4.5:1$ contrast for standard text).

```css
:root {
  /* Brand & Core Zen Green Tokens */
  --zg-primary: #006b3c;        /* Deep Forest Green - Header, Primary CTA, Active tab */
  --zg-primary-hover: #08502e;  /* Dark Moss - Hover/focus states */
  --zg-secondary: #0b7a46;      /* Medium Zen Green - Secondary actions, focus rings */
  --zg-pale: #eaf6ef;           /* Pale Mint - Active row highlights, badge containers */
  --zg-accent: #12b76a;         /* Vibrant Emerald - Success badges, checkmark confirmations */

  /* Neutral Backgrounds & Canvas */
  --zg-bg: #f5f7f6;             /* Page canvas background */
  --zg-surface: #ffffff;        /* Cards, modal dialogs, dropdowns */
  --zg-surface-subtle: #fafcfb; /* Form inputs, read-only wells, callout boxes */

  /* Typography & Text */
  --zg-text-primary: #1d2939;   /* Main headings, body labels */
  --zg-text-secondary: #667085; /* Supporting metadata, timestamps */
  --zg-text-muted: #98a2b3;     /* Placeholder text, disabled labels */
  --zg-text-inverse: #ffffff;   /* Pure white text on dark green surfaces */

  /* Borders & Dividers */
  --zg-border: #d0d5dd;         /* Form inputs, card boundaries */
  --zg-border-focus: #0b7a46;   /* Focus outline and border */
  --zg-border-subtle: #eaecf0;  /* Table gridlines, subtle dividers */

  /* Concurrency & Conflict Indicators */
  --zg-conflict-bg: #fff1f3;    /* 409 Conflict container background */
  --zg-conflict-border: #fda29b;/* 409 Conflict border outline */
  --zg-conflict-text: #b42318;  /* 409 Conflict alert text */

  /* Severity & Priority Colors */
  --zg-urgent: #b42318;         /* P0 Urgent text */
  --zg-urgent-bg: #fef3f2;      /* P0 Urgent badge background */
  --zg-high: #b54708;           /* P1 High text */
  --zg-high-bg: #fffaeb;        /* P1 High badge background */
  --zg-medium: #b76e00;         /* P2 Medium text */
  --zg-medium-bg: #fef6ee;      /* P2 Medium badge background */
  --zg-low: #344054;            /* P3 Low text */
  --zg-low-bg: #f2f4f7;         /* P3 Low badge background */

  /* Status Colors */
  --zg-status-new-bg: #eff8ff;
  --zg-status-new-text: #175cd3;
  --zg-status-open-bg: #e0f2fe;
  --zg-status-open-text: #0369a1;
  --zg-status-progress-bg: #fef0c7;
  --zg-status-progress-text: #b54708;
  --zg-status-waiting-bg: #ffedd5;
  --zg-status-waiting-text: #c2410c;
  --zg-status-resolved-bg: #ecfdf3;
  --zg-status-resolved-text: #027a48;
  --zg-status-closed-bg: #f2f4f7;
  --zg-status-closed-text: #344054;
  --zg-status-cancelled-bg: #fef3f2;
  --zg-status-cancelled-text: #b42318;
  --zg-status-reopened-bg: #fdf2fa;
  --zg-status-reopened-text: #c11574;
}
```

---

## 2. Role-Based UI Visibility & Action Controls

TokTickIT enforces strict role-based visibility rules at both the view level and individual control level:

### 2.1 Role-Based UI Control Matrix

| UI Component / Control | Requester View | IT Staff View | Administrator View |
| :--- | :---: | :---: | :---: |
| **Actions Taken Timeline / List** | **Visible (Read-Only)** | **Visible** | **Visible** |
| **"Log Action" Button** | **Hidden / Unrendered** | **Visible** | **Visible** |
| **"Edit Action" Button** | **Hidden / Unrendered** | **Visible** | **Visible** |
| **Action Concurrency Conflict Dialog** | **Hidden** | **Visible on 409** | **Visible on 409** |
| **Resolution Gate Validation Warnings** | **Hidden** | **Visible** | **Visible** |
| **Status Transition Modal (Resolve)** | **Hidden** | **Visible** | **Visible** |
| **"Problem Appears Resolved" Button** | **Visible** (own eligible tickets) | **Hidden** | **Hidden** |
| **Operational Dashboard Navigation & View**| **Hidden** (Redirect/403) | **Visible** | **Visible** |
| **Internal Notes Panel** | **Hidden** | **Visible** | **Visible** |
| **User Management Navigation & View** | **Hidden** | **Hidden** | **Visible** |

### 2.2 Requester View Isolation Details
* On the Requester Ticket Detail screen (`/tickets/:id`), the Actions Taken section is rendered as an informational **"Work History & Actions Taken"** timeline.
* Requesters can see:
  - Performer display name (e.g., "Alex Morgan (IT Staff)").
  - Formatted timestamp (e.g., "Oct 8, 2026, 11:00 AM").
  - Action category pill (e.g., `INVESTIGATION`, `REPAIR`).
  - Technical action description.
  - Duration badge (e.g., `30 mins`).
* **Strict Control Omission:**
  - The `"Log Action"` button, modal forms, edit icons, and delete buttons are completely absent from the DOM (not merely disabled with CSS `display: none`).
  - No client actions exist that could trigger `POST /api/tickets/:id/actions` or `PUT /api/tickets/:id/actions/:actionId`.

---

## 3. Actions Taken Component Specifications

### 3.1 Actions Taken Section Layout (Staff Ticket Detail)

Located beneath the ticket details panel on the Staff Ticket Detail screen:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Actions Taken (2)                            [ + Log Action Taken ]    │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [REPAIR] 25 mins • Oct 8, 2026 10:00 AM • Chris Taylor   [Edit]   │ │
│ │ Re-crimped RJ45 connector and tested cable continuity with fluke   │ │
│ │ tester. Gigabit connection verified.                               │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [INVESTIGATION] 30 mins • Oct 8, 2026 09:15 AM • Chris Taylor [Edit]│
│ │ Ran diagnostic ping and traceroute tests to gateway; confirmed      │ │
│ │ high latency on switch port 24.                                    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 "Log Action Taken" Modal Dialog

* **Trigger:** Click `[ + Log Action Taken ]` in the Actions Taken card header.
* **Form Fields:**
  1. **Action Type / Category:** Select dropdown with options:
     - `INVESTIGATION` (Default)
     - `CONFIGURATION`
     - `REPAIR`
     - `COMMUNICATION`
     - `OTHER`
  2. **Time Spent (Minutes):** Numeric input with step `5`, min `1`, max `1440`. Includes helper presets: `[ 15m ] [ 30m ] [ 45m ] [ 1h ] [ 2h ]`.
  3. **Performed At:** DateTime-local picker defaulting to current time. Cannot be set beyond current time + 5 minutes.
  4. **Description:** Textarea with live character counter (10 to 2,000 characters). Displays validation error if trimmed length is $< 10$ characters.
* **Actions:**
  - `Cancel`: Closes modal without saving.
  - `Save Action`: Disabled if description $< 10$ chars or time spent is invalid. Shows spinner during submission.

### 3.3 Empty State: 0 Actions Taken

When a ticket in `OPEN` or `IN_PROGRESS` has no actions taken:
* Displays an informative empty well:
  - Icon: Clipboard with checklist (`bi-clipboard-pulse` or similar).
  - Heading: "No actions taken recorded yet".
  - Subtext: "Document technical actions performed on this ticket. At least one action is required before this ticket can be resolved."
  - Call to Action: `[ Log First Action ]` button.

---

## 4. Optimistic Concurrency Conflict UI Handling

When an IT Staff member attempts to update an action record via `PUT /api/tickets/:id/actions/:actionId` and the server responds with **`409 STALE_ACTION_CONFLICT`**, the UI prevents data loss through an interactive conflict dialog:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ⚠️ Concurrency Conflict Detected                                      │
├────────────────────────────────────────────────────────────────────────┤
│ Another team member updated this action record while you were editing. │
│ To avoid overwriting their work, please review the changes below:     │
│                                                                        │
│ ┌──────────────────────────────────┬─────────────────────────────────┐ │
│ │ Current Server Version (Latest)  │ Your Changes (Unsaved)          │ │
│ ├──────────────────────────────────┼─────────────────────────────────┤ │
│ │ Updated By: Alex Morgan          │ Updated By: You                 │ │
│ │ Time: 10:18 AM                   │ Time: 10:15 AM (Loaded)         │ │
│ │ Duration: 45 mins                │ Duration: 35 mins               │ │
│ │                                  │                                 │ │
│ │ Description:                     │ Description:                    │ │
│ │ "Updated firmware configuration  │ "Swapped out defective display  │ │
│ │ per network supervisor review."  │ cable and tested 4K output."    │ │
│ └──────────────────────────────────┴─────────────────────────────────┘ │
│                                                                        │
│ [ Reload Latest Version ]      [ Copy My Changes ]      [ Cancel ]     │
└────────────────────────────────────────────────────────────────────────┘
```

* **Interactive Conflict Actions:**
  - **Reload Latest Version:** Discards local draft, re-fetches latest action with its new `updatedAt` token, and loads it into the edit form.
  - **Copy My Changes:** Copies the user's unsaved text to the clipboard so they can safely reload and merge their notes.
  - **Cancel:** Dismisses the dialog and keeps the edit modal open for manual copying.

---

## 5. Resolution Gate UI Behavior

### 5.1 Resolution Action Check in Status Transition Modal

When IT Staff selects `RESOLVED` in the Status Transition dropdown or clicks the `[ Resolve Ticket ]` primary action:

1. **Gate Check: `actionsCount === 0` (Blocked):**
   * The modal displays a prominent warning callout with an amber/red border:
     - **Alert Banner:** `"Resolution Blocked: At least one Action Taken must be recorded before this ticket can be resolved."`
     - The `Confirm Resolution` button is disabled.
     - A direct button `[ + Log Action Now ]` is rendered, allowing staff to log the work without losing context.
2. **Gate Check: `actionsCount >= 1` (Passed):**
   * The modal displays a green checkmark pill: `"✓ Actions Recorded: 2 actions (55 mins total)"`.
   * The `Resolution Summary` textarea is enabled:
     - Placeholder: `"Detail how the issue was resolved and what verification was performed..."`
     - Live character counter: `0 / 1000 characters (minimum 10 required)`.
     - `Confirm Resolution` button unlocks once summary reaches $\ge 10$ characters.

---

## 6. Operational Dashboard UI Specification

### 6.1 Layout Overview (Zen Green Dashboard)

The Operational Dashboard is accessible via the top navigation bar (`Dashboard` tab) for `IT_STAFF` and `ADMINISTRATOR` users.

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ TokTickIT   [ Queue ]  [ Dashboard ]  [ Users ]       (David Lee - IT Staff)   │
├────────────────────────────────────────────────────────────────────────────────┤
│ Operational Service Desk Dashboard                                            │
│ Real-time workload, queue metrics, and recent resolution throughput.           │
│                                                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┤
│ │ Total Open   │ │ In Progress  │ │ Waiting Req  │ │ Recently Res.│ │ Total   │
│ │ 5            │ │ 3            │ │ 2            │ │ 8 (7 days)   │ │ Time    │
│ │ [View Open]  │ │ [View Active]│ │ [View Block] │ │ [View Done]  │ │ 10h 45m │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └─────────┤
│                                                                                │
│ ┌────────────────────────────────────────┬───────────────────────────────────┐ │
│ │ Tickets by Category                    │ Priority Distribution             │ │
│ ├────────────────────────────────────────┼───────────────────────────────────┤ │
│ │ Account & Access  ████████ 6 (3.0 hrs) │ [P0 Urgent]  █ 1                  │ │
│ │ Hardware          █████ 4 (4.0 hrs)    │ [P1 High]    ███ 3                │ │
│ │ Software          ████ 3 (2.5 hrs)     │ [P2 Medium]  ███████ 7            │ │
│ │ Network           ██ 2 (1.25 hrs)      │ [P3 Low]     ████ 4               │ │
│ └────────────────────────────────────────┴───────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Metric KPI Cards Design Tokens
* **Total Open Card:** Pale blue container (`--zg-status-open-bg`), deep blue text (`--zg-status-open-text`), deep link: `/staff/queue?status=NEW,OPEN`.
* **In Progress Card:** Pale amber container (`--zg-status-progress-bg`), amber text (`--zg-status-progress-text`), deep link: `/staff/queue?status=IN_PROGRESS`.
* **Waiting for Requester Card:** Pale orange container (`--zg-status-waiting-bg`), orange text (`--zg-status-waiting-text`), deep link: `/staff/queue?status=WAITING_FOR_REQUESTER`.
* **Recently Resolved Card:** Pale mint container (`--zg-pale`), deep green text (`--zg-primary`), subtitle `"Rolling 7-day window"`, deep link: `/staff/queue?status=RESOLVED`.
* **Total Time Spent Card:** Neutral container (`--zg-surface-subtle`), dark charcoal text (`--zg-text-primary`), subtitle `"Sum of recorded actions"`.

---

## 7. Responsive Layouts & Breakpoint Rules

To uphold TokTickIT's strict presentation quality standards:

* **Desktop ($\ge 992$px):**
  - KPI summary row displays 5 equal-width cards in a single horizontal row (`grid-template-columns: repeat(5, 1fr)`).
  - Category breakdown and Priority distribution render in a 2-column side-by-side split grid.
* **Tablet ($768$px – $991$px):**
  - KPI summary cards wrap into a 3-column top row and 2-column bottom row.
  - Workload breakdown panels stack vertically with full width.
  - Tables wrap in `.table-responsive` with clean horizontal scrollbars. Root document maintains `overflow-x: hidden`.
* **Mobile ($< 768$px):**
  - KPI summary cards render in a 2-column grid, with the "Total Time" card spanning full width.
  - Actions Taken timeline displays stacked cards without table borders.
  - Modal sheets anchor to the viewport bottom with 100% width and rounded top corners.
  - **Zero Horizontal Page Overflow Rule:** Root container width is strictly capped at `100vw` with `overflow-x: hidden`.

---

## 8. Accessibility & WCAG 2.1 AA Standards

1. **Color Contrast:** All body text meets or exceeds $\ge 4.5:1$ contrast against card backgrounds. Large headers ($\ge 18$pt) and badges meet or exceed $\ge 3:1$.
2. **Keyboard Navigation:** All interactive elements (`[ + Log Action Taken ]`, `[ Edit ]`, `[ Reload ]`, KPI deep links) have visible `:focus-visible` outline rings (`2px solid var(--zg-secondary)`).
3. **Screen Reader Tags:**
   - Modals use `role="dialog"`, `aria-labelledby`, and `aria-modal="true"`.
   - Character counters include `aria-live="polite"`.
   - Status indicators have explicit textual descriptions alongside color badges.
