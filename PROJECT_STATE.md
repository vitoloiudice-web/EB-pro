# Project State - EB-Pro

## Ultimo Aggiornamento: 07/05/2026 (Turno 18)

## Stato Corrente
Allineamento del documento su 4 pagine secondo layout stringente, sistemando slittamenti per accogliere esattamente ogni blocco nei suoi limiti fisici assecondando le istruzioni fotografiche.

### Funzionalità Implementate
- **Allineamento Dimensione Font**:
  - Ripristinata grandezza corpo carattere (`BODY_SIZE`) in corrispondenza del salto manuale istruito per il capoverso `1.5.`. Il metodo `reapplyMinimalHeader()` altera temporaneamente il contesto font a `8pt` per la testatina, per cui è stato essenziale riapplicare `BODY_SIZE` (circa 9.5pt) subito dopo la re-intestazione manuale, scongiurando il nanismo non voluto dei successivi elementi testuali su quella facciata.
- **Forzatura Distribuzione Elementi (Slittamento Pagine)**:
  - Disattivato il calcolo marginimetrico cautelativo che mandava l'Articolo 4 su Pagina 3. Adesso risiede per intero sulla Pagina 2.
  - Sgonfiato il constraint di sicurezza sul blocco della Sottoscrizione per trattenerla saldamente in Pagina 3 insieme agli Articoli 5, 6, 7, 8, e 9.
  - Svincolato del tutto l'elenco delle clausole vessatorie: possiede ora inesorabile break-line forzato sull'ultima pagina della convenzione (Pagina 4).

### Invarianti e Vincoli
- Margini: 20mm.
- Font: Helvetica.
- Colori: Pantone 648 C (Blu EB).
- Footer obbligatorio: "MOD-CTR-01 REV. 02".
