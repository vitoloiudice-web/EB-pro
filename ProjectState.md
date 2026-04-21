# Project State

## Session Info
- **Last Update**: 2026-04-21
- **Status**: Production Ready - Stabilized UI & Core Workflows

## Current Architecture
- **Frontend**: React 19+ + Vite + Tailwind CSS 4.0
- **Backend Services**: 
  - `server.ts`: Express 5.x server serving static assets and handling email APIs.
  - `firestoreService`: Primary data source (Firebase Firestore Enterprise).
  - `googleSheetsService`: Legacy/Fallback data source.
  - `geminiService`: Integration with Google Gemini API via `@google/genai` SDK.
- **State Management**: React `useState` + Local Component State + Custom Hooks (`usePaginatedData`).
- **Data Persistence**: Firebase Firestore.
- **Email System**: Nodemailer via Gmail SMTP (App Passwords).
- **PDF Infrastructure**: jsPDF + autoTable for professional document generation.

## Key Components
- **Dashboard**: Strategic overview with real-time approved budget monitoring and AI insights.
- **MRPView**: Material Requirements Planning using e-Solver logic.
- **LogisticsView**: Unified order management, tracking, and PDF generation.
- **BudgetManager**: Dynamic budget deviation workflow (Draft/Pending -> PDF -> Email -> Approval).
- **AdminProfileView**: Centralized legal, contact, and bank identity management for the procurement center.
- **MasterDataView**: Robust CRUD for Items (with taxonomic coding), Suppliers, and Customers.

## Recent Changes (Sprint 16)
- **PWA Mobile Hotfix**: 
  - Express 5.x catch-all routing fallback fixed via `app.use` instead of `app.get('*all')`.
  - Manifest `start_url` forced to absolute `/` root.
  - HTML DOM injected with `<base href="/" />` to prevent relative chunk path leaks on Mobile install.

## Recent Changes (Sprint 15)
- **Document Numbering API**: Implemented abstract layer in `documentService` supporting persistent numeric progression natively attached to Firestore Transaction counters.
- **Persistent PDF Backups**: Auto-archival of `.pdf` byte-codes within Firestore via specific `generated_documents` audits registry.
- **Sandbox Ephemeral Mode**: 
  - Complete routing bypass in Sandbox environment preventing pollution of production Firebase database.
  - Volatile caching pattern via browser SessionStorage specifically injected for sequential simulation matching "Exit Sandbox" volatile lifecycle constraints.

## Pending Tasks
- [ ] Implement advanced analytics in `BusinessIntelligenceView` for multi-year trends.
- [ ] Add bulk import/export for price lists.
- [ ] Optimize Firestore composite indices for complex BI queries.

## Notes
- **Caveman Logic**: AI prompts and communication follow a telegrafic, high-density style for token efficiency.
- **Security**: Security Rules are in place; Admin access restricted via Firestore rules.
- **Environment**: Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` for email features.
- **Design**: The application uses a "Neomorphism" design style.
- **Data Facade**: `dataService` acts as a facade, currently prioritizing Firestore (`USE_FIRESTORE = true`).
- **Standard Hooks**: `usePaginatedData` is the standard hook for all paginated lists.
