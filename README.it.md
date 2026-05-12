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
- **14 agenti AI specializzati** per diversi compiti (build, plan, review, docs, legal, ecc.)
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
├── storage/       # Dati runtime (log, modelli, temp)
├── tests/         # Suite pytest
├── docs/          # Documentazione (en/it)
├── .opencode/     # Configurazione agenti OpenCode
└── run.ps1/.sh    # Script di avvio
```

## Plugin

Il bot utilizza OpenCode con tre plugin installati:

| Plugin | Scopo |
|--------|-------|
| `superpowers` | Capacità e strumenti AI avanzati |
| `@asidorenko/openslimedit` | Operazioni di modifica file efficienti |
| `agents-opencode` | Sistema di orchestrazione multi-agente |

## Agenti Disponibili

| Agente | Modello | Caso d'Uso |
|--------|---------|------------|
| `build` | deepseek-v4-flash | Costruire nuove funzionalità e codice |
| `plan` | glm-5.1 | Pianificazione architettura e implementazione |
| `explore` | deepseek-v4-flash | Esplorare e comprendere codebase |
| `scout` | qwen3.6-plus | Trovare file e pattern specifici |
| `orchestrator` | kimi-k2.6 | Coordinare compiti complessi multi-step |
| `planner` | glm-5.1 | Creare piani di implementazione dettagliati |
| `codebase` | kimi-k2.6 | Modificare ed estendere codice esistente |
| `review` | glm-5.1 | Revisione codice e analisi sicurezza |
| `docs` | qwen3.5-plus | Generare documentazione |
| `em-advisor` | qwen3.6-plus | Consulenza engineering management |
| `blogger` | qwen3.5-plus | Scrivere post blog e contenuti |
| `brutal-critic` | glm-5.1 | Revisione critica e feedback |
| `legal-advisor` | glm-5.1 | Guida legale e compliance |
| `file-parser` | kimi-k2.6 | Analizzare immagini, documenti, video |

## Esempi di Utilizzo

| Compito | Esempio Prompt |
|---------|----------------|
| Costruire CLI | "Build a new Python CLI tool for task management" |
| Pianificare architettura | "Plan the architecture for a microservice that processes invoices" |
| Esplorare codebase | "Explore this codebase and tell me how authentication works" |
| Trovare file | "Find all files related to database configuration" |
| Coordinare refactoring | "I need to refactor my bot handlers - coordinate the full plan" |
| Piano implementazione | "Create a detailed implementation plan for adding user authentication" |
| Aggiungere feature | "Add a new command handler for /stats that shows usage statistics" |
| Code review | "Review this pull request for security issues" |
| Generare docs | "Generate API documentation for the OpenCode client module" |
| Consulenza engineering | "What's the best way to structure a Python async project?" |
| Scrivere blog | "Write a blog post about how I built this Telegram AI bot" |
| Criticare README | "Critique my project README and suggest improvements" |
| Domande legali | "What licenses should I consider for an open source AI tool?" |
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
