# EB-pro ERP Application Analysis Report

## Project Structure (Tree)

```
eb-pro/
├── .env.local                    # Environment variables (35 bytes)
├── .gitignore                    # Git config
├── index.html                    # Entry point HTML
├── index.tsx                     # React bootstrap
├── App.tsx                       # Main app component (239 righe)
├── types.ts                      # Type definitions (290 righe, 25+ tipi)
├── constants.ts                  # KPI/mock data
├── firebaseConfig.ts             # Firebase config
├── vite.config.ts                # Vite bundler config
├── package.json                  # Dipendenze NPM
├── tsconfig.json                 # TypeScript config
├── components/
│   ├── Dashboard.tsx             # KPI dashboard (148 righe)
│   ├── Sidebar.tsx               # Navigation menu
│   ├── TenantHeader.tsx          # Multi-tenant selector
│   ├── EVAAssistant.tsx          # AI chatbot (Gemini)
│   ├── Inventory.tsx             # Part management (892 righe) ⭐
│   ├── BillOfMaterials.tsx       # BOM hierarchy (816 righe) ⭐
│   ├── MRP.tsx                   # MRP engine (418 righe) ⭐
│   ├── Purchasing.tsx            # Order management (983 righe) ⭐
│   ├── SalesPlan.tsx             # Sales forecasting (182 righe)
│   ├── Suppliers.tsx             # SRM module (302 righe)
│   ├── Quality.tsx               # NCR management
│   ├── Analytics.tsx             # Reporting
│   ├── Settings.tsx              # Tenant config
│   └── Reports.tsx               # Placeholder (stub)
├── services/
│   ├── dataService.ts            # Data layer (665 righe) ⭐
│   └── geminiService.ts          # AI integration
└── utils/
    └── seasonalAlgorithms.ts     # MRP seasonal logic (40 righe)
```

---

## Architecture Overview

### 1. Multi-Tenant System
- **3 Tenant Hardcoded**: `main`, `logistics`, `germany`
- Filtro a runtime via prop `tenantId` e `isMultiTenant`
- Selezione tenant nella schermata di login

### 2. Data Layer (Hybrid)
- **Firebase Firestore**: tentativo primario di lettura
- **LocalStorage**: fallback attivo e persistenza locale
- Pattern: `try { Firestore } catch { localStorage }`

### 3. Application Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         App.tsx (ROUTER)                         │
│  ┌───────────┐    ┌─────────────────────────────────────────┐    │
│  │  Login/   │───▶│  Main App (Sidebar + Content)            │    │
│  │  Tenant   │    │  ├─ Dashboard                            │    │
│  │  Select   │    │  ├─ Suppliers ──┐                        │    │
│  └───────────┘    │  ├─ Inventory ──┴── Part Registry        │    │
│                   │  ├─ BOM ────────── Structure Editor      │    │
│                   │  ├─ SalesPlan ─── Forecasts              │    │
│                   │  ├─ MRP ───────── Requirement Engine     │    │
│                   │  ├─ Purchasing ── Orders + MRP Proposals │    │
│                   │  └─ Settings ──── Tenant Config          │    │
│                   └─────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Flow with Cascading Effects

### Flow #1: Sales → MRP → Purchasing

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SalesPlan     │────▶│      MRP        │────▶│   Purchasing    │
│   (Forecasts)   │     │   (Engine)      │     │   (Orders)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         ▼                      ▼                       ▼
   SalesForecast[]        MrpProposal[]         PurchaseOrder[]
   - bomId                - partSku             - vendor
   - period               - missingQty          - amount
   - quantity             - needDate            - deliveryDate
   - status               - orderByDate         - partId
```

**Cascading:**
1. `SalesPlan` → Crea `SalesForecast` con `bomId`
2. `MRP.runMRP()` → Esplode BOM, calcola fabbisogni, applica stagionalità
3. `MRP` genera `MrpProposal[]` con date ottimizzate
4. `Purchasing.executeMrpConversion()` → Converte proposta in `PurchaseOrder`

### Flow #2: Inventory → BOM → MRP Link

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Inventory     │────▶│      BOM        │────▶│       MRP       │
│   (Parts)       │     │   (Structure)   │     │   (Explosion)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         ▼                      ▼                       ▼
      Part[]              BOMItem[]              Net Requirements
   - sku                - partNumber           - stock vs safety
   - stock              - nodeType             - leadTime calc
   - safetyStock        - quantity             - seasonal adj
   - bomUsage[]         - wbs                  
```

---

## 🚨 CRITICAL ISSUES IDENTIFIED

### A. ARCHITECTURE & DATA INTEGRITY

#### A1. **No Database Transaction Support**
- **Location**: `dataService.ts` (tutte le funzioni di update)
- **Issue**: Operazioni CRUD non atomiche. Se fallisce `updateOrder` dopo `addOrder` nel frazionamento, dati inconsistenti.
- **Cascading**: Split ordini può creare ordini fantasma senza decremento originale.

#### A2. **Race Condition in MRP**
- **Location**: `MRP.tsx:52-288`
- **Issue**: `runMRP()` modifica `proposals` state mentre scorre `parts`. Se utente esegue doppio click, genera duplicati.
- **Missing**: Mutex/lock su esecuzione MRP.

#### A3. **Firebase Rules Not Enforced**
- **Location**: `firebaseConfig.ts` (API key hardcoded)
- **Issue**: Chiave API esposta nel client. Anonymous auth attivo.
- **Risk**: Qualsiasi utente può leggere/scrivere se le rules Firestore non sono restrittive.

---

### B. BUSINESS LOGIC

#### B1. **BOM Explosion Incomplete**
- **Location**: `MRP.tsx:98-111`
- **Issue**: L'esplosione BOM processa solo nodi con `nodeType === 'Component' | 'Variant' | 'Option'`. I nodi `Sub-Assembly` con figli vengono ignorati.
- **Impact**: MRP non calcola fabbisogni per sotto-gruppi con propri componenti.

**Codice Problematico:**
```typescript
bom.items.forEach(item => {
    if (item.partNumber && (item.nodeType === 'Component' || item.nodeType === 'Variant' || item.nodeType === 'Option')) {
        // Solo questi vengono processati
    }
});
```

#### B2. **Seasonal Algorithm Oversimplified**
- **Location**: `seasonalAlgorithms.ts:25-31`
- **Issue**: Controllo basato solo sul mese (`orderMonth`), non considera:
  - Date specifiche di chiusura
  - Buffer dinamici per lead time lunghi
  - Conflitti multipli (es. Ferragosto + ponte)

#### B3. **No Stock Allocation**
- **Location**: `MRP.tsx:143-148`
- **Issue**: Stock calcolato come `part.stock - blockedNCR` ma non considera:
  - Ordini cliente già confermati
  - Stock riservato ad altri BOM
  - Trasferimenti inter-tenant pendenti

---

### C. UI/UX & MAINTAINABILITY

#### C1. **Components Too Large**
| File | Lines | Complexity |
|------|-------|------------|
| `Purchasing.tsx` | 983 | ⛔ Very High |
| `Inventory.tsx` | 892 | ⛔ Very High |
| `BillOfMaterials.tsx` | 816 | ⛔ High |
| `dataService.ts` | 665 | ⚠️ Moderate |

**Recommendation**: Estrarre logica in custom hooks e componenti atomici.

#### C2. **No Loading States in Modals**
- **Location**: `Purchasing.tsx:500-761`, `Inventory.tsx:640-892`
- **Issue**: Submit form non disabilita bottoni durante save. Double-submit possibile.

#### C3. **Hardcoded Mock Data**
- **Location**: `dataService.ts:88-296`
- **Issue**: 168 righe di dati mock embedded nel service. Difficile da mantenere.
- **Recommendation**: File separati JSON o fixtures.

---

### D. MISSING FEATURES (Implied but Absent)

| Feature | Status | Notes |
|---------|--------|-------|
| Delete Part | ❌ Missing | Solo create/update |
| Delete Supplier | ❌ Missing | Solo create/update |
| Delete BOM Node | ❌ Missing | Solo edit |
| Audit Log | ❌ Missing | Nessun tracking operazioni |
| User Authentication | ⚠️ Partial | Solo anonymous auth |
| Role-Based Access | ❌ Missing | Tutti admin |
| Export PDF/Excel | ❌ Missing | Nessun export |
| Undo/Redo | ❌ Missing | Operazioni irreversibili |

---

### E. STATE MANAGEMENT

#### E1. **Prop Drilling Anti-Pattern**
- **Location**: Tutti i componenti
- **Issue**: `tenantId` e `isMultiTenant` passati manualmente a ogni view. 
- **Better**: Context API o state manager (Zustand/Redux).

#### E2. **Stale Closures Risk**
- **Location**: `MRP.tsx:55` (`addLog` closure)
- **Issue**: La funzione `addLog` cattura `setLogs` ma il loop `forEach` potrebbe non vedere gli aggiornamenti.

---

### F. TYPE SAFETY GAPS

#### F1. **Any Casts**
- **Location**: `dataService.ts:511`
```typescript
await updateDoc(partRef, data as any); // Type safety bypassed
```

#### F2. **Loose Unions**
- **Location**: `types.ts:133`
```typescript
status: 'Draft' | 'Approved' | 'Sent' | 'Closed' | 'Pending Approval' | 'Open';
```
**Issue**: 6 stati non mappati a un workflow chiaro. Manca FSM validation.

---

## Lifecycle Simulation Summary

1. **App Init** → Firebase anon auth → fallback demo mode
2. **Tenant Selection** → State update `currentTenantId`
3. **Data Fetch** → All components call `fetch*()` from `dataService`
4. **CRUD Operations** → LocalStorage write, attempt Firestore (often fails)
5. **MRP Calculation** → Batch processing, no queue system
6. **Order Generation** → Manual conversion from MRP proposals

---

## Performance Concerns

- **Re-renders**: Ogni cambio tenant triggera refresh completo di tutte le viste
- **Large Data Sets**: No pagination su tabelle (Parts, Orders, Suppliers)
- **MRP Horizon**: Fixed 6 mesi, no configurabilità
- **Chart Libs**: Recharts bundle size non ottimizzato per tree-shaking

---

## Severity Summary

| Priority | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 3 | Data integrity, BOM explosion, security |
| 🟠 High | 5 | Race conditions, missing deletes, stale state |
| 🟡 Medium | 8 | UX issues, code organization, type safety |
| 🟢 Low | 4 | Performance, documentation |

---

*Report generato dall'analisi del codebase EB-pro v2.0*
