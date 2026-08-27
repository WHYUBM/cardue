# 0004 - Sorgente dell'anagrafica marca-modello

## Stato

Proposto
<!-- La strategia (seed una tantum da fonte aperta) è decisa; la fonte
     specifica è ancora da scegliere. -->

## Contesto

Serve popolare il database di conoscenza con l'elenco marca → modello. Si tratta
di un **seed una tantum**, non di un dato "live": l'elenco dei modelli è
sostanzialmente statico e va importato una volta, poi integrato nel tempo.

Alternative considerate:

- **Scraping di un portale di annunci** (es. AutoScout24): scartato. Viola quasi
  sempre i Terms of Service, è fragile (si rompe a ogni cambio di HTML) ed è
  sproporzionato per un dato disponibile già pronto e con licenza libera.
- **CarQuery API**: API gratuita senza registrazione, buona copertura, comoda.
- **Dataset CSV open su GitHub** (licenze CC0/CC-BY): semplicissimi da importare,
  ma spesso fermi agli aggiornamenti e sbilanciati sul mercato USA.
- **Wikidata** (query SPARQL): copertura globale e neutra, più lavoro iniziale.
- **NHTSA vPIC**: API governativa USA, stabilissima ma molto USA-centrica.

## Decisione

Effettuare un **import una tantum da una fonte aperta** con licenza libera
(candidate principali: CarQuery o Wikidata per la copertura europea; in
alternativa un CSV da correggere a mano). La fonte definitiva sarà scelta al
momento dell'implementazione del seed.

Il dataset iniziale viene poi **completato dagli utenti**, che possono richiedere
veicoli mancanti e contribuire informazioni.

## Conseguenze

- + Nessun rischio legale né manutenzione di scraper.
- + Base dati pronta in tempi rapidi.
- − Molte fonti sono USA-centriche: i modelli e gli allestimenti europei vanno
    integrati a mano o tramite i contributi della community.
- − Alcuni dataset non sono più aggiornati: accettabile come base di partenza.
- − La scelta della fonte definitiva resta aperta finché non si implementa il seed.
