# OpenCode Agents - Bot Telegram

Interfaccia Telegram per [OpenCode](https://opencode.ai) — ricevi messaggi su Telegram, inoltrali ad agenti OpenCode, ottieni risposte.

## Architettura

```
Telegram ──► python-telegram-bot ──► httpx ──► OpenCode Server
                  │
                  ├── ProcessManager (ciclo vita opencode serve)
                  ├── VoiceTranscriber (faster-whisper locale)
                  └── SessionStore (in memoria)
```

- **Linguaggio:** Python 3.12+
- **Bot framework:** `python-telegram-bot` v21+
- **HTTP client:** `httpx`
- **Trascrizione vocale:** `faster-whisper` (locale, CPU int8)
- **Test:** `pytest`, `pytest-asyncio`, `respx`

## Avvio Rapido

```bash
cp .env.example .env        # Modifica con la tua configurazione
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
python -m src.cli setup
python -m src.cli check
python -m src.cli start
```

## Comandi

- `/start` — Messaggio di benvenuto
- `/help` — Comandi disponibili
- `/new` — Pulisci sessione e ricomincia
- `/status` — Stato del server
- `/restart` — Riavvia il server OpenCode

## Tipi di Messaggio

- **Testo** — inoltrato a OpenCode
- **Foto** — scaricate in `storage/temp/`, percorso inviato a OpenCode
- **Documenti** — scaricati in `storage/temp/`, percorso inviato a OpenCode
- **Voce** — trascritta localmente con `faster-whisper`, testo inoltrato

## Struttura del Progetto

```
opencode-personal-agent/
├── src/
│   ├── main.py              # Punto di ingresso
│   ├── cli.py               # Comandi CLI (check/setup/start/test)
│   ├── config.py            # Validazione variabili d'ambiente
│   ├── bootstrap.py         # Controlli pre-avvio
│   ├── security.py          # Protezione path traversal + file sensibili
│   ├── bot/                 # Logica del bot Telegram
│   ├── opencode/            # Client HTTP per OpenCode
│   ├── process/             # Gestore del processo
│   └── voice/               # Trascrittore vocale
├── storage/
│   ├── logs/
│   ├── models/              # Cache HF per faster-whisper
│   └── temp/                # Download temporanei (auto-puliti)
├── tests/                   # Suite pytest
├── docs/                    # Documentazione
└── run.ps1 / run.sh         # Launcher
```

## Decisioni Chiave

- **Nessuna persistenza** — sessioni in memoria `dict[int, str]`. Riavvio = stato fresco.
- **Niente API cloud per la voce** — 100% locale con `faster-whisper` (CPU, int8).
- **Path sicuri** — `safe_path()` previene traversal, blocca file sensibili.
- **Auto-pulizia** — `storage/temp/` pulito all'avvio (file >1h).

## Test

```bash
python -m src.cli test
# oppure
pytest tests/ --cov=src
```
