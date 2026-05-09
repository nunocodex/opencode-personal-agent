# Utilizzo

## Avvio del Bot

```bash
python -m src.cli start
```

Oppure via launcher:

**Windows:**
```powershell
.\run.ps1
```

**Linux/macOS:**
```bash
./run.sh
```

Il bot esegue:
1. Controlli pre-avvio
2. Avvio del server OpenCode (`opencode serve`)
3. Attesa 5s e verifica salute
4. Avvio del listener Telegram

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `/start` | Messaggio di benvenuto con lista comandi |
| `/help` | Aiuto dettagliato con tutti i comandi |
| `/new` | Pulisci la sessione OpenCode corrente e ricomincia |
| `/status` | Mostra salute del server e uptime |
| `/restart` | Riavvia il processo del server OpenCode |

## Tipi di Messaggio

### Testo
Qualsiasi messaggio di testo che non inizi con `/` o `^` viene inoltrato a OpenCode. Il bot:
1. Recupera o crea una sessione per la tua chat
2. Invia il testo a OpenCode
3. Restituisce la risposta (divisa in blocchi da 4096 caratteri se necessario)

### Foto
Quando invii una foto:
1. Il bot la scarica in `storage/temp/`
2. Invia un prompt a OpenCode con il percorso dell'immagine
3. L'agente AI può analizzare l'immagine

### Documenti
Quando invii un documento:
1. Il bot lo scarica in `storage/temp/` (nome file sanitizzato)
2. Invia un prompt a OpenCode con il percorso del file
3. L'agente AI può leggere e processare il file

### Messaggi Vocali
Quando invii un messaggio vocale:
1. Il bot scarica l'audio OGG in `storage/temp/`
2. Lo trascrive usando `faster-whisper` (locale, CPU, modello "small")
3. Invia la trascrizione a OpenCode
4. L'agente AI risponde basandosi sul testo trascritto

## Comandi CLI

```bash
python -m src.cli check    # Esegui validazione pre-avvio
python -m src.cli setup    # Crea .env e directory storage
python -m src.cli start    # Avvia il bot
python -m src.cli test     # Esegui suite di test con coverage
```

## Note sulla Sicurezza

- Il bot risponde solo a `ALLOWED_CHAT_ID` — tutte le altre chat ricevono "Access denied"
- I download usano `safe_path()` per prevenire path traversal
- I file sensibili (`.env`, chiavi SSH, `.pem`, ecc.) sono bloccati dal download
- `storage/temp/` viene pulito all'avvio (file >1h)
