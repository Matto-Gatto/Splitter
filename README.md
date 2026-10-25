# Folio

Web app in italiano per suddividere libri PDF ed EPUB in capitoli e paragrafi. Tutta l'elaborazione avviene nel browser.

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
- Ricostruzione delle righe per coordinate, paragrafi dai rientri e dagli spazi, ricomposizione delle parole con trattino a fine riga, prosecuzione su pagine della stessa lingua, filtro intestazioni e note facoltative.
- Percorso libro/parte e riferimenti alle pagine PDF nei paragrafi e nell'esportazione JSON.
- Revisione dell'indice, ricerca, selezione, rinomina, divisione a inizio paragrafo e unione.
- ZIP con capitoli TXT, Markdown o JSON, paragrafi TXT e indice JSON.
- Esportazione PDF con elenchi di pagine anche non consecutive: una vista italiana non include le pagine inglesi. Le pagine condivise da sezioni consecutive compaiono in entrambi i file; testo e note delle pagine originali non vengono modificati.
- Libro dimostrativo esplicitamente indicato come esempio.

## Limiti

I PDF devono contenere testo estraibile: OCR e correzione degli errori OCR non inclusi. EPUB protetti da DRM non supportati. La divisione automatica PDF e il rilevamento italiano/inglese dipendono dall'impaginazione e vanno verificati; i testi con più lingue nella stessa pagina o colonne complesse richiedono revisione. Il rilevamento delle note è euristico. Cambiare lingua o inclusione delle note ricostruisce l'indice, previa conferma se sono presenti modifiche manuali. I capitoli PDF sulla stessa pagina non si possono separare conservando le pagine originali; in quel caso usare la divisione testuale. I libri restano in memoria fino alla chiusura della pagina, senza salvataggio persistente. I caratteri web sono caricati da Google Fonts; il contenuto dei libri non viene trasmesso.

## Verifica su un PDF locale

```sh
node tests/analyze-book.mjs /percorso/libro.pdf /percorso/report.json
```

Il report contiene statistiche e titoli, senza il testo integrale. Il PDF e il report non devono essere aggiunti al repository né al sito.
