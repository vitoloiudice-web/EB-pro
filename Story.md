# EB-pro Project Story & Changelog

Documento consolidato evoluzione ERP "EB-pro" (Easy Buy procurement).

## 1. Architettura Core
- **Stack:** React 19+, Vite, Tailwind 4.0, Firebase (Firestore Enterprise + Auth).
- **Backend:** Express 5.x (Static assets, Email APIs via Gmail SMTP).
- **AI:** Gemini 3.1 Pro/Flash (@google/genai) per Scouting e Smart Import.
- **Design:** Neomorphism / Soft UI Style.

## 2. Changelog Sincronizzato (Cronologia Sprints)

### Aprile 2026: Fondamenta e Stabilità
- **07/04:** Rifattorizzazione Single-Tenant (Centrale Acquisti). Stabilizzazione Scouting AI (rimozione loop infiniti) e guardie `client` su servizi.
- **14/04 (eSOLVER):** Integrazione tassonomia eSOLVER (SKU, Gruppi, Famiglie, Lead Time). Sistema Tooltip Neumorfico "Cosa è, Cosa fa".
- **17/04:** Workflow Budget. Salvataggio Firestore (`APPROVED`/`PENDING`). Generazione PDF Contratti/Richieste e invio email automatico.
- **21/04 (Fase Stabilità):** Fix focus input in `AdminProfileView`. Isolamento Sandbox con `SessionStorage`. Fix PWA (Service Worker, Manifest Mobile) e routing fallback Express.
- **27/04:** Mappatura Macrofamiglie/Famiglie dinamica. Migrazione Auth da Google a Email/Password. Sincronizzazione dati Prod -> Sandbox. Gestione limiti Firestore (taglio PDF > 1MB).
### Maggio 2026: Automazione e Raffinatezza
- **02/05 (Bulk & AI):** Import/Export Excel con controllo anti-duplicato (SKU/Ragione Sociale). **Smart Import AI**: Analisi datasheet PDF/Immagini via Gemini per pre-compilazione anagrafica.
- **05/05 (Persistence & Layout):** 
  - Fix persistenza Sandbox via `localStorage` (evita reset su refresh).
  - Fix bug refresh `usePaginatedData` su cambio Tab/Ambiente.
  - Fix bug Firestore (eliminazione `id: undefined` e protezione `serverTimestamp`).
  - Normalizzazione input (Regione ITA, Prov MAIUSCOLE, Tel +39).
  - Raffinamento PDF: Logo EB-Pro, Dati fiscali e Regime (Split Payment) in header.
  - Raffinamento Contratti: Clausole esclusiva/saving e Firmatari (Vito Loiudice vs Partner).
  - Estensione layout Contratti ai Fornitori (Reciproco Vantaggio).
  - Consolidamento documentazione (.md).

## 3. Stato Attuale
- [x] CRUD Firestore stabile (Anagrafiche, Documenti, Budget).
- [x] PWA funzionante su Android/iOS.
- [x] Workflow documentale completo (PDF + Email).
- [x] AI Agent integrato per data-entry e scouting.
- [x] Sandbox blindata per test volatili.

--- 
*Ultimo aggiornamento: 2026-05-05. Consolidamento log.*
