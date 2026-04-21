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

## Recent Changes (Sprint 14)
- **UI Focus Fix**: Resolved critical "focus loss" bug in `AdminProfileView` by decoupling sub-render logic. Digitazione ora fluida.
- **React Stability**: Fixed "Controlled vs Uncontrolled" input warnings globally using fallback state patterns.
- **Email Workflow**: Implemented full lifecycle for budget approval:
  - Draft saving of deviations status 'PENDING'.
  - Automated PDF generation (jsPDF).
  - Server-side email dispatch (`nodemailer`) with attachments.
- **Production Readiness**:
  - Configured `scripts` in `package.json` for production lifecycle (`start` command).
  - Validated Express production middleware for serving SPA assets.
- **Taxonomic Coding**: Optimized `CodingSchemaModal` for Article SKU auto-generation.

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
