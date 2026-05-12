# Documentazione di OpenCode Agents — Bot Telegram

Documentazione completa per il bot Telegram OpenCode Personal Agent — un'interfaccia mobile per assistenza allo sviluppo basata su AI.

## Panoramica

Questo bot Telegram inoltra i tuoi messaggi a un server OpenCode locale e restituisce risposte di agenti AI. Supporta testo, foto, documenti e messaggi vocali, con trascrizione vocale 100% locale.

### Funzionalità Principali

- **5 comandi bot** per gestione sessione e server
- **4 tipi di messaggio**: testo, foto, documento, voce
- **10 agenti AI specializzati** per diversi compiti
- **20+ skill** per guida specifica per dominio e linguaggio
- **2 plugin OpenCode** per capacità avanzate
- **Trascrizione vocale 100% locale** via faster-whisper
- **Sicurezza singolo utente** con protezione path traversal

## Indice Documentazione

| Documento | Descrizione |
|-----------|-------------|
| [Guida Setup](setup.md) | Installazione, configurazione e controlli pre-avvio |
| [Guida Utilizzo](usage.md) | Comandi bot, tipi di messaggio e pattern di interazione |
| [Agenti & Skill](agents.md) | Riferimento completo per tutti gli agenti, plugin e skill |
| [Sicurezza](security.md) | Modello di sicurezza, controllo accessi e protezione dati |
| [Architettura](architecture.md) | Architettura di sistema e dettaglio componenti |

## Avvio Rapido

```bash
# 1. Clona e configura
git clone <repo-url> opencode-personal-agent
cd opencode-personal-agent

# 2. Configura ambiente
cp .env.example .env
# Modifica .env con il token del bot Telegram e il tuo chat ID

# 3. Installa dipendenze
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt

# 4. Esegui setup e controlli
python -m src.cli setup
python -m src.cli check

# 5. Avvia il bot
python -m src.cli start
```

## Agenti Disponibili

Il bot utilizza il sistema multi-agente di OpenCode con 10 agenti specializzati:

| Agente | Modello | Scopo |
|--------|---------|-------|
| `build` | deepseek-v4-flash | Costruire nuove funzionalità e codice (default) |
| `plan` | glm-5.1 | Pianificazione architettura e implementazione standard |
| `plan-opus` | glm-5.1 | Pianificazione approfondita per sistemi complessi |
| `plan-haiku` | deepseek-v4-flash | Schizzi implementazione rapidi |
| `explore` | deepseek-v4-flash | Esplorare e comprendere codebase |
| `debug` | glm-5.1 | Debug sistematico e analisi cause |
| `review` | glm-5.1 | Revisione codice e analisi sicurezza |
| `docs` | deepseek-v4-flash | Generare documentazione |
| `file-parser` | kimi-k2.6 | Analizzare immagini, documenti, video |
| `general` | deepseek-v4-flash | Ricerca generica e task multi-step |

## Plugin

Due plugin OpenCode estendono le capacità del bot:

| Plugin | Descrizione |
|--------|-------------|
| `superpowers` | Capacità AI avanzate e strumenti potenziati |
| `@asidorenko/openslimedit` | Operazioni di modifica file efficienti |

## Skill

Oltre 20 skill forniscono guida specifica per dominio:

| Skill | Dominio |
|-------|---------|
| `python` | Best practices Python |
| `react-next` | Sviluppo React e Next.js |
| `flutter` | Flutter/Dart con Riverpod |
| `go` | Best practices Go |
| `rust` | Best practices Rust |
| `dotnet` | Clean Architecture .NET |
| `java-spring` | Java Spring Boot |
| `node-express` | Node.js e Express |
| `ruby-rails` | Ruby on Rails |
| `typescript` | TypeScript strict mode |
| `sql-migrations` | Best practices migrazioni SQL |
| `ux-responsive` | Design UX responsive |
| `career-content` | Resume, LinkedIn, lettere di presentazione |
| `blogger` | Creazione contenuti |
| `brutal-critic` | Revisione contenuti |
| `legal-advisor` | Ricerca legale |
| `docs-validation` | Qualità documentazione |
| `agent-diagnostics` | Validazione setup agenti |
| `project-bootstrap` | Scaffold progetto |

## Esempi di Utilizzo

### Sviluppo Codice

```
Invia al bot: "Build a Python function to parse JSON config files with validation"
Agente: build (con skill python)
```

### Pianificazione Architettura

```
Invia al bot: "Plan the architecture for a microservice that processes invoices"
Agente: plan o planner
```

### Revisione Codice

```
Invia al bot: "Review this code for security vulnerabilities and suggest improvements"
Agente: review
```

### Debug

```
Invia al bot: "Investigate why the API endpoint returns 500 errors"
Agente: debug
```

### Documentazione

```
Invia al bot: "Generate API documentation for the OpenCode client module"
Agente: docs
```

### Analisi File

```
Invia al bot: [allega immagine] "Analyze this screenshot and extract the text"
Agente: file-parser
```

## Comandi Bot

| Comando | Descrizione |
|---------|-------------|
| `/start` | Messaggio di benvenuto con lista comandi |
| `/help` | Aiuto dettagliato con tutti i comandi disponibili |
| `/new` | Pulisci sessione corrente e ricomincia |
| `/status` | Mostra salute server e uptime |
| `/restart` | Riavvia il processo server OpenCode |

## Tipi di Messaggio

| Tipo | Gestione |
|------|----------|
| **Testo** | Inoltrato direttamente all'agente OpenCode |
| **Foto** | Scaricata in temp storage, percorso inviato per analisi |
| **Documento** | Scaricato in temp storage, percorso inviato per elaborazione |
| **Voce** | Trascritto localmente con faster-whisper, testo inoltrato |

## Sicurezza

- **Accesso singolo utente** tramite `ALLOWED_CHAT_ID`
- **Protezione path traversal** su tutte le operazioni file
- **Blocklist file sensibili** previene esposizione credenziali
- **Trascrizione vocale locale** — nessun audio inviato a API cloud
- **Auto-pulizia** file temporanei più vecchi di 1 ora

Vedi [Documentazione Sicurezza](security.md) per dettagli.

## Test

```bash
# Esegui suite completa con coverage
pytest tests/ --cov=src -v

# Testa un singolo file
python -m pytest tests/test_bot.py -v
```

## Struttura Progetto

```
opencode-personal-agent/
├── src/
│   ├── main.py              # Punto di ingresso
│   ├── cli.py               # Comandi CLI
│   ├── config.py            # Validazione config
│   ├── bootstrap.py         # Controlli pre-avvio
│   ├── security.py          # Protezione path traversal + file sensibili
│   ├── bot/                 # Logica bot Telegram
│   ├── opencode/            # Client HTTP OpenCode
│   ├── process/             # Gestore processo
│   └── voice/               # Trascrittore vocale
├── storage/
│   ├── logs/
│   ├── models/              # Cache HF per faster-whisper
│   ├── temp/                # Download temporanei (auto-puliti)
│   └── uploads/             # File caricati utente (auto-puliti)
├── tests/
├── docs/
│   ├── en/                  # Documentazione inglese
│   └── it/                  # Documentazione italiana
├── .opencode/               # Configurazione agenti OpenCode
└── run.ps1 / run.sh         # Launcher
```

## Requisiti

- Python 3.12+ (3.13+ raccomandato)
- OpenCode CLI installato e configurato
- Token Bot Telegram (da @BotFather)
- Chat ID autorizzato per sicurezza

## Licenza

Licenza MIT — vedi [LICENSE](../LICENSE) per dettagli.
