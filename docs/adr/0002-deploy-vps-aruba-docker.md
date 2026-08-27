# 0002 - Deploy su VPS Aruba con Docker

## Stato

Accettato

## Contesto

Serve un ambiente di produzione per rendere l'app disponibile ad altri utenti.
Tra gli obiettivi del progetto c'è imparare le pratiche di operations (ops) usate in azienda.

Alternative considerate: piattaforme managed (Railway, Render, Fly.io), che
semplificano il deploy ma nascondono proprio i dettagli infrastrutturali che qui
si vogliono imparare, e non sfrutterebbero il credito Aruba.

## Decisione

Deploy su un **VPS** gestito direttamente, con l'intero stack
descritto in **Docker Compose** (backend + PostgreSQL + reverse proxy).

Il reverse proxy (Caddy o Nginx) gestisce l'HTTPS con Let's Encrypt, requisito
obbligatorio per PWA e Web Push.

## Conseguenze

- + Controllo completo sulla macchina e apprendimento reale di ops (SSH,
    firewall, reverse proxy, HTTPS, gestione container).
- + Stack riproducibile con un comando grazie a Docker Compose.
- − Più manutenzione a proprio carico rispetto a una piattaforma managed
    (aggiornamenti di sistema, sicurezza, backup).
