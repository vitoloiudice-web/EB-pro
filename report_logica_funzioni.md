# Report Agente 2: Analisi Logica e Funzioni

**Stato**: 🔴 Critico
**Data**: 12/01/2026

## Panoramica
L'analisi funzionale ha evidenziato fondamenta logiche solide nel calcolo (es. MRP), ma **gravi lacune nella gestione dati** che compromettono l'affidabilità del sistema in produzione.

## 1. Persistenza e Sincronizzazione Dati
**Rilevazione**: Modello Ibrido "Optimistic Fallback".
- **Logica Attuale**: Il sistema tenta la scrittura su Firestore. Se fallisce, scrive su LocalStorage.
- **Problema (Critical)**: Non esiste un meccanismo di riallineamento (sync). Se un utente lavora offline (o Firestore fallisce), i dati vengono salvati localmente. Al ripristino della rete, questi dati **non vengono inviati al server** e il server sovrascrive il locale al prossimo fetch.
- **Rischio**: Perdita dati silenziosa.

## 2. Integrità Referenziale
**Rilevazione**: Mancanza di vincoli relazionali (Foreign Keys logiche).
- **Caso Specifico**: `deletePart` in `dataService.ts` ammette esplicitamente: *"In production, should also check for BOM usage before deleting"*.
- **Impatto**: Cancellare una Parte usata in una Distinta Base (BOM) corrompe silenziosamente la BOM (riferimento orfano).
- **MRP**: L'algoritmo MRP esplode la BOM cercando per SKU. Se un SKU cambia ma la BOM non viene aggiornata a cascata, l'MRP fallisce o genera dati errati.

## 3. Robustezza del Codice ("Lazy Coding")
**Rilevazione**: Uso estensivo di Mock Data mesh.
- **Analisi**: Il sistema carica dati ibridi (MOCK + Reali combinati). `fetchOrders` combina array remoti e locali duplicando la logica di filtering.
- **Gestione Errori**: Molti `try/catch` "ingoiano" l'errore (`catch (e) { ...fallback... }`) senza notificare l'utente che sta lavorando in modalità degradata.

## 4. Analisi Algoritmica (MRP)
**Rilevazione**: Buona implementazione.
- **Punto di Forza**: L'MRP usa correttamente un Mutex (`isRunningRef`) per prevenire race conditions sull'UI.
- **Debolezza**: I log dell'elaborazione sono volatili (state React). Un refresh della pagina cancella lo storico delle operazioni MRP.

## Conclusione Agente 2
La logica di business (es. calcoli MRP) è ben fatta, ma l'infrastruttura dati sottostante è pericolosa per un uso reale. È un ottimo prototipo ma un cattivo ERP di produzione.

**Voto Logico**: 5/10 (Algoritmi: 8/10, Data Safety: 2/10).
