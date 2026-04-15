# Report Implementazioni eSOLVER & Sistema Tooltip
**Data:** 14 Aprile 2026
**Oggetto:** Ottimizzazione Anagrafiche, Integrazione Logiche eSOLVER e Supporto Utente (Tooltips)

## 1. Evoluzione Anagrafica Articoli (eSOLVER Ready)
L'interfaccia di gestione articoli è stata potenziata per supportare la complessità del sistema eSOLVER, introducendo una struttura a tab per una migliore organizzazione dei dati.

### Nuove Funzionalità Logistiche
- **Tassonomia Organizzativa:** Introduzione di `Prefisso SKU`, `Gruppo`, `Macro-Famiglia` e `Famiglia`.
- **Tassonomia Tecnica:** Gestione di `Classe Tecnica` e `Sottoclasse Tecnica` per una ricerca granulare.
- **Logiche Avanzate:** 
    - Switch **Phantom (Fittizio)** per componenti di distinte basi logiche.
    - Switch **Conto Lavoro** per la gestione di lavorazioni esterne.
    - **Lead Time Offset:** Gestione dei giorni di anticipo necessari per la pianificazione.
- **Politiche di Lotto:** Supporto per `LFL` (Lotto per Lotto) e `MLS` (Lotto Minimo di Fornitura) con relativo campo quantità.
- **Multi-UM (Unità di Misura):** Gestione differenziata per *Acquisto*, *Stoccaggio* e *Consumo* con fattore di conversione integrato.

### Documental Linking
- Nuova sezione dedicata al collegamento di risorse esterne:
    - **CAD URL:** Link diretto ai disegni tecnici.
    - **Specifiche Tecniche:** Collegamento a datasheet e specifiche di prodotto.
    - **Manuale Operativo:** Link a guide e manuali d'uso.

## 2. Sistema di Tooltip Intelligente
Implementato un sistema di supporto contestuale "Cosa è, Cosa fa, Come si usa" attivo in tutta l'applicazione.

- **Copertura:** Pulsanti, Card, Campi di input, Selettori, Menu e Switch.
- **Design:** Popup sintetici in stile Neumorfico, coerenti con l'estetica dell'app.
- **Contenuto:** Ogni tooltip fornisce il titolo della funzione, una descrizione breve e istruzioni pratiche d'uso.

## 3. Ottimizzazioni UI/UX
- **Gestione Spazi:** Ottimizzati i gap (campo-campo, etichetta-campo) nelle modali per garantire la massima leggibilità senza tagli di testo.
- **Scrollbar Enhanced:** Aumentata la larghezza delle scrollbar in tutta l'applicazione (inclusa la sidebar) per facilitare l'uso con mouse e touch.
- **SKU Auto-Generation:** La logica di generazione SKU ora integra correttamente i prefissi eSOLVER e la tassonomia tecnica definita nello schema di codifica.

## 4. Integrità del Dato
I servizi di persistenza (**Google Sheets** e **Supabase**) sono stati aggiornati per mappare e salvare correttamente tutti i nuovi campi eSOLVER, garantendo la continuità del dato tra le diverse sessioni.

---
*Certificato di Compliance: Le modifiche sono state testate per coerenza e robustezza sistemica.*
