# Architettura

Documentazione architettura di sistema per il bot Telegram OpenCode Personal Agent.

## Panoramica

```
┌─────────────────────────────────────────────────────────────────┐
│                         Telegram Bot                              │
│                                                                   │
│  ┌──────────┐    ┌──────────┐    ┌────────────────────────┐     │
│  │   CLI    │───▶│ Bootstrap│───▶│   PTB Application      │     │
│  │ (check,  │    │ (checks, │    │   (app.py)             │     │
│  │  setup,  │    │ cleanup) │    └──────────┬─────────────┘     │
│  │  start,  │    └──────────┘               │                   │
│  │  test)   │                               │                   │
│  └──────────┘    ┌──────────────────────────┼──────────┐        │
│                  │      BotHandlers          │          │        │
│                  │  ┌───────────────────────┴───────┐   │        │
│                  │  │    CommandHandler             │   │        │
│                  │  │    (start, help, new,         │   │        │
│                  │  │     status, restart)          │   │        │
│                  │  ├───────────────────────────────┤   │        │
│                  │  │    Text Handler               │   │        │
│                  │  │    (on_text)                  │   │        │
│                  │  └──────────────┬────────────────┘   │        │
│                  │                 │                    │        │
│                  │  ┌──────────────┴────────────────┐   │        │
│                  │  │    MediaHandler               │   │        │
│                  │  │    (photo, document, voice)   │   │        │
│                  │  └───────────────────────────────┘   │        │
│                  │                                      │        │
│                  │  ┌──────────────┐ ┌──────────────┐   │        │
│                  │  │ SessionStore │ │ Utils        │   │        │
│                  │  │ (dict mem)   │ │ (send_reply, │   │        │
│                  │  │              │ │  check_auth, │   │        │
│                  │  │              │ │  typing)     │   │        │
│                  │  └──────────────┘ └──────────────┘   │        │
│                  └───────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│   OpenCodeClient     │    │    ProcessManager            │
│   (httpx async)      │    │  (opencode serve subprocess) │
│   - create session   │    │  - start/stop/restart        │
│   - send message     │    │  - health check              │
│   - delete session   │    │  - uptime tracking           │
└──────────┬───────────┘    └──────────────┬───────────────┘
           │                               │
           ▼                               ▼
┌─────────────────────────────────────────────────────────┐
│                   OpenCode Server                        │
│              (http://127.0.0.1:4096)                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Configurazione Agenti                │   │
│  │  ┌────────────────────────────────────────────┐  │   │
 │  │  │  .opencode/opencode.json                   │  │   │
 │  │  │  - default_agent: build                    │  │   │
 │  │  │  - agenti scoperti da .agents/agents/       │  │   │
 │  │  │  - 10 agenti (build, plan, review, ecc.)  │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Plugin                                    │  │   │
│  │  │  - superpowers                             │  │   │
│  │  │  - @asidorenko/openslimedit                │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Skill (auto-allow)                        │  │   │
│  │  │  - python, react-next, flutter, go, ecc.   │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  VoiceTranscriber    │
│  (faster-whisper)    │
│  - model "small"     │
│  - CPU, int8         │
│  - HF_HOME cache     │
│    in storage/       │
└──────────────────────┘
```

## Dettaglio Componenti

### `src/config.py`

Dataclass `Config` immutabile caricata da variabili d'ambiente.

**Responsabilità:**
- Parsificare variabili d'ambiente
- Validare formato token (`\d+:[A-Za-z0-9_-]+`)
- Applicare default per valori opzionali
- Congelare configurazione dopo caricamento

**Valori configurazione:**
- `telegram_bot_token` — Obbligatorio
- `allowed_chat_id` — Obbligatorio
- `opencode_project_dir` — Obbligatorio
- `opencode_server_url` — Obbligatorio
- `opencode_server_username` — Default: `opencode`
- `opencode_server_password` — Opzionale
- `whisper_language` — Default: `auto`
- `max_file_size` — Default: 52428800 (50MB)
- `rate_limit_seconds` — Default: 2.0

### `src/security.py`

Utility sicurezza per operazioni file.

**Funzioni:**
- `safe_path(filename, base_dir)` — Risolve path e blocca traversal
- `is_sensitive(filename)` — Verifica contro blocklist file sensibili

**Pattern blocklist:**
- `.env`, `.env.local`, `.env.*`
- `.ssh/`, `id_rsa`, `id_ed25519`, `authorized_keys`
- `.pem`, `.key`, `.p12`, `.pfx`
- `credentials`, `secrets`, `secret`, `token`
- `.aws/`, `.docker/`, `.netrc`, `.htpasswd`

### `src/bootstrap.py`

Controlli pre-avvio all'avvio.

**Controlli:**
- Validazione Python 3.12+
- Esistenza file `.env`
- Caricamento e validazione config
- Comando `opencode` in PATH
- Creazione directory storage
- Pulizia file temporanei (>1h)

### `src/cli.py`

CLI basata su argparse con subcomandi.

**Comandi:**
- `check` — Esegui bootstrap validation
- `setup` — Crea `.env` e directory storage
- `start` — Avvia bot
- `test` — Esegui pytest con coverage

### `src/bot/app.py`

Setup PTB Application.

**Responsabilità:**
- Creare istanza `Application` con token bot
- Registrare tutti i command e message handler
- Collegare `BotHandlers` (comandi + testo) e `MediaHandler` (foto, documenti, voce)
- Configurare supporto graceful shutdown

### `src/bot/handlers.py`

Logica bot per comandi e messaggi di testo.

**Command handler:**
- `/start` — Messaggio benvenuto
- `/help` — Aiuto dettagliato
- `/new` — Pulisci sessione
- `/status` — Stato server
- `/restart` — Riavvia server

**Handler testo:**
- Inoltra testo a OpenCode tramite API sessione

**Funzionalità:**
- Rate limiting tra messaggi
- Gestione errori con messaggi per utente
- Delega foto/documenti/voce a MediaHandler

### `src/bot/media_handler.py`

Gestisce messaggi foto, documento e voce.

**Handler:**
- Foto — Scaricate in `storage/uploads/`, inviate all'agente `file-parser` via CLI
- Documenti — Scaricati in `storage/uploads/`, inviati all'agente `file-parser` via CLI
- Voce — Scarica OGG, trascrive con VoiceTranscriber, inoltra testo alla sessione

**Funzionalità:**
- Controllo dimensione file
- Indicatore digitazione durante elaborazione
- Auto-pulizia file dopo elaborazione
- Rilevamento risposte JSON (fallback plain text)

### `src/bot/utils.py`

Funzioni utility per operazioni bot.

**Funzioni:**
- `send_reply()` — Divide messaggi >4096 caratteri, quota originale sul primo chunk
- `check_auth()` — Verifica utente contro `ALLOWED_CHAT_ID`
- `typing_scope()` — Context manager async per indicatore digitazione
- Rilevamento JSON — Invia risposte JSON come plain text

### `src/bot/session.py`

Store sessioni in memoria.

**Implementazione:**
- `dict[int, str]` mapping chat_id a session_id
- Nessuna persistenza
- Stato fresco al riavvio

### `src/bot/utils.py`

Funzioni utility per operazioni bot.

**Funzioni:**
- `send_reply()` — Divide messaggi >4096 caratteri, quota originale sul primo chunk
- Rilevamento JSON — Invia risposte JSON come plain text

### `src/opencode/client.py`

Client HTTP asincrono per API OpenCode.

**Metodi:**
- `create_session(title, project_dir)` — POST `/session`
- `send_message(session_id, text)` — POST `/session/{id}/message`
- `send_message_cli(text, file_paths)` — Spawna `opencode run --agent file-parser` in CLI per analisi file (sessione disposable)
- `delete_session(session_id)` — DELETE `/session/{id}`

**Funzionalità:**
- Client httpx async
- Supporto Basic Auth
- Gestione risposta streaming
- Parsing eventi (text, tool-use, errori)
- Parsing JSON stream per risposte CLI

### `src/process/manager.py`

Gestore subprocess asincrono per server OpenCode.

**Metodi:**
- `start()` — Spawn `opencode serve`, attesa 5s, health check
- `stop()` — SIGTERM → timeout 5s → SIGKILL
- `restart()` — Stop + start
- `is_healthy()` — GET `/global/health`
- `uptime()` — Track uptime server

**Health check:**
- HTTP GET a `/global/health`
- Timeout 5 secondi
- Logica retry all'avvio

### `src/voice/transcriber.py`

Trascrizione vocale locale usando faster-whisper.

**Funzionalità:**
- Lazy-init `WhisperModel("small", cpu=True, compute_type="int8")`
- `HF_HOME` forzato a `storage/models/`
- `transcribe(file_path, language)` → str

**Modello:**
- Dimensione: ~240MB (small)
- Quantizzazione: int8
- Esecuzione: Solo CPU

### `.opencode/opencode.json`

Configurazione agenti OpenCode (snella — nessuna definizione agente inline).

**Struttura:**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode-go/deepseek-v4-flash",
  "default_agent": "build",
  "plugin": ["superpowers", "@asidorenko/openslimedit"],
  "permission": {
    "skill": { "*": "allow" }
  }
}
```

**Componenti:**
- **Agente predefinito:** `build`
- **10 agenti:** Definizioni in `.agents/agents/*.md` (scoperte tramite junction)
- **2 plugin:** superpowers, openslimedit
- **Skill:** Auto-allow tramite permission wildcard

### `.agents/agents/`

File definizione agenti canonici (formato cross-tool compatibile: frontmatter YAML + corpo prompt opzionale).

**Contenuti:**
| File | Modello | Ruolo |
|------|---------|-------|
| `build.md` | deepseek-v4-flash | Implementazione (default) |
| `plan.md` | deepseek-v4-flash | Pianificazione standard |
| `ultraplan.md` | deepseek-v4-pro | Pianificazione multi-fase approfondita |
| `debug.md` | deepseek-v4-pro | Analisi causa radice |
| `review.md` | deepseek-v4-pro | Revisione codice |
| `docs.md` | deepseek-v4-pro | Documentazione |
| `file-parser.md` | qwen3.6-plus | Analisi file multimodale |
| `explore.md` | deepseek-v4-flash | Esplorazione codebase (subagente) |
| `scout.md` | deepseek-v4-flash | Ricerca documentazione esterna (subagente) |
| `general.md` | deepseek-v4-flash | Uso generico (subagente) |

### `.opencode/agents/`

Junction (collegamento) che punta a `.agents/agents/`. OpenCode scopre le definizioni degli agenti da questa directory. I file reali vivono in `.agents/agents/`.

**Esempio `file-parser.md` (accessibile tramite junction):**
- Agente specializzato per analisi file
- Permessi sola lettura (no bash, no edit, nessuna skill)
- Invocazione diretta via `opencode run --agent file-parser`
- Capacità vision per immagini
- Parsing documenti per estrazione testo
- Formato risposta strutturato

## Flusso Dati

### Flusso Messaggio Testo

```
Utente → Telegram → Bot Handler → Session Store → OpenCodeClient → OpenCode Server → Agente → Risposta → Bot → Telegram → Utente
```

### Flusso Foto/Documento

```
Utente → Telegram → Bot Handler → Download in storage/uploads/ → OpenCodeClient.send_message_cli() → opencode run --agent file-parser → Agente file-parser → Risposta → Bot → Telegram → Utente
```

### Flusso Messaggio Vocale

```
Utente → Telegram → Bot Handler → Download OGG → VoiceTranscriber → Trascrizione → OpenCodeClient → OpenCode Server → Agente → Risposta → Bot → Telegram → Utente
```

### Ciclo Vita Server

```
CLI start → Bootstrap → ProcessManager.start() → subprocess opencode serve → Health check → Bot listener → (in esecuzione) → Ctrl+C → ProcessManager.stop() → SIGTERM → timeout 5s → SIGKILL → Exit
```

## Decisioni di Progetto Chiave

| Decisione | Motivazione |
|-----------|-------------|
| Sessioni in memoria | Riavvio = stato fresco. Nessun I/O file. Più semplice. |
| Trascrizione vocale locale | Privacy. Nessuna dipendenza cloud. |
| `PYTHONPATH=src` | Evita `pip install -e .`. Packaging più semplice. |
| `safe_path()` su tutte le scritture | Difesa contro nomi file malevoli. |
| Auto-pulizia temp | Previene riempimento disco da file grandi. |
| Singolo utente (ALLOWED_CHAT_ID) | Il bot è un'interfaccia mobile personale. |
| Specializzazione agente-per-compito | Risultati migliori con agenti focalizzati. |
| Skill auto-allow | Flessibilità per guida specifica per dominio. |
| Architettura basata su plugin | Capacità AI estensibili. |
| Subprocess CLI per analisi file | Sessioni disposable, nessun rischio permessi sulla sessione principale. |

## Punti di Integrazione

### Telegram Bot API

- **Libreria:** `python-telegram-bot` v21+
- **Modalità:** Async (asyncio)
- **Funzionalità:** Comandi, messaggi, foto, documenti, voce

### OpenCode Server

- **Protocollo:** HTTP REST API
- **Auth:** Basic Auth (opzionale)
- **Endpoint:** `/session`, `/session/{id}/message`, `/global/health`

### faster-whisper

- **Libreria:** `faster-whisper`
- **Modello:** small (quantizzato int8)
- **Cache:** `storage/models/` via `HF_HOME`

## Architettura Testing

### Struttura Test

```
tests/
├── conftest.py          # Fixture condivise
├── test_bot.py          # Test handler bot
├── test_client.py       # Test client OpenCode
├── test_manager.py      # Test process manager
├── test_security.py     # Test funzioni sicurezza
└── test_transcriber.py  # Test trascrittore vocale
```

### Strumenti Testing

- **pytest** — Framework test
- **pytest-asyncio** — Supporto test async (modalità auto)
- **respx** — Mock HTTP per client OpenCode
- **pytest-cov** — Report coverage

### Fixture

- `config` — Configurazione test
- `mock_update` — Update Telegram mockato
- `mock_context` — Callback context mockato

## Considerazioni Distribuzione

### Sviluppo Locale

- Esecuzione su localhost
- Accesso diretto file system
- Nessuna esposizione rete

### Distribuzione Produzione

- Mantieni server OpenCode su localhost
- Usa Basic Auth per server
- Restringi bot a singolo chat ID
- Monitora salute server via `/status`

### Requisiti Risorse

| Componente | Memoria | CPU |
|------------|---------|-----|
| Processo bot | ~100MB | Bassa |
| Server OpenCode | ~500MB | Media |
| Modello Whisper | ~240MB | Alta (durante trascrizione) |

## Monitoring

### Health Checks

- Comando `/status` — Salute server e uptime
- Process manager — Monitoraggio automatico salute
- Controlli pre-avvio — Validazione avvio

### Logging

- Log bot — `storage/logs/`
- Log server OpenCode — Gestiti dal server
- Pulizia file temp — Loggata all'avvio
