# TechSozo Invoices — Precision Agency Billing & Invoicing Platform

TechSozo Invoices is an internal invoicing and payment tracking web application crafted specifically for digital marketing services agencies in Tamil Nadu, India. It combines a restrained luxury aesthetic (Charcoal `#292A2D`, Champagne Gold `#C6A15B`, and Polished Silver `#B9BCC4`) with Indian statutory numbering rules (`INV/YY-YY/001`), decimal-safe monetary calculations, payment recording, and print-ready PDF invoices.

---

## 1. Brand Identity & Visual Design System

- **Palette**:
  - **Charcoal (`#292A2D`)**: Used for the primary app shell sidebar, headers, and strong typography.
  - **Champagne Gold (`#C6A15B`)**: Used sparingly for key actions, status badges, and active highlights.
  - **Polished Silver (`#B9BCC4`)**: Used for borders, subtle dividers, and secondary text on dark surfaces.
  - **Warm White (`#FAF9F6`)**: Primary canvas background to prevent eye fatigue.
  - **Warm Grey (`#F1F0ED`)**: Card and surface contrasts.
  - **Soft Border (`#DAD8D2`)**: WCAG AA compliant contrast borders.
- **Typography**:
  - Headings & Monetary Numerals: **Sora** (Google Fonts) with `tabular-nums` formatting.
  - Body & Form Tables: **Inter** (Google Fonts).
  - Indian Currency Grouping: `₹1,25,000.00` with full Lakhs / Crores words conversion.

---

## 2. Implemented Features Checklist

### Core Application Shell & Navigation
- [x] **App Shell**: Desktop luxury charcoal sidebar with gold butterfly emblem, navigation badges, and mobile drawer.
- [x] **Mobile Responsive Navigation**: Safe-area bottom navigation bar with 48px touch targets for mobile devices.
- [x] **Toast Alert System**: Accessible status feedback for creations, edits, reversals, and downloads.
- [x] **Two-Step Confirmation Modals**: Guarding destructive and permanent accounting actions (finalize, cancel, delete, reset).

### Dashboard & Analytics
- [x] **Dynamic Real-Time Stat Cards**: Total Billed, Total Received, Pending Receivables, and Overdue Balance computed directly from live data records.
- [x] **Cash Flow Distribution Bar**: Visual proportion of Received vs Pending vs Overdue balances.
- [x] **Due in 7 Days & Overdue Panel**: Immediate actionable overview with direct payment/view shortcuts.
- [x] **Recent Invoices Ledger**: Quick access to latest billing documents.

### Invoices & Financial Rules
- [x] **Draft Invoices**: Unassigned statutory numbers, editable line items, deletable with confirmation.
- [x] **Statutory Financial Year Numbering**:
  - `INV/YY-YY/001` (e.g., `INV/26-27/001`).
  - Follows Indian Financial Year boundaries (1 April to 31 March).
  - Sequence increments per FY and strictly preserves cancelled numbers so they are never reused.
- [x] **Irreversible Finalization**: Once finalized, line items and rates are permanently locked to preserve accounting integrity.
- [x] **Cancellation Flow**: Cancelling an invoice locks payment processing and records cancellation reason in the audit trail.
- [x] **Decimal-Safe Calculations**:
  - Subtotal, percentage discounts, round-off to nearest whole rupee.
  - Eliminates JavaScript floating-point errors (e.g. 0.1 + 0.2).
- [x] **Amount in Words**: Converts rupees and paise into Indian numbering words (Crores, Lakhs, Thousands, Hundreds).

### Payment Tracking & Ledger
- [x] **Payment Recording**: Advance, partial, and full payment entries with date, mode (Bank Transfer, UPI, Cheque, Cash, Card), and reference ID.
- [x] **Overpayment Protection**: Prevents entering amounts exceeding the current outstanding balance.
- [x] **Correction / Reversal Ready**: Payments cannot be silently deleted; reversals require justification and update invoice status immediately.
- [x] **Dynamic Status Lifecycle**: Automatic transition between `draft`, `sent`, `partially_paid`, `paid`, `overdue`, and `cancelled`.

### Outstanding Balance Statements & Reminders
- [x] **Non-Destructive Statements**: References original invoice number, total, received amount, and remaining balance without altering the original invoice.
- [x] **WhatsApp Reminder Composer**: Ready-to-copy or direct `wa.me` link with formatted agency text.
- [x] **Email Reminder Composer**: Pre-formatted mailto composer with bank details and formal breakdown.
- [x] **Printable Statement**: Dedicated print stylesheet for outstanding balance statements.

### GST Configuration (Optional / Phase 1 Ready)
- [x] **GST OFF by Default**: Invoices render as standard non-tax invoices per company registration status.
- [x] **GST Toggle & Rates**: Configurable rate (default 18%).
- [x] **Intra-State vs Interstate**: CGST + SGST (9% + 9%) for Tamil Nadu clients, IGST (18%) for out-of-state clients.
- [x] **GST Snapshotting**: Tax configuration is snapshotted into the invoice upon finalization so future rate changes never alter historical records.
- [x] **Statutory Disclaimer**: Prominently labels tax calculations as requiring CA verification before commercial filing.

### Clients & Services Management
- [x] **Clients CRUD**: Company name, contact person, phone, email, address, state, and optional GSTIN.
- [x] **Referential Deletion Protection**: Blocks deleting clients who have linked invoices; suggests deactivation instead.
- [x] **Services Catalog**: Service name, description, standard rate, and SAC code (998361).
- [x] **Quick Client Creation**: Inline modal within the invoice editor to create new clients without losing invoice drafts.

### Settings, Data Safety & Backups
- [x] **Company Profile**: Address, contact, state (Tamil Nadu), tagline, footer text.
- [x] **Bank Details**: Account name, account number, bank, branch, IFSC, and UPI ID.
- [x] **JSON Backup Export**: Download complete database as a timestamped `.json` file.
- [x] **JSON Restore & Import**: Validate schema and choose between **Merge** (safe add) and **Replace** (full overwrite).
- [x] **Demo Reset**: One-click restore to original sample seed data.

---

## 3. Implementation Status Summary

| Item | Status | Notes |
| :--- | :---: | :--- |
| Frontend Application UI & Architecture | **Implemented** | React 19 + TypeScript + Tailwind CSS |
| Financial Calculation Engine & Unit Tests | **Implemented** | 11/11 tests passing in Vitest |
| Local Storage Demo Repository | **Implemented** | Isolated behind `IInvoiceRepository` |
| GST Handling & Snapshotting | **Implemented** | OFF by default, intra/interstate aware |
| Print & Save as PDF | **Implemented** | Dedicated `@media print` layout |
| WhatsApp & Email Reminder Composer | **Implemented** | Pre-formatted templates + direct open |
| Firebase Auth & Firestore Sync | **Deferred to Phase 2** | Repository interface ready for drop-in migration |
| Automated Cron/Server Email Sending | **Deferred to Phase 2** | Manual mailto/WhatsApp supported in Phase 1 |

---

## 4. Prerequisites & Installation

### Prerequisites
- **Node.js**: Version 18.x, 20.x, or 24.x
- **Package Manager**: npm (v9+) or pnpm

### Setup Instructions

```bash
# 1. Clone or navigate to the project directory
cd "c:/Users/Admin/Desktop/invoice app"

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

The application will start on `http://localhost:5173`.

---

## 5. Verification & Testing Commands

### Run Unit Tests
```bash
npm run test
```
*Result: 11 tests passed in 30ms (Calculations, GST breakdown, Financial Year boundaries, Indian words conversion, Status transitions).*

### Run TypeScript Verification
```bash
npm run typecheck
```
*Result: `tsc --noEmit` exited with code 0 (zero errors).*

### Production Build
```bash
npm run build
```
*Result: Vite compiled 1,940 modules to `dist/` with gzip optimization.*

---

## 6. Architecture for Future Firebase Cloud Migration (Phase 2)

The application has been intentionally engineered with an isolated Data Access Layer:

```
src/
├── types/              # Domain models (Invoice, Client, Payment, Settings)
├── utils/              # Decimal-safe math & Indian numbering
├── repositories/
│   ├── types.ts        # IInvoiceRepository interface
│   └── LocalStorageRepository.ts  # Phase 1 Local storage implementation
└── context/
    └── AppContext.tsx  # Application state consuming IInvoiceRepository
```

### Steps to connect Firebase in Phase 2:
1. Create a Firebase project under the **Firebase Spark (Free)** plan.
2. Enable **Firebase Authentication** (Email/Password for Founder + Authorized user).
3. Enable **Cloud Firestore** in production mode with security rules:
   - Allow read/write only to authenticated agency users (`request.auth != null`).
4. Implement `FirestoreInvoiceRepository.ts` adhering to the `IInvoiceRepository` interface.
5. In `src/repositories/LocalStorageRepository.ts`, swap the singleton export to `FirestoreInvoiceRepository`. No presentation components will require modification.
