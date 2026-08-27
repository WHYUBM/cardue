# Architecture Decision Records (ADR)

Questa cartella raccoglie le **decisioni architetturali** del progetto: cosa è
stato scelto e — soprattutto — **perché**. Ogni ADR è un file breve, numerato in
modo progressivo e immutabile: una decisione presa non si riscrive, semmai la si
supera con un nuovo ADR che la sostituisce.

## Perché scriverli

Quando torni sul progetto dopo mesi (o quando ci arriva qualcun altro), la
domanda ricorrente è «ma perché avevo scelto X invece di Y?». L'ADR conserva
quella risposta accanto al codice, sotto version control.

## Convenzioni

- File: `NNNN-titolo-in-kebab-case.md` (es. `0001-scelta-dello-stack.md`)
- Numerazione progressiva a partire da `0001`
- Ogni ADR ha uno **stato**: `Proposto` · `Accettato` · `Superato da 00NN` · `Deprecato`
- Per creare un nuovo ADR, copia [`0000-template.md`](0000-template.md)

## Indice

| N.   | Titolo                                                             | Stato     |
|------|--------------------------------------------------------------------|-----------|
| 0001 | [Scelta dello stack tecnologico](0001-scelta-dello-stack.md)       | Proposto  |
| 0002 | [Deploy su VPS Aruba con Docker](0002-deploy-vps-aruba-docker.md)  | Accettato |
| 0003 | [Web Push per le notifiche di scadenza](0003-web-push-notifiche.md)| Accettato |
| 0004 | [Sorgente dell'anagrafica marca-modello](0004-sorgente-anagrafica-marca-modello.md) | Proposto |
