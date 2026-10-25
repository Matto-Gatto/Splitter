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
- Segnalibri PDF, ripiego sui titoli dei capitoli nel testo.
- Revisione dell'indice, ricerca, selezione, rinomina, divisione a inizio paragrafo e unione.
- ZIP con capitoli TXT, Markdown o JSON, paragrafi TXT e indice JSON.
- Esportazione PDF per intervallo di pagine quando la struttura proviene dai segnalibri e non è stata modificata.
- Libro dimostrativo esplicitamente indicato come esempio.

## Limiti

I PDF devono contenere testo estraibile: OCR non incluso. EPUB protetti da DRM non supportati. La divisione automatica PDF dipende dall'impaginazione e va verificata. I capitoli PDF sulla stessa pagina non si possono separare conservando le pagine originali; in quel caso usare la divisione testuale. I libri restano in memoria fino alla chiusura della pagina, senza salvataggio persistente. I caratteri web sono caricati da Google Fonts; il contenuto dei libri non viene trasmesso.
