# Folio

Web app in italiano per suddividere libri PDF ed EPUB in capitoli e paragrafi intesi come **sottosezioni con titolo o numero**. I capoversi tipografici restano nel testo di ciascuna sottosezione. Tutta l'elaborazione avviene nel browser.

## Avvio

Richiede Node.js 22 o successivo.

```sh
npm install
npm run dev
```

`npm run build` crea il sito statico in `dist`. `npm test` verifica le funzioni di segmentazione. `node tests/fixtures.mjs` genera PDF ed EPUB sintetici per verificare l'importazione nel browser.

## Funzioni

- Indice EPUB 3, indice NCX EPUB 2, ripiego sull'ordine di lettura.
- PDF: verifica dei segnalibri (esclude etichette numeriche per pagina), lettura del sommario stampato con verifica dei titoli e ripiego sui titoli nel testo.
- Edizioni italiano/inglese a fronte: rilevamento della lingua sul corpo di ogni pagina, viste per lingua, entrambe separate e ordine originale completo. Le pagine incerte sono conservate nelle viste complete.
- Ricostruzione delle righe per coordinate; capoversi da rientri e spaziatura, con stima dei margini sull'intera pagina e compensazione dell'inclinazione della scansione. I titoli strutturali e i segni OCR isolati non sono contati come capoversi.
- Le note sono riconosciute come blocchi contigui, mantenute separate dal testo e disponibili in un riquadro dedicato e nella cartella `note/` dello ZIP. Attivare o nascondere le note non modifica i capoversi del corpo del libro, né la prosecuzione tra pagine.
- Indice gerarchico libro → capitolo/parte → sottosezione; ogni sottosezione ha una casella di selezione indipendente. Il clic conserva posizione dell'elenco, posizione della pagina e focus da tastiera.
- EPUB: indice navigabile annidato o titoli HTML h1–h4 per individuare le sottosezioni. Nei PDF si riconoscono anche sezioni numerate come `§ 3` e `1.2`.
- Lo ZIP contiene un file per ciascuna sottosezione selezionata, con titolo, numero e testo completo; per l'esportazione PDF sono disponibili anche i PDF delle singole sottosezioni. Le voci introduttive prive di sottosezioni restano testi completi senza divisioni inventate.
- Percorso libro/parte e riferimenti alle pagine PDF nei paragrafi e nell'esportazione JSON.
- Revisione dell'indice, ricerca, selezione, rinomina, divisione a inizio paragrafo e unione.
- ZIP con capitoli TXT, Markdown o JSON, paragrafi TXT e indice JSON.
- Esportazione PDF con elenchi di pagine anche non consecutive: una vista italiana non include le pagine inglesi. Le pagine condivise da sezioni consecutive compaiono in entrambi i file; testo e note delle pagine originali non vengono modificati.
- Libro dimostrativo esplicitamente indicato come esempio.

## Limiti

I PDF devono contenere testo estraibile: OCR e correzione degli errori OCR non inclusi. EPUB protetti da DRM non supportati. La divisione automatica PDF e il rilevamento italiano/inglese dipendono dall'impaginazione e vanno verificati; i testi con più lingue nella stessa pagina o colonne complesse richiedono revisione. Il rilevamento delle note è euristico. Cambiare lingua ricostruisce l'indice, previa conferma se sono presenti modifiche manuali. Mostrare o nascondere le note conserva le correzioni ai capoversi. I capitoli PDF sulla stessa pagina non si possono separare conservando le pagine originali; in quel caso usare la divisione testuale. I libri restano in memoria fino alla chiusura della pagina, senza salvataggio persistente. I caratteri web sono caricati da Google Fonts; il contenuto dei libri non viene trasmesso.

## Verifica su un PDF locale

```sh
node tests/analyze-book.mjs /percorso/libro.pdf /percorso/report.json
```

Il report contiene statistiche e titoli, senza il testo integrale. Il PDF e il report non devono essere aggiunti al repository né al sito.
