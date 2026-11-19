# Aggiornare il catalogo della formazione

L'Excel originale rimane fuori dal repository. Il sito usa il file pubblico
`contenuti/catalogo-formazione.json`, generato con Python 3.9 o successivo senza
installare librerie aggiuntive.

Dalla radice del sito:

```text
python strumenti/importa-formazione.py "percorso/del/file.xlsx" --report "../verifica-importazione-formazione.json"
node strumenti/genera.mjs
node strumenti/verifica.mjs
```

Caricare su GitHub il JSON aggiornato e la pagina HTML rigenerata. Il rapporto
contiene le note di lavoro dell'Excel e va conservato fuori dal repository e
dalla cartella pubblicata. L'importatore impedisce di salvarlo nel repository.

I due fogli richiesti sono `scuole` e `docenti e moduli`. Le intestazioni della
prima riga devono rimanere quelle del modello. Le righe ripetute sono conservate;
quando una città e un anno compaiono più volte, i moduli vengono collegati alla
registrazione con le stesse date. I codici pubblici distinguono le righe della
fonte (`scuola-002`, `modulo-002`): riordinare o inserire righe prima di quelle
esistenti cambia i codici, perciò gli aggiornamenti successivi vanno aggiunti
in fondo se si vogliono conservare gli stessi collegamenti.

La correzione concordata `Vietri2024` → `Vietri2004` è applicata durante
l'importazione. Per le sei registrazioni storiche 1999–2004 memorizzate con date
del 2026, sono mantenuti giorno e mese e usato l'anno della colonna `anno`.
Gli altri intervalli invertiti o con anno incompatibile vengono omessi e
segnalati nel rapporto. Le date mancanti non vengono ricostruite.

Gli stati pubblici sono `registrato`, `annullato` e `da-verificare`.
`registrato` indica che la voce compare nel programma storico e non certifica
la presenza effettiva di ogni docente. Le affiliazioni sono quelle riportate
nel programma dell'epoca. Le note redazionali non vengono copiate nel JSON;
i casi di annullamento o svolgimento incerto sono resi soltanto come stato.
