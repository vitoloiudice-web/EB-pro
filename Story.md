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
- **05/05 (Data Integrity & PDF):** 
  - Fix bug Firestore (eliminazione `id: undefined` e protezione `serverTimestamp`). 
  - Normalizzazione input: Regione/Stato a 3 lettere (ITA), Province MAIUSCOLE, numeri Telefono con prefisso +39 automatico.
  - Layout Contratti Prof: Logo EB-Pro, dettagli fiscali Centrale Acquisti, clausole gestione esclusiva e firmatari contrapposti (Vito Loiudice vs Partner).
  - Raffinamento rendering Clienti: Concatenazione Stato/Provincia e formattazione dinamica stringa pagamenti.

## 3. Stato Attuale
- [x] CRUD Firestore stabile (Anagrafiche, Documenti, Budget).
- [x] PWA funzionante su Android/iOS.
- [x] Workflow documentale completo (PDF + Email).
- [x] AI Agent integrato per data-entry e scouting.
- [x] Sandbox blindata per test volatili.

--- 
*Ultimo aggiornamento: 2026-05-05. Consolidamento log.*
