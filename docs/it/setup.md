# Setup

Istruzioni complete di setup per il bot Telegram OpenCode Personal Agent.

## Requisiti

- **Python 3.12+** (3.13+ raccomandato)
- **OpenCode CLI** installato e configurato
- **Token Bot Telegram** da [@BotFather](https://t.me/BotFather)
- **Chat ID Telegram** per sicurezza (il tuo chat ID personale)

## Installazione

### 1. Clona il Repository

```bash
git clone <repo-url> opencode-personal-agent
cd opencode-personal-agent
```

### 2. Crea Ambiente Virtuale

**Windows (PowerShell):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Linux/macOS:**

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configura Ambiente

Copia il file di ambiente di esempio:

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi valori:

| Variabile | Obbligatoria | Descrizione |
|-----------|--------------|-------------|
| `TELEGRAM_BOT_TOKEN` | Sì | Da @BotFather (formato: `cifre:alfanumerici`) |
| `ALLOWED_CHAT_ID` | Sì | Il tuo chat ID Telegram per sicurezza |
| `OPENCODE_PROJECT_DIR` | Sì | Percorso della directory progetto OpenCode |
| `OPENCODE_SERVER_URL` | Sì | URL server OpenCode (es. `http://127.0.0.1:4096`) |
| `OPENCODE_SERVER_USERNAME` | No | Username server (default: `opencode`) |
| `OPENCODE_SERVER_PASSWORD` | No | Password server (richiesta se auth abilitata) |
| `WHISPER_LANGUAGE` | No | Lingua trascrizione voce (`auto`, `it`, `en`, ecc.) |
| `max_file_size` | No | Dimensione massima file in byte (default: 52428800 = 50MB) |
| `rate_limit_seconds` | No | Rate limit tra messaggi (default: 2.0) |

#### Ottenere il Tuo Chat ID

Per ottenere il tuo chat ID Telegram:

1. Avvia una chat con [@userinfobot](https://t.me/userinfobot)
2. Risponderà con il tuo chat ID (un numero come `123456789`)
3. Usa questo valore per `ALLOWED_CHAT_ID`

### 4. Configurazione OpenCode

Il bot utilizza la configurazione OpenCode da `.opencode/opencode.json`. Questo file definisce:

- **Agente predefinito:** `build`
- **Agenti disponibili:** 10 agenti specializzati (build, plan, ultraplan, review, docs, ecc.)
- **Plugin:** superpowers, openslimedit
- **Skill:** Skill auto-allow per guida specifica per dominio
- **Modelli:** Assegnazioni modello per agente

Nessuna modifica è necessaria per l'uso base. Utenti avanzati possono modificare le definizioni agente in `.agents/agents/` (posizione canonica) o `.opencode/agents/` (junction).

#### Configurazione Plugin

Due plugin sono configurati:

| Plugin | Scopo |
|--------|-------|
| `superpowers` | Capacità AI avanzate e strumenti |
| `@asidorenko/openslimedit` | Operazioni di modifica file efficienti |

I plugin sono automaticamente caricati da OpenCode. Nessun setup aggiuntivo richiesto.

#### Configurazione Skill

Le skill sono auto-allow nella configurazione permessi:

```json
"permission": {
  "skill": {
    "*": "allow"
  }
}
```

Tutte le skill disponibili possono essere usate da qualsiasi agente. Le skill forniscono guida specifica per dominio per:

- Linguaggi di programmazione (Python, React, Flutter, Go, Rust, ecc.)
- Creazione contenuti (blogger, brutal-critic)
- Servizi professionali (legal-advisor, career-content)
- Strumenti sviluppo (docs-validation, agent-diagnostics)

Vedi [Agenti & Skill](agents.md) per la lista completa delle skill.

### 5. Esegui Setup

```bash
python -m src.cli setup
```

Questo comando:
- Crea `.env` dall'esempio (se mancante)
- Garantisce l'esistenza delle directory `storage/` (`logs/`, `models/`, `temp/`, `uploads/`)

### 6. Verifica Configurazione

```bash
python -m src.cli check
```

I controlli pre-avvio includono:
- Validazione versione Python (3.12+)
- Esistenza file `.env`
- Caricamento e validazione configurazione
- Comando `opencode` in PATH
- Creazione directory storage
- Pulizia file temporanei (file >1h)

Tutti i controlli devono passare prima di avviare il bot.

### 7. Avvia il Bot

```bash
python -m src.cli start
```

Oppure usa gli script launcher:

**Windows:**

```powershell
.\run.ps1
```

**Linux/macOS:**

```bash
chmod +x run.sh
./run.sh
```

Il bot eseguirà:
1. Controlli pre-avvio
2. Avvio del server OpenCode (`opencode serve`)
3. Attesa 5 secondi e verifica salute
4. Avvio del listener Telegram

## Directory Storage

Il setup crea queste directory sotto `storage/`:

| Directory | Scopo |
|-----------|-------|
| `logs/` | Log bot e server |
| `models/` | Cache modello Whisper (HF_HOME) |
| `temp/` | Staging file temporanei (auto-puliti) |
| `uploads/` | File caricati dagli utenti |

Tutte le directory sono gitignorate eccetto i file placeholder `.gitkeep`.

## Risoluzione Problemi

### Errore Versione Python

```
Error: Python 3.12+ required
```

**Soluzione:** Installa Python 3.12 o successivo da [python.org](https://www.python.org/).

### OpenCode Non Trovato

```
Error: opencode command not found in PATH
```

**Soluzione:** Installa OpenCode CLI e assicurati sia nel tuo PATH.

### Token Bot Non Valido

```
ValueError: Invalid TELEGRAM_BOT_TOKEN format
```

**Soluzione:** Verifica che il tuo token da @BotFather corrisponda al formato `cifre:alfanumerici`.

### Mismatch Chat ID

Se ricevi messaggi "Access denied":

**Soluzione:** Verifica che `ALLOWED_CHAT_ID` corrisponda al tuo effettivo chat ID Telegram.

### Porta Già in Uso

```
Error: Port 4096 is already in use
```

**Soluzione:** Ferma qualsiasi server OpenCode esistente o cambia `OPENCODE_SERVER_URL` su una porta diversa.

## Prossimi Passi

Dopo il setup completato con successo:

1. Leggi la [Guida Utilizzo](usage.md) per comandi bot e funzionalità
2. Review [Agenti & Skill](agents.md) per comprendere gli agenti disponibili
3. Controlla [Sicurezza](security.md) per dettagli modello sicurezza
4. Esplora [Architettura](architecture.md) per interni sistema
