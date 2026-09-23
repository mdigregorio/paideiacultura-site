# Come modificare i contenuti

I testi pubblicati nel sito sono in questa cartella. Si possono modificare
direttamente da GitHub con il pulsante della matita. Dopo il salvataggio, il sito
viene rigenerato e pubblicato automaticamente.

## Quale file modificare

- `01-home.md`: apertura della pagina.
- `02-manifesto.md`: manifesto.
- `03-chi-siamo.md`: direttivo, soci e direttivi precedenti.
- `04-formazione.md` e `formazione/`: presentazione e singole iniziative.
- `05-convegni.md` e `convegni/`: presentazione e singoli convegni.
- `06-archivio.md` e `archivio/`: introduzione e documenti storici.
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

## Pubblicazione

Quando si salva una modifica nel ramo `main`, il flusso **Genera e pubblica il
sito** crea `index.html`, esegue i controlli e aggiorna GitHub Pages. Lo stato è
visibile nella scheda **Actions** del repository.
