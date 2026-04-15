**Schema di Codifica**

# Albero delle gerarchie:
0. Categoria
0. Gruppo
    1. Macrofamiglia
        2. Famiglia
            3. ITEM


# Categoria:
- (D) Diretto
- (I) Indiretto

# Gruppo:
- (VA) Cassa/Vasca
- (TE) Telaio
- (KO) Compattazione
- (CA) Cabina

# Macrofamiglia:
- (CAR) Carpenteria
- (TOR) Torneria
- (OLE) Oleodinamica
- (ELE) Elettrica
- (PNE) Pneumatica
- (GOM) Gomma
- (FER) Ferramenta
- (VER) Verniciatura
- (FIN) Finiture

# Famiglia (codice numerico a seconda della Macrofamiglia):
- (CAR) -> * (00) Laminato
- (CAR) -> * (01) Profilato
- ...
- (OLE) -> * (99) Olio

# ITEM:
- articolo 1 (SKU X.XX.XXX.00.000-X.0)
- articolo 2 (SKU Y.YY.YYY.00.000-Y.0)
- ...
  

**Alberatura categorie**

1. Diretto
    2. (CAR) Carpenteria
        3. Laminato
        3. Profilato
        3. ...
    2. (TOR) Torneria
        3. Spinotto
        3. Flangia
        3. ...
    2. (OLE) Oleodinamica
        3. Cilindro
        3. Distributore
        3. Pompa
        3. PTO
        3. Centralina
        3. Valvola
        3. Filtrazione
        3. Serbatoio
        3. Raccorderia
        3. Tubo
        3. Olio
        3. ...
    2. (ELE) Elettrica
        3. Cavo
        3. Logica
        3. IOT 4.0
        3. Illuminazione
        3. Audio-Video
        3. Componente
        3. Minuteria
        3. ...
    2. (PNE) Pneumatica
        3. Attuatore
        3. Filtrazione
        3. Componente
        3. ...
    2. (GOM) Gomma
        3. Battuta
        3. Protezione
        3. Copertura
        3. ...
    2. (FER) Ferramenta
        3. Vite
        3. Bullone
        3. Dado
        3. Minuteria
        3. ...
    2. (VER) Verniciatura
        3. Smalto
        3. Catalizzatore
        3. Solvente
        3. Sigillante
        3. Stucco
        3. ...
    2. (FIN) Finitura
        3. Carrozzeria
        3. Segnaletica
        3. ...

1. Indiretto
    2. (CAN) Canone
        3. Energia
        3. Finanziario
        3. Fabbricato
        3. Macchinario
        3. ...
    2. (STR) Strumentale
        3. Preparazione
        3. Utensile
        3. Sicurezza
        3. Formazione
        3. DPI
        3. Stoccaggio
        3. Movimentazione
        3. ...