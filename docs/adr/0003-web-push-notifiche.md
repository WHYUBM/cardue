# 0003 - Web Push (VAPID) per le notifiche di scadenza

## Stato

Accettato

## Contesto

Il cuore dell'app sono i promemoria di bollo, assicurazione, revisione e
tagliando. Servono notifiche che raggiungano l'utente **anche con l'app chiusa**,
inviate in base a scadenze future.

Alternative considerate:

- **Email**: affidabile ma meno immediata, richiede un servizio di invio.
- **SMS**: costo per messaggio, non sostenibile per un progetto non profit.
- **Web Push**: gratuita e integrata nella PWA.

## Decisione

Usare **Web Push con chiavi VAPID**. Un **cron giornaliero** lato backend
controlla le scadenze imminenti e invia le notifiche alle subscription
registrate dai browser degli utenti.

## Conseguenze

- + Gratuita e integrata nativamente nella PWA.
- + Nessun costo ricorrente (a differenza degli SMS).
- − Su **iOS** funziona solo da **iOS 16.4** e solo se la PWA è stata aggiunta
    alla schermata home. Su Android/Chrome nessuna limitazione.
- − Richiede HTTPS (già previsto dall'ADR 0002).
- − Va gestito lo scheduler e il ciclo di vita delle subscription (che possono
    scadere o essere revocate dal browser).
