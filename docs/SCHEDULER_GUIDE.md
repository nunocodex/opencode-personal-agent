# Scheduler Guide — Eventi Programmati

Il bot supporta **promemoria e messaggi programmati** gestiti da OpenCode in linguaggio naturale. Non serve usare comandi speciali: basta chiedere a OpenCode come faresti con una persona.

## Come funziona

Quando avvii una nuova conversazione, il bot invia automaticamente a OpenCode un set di istruzioni (system prompt) che gli spiega come usare il sistema di scheduling. Da quel momento, OpenCode può generare promemoria e messaggi ricorrenti in risposta alle tue richieste in linguaggio naturale.

## Esempi di linguaggio naturale

### Promemoria one-shot (una sola volta)

- "*ricordami tra 5 minuti di andare a letto*"
- "*tra 2 ore mandami un promemoria per la riunione*"
- "*tra 1 giorno ricordami del compleanno di Marco*"
- "*alle 15:30 ricordami di prendere le medicine*"
- "*domani alle 9:00 mandami un reminder per la call*"

### Messaggi ricorrenti

- "*ogni mattina alle 9 mandami le news della giornata*"
- "*ogni lunedì alle 10 ricordami della call di team*"
- "*ogni 30 minuti ricordami di fare una pausa*"
- "*ogni giorno alle 20:00 chiedimi come è andata la giornata*"

### Cancellazione

- "*cancella il promemoria delle 9*"
- "*elimina tutti i miei reminder*"

> **Nota:** OpenCode deciderà se generare un blocco `[SCHEDULE]` in base al contesto della conversazione. Se non chiedi esplicitamente un promemoria, non verrà creato alcun evento.

---

## Protocollo tecnico (per riferimento)

Quando OpenCode decide di creare un evento, include un blocco speciale **invisibile** nella sua risposta:

```
[SCHEDULE]
{"type":"once","when":"+5m","message":"Vai a letto!"}
[/SCHEDULE]
```

Il bot:
1. **Intercetta** il blocco nella risposta di OpenCode
2. **Crea** l'evento nello scheduler
3. **Rimuove** il blocco prima di mostrarti il testo
4. **Invia** il messaggio al momento giusto

### Formati supportati

| Tipo | Esempio | Descrizione |
|------|---------|-------------|
| **One-shot relativo** | `+5m`, `+2h`, `+1d`, `+30s` | Tra N minuti/ore/giorni/secondi |
| **Orario oggi/domani** | `15:30`, `09:00` | Se l'orario è già passato, viene programmato per domani |
| **Data e ora** | `2026-05-10 09:00` | Data e ora assolute |
| **Ricorrente daily** | `daily 09:00` | Ogni giorno alle 9:00 |
| **Ricorrente weekly** | `weekly monday 10:00` | Ogni lunedì alle 10:00 |
| **Ricorrente interval** | `every 30m` | Ogni 30 minuti |
| **Ricorrente cron** | `0 9 * * *` | Espressione cron completa |

---

## Comandi (alternativa ai messaggi naturali)

Se preferisci usare comandi espliciti:

- `/list` — Mostra tutti gli eventi attivi per la chat corrente
- `/cancel <id>` — Cancella un evento per ID (l'ID ti viene mostrato quando viene creato)

---

## Sicurezza

- Solo la chat autorizzata (`ALLOWED_CHAT_ID`) può creare e ricevere eventi programmati
- Eventi creati da chat non autorizzate vengono eliminati automaticamente
- Se il bot viene riavviato, gli eventi **persi** (che avrebbero dovuto scattare mentre il bot era offline) vengono **saltati**, non eseguiti in ritardo

---

## File di persistenza

Gli eventi programmati vengono salvati in:
```
./data/events.json
```

Il file viene aggiornato atomicamente (scrittura su file temporaneo + rinomina) per evitare corruzioni.

---

## Configurazione avanzata

Puoi configurare la lingua della trascrizione vocale (se usi i messaggi vocali) tramite variabili d'ambiente in `.env`:

```env
# Opzionale: forza la lingua per la trascrizione vocale
# Se omesso, whisper rileva automaticamente la lingua
WHISPER_LANGUAGE=it
```

Per lo scheduler non sono necessarie configurazioni aggiuntive.

---

## Limitazioni note

- **Precisione:** circa ±1 secondo per i promemoria
- **DST:** possibile scostamento di 1 ora durante i cambi di ora legale/solare
- **Offline:** eventi persi durante lo shutdown non vengono recuperati
- **Volume:** progettato per uso personale (decine di eventi, non migliaia)

---

## Esempio completo di interazione

**Utente:** ricordami tra 10 minuti di prendere il caffè

**OpenCode (risposta visibile):** Certo! Ti ricorderò di prendere il caffè tra 10 minuti.

*(Invisibile al utente, OpenCode ha generato:)*
```
[SCHEDULE]
{"type":"once","when":"+10m","message":"Ricordati di prendere il caffè! ☕"}
[/SCHEDULE]
```

**10 minuti dopo — Bot:** Ricordati di prendere il caffè! ☕

---

Per domande o problemi, consulta il [RUNBOOK](RUNBOOK.md) operativo.
