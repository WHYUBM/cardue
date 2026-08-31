# 0008 - Scopo del progetto e criterio di scelta tecnica

## Stato

Accettato

## Contesto

Il progetto è nato con **due** scopi dichiarati: costruire un'applicazione utile
per le scadenze dell'auto, e servire da esercizio per imparare strumenti diffusi
in ambito professionale, con annesso valore di portfolio. Il secondo scopo è
scritto in ADR 0001 ed è stato usato come criterio dirimente in almeno quattro
decisioni successive: ADR 0002 (VPS gestito a mano invece di una piattaforma
managed), ADR 0005 (React Router al posto di TanStack Router), ADR 0006
(TypeORM al posto di Prisma o Drizzle) e ADR 0007 (dove è stato pesato in
entrambe le direzioni).

Quel secondo scopo **non regge più**, per una ragione concreta: il codice è
scritto da Claude Code, non a mano. Un criterio che diceva «scegli lo strumento
che conviene aver imparato» presuppone che scriverlo sia l'occasione di
impararlo. Qui non lo è: chi dirige il progetto ne definisce i requisiti,
sceglie fra le alternative e verifica il risultato, ma non ne scrive il codice —
e trattandosi di un progetto personale e non professionale, non c'è una ragione
esterna che renda quell'apprendimento un obiettivo.

Il problema pratico che ne deriva non è cosmetico. Le decisioni tecniche
richiedono un criterio per rompere i pareggi, e togliendo quello didattico
resterebbe un vuoto: senza un sostituto, ogni scelta futura fra due strumenti
equivalenti diventerebbe arbitraria.

## Decisione

**Lo scopo del progetto è uno solo: tenere traccia delle scadenze della propria
auto e ricevere un promemoria prima che scadano.** Non è un esercizio didattico
né un portfolio. Resta open source, non profit e personale.

**Il criterio che sostituisce quello didattico è la longevità.** A parità di
qualità, si sceglie ciò che ha più probabilità di funzionare ancora fra due
anni, con un solo manutentore e lunghi periodi di inattività. In concreto,
in ordine di peso:

1. **Poche dipendenze.** Ogni pacchetto è una cosa che può rompersi, essere
   abbandonata o richiedere una migrazione. La soluzione che non aggiunge nulla
   parte avvantaggiata.
2. **Documentazione solida e progetto vivo.** Non «popolare», ma leggibile senza
   ricostruire il contesto da zero dopo mesi di pausa.
3. **Reversibilità.** A parità di tutto il resto, vince ciò che è più facile
   sostituire.
4. **Introdurre le cose quando servono**, non prima: resta valido l'approccio
   walking skeleton già in uso.

**Il codice è scritto da Claude Code, e questo va dichiarato apertamente** nel
README e in questo registro delle decisioni: non è un dettaglio di processo, è
il motivo per cui questo ADR esiste.

### Che effetto ha sugli ADR precedenti

**Nessuna decisione presa finora viene ribaltata**, e nessun ADR precedente
viene riscritto: sono immutabili per convenzione. Ciò che decade è una delle
motivazioni citate al loro interno, dove compaiono formule come «obiettivo
didattico» o «diffuso in azienda»: quelle frasi vanno lette come **contesto
storico**, non come criteri ancora attivi.

Le decisioni restano valide perché reggono anche sul nuovo criterio, per ragioni
già scritte negli ADR stessi:

| ADR | Reggeva anche su | Verdetto |
|---|---|---|
| 0002 — VPS + Docker | Credito Aruba già disponibile, controllo completo, stack riproducibile | Confermata |
| 0005 — React Router dichiarativo | Nessuna configurazione di build, nessuna dipendenza aggiuntiva rispetto alle alternative | Confermata |
| 0006 — TypeORM | Integrazione ufficiale con NestJS, un'unica definizione delle entità, nessun passo di codegen | Confermata, ma vedi sotto |
| 0007 — `fetch` a mano | Zero dipendenze, superficie minima: è la decisione che il nuovo criterio avrebbe preso ancora più facilmente | Confermata, rafforzata |

Su **ADR 0006** va detta una cosa onesta: con il criterio della longevità la
manutenzione storicamente irregolare di TypeORM pesa **più** di prima, e Drizzle
— scartato perché «meno diffuso in azienda» — perde la sua unica obiezione. La
decisione resta però confermata, perché cambiarla ora significherebbe riscrivere
entità, migrazioni e servizi per un vantaggio ipotetico: esattamente il genere di
migrazione che il criterio di longevità serve a evitare. Se un giorno TypeORM
diventasse un problema reale, quello sarà il momento di un ADR che lo sostituisca.

## Conseguenze

- + Il criterio di scelta resta esplicito: le decisioni future hanno ancora un
    modo di rompere i pareggi, e non diventano arbitrarie.
- + La longevità è un criterio più adatto alla realtà del progetto — personale,
    con un manutentore solo — di quanto lo fosse la diffusione professionale.
- + L'autoria è dichiarata apertamente, invece di essere lasciata intuire.
- + Alcune scelte future si semplificano: strumenti diffusi ma pesanti non hanno
    più un punto a favore automatico.
- − Gli ADR da 0001 a 0007 contengono motivazioni che non valgono più. Restano
    scritti, e chi li legge deve conoscere questo ADR per interpretarli: è il
    costo della convenzione di immutabilità, accettato in cambio di una storia
    delle decisioni che non viene riscritta a posteriori.
- − Il criterio nuovo è meno immediato da applicare: «più diffuso in azienda» si
    verifica con una ricerca, «più probabile che funzioni fra due anni» richiede
    un giudizio.
- − Sparisce una ragione che giustificava di fare le cose per esteso quando
    esisteva una scorciatoia. Se in futuro si vorrà comunque la strada lunga,
    andrà motivata su altre basi.
