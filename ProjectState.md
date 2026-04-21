# Project State

## Session Info
- **Last Update**: 2026-04-07
- **Status**: Active Development - Stability & Refinement Phase

## Current Architecture
- **Frontend**: React 18+ + Vite + Tailwind CSS
- **Backend Services**: 
  - `firestoreService`: Primary data source (Firebase Firestore).
  - `googleSheetsService`: Legacy/Fallback data source.
  - `geminiService`: Integration with Google Gemini API via `@google/genai` SDK.
- **State Management**: React `useState` + Local Component State + Custom Hooks (`usePaginatedData`).
- **Data Persistence**: Firebase Firestore.

## Key Components
- **Dashboard**: Main overview with AI insights.
- **MRPView**: Material Requirements Planning and shortage analysis.
- **LogisticsView**: Logistics, orders, and event tracking.
- **SupplierScoutingView**: AI-powered supplier scouting using Gemini Search Grounding.
- **BusinessIntelligenceView**: AI analysis of procurement data with Recharts visualizations.
- **SupplierQualificationView**: Vendor rating and audit management.
- **MasterDataView**: CRUD operations for Items, Suppliers, and Customers.
- **AdminProfileView**: Settings and Profile management for the "Centrale Acquisti".

## Recent Changes
- **Database Stability**: 
  - Provisioned a new Firebase project and updated `firebase-applet-config.json` with correct `projectId` and `firestoreDatabaseId`.
  - Updated `firebase.ts` to explicitly use the named `firestoreDatabaseId` during initialization.
  - Deployed updated `firestore.rules` to ensure correct permissions for the `clients` collection and sub-settings.
- **Architecture Simplification**:
  - Removed "Aziende (Tenants)" logic. The app now operates as a single "Centrale Acquisti" managed by the admin.
  - Removed `ClassificationManager` (Gestione Gerarchie) as the hierarchy is already managed within the Items (Articoli) BOM system.
  - Refactored `App.tsx` to use a single `adminWorkspace` instead of a client dropdown.
  - Updated `AdminProfileView` to serve as the global settings for the Centrale Acquisti.
- **Stability Fixes**: 
  - Resolved infinite loops in `usePaginatedData` hook by stabilizing `fetchMethod` dependency.
  - Implemented extensive guards for `client` object across all services (`dataService`, `firestoreService`) and views to prevent "Cannot read properties of undefined (reading 'id')" errors.
  - Refactored `SupplierScoutingView` to use `useCallback` for fetchers, stopping the generation of thousands of console errors in the IDE.
- **AI Enhancements**:
  - Updated `geminiService.ts` to use `gemini-3-flash-preview` and `gemini-3.1-pro-preview`.
  - Refined `scoutSuppliers` to correctly handle grounding metadata and sources.
  - Implemented AI Analysis Caching in Firestore and background updates for Dashboard.
  - Optimized AI prompts using "caveman" style for faster response times.
- **Budget Persistence**:
  - Implemented `budget_allocations` collection in Firestore.
  - Replaced mock budget logic in `BudgetManagerModal` and `Dashboard` with real persistence.
  - Added smart fallback logic (Spend + 20%) for non-allocated categories.
- **UI/UX**:
  - Improved layout and overflow handling in `SupplierScoutingView`.
  - Added conditional rendering and loading states for better resilience.
  - Clarified Supplier Rating: "Internal Rating" (1-5) is manual/subjective, while "Global Score" (0-100) is automated/objective.
  - Optimized Dashboard startup by decoupling AI analysis from main data loading.

## Pending Tasks
- [ ] Complete data integration for `BusinessIntelligenceView` (currently using some placeholder data).
- [ ] Refine `ClassificationManager` for better custom input handling.
- [ ] Implement more robust error boundaries for specific AI output rendering issues.
- [ ] Optimize Firestore queries with composite indices where necessary.

## Notes
- The application uses a "Neomorphism" design style.
- `dataService` acts as a facade, currently prioritizing Firestore (`USE_FIRESTORE = true`).
- `usePaginatedData` is the standard hook for all paginated lists.
