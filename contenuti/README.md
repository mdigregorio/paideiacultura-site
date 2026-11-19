# Come modificare i contenuti

I testi pubblicati nel sito sono in questa cartella. Si possono modificare
direttamente da GitHub con il pulsante della matita. Dopo il salvataggio, il sito
viene rigenerato e pubblicato automaticamente.

## Quale file modificare

- `00-news.md`: banner delle notizie in cima alla pagina.
- `01-home.md`: apertura della pagina.
- `02-manifesto.md`: manifesto.
- `03-chi-siamo.md`: direttivo, soci e direttivi precedenti.
- `04-formazione.md` e `formazione/`: presentazione e singole iniziative.
- `05-convegni.md` e `convegni/`: presentazione e singoli convegni.
- `06-archivio.md` e `archivio/`: introduzione e documenti storici.
- `catalogo-formazione.json`: catalogo di scuole e moduli ricavato dall'Excel.
- `07-contatti.md`: testo e collegamento di contatto.

La parte compresa tra le due righe `---` all'inizio di ogni file contiene i dati
brevi, per esempio titolo, data o collegamento. È in formato JSON: lasciare
virgolette, virgole e parentesi come sono e modificare soltanto i valori.

Sotto la seconda riga `---` si scrive normalmente in Markdown:

```md
Un normale paragrafo con una parola in **grassetto** e una in *corsivo*.

[Testo del collegamento](https://www.esempio.it/)

- prima voce
- seconda voce
```

Per aggiungere una nuova iniziativa o un convegno, duplicare un file simile nella
relativa sottocartella, rinominarlo mantenendo un numero iniziale progressivo e
modificarne i dati. I file sono mostrati nell'ordine alfabetico del nome.

I documenti dell'archivio derivano dal vecchio sito e possono contenere tabelle
HTML: non eliminare i tag di una tabella se non si vuole rimuoverla. Tutto il
resto è modificabile con la normale sintassi Markdown.

## Attivare o disattivare il banner delle notizie

Aprire `00-news.md` e impostare il valore `attiva`:

```json
"attiva": true
```

mostra il banner, mentre:

```json
"attiva": false
```

lo nasconde completamente senza cancellarne testi e collegamenti. Nello stesso
file si possono modificare titolo, data, luogo, link per l'iscrizione e percorso
della locandina. I campi `immagine` e `immagine_alt` controllano la fotografia
mostrata sotto data e luogo; impostando `immagine` a una stringa vuota (`""`),
la fotografia viene omessa. Caricare PDF e immagine indicati nella cartella
`uploads/` prima di attivare la notizia.

## Attivare o disattivare le sezioni

Le sezioni principali dal manifesto ai contatti hanno lo stesso interruttore
nel blocco JSON iniziale:

```json
"attiva": true
```

Per nascondere temporaneamente una sezione, impostarlo a `false` nel relativo
file e salvare il commit. Il generatore rimuove insieme la sezione, la sua voce
dal menu e gli eventuali collegamenti interni che altrimenti resterebbero
interrotti. I testi rimangono conservati nei file Markdown.

| Sezione | File |
| --- | --- |
| Manifesto | `02-manifesto.md` |
| Chi siamo | `03-chi-siamo.md` |
| Formazione | `04-formazione.md` |
| Convegni | `05-convegni.md` |
| Archivio | `06-archivio.md` |
| Contatti | `07-contatti.md` |

La home e il piè di pagina restano sempre pubblicati. Per riattivare una
sezione basta riportare `attiva` a `true`.

## Introduzione e nota delle sezioni

Negli stessi sei file, i campi `introduzione` e `nota` funzionano allo stesso
modo per ogni sezione:

```json
"introduzione": "Testo introduttivo mostrato sotto il titolo.",
"nota": "Avviso breve mostrato subito sotto l’introduzione."
```

Entrambi accettano anche la formattazione Markdown semplice, per esempio
`**grassetto**` e `[collegamenti](https://www.esempio.it/)`. Se un testo non
serve, lasciare il valore vuoto (`""`): il relativo spazio non viene creato
nella pagina. La `nota` usa lo stile evidenziato già presente in “Chi siamo”.

## Aggiornare i soci

In `03-chi-siamo.md`, ogni voce di `soci` contiene i dati di una persona:

```json
{
  "id": 45,
  "nome": "Marco Di Gregorio",
  "cognome": "Di Gregorio",
  "profilo": "https://www.iris.unisa.it/cris/rp/rp03640",
  "deceduto": false
}
```

`id` è il numero di tessera e deve restare associato alla persona anche quando
si cambia l'ordine. Non rinumerare le tessere per eliminare eventuali salti.
`cognome` comprende anche le particelle e i cognomi composti, per esempio
`Di Gregorio`, `Delli Paoli` e `Parra Saiani`. `profilo` contiene il collegamento
verificato alla pagina personale, al catalogo di ricerca o al curriculum
pubblicato su un sito universitario o dell'ente di ricerca di appartenenza;
lasciare `""` quando non disponibile.
Non inserire indirizzi email nel campo del profilo.

Per una persona scomparsa, impostare `deceduto` a `true`: il nome sarà seguito
dal simbolo †. Il campo facoltativo `ricordo` può contenere il collegamento
al ricordo pubblicato dall'ateneo, che viene aperto dal simbolo †.

La pagina mostra inizialmente l'elenco in ordine alfabetico per cognome.
Il selettore consente di passare all'ordine numerico per tessera. Senza
JavaScript, l'elenco rimane leggibile in ordine alfabetico.

## Aggiornare il catalogo della formazione

Il catalogo si apre per edizione e consente anche la consultazione per corso,
con ricerca per argomento, docente o luogo e filtri per anno e iniziativa.
I programmi storici già presenti rimangono consultabili nei documenti integrali.

Per aggiornare i dati dall'Excel usare `strumenti/importa-formazione.py`,
poi rigenerare la pagina. La procedura completa è in
`strumenti/IMPORTAZIONE-FORMAZIONE.md`. Il rapporto delle verifiche va conservato
fuori dal sito. L'Excel originale non va caricato nel repository pubblico.

Il file pubblico `catalogo-formazione.json` contiene solo i dati del catalogo.
Il file `integrazioni-formazione.json` conserva le edizioni e i corsi forniti
separatamente dall'Excel (attualmente il 2026) e i collegamenti alle locandine.
L'importatore unisce queste integrazioni ai dati dell'Excel prima di rigenerare
il catalogo. Per correggere i dati del 2026 o gli allegati, modificare questo
file sorgente e ripetere l'importazione e la generazione.

Le locandine sono in `uploads/formazione/`. Ogni documento ha i campi `titolo`
e `file`; nell'elenco `documenti` le chiavi sono i codici `origine` delle edizioni,
per esempio `Tortorella2026`. Si possono collegare più documenti alla stessa
edizione. PDF e immagini si aprono in una nuova scheda e mostrano formato e peso;
gli originali non sono ridotti o modificati. Le locandine 2015 e 2016 sono
collegate a entrambe le sedi riportate nei documenti, senza duplicare i file.

Le righe ripetute rimangono distinte. I collegamenti diretti alle singole
edizioni e ai corsi si possono condividere copiando l'indirizzo dopo averli aperti.

## Pubblicazione

Quando si salva una modifica nel ramo `main`, il flusso **Genera e pubblica il
sito** crea `index.html`, esegue i controlli e aggiorna GitHub Pages. Lo stato è
visibile nella scheda **Actions** del repository.
