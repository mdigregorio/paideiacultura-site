# Paideia — sito statico

Questa cartella contiene il sito pronto per GitHub Pages. I testi si modificano
nei file Markdown della cartella `contenuti/`; `index.html` viene poi creato
automaticamente. Stile e comportamento si trovano in `assets/`, immagini e
allegati in `assets/` e `uploads/`. Non è presente alcuna installazione WordPress.

## Visualizzare e pubblicare

Per rigenerare e controllare il sito in locale, da questa cartella eseguire:

```text
node strumenti/genera.mjs
node strumenti/verifica.mjs
```

Non servono database, PHP, pacchetti o dipendenze esterne. Dopo la generazione si
può aprire `index.html` nel browser. Le istruzioni editoriali sono in
`contenuti/README.md`.

Caricare **il contenuto di questa cartella** nella radice del repository, inclusi
`.github/`, `contenuti/`, `strumenti/`, `modello.html`, `assets/` e `uploads/`.
In **Settings → Pages → Build and deployment → Source** scegliere **GitHub
Actions**. A ogni modifica del ramo `main`, il flusso in
`.github/workflows/pubblica.yml` rigenera, verifica e pubblica il sito.

Le risorse usano percorsi relativi, quindi la pagina funziona anche sotto il
percorso di un repository. Il dominio personalizzato si configura separatamente
nelle impostazioni di GitHub Pages.

Non caricare `backup-wordpress`: il backup e il database non fanno parte del sito.

## Contenuti e revisione editoriale

- Un'unica pagina: manifesto, associazione, formazione, convegni, archivio, contatti.
- I documenti storici mantenuti nella versione modificata sono separati in
  `contenuti/archivio/` e pubblicati in pannelli espandibili. Le ancore aprono
  automaticamente il documento collegato quando JavaScript è attivo.
- Il manifesto duplicato nel database è stato riunito nella versione della home.
- I dati del direttivo e dei soci provengono dal contenuto del 2018. La data è resa
  esplicita: occorre fornire le informazioni aggiornate per presentarli come attuali.
- Il modulo WordPress non è trasferibile senza un servizio di invio. Per ora
  rimane il collegamento Facebook originale. Si può aggiungere un indirizzo email
  pubblico con un semplice collegamento `mailto:`.
- Tre immagini remote non erano nel backup e non sono caricate: `logo_ais.gif`,
  `arco_porta.jpg`, `gregoriosoldivieri.jpg`, originariamente su me-teor.it.
- I documenti storici conservano i riferimenti originali, incluse vecchie tariffe,
  recapiti e tabelle nominative di partecipanti. Sono marcati come archivio.
- Il programma del convegno del 2017 ora punta al file `2017-convegno-asl.pdf`
  presente nel backup, invece del PDF del 2011 collegato per errore nell'originale.

I collegamenti interni nei testi sono stati convertiti in ancore. Le richieste
provenienti dall'esterno ai vecchi URL WordPress richiedono ancora una strategia
di reindirizzamento, da definire insieme alla destinazione di pubblicazione.

## Accessibilità e riservatezza

HTML semantico con lingua italiana, titoli gerarchici, salto al contenuto,
controlli nativi, focus visibile, menu da tastiera e supporto al movimento ridotto.
Il contenuto rimane consultabile senza JavaScript; menu e pannelli usano una
base HTML funzionante. Nessun cookie, archivio nel browser, analitica, font remoto,
video incorporato o widget social. I collegamenti esterni si aprono normalmente
nella stessa scheda e i servizi esterni applicano le proprie condizioni.

I PDF/DOC originali sono mantenuti come documenti scaricabili; la loro accessibilità
interna non è stata corretta o certificata. Le verifiche del sito non equivalgono
a una certificazione completa di conformità WCAG né a una verifica con ogni lettore
di schermo. Le eventuali politiche dell'hosting vanno controllate dopo la pubblicazione.
