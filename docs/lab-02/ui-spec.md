# TokTickIT — UI & Design System Specification (Sprint 2 / Issue 5)
**Design System:** Zen Green Palette  
**Typography:** Inter / System Font Stack  
**Target Viewports:** Desktop ($\ge 992$px), Tablet ($768$px-$991$px), Mobile ($< 768$px)

---

## 1. Design Tokens & Color Palette (Zen Green)

TokTickIT adopts the **Zen Green Design System**, engineered for visual clarity, calm focus, and modern accessibility standards (WCAG AA compliant contrast ratios).

```css
:root {
  /* Brand & Theme Colors */
  --zg-primary: #006B3C;          /* Deep Zen Green - Primary CTA, Active Navigation, Main Header */
  --zg-secondary: #0B7A46;        /* Medium Zen Green - Hover state for primary buttons, focus rings */
  --zg-pale: #EAF6EF;             /* Light Mint Pale - Active card highlight, badge background, table zebra */
  --zg-accent: #12B76A;           /* Vibrant Green - Success checkmarks and positive badges */

  /* Neutral Backgrounds & Canvas */
  --zg-bg: #F5F7F6;               /* Page background canvas */
  --zg-surface: #FFFFFF;          /* Cards, modals, dropdown surfaces */
  --zg-surface-subtle: #FAFCFB;   /* Input background, subtle wells */

  /* Typography & Text */
  --zg-text-primary: #1D2939;     /* Main headers and primary text */
  --zg-text-secondary: #475467;   /* Descriptive text, subheaders */
  --zg-text-muted: #98A2B3;       /* Disabled text, placeholder text */
  --zg-text-inverse: #FFFFFF;     /* White text on dark elements */

  /* Borders & Dividers */
  --zg-border: #D0D5DD;           /* Default border for inputs, cards, tables */
  --zg-border-focus: #006B3C;     /* Border on input focus */
  --zg-border-subtle: #EAECF0;    /* Divider lines between list items */

  /* Status & Severity Colors */
  --zg-error: #B42318;            /* Error message, P0 badge background */
  --zg-error-bg: #FEF3F2;         /* Error container fill */
  --zg-warning: #B54708;          /* P1 High Priority text */
  --zg-warning-bg: #FFFAEB;       /* P1 High Priority container */
  --zg-notice: #B76E00;           /* P2 Medium Priority text */
  --zg-notice-bg: #FEF6EE;        /* P2 Medium Priority container */
  --zg-neutral: #344054;          /* P3 Low Priority / Closed text */
  --zg-neutral-bg: #F2F4F7;       /* P3 Low Priority container */

  /* Shadows & Elevation */
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

## 2. Badges & Indicators

### 2.1 Priority Badges

| Priority Code | Label | Background Color | Text Color | Border Color | Icon / Visual Indicator |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `P0_URGENT` | Urgent | `#FEF3F2` | `#B42318` | `#FECDCA` | 🔴 Solid red dot + Bold text |
| `P1_HIGH` | High | `#FFFAEB` | `#B54708` | `#FEDF89` | 🟠 Solid orange dot |
| `P2_MEDIUM` | Medium | `#FEF6EE` | `#B76E00` | `#F9DBAF` | 🟡 Solid yellow/amber dot |
| `P3_LOW` | Low | `#F2F4F7` | `#344054` | `#D0D5DD` | ⚪ Neutral gray dot |

### 2.2 Ticket Status Badges

| Status Code | Label | Background Color | Text Color | Border Color |
| :--- | :--- | :--- | :--- | :--- |
| `NEW` | New | `#EAF6EF` (`--zg-pale`) | `#006B3C` (`--zg-primary`) | `#A6F4C5` |
| `IN_PROGRESS` | In Progress | `#EFF8FF` | `#175CD3` | `#B2DDFF` |
| `RESOLVED` | Resolved | `#ECFDF3` | `#027A48` | `#A6F4C5` |
| `CLOSED` | Closed | `#F8F9FA` | `#475467` | `#E4E7EC` |
| `REJECTED` | Rejected | `#FEF3F2` | `#B42318` | `#FECDCA` |

---

## 3. Responsive Layout Guidelines

```text
+-------------------------------------------------------------------------------+
| Top Header: [TokTickIT Logo] [Nav: Create Ticket | My Tickets] [Requester: Sarah (Eng) v] |
+-------------------------------------------------------------------------------+
| Main Container (max-width: 1200px; centered; padding: 24px)                  |
|                                                                               |
| [Desktop >= 992px]                                                            |
|  - Full width navigation bar                                                  |
|  - Create Ticket Form: 2-column grid for taxonomy (Category + Related System) |
|  - My Tickets: Full multi-column table with column sorting headers             |
|                                                                               |
| [Tablet 768px - 991px]                                                        |
|  - Responsive table with horizontal card consolidation                        |
|  - Forms maintain fluid 1-column layout for small fields                      |
|                                                                               |
| [Mobile < 768px]                                                              |
|  - Requester dropdown takes full width on top bar or mobile drawer           |
|  - My Tickets table transforms into Stacked Card list (Zero horizontal scroll)|
|  - Ticket cards show: Ticket No & Status badge header, Summary, Date & Priority|
+-------------------------------------------------------------------------------+
```

---

## 4. Component Specifications

### 4.1 Global Shell & Requester Context Switcher
- **Header Bar:** Dark Zen Green background (`#006B3C`), white logo text, clean navigation links with active state indicator (white underline or pale pill).
- **Requester Dropdown:**
  - Placed in top-right corner with user avatar/initials icon.
  - Lists display name (`displayName`), department, and active status (`Sarah Connor (Engineering)`).
  - Switching requester triggers a global React Context state update and persists in `localStorage`.
  - If a dirty form is currently active, switching is blocked until the user resolves the confirmation modal.

### 4.2 Dirty-State Warning Modal
- **Trigger:** Intercepts route navigation or Requester switching whenever form dirty state is `true`.
- **Modal Design:**
  - Title: "Unsaved Changes"
  - Body: "You have unsaved ticket details. Leaving this page will discard your changes. Are you sure you want to proceed?"
  - Actions:
    - `[Cancel / Stay]` (Secondary Button: Neutral outline)
    - `[Discard Changes]` (Destructive Button: Solid Red `#B42318`)

### 4.3 Ticket Creation Form
- **Fields:**
  1. **Summary:** Input text, `placeholder="Brief description of the issue"`, character counter `(X/100)`, inline error message container.
  2. **Category:** Select dropdown populated from `/api/categories`.
  3. **Related System:** Dynamic select dropdown filtered by selected `categoryId` (disabled with placeholder "Select category first" if none chosen).
  4. **Priority:** Visual pill radio selector (`P0 - Urgent`, `P1 - High`, `P2 - Medium`, `P3 - Low`) with default selected `P2 - Medium`.
  5. **Description:** Textarea (min 4 rows), character counter `(X/2000)`.
  6. **Attachment Dropzone & Staging List:** Described below.
- **Form Actions:**
  - `[Cancel]` button: prompts dirty check if modified.
  - `[Submit Ticket]` button: Zen Green primary button with loading spinner state while submitting.

### 4.4 Pre-Upload Attachment Dropzone
- **Dropzone Area:** Dashed Zen Green border (`2px dashed #006B3C`), pale green background on drag hover (`#EAF6EF`), icon + "Drag & drop files here or Browse".
- **Validation Rules:**
  - Max 5 files total.
  - Max 5MB per file.
  - Allowed extensions: `.jpg, .jpeg, .png, .webp, .pdf`.
- **Staging Item Row:**
  - File icon according to MIME type.
  - File name and formatted size (e.g., `screenshot.png (1.2 MB)`).
  - Status Indicators:
    - **Uploading:** Subtle animated progress bar.
    - **Ready (Staged):** Green checkmark icon ✅ + "Ready".
    - **Error:** Red exclamation mark icon ❌ + Error reason ("File exceeds 5MB limit" or "Invalid format") + `[Retry]` button.
  - **Remove Action:** Trash icon button to unstage/remove file.

### 4.5 My Tickets Dashboard
- **Controls Toolbar:**
  - Search Input: Real-time search filter by ticket number or summary.
  - Status Filter: Dropdown (`All Statuses`, `New`, `In Progress`, `Resolved`, `Closed`, `Rejected`).
  - Page Size Selector: `10`, `20`, `50` items per page.
- **Desktop Table View ($\ge 768$px):**
  - Columns: `Ticket No`, `Summary`, `Category`, `Priority`, `Status`, `Attachments`, `Created At`, `Actions`.
  - Hover row highlights in pale mint (`--zg-pale`).
- **Mobile Card View ($< 768$px):**
  - Rendered as discrete cards with border `--zg-border` and radius `--zg-radius-md`.
  - Header: `Ticket No` (bold monospace) + `Status Badge`.
  - Body: Summary text (truncated to 2 lines) + Category pill.
  - Footer: Priority badge + Created date + Right arrow icon `>` linking to detail.
- **Empty States:**
  - **No Tickets Created:** Friendly illustration/icon + "No tickets found" + "You haven't submitted any IT support requests yet." + `[Create Your First Ticket]` CTA.
  - **No Search Results:** "No matching tickets found for query" + `[Clear Filters]` button.

### 4.6 Ticket Detail Read-Only View
- **Header:** Ticket Number headline (`TKT-2026-00042`), status badge, priority badge, and creation timestamp.
- **Metadata Card:**
  - Requester Name & Department.
  - Category & Related System.
- **Content Card:**
  - Summary and formatted full Description text container.
- **Attachment List Card:**
  - Displays each attachment card with filename, file size, upload date.
  - **Active File:** Clickable `[Download]` button with download icon.
  - **Soft-Removal Action:** `[Remove]` button (trash icon).
  - **Soft-Deleted State:** Download button disabled, item styled with muted gray strike-through, badge `Removed`, displaying deletion timestamp and reason.

### 4.7 Soft-Removal Audit Modal
- **Trigger:** Clicking `[Remove]` on any active attachment in Ticket Detail.
- **Modal Elements:**
  - Title: "Remove Attachment"
  - Warning Alert: "This file will be soft-deleted. The removal will be recorded in the audit log and the file can no longer be downloaded."
  - Reason Input: Textarea (mandatory, 5-255 characters) with placeholder "Please enter the reason for removing this attachment (e.g. uploaded wrong file / sensitive data)".
  - Inline error if submitted empty or $< 5$ chars.
  - Action Buttons: `[Cancel]` and `[Confirm Removal]` (Red primary button).

---

## 5. Visual Inspection Checklist

| Check ID | Verification Item | Expected Visual Result |
| :--- | :--- | :--- |
| **VI-01** | Zen Green Theme Palette | Primary headers, active links, and buttons match `--zg-primary: #006B3C` and `--zg-secondary: #0B7A46`. |
| **VI-02** | Priority Badge Badging | P0 displays Red, P1 displays Orange, P2 displays Yellow/Amber, P3 displays Neutral Gray. |
| **VI-03** | Mobile Viewport Layout | On $< 768$px viewport, table seamlessly switches to stacked cards with zero horizontal scrolling. |
| **VI-04** | Inline Form Validation | Submitting empty form highlights invalid fields with red borders (`#B42318`) and shows descriptive helper text below the field. |
| **VI-05** | Pre-upload Feedback | Dragging a 6MB file triggers immediate error state with red border and explicit size warning; valid file shows green staged badge. |
| **VI-06** | Dirty State Interception | Navigating away from partially filled form displays standard Zen Green styled confirmation modal. |
| **VI-07** | Soft-removal State | Soft-deleted attachment shows "Removed" badge and displays audit reason without download link. |
