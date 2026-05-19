# OpenClaw — Personal AI Assistant

Prova su Windows nativo con DeepSeek + Gemini Vision.

## Setup

```powershell
# 1. Installa OpenClaw
npm install -g openclaw@latest

# 2. Copia il config template
copy openclaw-config.json ~/.openclaw/openclaw.json

# 3. Apri ~\.openclaw\openclaw.json e inserisci le API key:
#    - DEEPSEEK_API_KEY (da https://platform.deepseek.com/api_keys)
#    - GEMINI_API_KEY  (da https://aistudio.google.com/apikey)

# 4. Crea directory per il config
#    Se ~\.openclaw\ non esiste, creala:
mkdir ~\.openclaw

# 5. Avvia il gateway
openclaw gateway

# Il gateway parte su http://localhost:18789
# Collega Telegram via configurazione (vedi README.md)
```

## Struttura

```
~/.openclaw/
├── openclaw.json        # Config principale (modelli, canali, agenti)
├── workspace/            # Workspace agent (memoria, skills, tools)
└── .env                  # Variabili d'ambiente (opzionale)
```

## Costi stimati

| Provider | Modello | Costo |
|----------|---------|-------|
| DeepSeek API | deepseek-v4-flash | $0,14/1M input |
| Gemini API | gemini-3-flash-preview | ~$0,15/1M input |
| **Totale** (500 msg + 50 foto/mese) | | **~$0,12/mese** |
