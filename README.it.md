# OpenCode Agents — Bot Telegram

[![Python](https://img.shields.io/badge/python-3.12%2B-blue)](https://www.python.org/) [![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Interfaccia Telegram per [OpenCode](https://opencode.ai). Ricevi messaggi su Telegram, inoltrali ad agenti OpenCode, ottieni risposte.

## Funzionalità

- **5 comandi:** `/start`, `/help`, `/new`, `/status`, `/restart`
- **4 tipi di messaggio:** testo, foto, documento, vocali
- **Trascrizione vocale 100% locale** con `faster-whisper` (CPU, int8)
- **Ciclo di vita asincrono** — avvia/ferma/riavvia `opencode serve`
- **Sicurezza prima di tutto** — protezione path traversal, blocklist file sensibili, autenticazione singolo utente
- **68 test, 84% copertura**
- **10 agenti AI specializzati** per diversi compiti (build, plan, review, docs, explore, ecc.)
- **20+ skill** per guida specifica per linguaggio (Python, React, Flutter, Go, Rust, ecc.)

## Avvio Rapido

```bash
cp .env.example .env                              # Configura il bot
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
python -m src.cli setup && python -m src.cli check && python -m src.cli start
```

## Documentazione

| Italiano | English |
|----------|---------|
| [Documentazione Completa](docs/it/README.md) | [Full Documentation](docs/en/README.md) |
| [Guida Setup](docs/it/setup.md) | [Setup Guide](docs/en/setup.md) |
| [Guida Utilizzo](docs/it/usage.md) | [Usage Guide](docs/en/usage.md) |
| [Sicurezza](docs/it/security.md) | [Security](docs/en/security.md) |
| [Architettura](docs/it/architecture.md) | [Architecture](docs/en/architecture.md) |
| [Agenti & Skill](docs/it/agents.md) | [Agents & Skills](docs/en/agents.md) |

## Struttura del Progetto

```
opencode-personal-agent/
├── src/           # Codice sorgente Python
│   ├── main.py    # Punto di ingresso
│   ├── cli.py     # Comandi CLI
│   ├── config.py  # Validazione configurazione
│   ├── bot/       # Handler del bot Telegram
│   ├── opencode/  # Client HTTP OpenCode
│   ├── process/   # Gestore del processo
│   └── voice/     # Trascrittore vocale
├── storage/       # Dati runtime (log, modelli, temp, uploads)
├── tests/         # Suite pytest
├── docs/          # Documentazione (en/it)
├── .opencode/     # Configurazione agenti OpenCode
└── run.ps1/.sh    # Script di avvio
```

## Plugin

Il bot utilizza OpenCode con due plugin installati:

| Plugin | Scopo |
|--------|-------|
| `superpowers` | Capacità e strumenti AI avanzati |
| `@asidorenko/openslimedit` | Operazioni di modifica file efficienti |

## Agenti Disponibili

| Agente | Modello | Caso d'Uso |
|--------|---------|------------|
| `build` | deepseek-v4-flash | Costruire nuove funzionalità e codice (default) |
| `plan` | deepseek-v4-flash | Pianificazione architettura standard |
| `ultraplan` | deepseek-v4-pro | Pianificazione multi-fase approfondita |
| `explore` | deepseek-v4-flash | Esplorare e comprendere codebase |
| `debug` | deepseek-v4-pro | Debug sistematico e analisi cause |
| `review` | deepseek-v4-pro | Revisione codice e analisi sicurezza |
| `docs` | deepseek-v4-pro | Generare documentazione |
| `file-parser` | qwen3.6-plus | Analizzare immagini, documenti, video (multimodale) |
| `scout` | deepseek-v4-flash | Ricerca documentazione esterna e dipendenze |
| `general` | deepseek-v4-flash | Ricerca generica e task multi-step |

## Esempi di Utilizzo

| Compito | Esempio Prompt |
|---------|----------------|
| Costruire CLI | "Build a new Python CLI tool for task management" |
| Pianificare architettura | "Plan the architecture for a microservice that processes invoices" |
| Esplorare codebase | "Explore this codebase and tell me how authentication works" |
| Debug problema | "Investigate why the bot crashes on voice messages" |
| Code review | "Review this pull request for security issues" |
| Generare docs | "Generate API documentation for the OpenCode client module" |
| Analizzare immagine | Invia una foto e chiedi "Analyze this image and describe its contents" |

## Test

```bash
pytest tests/ --cov=src -v
```

## Sicurezza

- Accesso singolo utente tramite `ALLOWED_CHAT_ID`
- Prevenzione path traversal su tutte le operazioni file
- Blocklist download file sensibili
- Trascrizione vocale 100% locale — nessuna API cloud
- File temporanei auto-puliti all'avvio

## Licenza

MIT
