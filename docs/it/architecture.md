# Architettura

## Panoramica

```
┌─────────────────────────────────────────────────────────┐
│                     Telegram Bot                         │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌────────────────────┐  │
│  │  CLI     │──▶│ Bootstrap│──▶│  PTB Application   │  │
│  │  (check, │   │ (checks, │   │  (handlers, auth)  │  │
│  │  setup,  │   │  cleanup) │   └───────┬────────────┘  │
│  │  start,  │   └──────────┘           │                │
│  │  test)   │                          │                │
│  └──────────┘          ┌───────────────┼──────────┐     │
│                        │  BotHandlers   │          │     │
│                        │ ┌─────────────┴──────┐   │     │
│                        │ │  CommandHandler    │   │     │
│                        │ │  (start, help,     │   │     │
│                        │ │   new, status,     │   │     │
│                        │ │   restart)         │   │     │
│                        │ ├────────────────────┤   │     │
│                        │ │  MessageHandlers   │   │     │
│                        │ │  (text, photo,     │   │     │
│                        │ │   document, voice) │   │     │
│                        │ └────────┬───────────┘   │     │
│                        │          │               │     │
│                        │ ┌────────┴───────────┐   │     │
│                        │ │   SessionStore     │   │     │
│                        │ │   (dict in memoria) │   │     │
│                        │ └────────────────────┘   │     │
│                        └──────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐    ┌──────────────────────────┐
│  OpenCodeClient │    │    ProcessManager         │
│  (httpx)        │    │  (opencode serve subproc) │
│  - create sess  │    │  - start/stop/restart     │
│  - send msg     │    │  - health check           │
│  - delete sess  │    │  - uptime tracking        │
└────────┬────────┘    └────────────┬─────────────┘
         │                          │
         ▼                          ▼
┌──────────────────────────────────────────────┐
│              OpenCode Server                  │
│           (http://127.0.0.1:4096)             │
└──────────────────────────────────────────────┘

┌──────────────────┐
│  VoiceTranscriber │
│  (faster-whisper) │
│  - model "small"  │
│  - CPU, int8      │
│  - HF_HOME cache  │
│    in storage/    │
└──────────────────┘
```

## Componenti

### `src/config.py`
Dataclass `Config` immutabile caricato da variabili d'ambiente. Valida formato token (`\d+:[A-Za-z0-9_-]+`), parsifica interi, applica default.

### `src/security.py`
- `safe_path(filename, base_dir)` — risolve path e blocca traversal
- `is_sensitive(filename)` — verifica blocklist di pattern file sensibili

### `src/bootstrap.py`
Controlli pre-avvio:
- Validazione Python 3.12+
- Esistenza file `.env`
- Caricamento e validazione config
- Comando `opencode` in PATH
- Creazione directory storage
- Pulizia file temporanei (>1h)

### `src/cli.py`
CLI basata su argparse con subcomandi:
- `check` — bootstrap validation
- `setup` — crea `.env` e directory storage
- `start` — avvia bot
- `test` — esegue pytest con coverage

### `src/bot/app.py`
Setup PTB Application:
- Middleware auth che verifica `ALLOWED_CHAT_ID`
- Registrazione di tutti i command/message handler
- Supporto graceful shutdown

### `src/bot/handlers.py`
Tutta la logica del bot:
- 5 comandi: `/start`, `/help`, `/new`, `/status`, `/restart`
- 4 tipi messaggio: text, photo, document, voice
- Indicatore di digitazione durante l'elaborazione
- Gestione errori con messaggi per l'utente

### `src/bot/session.py`
Store sessioni in memoria (`dict[int, str]`). Nessuna persistenza.

### `src/bot/utils.py`
- `send_reply()` — divide messaggi >4096 caratteri
- Gestisce marcatori `[SEND_FILE:path]` nelle risposte

### `src/opencode/client.py`
Client HTTP asincrono per API OpenCode:
- `create_session(title, project_dir)` → POST `/session`
- `send_message(session_id, text)` → POST `/session/{id}/message`
- `delete_session(session_id)` → DELETE `/session/{id}`
- Supporto Basic Auth

### `src/process/manager.py`
Gestore asincrono del processo:
- `start()` — avvia `opencode serve`, attesa 5s, health check
- `stop()` — SIGTERM → 5s timeout → SIGKILL
- `restart()` — stop + start
- `is_healthy()` — GET `/global/health`

### `src/voice/transcriber.py`
- Init lazy `faster_whisper.WhisperModel("small", cpu, int8)`
- `HF_HOME` forzato a `storage/models/`
- `transcribe(file_path, language)` → str

## Decisioni di Progetto

| Decisione | Motivazione |
|-----------|-------------|
| Sessioni in memoria | Riavvio = stato fresco. Nessun I/O file. Più semplice. |
| Trascrizione vocale locale | Privacy. Nessuna dipendenza cloud. |
| `PYTHONPATH=src` | Evita `pip install -e .`. Packaging più semplice. |
| `safe_path()` su tutte le scritture | Difesa contro nomi file malevoli. |
| Auto-pulizia temp | Previene riempimento disco da file grandi. |
| Singolo utente (ALLOWED_CHAT_ID) | Il bot è un'interfaccia mobile personale. |
