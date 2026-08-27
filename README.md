# Cardue

PWA per tenere sotto controllo le scadenze e la manutenzione della propria auto:
bollo, assicurazione, revisione, tagliando e altri interventi periodici, con
promemoria automatici prima di ogni scadenza.

Il progetto è open source, sviluppato a scopo didattico e di portfolio.

---

## ⚠️ Disclaimer

Le informazioni su scadenze, intervalli di manutenzione e interventi consigliati
hanno **carattere puramente indicativo**. Non sostituiscono il libretto di uso e
manutenzione del veicolo, il meccanico o le fonti ufficiali. Gli autori **non si
assumono alcuna responsabilità** per errori, omissioni o decisioni prese sulla
base dei dati mostrati dall'applicazione. Verifica sempre le scadenze presso le
fonti ufficiali.

---

## Funzionalità previste

- Anagrafica dei propri veicoli (marca, modello, anno, targa…)
- Scadenze per veicolo: bollo, assicurazione, revisione, tagliando
- Promemoria automatici via notifica push prima di ogni scadenza
- Database di conoscenza marca → modello con gli intervalli tipici di manutenzione
- Possibilità per gli utenti di richiedere nuovi veicoli non presenti
- Possibilità per gli utenti di contribuire con informazioni su un veicolo
- Funzione per mettere in pausa/tracciare la sospensione dell'assicurazione

## Stack tecnico

| Livello    | Tecnologia (proposta)          |
|------------|--------------------------------|
| Frontend   | React + Vite (PWA installabile)|
| Backend    | Node.js (NestJS)               |
| Database   | PostgreSQL                     |
| Notifiche  | Web Push (VAPID) + scheduler   |
| Deploy     | VPS Aruba + Docker Compose     |
| CI/CD      | GitHub Actions                 |

Le scelte tecniche e le motivazioni sono documentate negli
[Architecture Decision Records](docs/adr/README.md).

## Architettura (vista Container — modello C4)

```mermaid
graph TD
    User([Utente con auto]) -->|usa via browser/PWA| PWA[PWA React<br/>frontend installabile]
    PWA -->|API REST| API[Backend Node<br/>NestJS]
    API -->|legge/scrive| DB[(PostgreSQL)]
    Cron[Scheduler giornaliero<br/>controlla scadenze] -->|legge scadenze| DB
    Cron -->|invia| Push[Web Push / VAPID]
    Push -->|notifica| User
```

## Licenza

Questo progetto è rilasciato sotto la [MIT License](LICENSE.md).
