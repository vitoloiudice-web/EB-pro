# EB-pro Project Story & Changelog

Questo documento traccia l'evoluzione, le scelte architetturali e le implementazioni tecniche del sistema ERP "EB-pro" (Easy Buy procurement).

## 1. Contesto e Visione
**Obiettivo:** Creare una "centrale acquisti" Enterprise Multi-Azienda per il settore manifatturiero (compattatori rifiuti).
**Vincoli:**
- Database su Google Sheets (NoSQL/Relational ibrido su Drive).
- Integrazione AI (Gemini) per analytics.
- UI/UX Mobile-first, veloce e accessibile.
- Stack: React, Vite, Tailwind, Google Cloud Platform ecosystem.

---

## 2. Cronologia dello Sviluppo

### Fase 1: Setup Architetturale e Core Services
**Data:** Inizio Progetto
**Obiettivo:** Struttura base e astrazione dati.

*   **Setup Progetto:** Inizializzazione con Vite + React + TypeScript per performance elevate.
*   **Gestione Dati (DAL):** Creazione del `googleSheetsService.ts`.
    *   *Pattern:* Singleton Service.
    *   *Funzione:* Astrazione delle chiamate API Google Sheets. In fase di dev, implementazione di un sistema di **Mock Data** robusto per Articoli, Fornitori e Clienti per permettere lo sviluppo UI senza dipendenza immediata dal backend.
    *   *Multi-Tenant:* Implementata logica per cambiare `spreadsheetId` in base all'azienda selezionata (`Company` interface).
*   **Sicurezza:** Integrazione `Google Identity Services` (OAuth2) per l'autenticazione.
*   **Routing:** Gestione stato vista tramite `ViewState` (SPA senza reload).

### Fase 2: Business Intelligence e AI Integration
**Obiettivo:** Fornire valore aggiunto tramite analisi dati.

*   **Dashboard Rinnovata:**
    *   Design ispirato ad "Ant Design" ma customizzato con Tailwind.
    *   Integrazione libreria `Recharts` per visualizzazione dati (AreaChart per trend, BarChart per budget).
    *   *Activity Feed* e Widget KPI.
*   **Gemini AI Integration:**
    *   Creazione `geminiService.ts`.
    *   Ingegnerizzazione del prompt per analizzare JSON di inventario e restituire KPI strutturati (JSON Schema enforcement).
    *   Widget "AI Insight" nella dashboard per suggerimenti su rischi scorte e anomalie fornitori.
*   **Modulo BI (Business Intelligence):**
    *   Vista dedicata `BusinessIntelligenceView.tsx`.
    *   Analisi su tre assi: Performance Fornitori, Qualità/Resi, Risparmio Economico.
    *   Simulazione export reportistica (PDF/Excel).

### Fase 3: Ottimizzazione UX, Scalabilità e Accessibilità
**Obiettivo:** Rendere l'app utilizzabile in produzione su device reali.

*   **Paginazione:**
    *   Creazione componente riutilizzabile `Pagination.tsx`.
    *   Applicazione su `MRPView` e `MasterDataView` per gestire dataset > 500 righe senza lag del DOM.
*   **Accessibilità:**
    *   **Contrasto:** Revisione palette colori (passaggio da grigi chiari a `slate-600/800` per leggibilità).
    *   **Font Size:** Implementazione toggle globale (A-/A+) nella Header per utenti ipovedenti.
    *   **Scroll:** Rimozione stili "scrollbar hidden" per favorire lo scroll nativo del browser (migliore UX su mobile).
*   **Responsività:**
    *   Miglioramento delle tabelle con `overflow-x-auto` e `min-w` per evitare rotture del layout su smartphone.

### Fase 4: Modulo Logistica & Ordini (Architettura MVC)
**Obiettivo:** Gestione flussi transazionali complessi separando la logica dalla UI.

*   **Refactoring Architetturale:**
    *   Introduzione del pattern **Custom Hook Controller**.
    *   Creazione `useLogisticsController` in `LogisticsView.tsx`.
    *   *Vantaggio:* La vista (`View`) si occupa solo del rendering. Il calcolo dei totali, il filtraggio, la gestione degli stati asincroni e le azioni di business (es. `receiveGoods`) sono incapsulati nell'Hook (simil-Controller).
*   **Modellazione Dati:**
    *   Definizione interfacce `PurchaseOrder` e `LogisticsEvent`.
    *   Gestione stati complessi: `DRAFT` -> `SENT` -> `SHIPPED` -> `RECEIVED`.
*   **UI Logistica:**
    *   Tabella Ordini con indicatori di stato colorati (Badge semantici).
    *   Vista Tracking/Inbound separata.
    *   KPI cards specifici per la logistica (Valore in transito, Anomalie).

### Fase 5: Bug Fix & Resilienza
**Obiettivo:** Garantire stabilità in ambienti con restrizioni di rete (Preview Environments).

*   **Google API Error Handling:** Risolto bug `API_KEY_HTTP_REFERRER_BLOCKED`.
    *   Il servizio `googleSheetsService` ora intercetta errori 403 durante l'init di GAPI.
    *   Implementato fallback automatico su "Mock Mode" invece di crashare l'applicazione all'avvio.

### Fase 6: UI Overhaul - Neomorphism (Soft UI)
**Obiettivo:** Modernizzazione radicale dell'interfaccia utente.

*   **Design System:**
    *   Adozione dello stile **Neomorphism** (o Soft UI).
    *   Palette colori unificata: Sfondo `#EEF2F6` (Cool Gray/Blue light).
    *   Tipografia: `Inter`, colori `Slate-700` per il testo principale.
*   **Componenti:**
    *   **Card & Containers:** Utilizzo di ombre doppie (Luce/Ombra) per creare effetto estruso (`.neu-flat`).
    *   **Input & Form:** Utilizzo di ombre interne (Inset) per creare effetto incavato (`.neu-input`, `.neu-pressed`).
    *   **Bottoni:** Effetto tattile 3D che diventa "piatto" o "incavato" al click.
*   **Layout:**
    *   Rimozione della Sidebar scura standard. Ora la sidebar è integrata nel colore di sfondo principale.
    *   Tabelle riprogettate con righe "fluttuanti" su hover.

---

## 3. Stato Attuale e Prossimi Passi

### Funzionalità Completate
- [x] Multi-Company Tenant Switching.
- [x] Dashboard con Grafici e AI Insights.
- [x] MRP Engine (Calcolo fabbisogni su scorta sicurezza).
- [x] Anagrafiche (CRUD Read-only simulate).
- [x] Business Intelligence (Performance & Quality).
- [x] Logistica & Ordini (Gestione stati e tracking).
- [x] Accessibilità e Paginazione.
- [x] Gestione Errori API (Fallback Mock).
- [x] Redesign Neomorphism completo.

### Backlog Tecnico / Future Implementazioni
1.  **Google Drive Integration:** Implementare l'upload reale di PDF/DDT su cartelle Drive specifiche per azienda.
2.  **Scrittura su Fogli:** Implementare i metodi `POST/UPDATE` nel `googleSheetsService` per rendere persistenti le modifiche (attualmente in Read-Only/Mock).
3.  **Gmail API:** Generazione reale delle bozze email per gli ordini ai fornitori.
4.  **Cashing:** Implementare `localStorage` o `IndexedDB` per cache dati e funzionamento offline-first.

---
*Ultimo aggiornamento: Neomorphism UI Redesign.*