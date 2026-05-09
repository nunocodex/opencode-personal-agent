# Setup

## Requisiti

- Python 3.12+ (3.13+ raccomandato)
- OpenCode CLI installato e configurato
- Token Bot Telegram (da [@BotFather](https://t.me/BotFather))

## Installazione

### 1. Clona il repository

```bash
git clone <repo-url> opencode-agents
cd opencode-agents
```

### 2. Crea ambiente virtuale

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

### 3. Configura ambiente

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi valori:

| Variabile | Obbligatoria | Descrizione |
|-----------|-------------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Da @BotFather (`cifre:alfanumerici`) |
| `ALLOWED_CHAT_ID` | ✅ | Restringe il bot a una chat per sicurezza |
| `OPENCODE_PROJECT_DIR` | ✅ | Percorso del tuo progetto OpenCode |
| `OPENCODE_SERVER_URL` | ✅ | Es. `http://127.0.0.1:4096` |
| `OPENCODE_SERVER_USERNAME` | no | Default: `opencode` |
| `OPENCODE_SERVER_PASSWORD` | no | Necessario se il server ha auth |
| `WHISPER_LANGUAGE` | no | Lingua trascrizione voce (`auto`, `it`, `en`, ecc.) |

### 4. Esegui setup

```bash
python -m src.cli setup
```

Crea `.env` dall'esempio (se mancante) e garantisce l'esistenza delle directory `storage/`.

### 5. Verifica

```bash
python -m src.cli check
```

Tutti i controlli devono passare prima di avviare il bot.

### 6. Avvia

```bash
python -m src.cli start
```

Oppure usa il launcher:

**Windows:**
```powershell
.\run.ps1
```

**Linux/macOS:**
```bash
chmod +x run.sh
./run.sh
```
