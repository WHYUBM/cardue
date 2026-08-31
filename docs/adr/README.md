# Architecture Decision Records (ADR)

Questa cartella raccoglie le **decisioni architetturali** del progetto: cosa è
stato scelto e — soprattutto — **perché**. 

## Convenzioni

- File: `NNNN-titolo-in-kebab-case.md` (es. `0001-scelta-dello-stack.md`)
- Numerazione progressiva a partire da `0001`
- Ogni ADR ha uno **stato**: `Proposto` · `Accettato` · `Superato da 00NN` · `Deprecato`

> **Nota di lettura.** Gli ADR da 0001 a 0007 citano fra le motivazioni
> l'obiettivo di *imparare strumenti usati in azienda*. Quello scopo è decaduto:
> vedi **ADR 0008**, che lo sostituisce con il criterio della **longevità**. Le
> decisioni restano valide, ma quelle motivazioni vanno lette come contesto
> storico. Gli ADR non vengono riscritti, per la convenzione di immutabilità.

## Indice

| N.   | Titolo                                                             | Stato     |
|------|--------------------------------------------------------------------|-----------|
| 0001 | [Scelta dello stack tecnologico](0001-scelta-dello-stack.md)       | Accettato |
| 0002 | [Deploy su VPS con Docker](0002-deploy-vps-aruba-docker.md)  | Accettato |
| 0003 | [Web Push per le notifiche di scadenza](0003-web-push-notifiche.md)| Accettato |
| 0004 | [Sorgente dell'anagrafica marca-modello](0004-sorgente-anagrafica-marca-modello.md) | Proposto |
| 0005 | [Information architecture e routing del frontend](0005-information-architecture-e-routing.md) | Accettato |
| 0006 | [Accesso ai dati con TypeORM](0006-accesso-ai-dati-con-typeorm.md) | Accettato |
| 0007 | [Data fetching nel frontend](0007-data-fetching-nel-frontend.md) | Accettato |
| 0008 | [Scopo del progetto e criterio di scelta tecnica](0008-scopo-del-progetto-e-criterio-di-scelta.md) | Accettato |
| 0009 | [Autenticazione con Keycloak, in modalità BFF](0009-autenticazione-con-keycloak-bff.md) | Accettato |
| 0010 | [Local-first con sincronizzazione](0010-local-first-con-sincronizzazione.md) | Accettato |
| 0011 | [PWA e Service Worker scritto a mano](0011-pwa-e-service-worker-scritto-a-mano.md) | Accettato |
