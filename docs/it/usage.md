# Utilizzo

Guida completa all'utilizzo del bot Telegram OpenCode Personal Agent.

## Avvio del Bot

```bash
python -m src.cli start
```

Oppure via script launcher:

**Windows:**

```powershell
.\run.ps1
```

**Linux/macOS:**

```bash
./run.sh
```

### Sequenza di Avvio

Quando avvii il bot, esegue questi step:

1. **Controlli pre-avvio** — Valida versione Python, file `.env`, configurazione e `opencode` in PATH
2. **Setup storage** — Crea directory `storage/` se mancanti
3. **Pulizia temp** — Rimuove file temporanei più vecchi di 1 ora
4. **Avvio server** — Lancia `opencode serve` come subprocesso
5. **Health check** — Attende 5 secondi, poi verifica salute server via `/global/health`
6. **Bot listener** — Avvia il listener Telegram

### Fermare il Bot

Premi `Ctrl+C` per fermare. Il bot:
- Ferma il listener Telegram
- Termina il processo server OpenCode (SIGTERM, poi SIGKILL dopo timeout 5s)
- Pulisce le risorse

## Comandi Bot

| Comando | Descrizione |
|---------|-------------|
| `/start` | Messaggio di benvenuto con lista comandi |
| `/help` | Aiuto dettagliato con tutti i comandi disponibili |
| `/new` | Pulisci sessione corrente e ricomincia |
| `/status` | Mostra salute server e uptime |
| `/restart` | Riavvia il processo server OpenCode |

### Dettaglio Comandi

#### /start

Invia un messaggio di benvenuto con lista comandi disponibili.

**Risposta:**
```
Welcome to OpenCode Agents Bot!

Available commands:
/help - Show this help message
/new - Start a new session
/status - Check server status
/restart - Restart the server

Send me any message to interact with AI agents.
```

#### /help

Mostra aiuto dettagliato con tutti i comandi e funzionalità disponibili.

#### /new

Pulisce la sessione OpenCode corrente e ricomincia.

**Usa quando:**
- Vuoi iniziare un nuovo contesto conversazione
- Risposte precedenti stanno influenzando compiti correnti
- Stai passando a un argomento completamente diverso

**Risposta:**
```
Session cleared. Starting fresh!
```

#### /status

Mostra stato salute server e uptime.

**Risposta:**
```
Server Status: Healthy
Uptime: 2h 34m 12s
PID: 12345
```

#### /restart

Riavvia il processo server OpenCode.

**Usa quando:**
- Server diventa non responsivo
- Dopo modifiche configurazione
- Per pulire stato server

**Risposta:**
```
Restarting server...
Server restarted successfully.
```

## Tipi di Messaggio

Il bot gestisce quattro tipi di messaggio:

### Messaggi di Testo

Qualsiasi messaggio di testo che non inizia con `/` o `^` è inoltrato a OpenCode.

**Flusso elaborazione:**
1. Bot recupera o crea una sessione per la tua chat
2. Invia il testo alle API OpenCode
3. Riceve risposta streaming
4. Restituisce la risposta (divisa in chunk da 4096 caratteri se necessario)

**Esempio:**
```
Tu: "Build a Python function to calculate fibonacci numbers"
Bot: [Risposta AI con codice]
```

### Foto

Quando invii una foto:

**Flusso elaborazione:**
1. Bot scarica la foto in `storage/temp/`
2. Invia un prompt a OpenCode con il percorso immagine
3. Agente AI analizza l'immagine (usando agente file-parser per vision)
4. Restituisce risultati analisi

**Esempio:**
```
Tu: [invia foto di un documento]
Tu: "Extract the text from this image"
Bot: [Risultati OCR e analisi]
```

**Casi d'uso:**
- Analisi screenshot
- OCR documenti
- Interpretazione diagrammi
- Spiegazione screenshot codice

### Documenti

Quando invii un documento:

**Flusso elaborazione:**
1. Bot scarica il documento in `storage/temp/` (nome file sanitizzato)
2. Invia un prompt a OpenCode con il percorso file
3. Agente AI legge ed elabora il file
4. Restituisce analisi o modifiche

**Formati supportati:**
- File testo (`.txt`, `.md`, `.json`, `.yaml`, ecc.)
- File codice (`.py`, `.js`, `.ts`, `.java`, `.go`, ecc.)
- Documenti (`.pdf`, `.docx` — quando supportato dall'agente)

**Esempio:**
```
Tu: [invia config.json]
Tu: "Review this configuration for security issues"
Bot: [Analisi sicurezza e raccomandazioni]
```

### Messaggi Vocali

Quando invii un messaggio vocale:

**Flusso elaborazione:**
1. Bot scarica l'audio OGG in `storage/temp/`
2. Trascrive usando `faster-whisper` (locale, CPU, modello "small", int8)
3. Invia la trascrizione a OpenCode
4. Agente AI risponde basandosi sul testo trascritto

**Privacy:** La trascrizione vocale è 100% locale. Nessun audio è inviato a API cloud.

**Esempio:**
```
Tu: [invia messaggio vocale: "How do I implement async/await in Python?"]
Bot: [Trascrizione: "How do I implement async/await in Python?"]
Bot: [Risposta AI che spiega async/await]
```

**Supporto lingue:** Configura `WHISPER_LANGUAGE` in `.env`:
- `auto` — Rilevamento automatico lingua (default)
- `en` — Inglese
- `it` — Italiano
- `es` — Spagnolo
- `fr` — Francese
- `de` — Tedesco
- E molte altre

## Pattern di Interazione con Agenti

### Agente Predefinito

Di default, l'agente `build` gestisce tutte le richieste.

### Specificare un Agente

Per usare un agente specifico, menzionalo nel prompt:

```
"Using the review agent: analyze this code for security vulnerabilities"
```

### Selezione Agente per Tipo di Compito

| Tipo di Compito | Agente Raccomandato |
|-----------------|---------------------|
| Costruire nuovo codice | `build` |
| Pianificare architettura | `plan` o `planner` |
| Comprendere codebase | `explore` |
| Trovare file | `scout` |
| Compiti complessi multi-step | `orchestrator` |
| Modificare codice esistente | `codebase` |
| Revisione codice | `review` |
| Documentazione | `docs` |
| Consulenza engineering | `em-advisor` |
| Creazione contenuti | `blogger` |
| Feedback critico | `brutal-critic` |
| Domande legali | `legal-advisor` |
| Analisi file | `file-parser` |

### Usare le Skill

Le skill sono automaticamente applicate basandosi sul contesto. Per richiedere esplicitamente una skill:

```
"Using the python skill: write a function to parse JSON with validation"
```

### Combinare Agenti e Skill

Per risultati migliori, combina agenti con skill rilevanti:

```
"Using the docs agent with the python skill: generate API documentation
for this module with proper docstrings"
```

## Esempi di Utilizzo

### Sviluppo Codice

```
Prompt: "Build a Python CLI tool for task management with add, list, and complete commands"
Agente: build (con skill python)
Atteso: Codice Python funzionante con argparse, archiviazione file e comandi CLI
```

### Pianificazione Architettura

```
Prompt: "Plan the architecture for a microservice that processes invoices"
Agente: plan
Atteso: Diagramma componenti, raccomandazioni tecnologiche, design API
```

### Revisione Codice

```
Prompt: "Review this code for security vulnerabilities"
[allega file codice]
Agente: review
Atteso: Risultati sicurezza, report vulnerabilità, suggerimenti fix
```

### Documentazione

```
Prompt: "Generate API documentation for the OpenCode client module"
Agente: docs
Atteso: Documentazione markdown con endpoint, parametri, esempi
```

### Analisi File

```
Prompt: "Analyze this screenshot and extract the error message"
[allega screenshot]
Agente: file-parser
Atteso: Testo estratto, spiegazione errore, fix suggeriti
```

### Creazione Contenuti

```
Prompt: "Write a LinkedIn post about launching my new open source project"
Agente: blogger
Atteso: Post social media coinvolgente con hashtag e call-to-action
```

### Guida Legale

```
Prompt: "What licenses should I consider for an open source AI tool?"
Agente: legal-advisor
Atteso: Confronto licenze, raccomandazioni, considerazioni
```

### Design Database

```
Prompt: "Write a SQL migration to add an index on users.email"
Agente: build (con skill sql-migrations)
Atteso: Migrazione sicura con capacità rollback
```

### Sviluppo UI

```
Prompt: "Create a responsive React dashboard component with charts"
Agente: build (con skill react-next)
Atteso: Componente React con design responsive e integrazione grafici
```

### Contenuti Career

```
Prompt: "Optimize my resume for ATS systems"
[allega resume]
Agente: blogger (con skill career-content)
Atteso: Resume ottimizzato per ATS con suggerimenti keyword
```

## Comandi CLI

Il bot fornisce comandi CLI per gestione:

```bash
python -m src.cli check    # Esegui validazione pre-avvio
python -m src.cli setup    # Crea .env e directory storage
python -m src.cli start    # Avvia il bot
python -m src.cli test     # Esegui suite test con coverage
```

### Test

```bash
# Esegui suite completa con coverage
python -m src.cli test

# Oppure direttamente con pytest
pytest tests/ --cov=src -v

# Testa un singolo file
python -m pytest tests/test_bot.py -v
```

## Rate Limiting

Il bot applica un rate limit tra messaggi (default: 2.0 secondi).

**Scopo:** Prevenire sovraccarico API e garantire elaborazione stabile.

**Configurazione:** Imposta `rate_limit_seconds` in `.env` per aggiustare.

## Limiti Dimensione File

Dimensione massima file: 50MB (default).

**Configurazione:** Imposta `max_file_size` in `.env` per aggiustare.

## Gestione Errori

### Errori Comuni

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| "Access denied" | Chat ID non corrisponde a `ALLOWED_CHAT_ID` | Verifica chat ID in `.env` |
| "Server unavailable" | Server OpenCode non in esecuzione | Usa comando `/restart` |
| "File too large" | File supera `max_file_size` | Riduci dimensione file o aumenta limite |
| "Rate limited" | Messaggi inviati troppo velocemente | Attendi tra messaggi |

### Gestione Risposte JSON

Quando OpenCode restituisce errori tool-use o JSON grezzo (es. dall'agente `file-parser`), il bot rileva risposte JSON e le invia come testo semplice per evitare errori di parsing Markdown di Telegram.

## Gestione Sessioni

Le sessioni sono memorizzate **solo in memoria** (`dict[int, str]`).

**Implicazioni:**
- Riavvio bot = stato sessione fresco
- Nessuna cronologia conversazione persistente
- Ogni chat ha una sessione attiva

Usa `/new` per pulire manualmente la tua sessione.

## Best Practices

1. **Sii specifico** — Prompt chiari ottengono risultati migliori
2. **Usa agenti appropriati** — Abbina agente al tipo di compito
3. **Sfrutta le skill** — Richiedi skill specifiche per dominio quando rilevanti
4. **Ricomincia quando necessario** — Usa `/new` per cambi contesto
5. **Controlla stato regolarmente** — Usa `/status` per monitorare salute server
6. **Allega file rilevanti** — Foto e documenti migliorano comprensione AI

## Prossimi Passi

- Review [Agenti & Skill](agents.md) per riferimento dettagliato agenti e skill
- Controlla [Sicurezza](security.md) per dettagli modello sicurezza
- Esplora [Architettura](architecture.md) per interni sistema
