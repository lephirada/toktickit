# TokTickIT — UI & Design System Specification (Sprint 3 / Issue 10)

**Project:** TokTickIT Enterprise IT Helpdesk  
**Design System:** Zen Green Palette  
**Typography Stack:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif  
**Target Viewports & Responsive Breakpoints:**
* **Desktop ($\ge 992$px, baseline capture at $1280 \times 900$px):** Multi-column tables, split operational panels, fixed top-level navigation bar.
* **Tablet ($768$px – $991$px, baseline capture at $768 \times 1024$px):** Consolidated tables with horizontal scroll wrapper, collapsible filter drawer.
* **Mobile ($< 768$px, baseline capture at $375 \times 812$px):** Single-column stacked cards, off-canvas navigation drawer, sticky primary actions, strictly zero horizontal page overflow.

---

## 1. Design Tokens & Color Palette (Zen Green)

TokTickIT adopts the **Zen Green Design System**, engineered for visual clarity, enterprise density, and strict accessibility compliance (WCAG 2.1 AA contrast ratios $\ge 4.5:1$ for normal text and $\ge 3:1$ for graphical UI elements).

```css
:root {
  /* Brand & Core Zen Green Tokens */
  --zg-primary: #006b3c;        /* Deep Zen Green - Header bar, Primary CTA, Active nav tab */
  --zg-primary-hover: #08502e;  /* Darker Zen Green - Button active / hover states */
  --zg-secondary: #0b7a46;      /* Medium Zen Green - Primary button hover, focus rings */
  --zg-pale: #eaf6ef;           /* Pale Mint - Active row highlight, badge fills, table zebra */
  --zg-accent: #12b76a;         /* Vibrant Green - Success badges, checkmark confirmations */

  /* Neutral Backgrounds & Canvas */
  --zg-bg: #f5f7f6;             /* Page canvas background */
  --zg-surface: #ffffff;        /* Cards, modal dialogs, dropdown menus */
  --zg-surface-subtle: #fafcfb; /* Form inputs, read-only wells */

  /* Typography & Text Tokens */
  --zg-text-primary: #1d2939;   /* Main headings, body labels */
  --zg-text-secondary: #667085; /* Supporting labels, table metadata, timestamps */
  --zg-text-muted: #98a2b3;     /* Placeholder text, disabled labels */
  --zg-text-inverse: #ffffff;   /* Pure white text on dark green elements */

  /* Borders & Dividers */
  --zg-border: #d0d5dd;         /* Form input borders, card boundaries */
  --zg-border-focus: #0b7a46;   /* Focus outline and border */
  --zg-border-subtle: #eaecf0;  /* Table gridlines, card dividers */

  /* Severity & Priority Colors */
  --zg-urgent: #b42318;         /* P0 Urgent text */
  --zg-urgent-bg: #fef3f2;      /* P0 Urgent badge container */
  --zg-high: #b54708;           /* P1 High text */
  --zg-high-bg: #fffaeb;        /* P1 High badge container */
  --zg-medium: #b76e00;         /* P2 Medium text */
  --zg-medium-bg: #fef6ee;      /* P2 Medium badge container */
  --zg-low: #344054;            /* P3 Low text */
  --zg-low-bg: #f2f4f7;         /* P3 Low badge container */

  /* Status Colors */
  --zg-status-new-bg: #eff8ff;
  --zg-status-new-text: #175cd3;
  --zg-status-open-bg: #e0f2fe;
  --zg-status-open-text: #0369a1;
  --zg-status-progress-bg: #fef0c7;
  --zg-status-progress-text: #b54708;
  --zg-status-waiting-bg: #ffedd5;
  --zg-status-waiting-text: #c2410c;
  --zg-status-resolved-bg: #dcfce7;
  --zg-status-resolved-text: #15803d;
  --zg-status-closed-bg: #f3f4f6;
  --zg-status-closed-text: #374151;
  --zg-status-reopened-bg: #fdf4ff;
  --zg-status-reopened-text: #a21caf;
  --zg-status-cancelled-bg: #fee2e2;
  --zg-status-cancelled-text: #991b1b;

  /* Internal Notes Specialized Tokens (Privacy Alert) */
  --zg-amber-bg: #fef0c7;       /* Internal Note container background */
  --zg-amber-border: #f79009;   /* Internal Note border */
  --zg-amber-text: #7a2e0e;     /* Internal Note author/header text */

  /* Shadows & Elevations */
  --zg-shadow-sm: 0px 1px 2px rgba(16, 24, 40, 0.05);
  --zg-shadow-md: 0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06);
  --zg-shadow-lg: 0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03);

  /* Radii */
  --zg-radius-sm: 4px;
  --zg-radius-md: 8px;
  --zg-radius-lg: 12px;
  --zg-radius-full: 9999px;
}
```

---

## 2. Badge & Component Standards

### 2.1 Role Badges
* `REQUESTER`: Pale Blue fill (`#EFF8FF`), Navy text (`#175CD3`), border `#B2DDFF`.
* `IT_STAFF`: Mint Pale fill (`var(--zg-pale)`), Deep Green text (`var(--zg-primary)`), border `#A6F4C5`.
* `ADMINISTRATOR`: Royal Purple fill (`#F4EBFF`), Purple text (`#5925DC`), border `#D8B4FE`.

### 2.2 Status Badges
* `NEW`: Blue fill (`#EFF8FF`), text `#175CD3`.
* `OPEN`: Light Cyan fill (`#E0F2FE`), text `#0369A1`.
* `IN_PROGRESS`: Amber fill (`#FEF0C7`), text `#B54708`.
* `WAITING_FOR_REQUESTER`: Orange fill (`#FFEDD5`), text `#C2410C`.
* `RESOLVED`: Green fill (`#DCFCE7`), text `#15803D`.
* `CLOSED`: Gray fill (`#F3F4F6`), text `#374151`.
* `REOPENED`: Fuchsia fill (`#FDF4FF`), text `#A21CAF`.
* `CANCELLED`: Red-gray fill (`#FEE2E2`), text `#991B1B`.

### 2.3 Priority Badges
* `P0_URGENT`: Red fill (`#FEF3F2`), text `#B42318`, border `#FECDCA`.
* `P1_HIGH`: Amber fill (`#FFFAEB`), text `#B54708`, border `#FEDF89`.
* `P2_MEDIUM`: Orange fill (`#FEF6EE`), text `#B76E00`, border `#F9DBAF`.
* `P3_LOW`: Gray fill (`#F2F4F7`), text `#344054`, border `#D0D5DD`.

### 2.4 Special Indicator Badges
* `[Requester Confirmed Resolved]`: Mint background (`var(--zg-pale)`), vibrant green border (`#12B76A`), green checkmark icon. Displays prominently in IT Staff Queue table and detail header when `resolutionIndicated = true`.

---

## 3. Screen Specifications & Layouts

### 3.1 Login Screen (`/login`)
* **Layout:** Centered card (max-width 420px) on subtle canvas background (`var(--zg-bg)`).
* **Brand Header:** TokTickIT leaf logo with Deep Green brand heading (`TokTickIT IT Helpdesk`).
* **Form Elements:**
  * Email Address input (`type="email"`, `autocomplete="username"`, placeholder: `name@company.com`).
  * Password input (`type="password"`, `autocomplete="current-password"`, visibility toggle eye-icon button).
  * Sign In primary button (full width, displays spinner during authentication request).
* **State Behaviors:**
  * **Loading State:** Sign In button disabled with animated spinner; inputs read-only.
  * **Validation State:** Red border on empty or malformed email; field error message below input.
  * **Error State (401):** Dismissible alert banner: *"Invalid email or password. Please try again."*
  * **Deactivated Account State:** Same generic message or clean banner: *"Account is deactivated. Please contact your system administrator."* (zero stack traces or internal leaks).
  * **Success State:** If `mustChangePassword = true`, navigate to `/change-password`; otherwise navigate to role landing page (`/staff/queue` for Staff/Admin, `/my-tickets` for Requesters).

### 3.2 Mandatory Change Password Screen (`/change-password`)
* **Layout:** Centered card (max-width 480px). Accessible only when authenticated.
* **Context Banner:** Zen Mint info callout: *"You are signing in with a temporary or initial password. Please choose a new password before continuing."*
* **Form Elements:**
  * Current (Temporary) Password input.
  * New Password input.
  * Confirm New Password input.
* **Real-time Password Rule Checklist:**
  - [ ] At least 8 characters
  - [ ] Includes uppercase and lowercase letters
  - [ ] Includes a number and a special character
  - [ ] Passwords match
* **State Behaviors:**
  * **Validation State:** Real-time green checkmarks appear next to fulfilled rules. "Save & Continue" CTA button remains disabled until all 4 criteria are fulfilled.
  * **Error State:** Server validation failures render an error alert banner at the top of the form.
  * **Success State:** Shows green success banner, updates user context (`mustChangePassword: false`), and redirects to home queue.

### 3.3 Shared Authenticated Application Shell & Header
* **Top Navigation Bar:** Height 64px, deep green background (`var(--zg-primary)`), white text.
* **Brand:** TokTickIT logo with white lettering.
* **Role-Specific Navigation Links:**
  * `REQUESTER`: "My Tickets" | "+ Create Ticket"
  * `IT_STAFF`: "Ticket Queue"
  * `ADMINISTRATOR`: "Ticket Queue" | "User Management"
* **User Profile & Navigation Menu (Right Aligned):**
  * Displays user's `fullName`.
  * Colored Role Badge (`Requester` / `IT Staff` / `Admin`).
  * Dropdown trigger displaying user email, "Change Password" link, and "Sign Out" button.
* **Mobile Drawer:** On viewports $< 768$px, nav links collapse into an off-canvas slide-out drawer accessible via hamburger menu button.

### 3.4 Requester Ticket Flow (`/my-tickets` & `/tickets/:id`)
* **My Tickets List (`/my-tickets`):**
  * Existing Lab 2 table preserved: Ticket No, Created Date, Summary, Category, Priority, Status.
  * Filter bar by Status and Category.
  * Click row to navigate to Ticket Detail.
* **Requester Ticket Detail (`/tickets/:id`):**
  * Breadcrumb navigation: `"My Tickets > Ticket #..."`.
  * Read-only ticket metadata panel: Ticket No, Summary, Category, Related System, Status, Requested Priority, Created Date.
  * Attachments list with download links and soft-delete indicators.
  * **"Problem Appears Resolved" Action Banner:**
    * Visible only when ticket is in `IN_PROGRESS` or `WAITING_FOR_REQUESTER` AND `resolutionIndicated = false`.
    * Clicking triggers a confirmation modal with optional feedback textarea.
    * On submission, posts to `POST /api/tickets/:id/confirm-resolved`, sets `resolutionIndicated = true`, appends a public comment, and replaces button with green confirmation notice: *"You confirmed this ticket appears resolved."*
  * **Public Discussion Thread:**
    * Chronological list of public comments showing author name, role badge, timestamp, and comment body.
    * Comment textarea with character counter (max 2,000 chars) and "Post Comment" button.
    * Internal Notes are completely hidden from this view.

### 3.5 IT Staff Ticket Queue (`/staff/queue`)
* **Header & Controls Bar:**
  * Search input: Filter by ticket number or summary keyword (with debounce).
  * Category dropdown, Requested Priority dropdown, IT Priority dropdown, Status dropdown.
  * Assignment toggle: "All" | "Unassigned" | "Assigned to Me".
  * "Reset Filters" action button.
* **Desktop Table View ($\ge 992$px):**
  * Columns: Ticket No, Created Date, Summary, Category, Req Priority, IT Priority, Status, Assigned Owner, Indicators.
  * When `resolutionIndicated = true`, displays `[Requester Confirmed Resolved]` badge.
  * Pagination footer: Current page, page size selector (10, 25, 50), totalItems, Prev / Next buttons.
* **Mobile Card View ($< 768$px):**
  * Responsive transformation into cards showing Ticket No, Status badge, IT Priority badge, Summary, Owner, and Confirm-Resolved indicator.
* **States:**
  * **Loading:** Skeleton rows showing pulsing placeholders.
  * **Empty:** Zen Mint illustration with message: *"No tickets match the current filters."*
  * **Error:** Alert banner with retry button.

### 3.6 IT Staff Ticket Detail & Operations (`/staff/tickets/:id`)
* **Layout:** Two-column desktop layout (Left: Ticket Info & Controls, Right: Discussion & Audit). Stacks to single-column on tablet/mobile.
* **Operational Control Panel:**
  * **Assignment:** Displays current owner. If unassigned, displays prominent `"Claim Ticket"` button. If assigned, dropdown allows reassigning to any active IT Staff or Administrator.
  * **IT Priority:** Dropdown (`P0_URGENT`, `P1_HIGH`, `P2_MEDIUM`, `P3_LOW`). Editing auto-saves or provides an "Update Priority" button.
  * **Status Action & Transition Modal:**
    * Displays current status badge.
    * "Update Status" button triggers transition modal displaying permitted target statuses based on the strict state machine.
    * If target is `RESOLVED`, `resolutionSummary` input is mandatory.
    * If target is `CANCELLED`, `cancellationReason` input is mandatory.
    * If target is `REOPENED`, `reopenReason` input is mandatory.
* **Tabbed Discussion Panel:**
  * Tab 1: **Public Comments (N)** — Shared messages visible to Requester and Staff.
  * Tab 2: **Internal Notes (M)** — Operational notes with prominent Amber privacy warning banner:  
    *`"Private Note. Visible only to IT Staff and Administrators."`*
  * New note/comment input with markdown/text formatting and 2,000-character limit.
* **Audit Activity Timeline:**
  * Collapsible timeline displaying assignment changes, priority changes, status transitions, and resolution confirmation events with actor name and timestamp.

### 3.7 Administrator User Management (`/admin/users`)
* **Header & Controls Bar:**
  * Search input: Filter by user name or email.
  * Role filter dropdown: All, Requester, IT Staff, Administrator.
  * Primary Action: `"+ Create User"` button.
* **User Directory Table:**
  * Columns: Full Name, Email Address, Role Badge, Status Toggle Switch (`Active` / `Inactive`), Actions (`Edit`).
* **Create User Modal:**
  * Fields: Full Name, Email Address, Role selector, Initial Password, Active status toggle.
  * Validates email format, unique email check, and password rules.
* **Edit User Modal:**
  * Fields: Full Name, Role selector, Active toggle switch.
  * Action: `"Reset Initial Password"` button (opens confirmation to supply a temporary password that forces `mustChangePassword = true` upon next login).
* **Safety & Guardrail Dialogs:**
  * **Self-Deactivation Attempt:** Intercepted client-side and server-side with warning dialog: *"You cannot deactivate your own account."*
  * **Last Administrator Protection:** Intercepted with error dialog: *"Cannot deactivate or demote the last remaining active Administrator."*

---

## 4. Responsive Viewport Rules & Layout Breakdown

| Screen / Component | Desktop ($\ge 992$px / Baseline $1280 \times 900$) | Tablet ($768$px – $991$px / Baseline $768 \times 1024$) | Mobile ($< 768$px / Baseline $375 \times 812$) |
| :--- | :--- | :--- | :--- |
| **Header Navigation** | Fixed top bar with text links & user dropdown | Compact top bar with role badge & user dropdown | Top bar with hamburger icon opening off-canvas drawer |
| **Login / Change Password**| Centered card ($420$px / $480$px) | Centered card ($440$px) | Full-width container with responsive padding ($16$px) |
| **Requester Ticket Detail**| 2-column layout (Metadata left, Discussion right) | Single-column stacked layout | Single-column stacked layout, full-width action buttons |
| **Staff Ticket Queue** | Full 9-column data table with pagination controls | Scrollable table inside container (`overflow-x: auto`) | Stacked ticket cards with badge header and touch targets |
| **Staff Ticket Detail** | 2-column layout (Controls left, Tabs right) | Single-column stacked layout | Single-column stacked layout; tabs switch between Public & Internal |
| **User Management** | Full 5-column table with inline toggles | Scrollable table inside container (`overflow-x: auto`) | Stacked user cards with edit buttons and status pills |
| **Modals & Dialogs** | Floating modal centered ($520$px max width) | Floating modal centered ($90\%$ screen width) | Bottom sheet modal ($100\%$ width, rounded top corners) |

> [!IMPORTANT]
> **Container vs. Page Scrolling Clarification:**
> Table containers may scroll horizontally (`overflow-x: auto`) on tablet viewports when column widths exceed container space. However, the root document and viewport (`html`, `body`, and page layout wrappers) must strictly maintain **zero horizontal page overflow** (`overflow-x: hidden`), guaranteeing no horizontal page-level body scrollbars exist.

---

## 5. Visual Consistency, Anti-Leakage & Accessibility Checklist

- [ ] **WCAG 2.1 AA Compliance:** Minimum 4.5:1 contrast ratio across all text and background pairings.
- [ ] **Focus Rings:** Visible focus ring (`2px solid var(--zg-secondary)`) on all interactive inputs, buttons, and dropdowns.
- [ ] **Zero Page-Level Overflow:** All viewports verified (Desktop $1280 \times 900$, Tablet $768 \times 1024$, Mobile $375 \times 812$) with strictly zero page-level horizontal overflow (`overflow-x: hidden`). Internal horizontal scrolling is confined strictly within responsive table wrappers (`.table-scroll-container { overflow-x: auto; }`).
- [ ] **Read-Only vs Editable Distinction:** Editable fields have white backgrounds with `#D0D5DD` borders; read-only wells have `#FAFCFB` backgrounds with subtle borders.
- [ ] **Information Leakage Prevention:**
  - Internal Notes tab and badges are never rendered in requester views.
  - 404 Not Found displayed when requesters attempt to navigate to unauthorized ticket IDs.
  - Generic authentication error messages prevent user enumeration.
- [ ] **Dirty State Guards:** Form cancel buttons or route changes with unsaved changes prompt user confirmation dialog.

---

## 6. Screenshot Inventory (24 Target Screenshots for Sprint 3 Verification)

To prove full responsive implementation and visual polish, Sprint 3 requires 24 screenshots saved under `artifacts/lab-03/screenshots/`:

| No. | Screen View | Viewport | Filename |
| :--- | :--- | :--- | :--- |
| 1 | Login Screen | Desktop ($1280 \times 900$) | `01-login-desktop.png` |
| 2 | Login Screen | Tablet ($768 \times 1024$) | `01-login-tablet.png` |
| 3 | Login Screen | Mobile ($375 \times 812$) | `01-login-mobile.png` |
| 4 | Change Password Screen | Desktop ($1280 \times 900$) | `02-change-password-desktop.png` |
| 5 | Change Password Screen | Tablet ($768 \times 1024$) | `02-change-password-tablet.png` |
| 6 | Change Password Screen | Mobile ($375 \times 812$) | `02-change-password-mobile.png` |
| 7 | Shared Header Shell & Navigation | Desktop ($1280 \times 900$) | `03-header-nav-desktop.png` |
| 8 | Shared Header Shell & Navigation | Tablet ($768 \times 1024$) | `03-header-nav-tablet.png` |
| 9 | Shared Header Shell & Navigation | Mobile ($375 \times 812$) | `03-header-nav-mobile.png` |
| 10 | Requester Ticket Detail & Discussion | Desktop ($1280 \times 900$) | `04-requester-ticket-desktop.png` |
| 11 | Requester Ticket Detail & Discussion | Tablet ($768 \times 1024$) | `04-requester-ticket-tablet.png` |
| 12 | Requester Ticket Detail & Discussion | Mobile ($375 \times 812$) | `04-requester-ticket-mobile.png` |
| 13 | IT Staff Ticket Queue | Desktop ($1280 \times 900$) | `05-staff-queue-desktop.png` |
| 14 | IT Staff Ticket Queue | Tablet ($768 \times 1024$) | `05-staff-queue-tablet.png` |
| 15 | IT Staff Ticket Queue | Mobile ($375 \times 812$) | `05-staff-queue-mobile.png` |
| 16 | IT Staff Ticket Detail & Operations | Desktop ($1280 \times 900$) | `06-staff-ticket-desktop.png` |
| 17 | IT Staff Ticket Detail & Operations | Tablet ($768 \times 1024$) | `06-staff-ticket-tablet.png` |
| 18 | IT Staff Ticket Detail & Operations | Mobile ($375 \times 812$) | `06-staff-ticket-mobile.png` |
| 19 | Admin User Management Table | Desktop ($1280 \times 900$) | `07-admin-users-desktop.png` |
| 20 | Admin User Management Table | Tablet ($768 \times 1024$) | `07-admin-users-tablet.png` |
| 21 | Admin User Management Table | Mobile ($375 \times 812$) | `07-admin-users-mobile.png` |
| 22 | Create / Edit User Modal Dialog | Desktop ($1280 \times 900$) | `08-user-modal-desktop.png` |
| 23 | Create / Edit User Modal Dialog | Tablet ($768 \times 1024$) | `08-user-modal-tablet.png` |
| 24 | Create / Edit User Modal Dialog | Mobile ($375 \times 812$) | `08-user-modal-mobile.png` |
