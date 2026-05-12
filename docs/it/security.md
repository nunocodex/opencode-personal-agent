# Sicurezza

Documentazione sulla sicurezza per il bot Telegram OpenCode Personal Agent.

## Panoramica

Il bot è progettato come **interfaccia mobile** per OpenCode, non come servizio AI general-purpose. Le misure di sicurezza si concentrano su:

1. **Controllo accessi** — Solo utenti Telegram autorizzati
2. **Prevenzione path traversal** — Gestione sicura file
3. **Blocco file sensibili** — Prevenire esposizione credenziali
4. **Auto-pulizia** — Prevenire accumulo file temporanei
5. **Permessi skill** — Controllo accesso skill

## Controllo Accessi

Il bot usa `ALLOWED_CHAT_ID` per limitare l'accesso a una singola chat Telegram:

```python
if chat.id != allowed_chat_id:
    await update.effective_message.reply_text("Access denied.")
```

**Raccomandazione:** Imposta sempre `ALLOWED_CHAT_ID`. Puoi ottenere il tuo chat ID mandando un messaggio a [@userinfobot](https://t.me/userinfobot) su Telegram.

### Design Singolo Utente

Il bot è intenzionalmente progettato per accesso singolo utente:

- **Uso personale:** Interfaccia mobile per sviluppatori individuali
- **Superficie attacco ridotta:** Nessuna complessità multi-utente
- **Sicurezza semplificata:** Un chat ID trusted

**Per scenari multi-utente:** Distribuisci istanze bot separate per utente.

## Protezione Path Traversal

La funzione `safe_path()` previene attacchi di directory traversal:

```python
safe_path("photo.jpg", Path("storage/temp"))     # OK
safe_path("../../etc/passwd", Path("storage/temp"))  # Bloccato
```

**Implementazione:**
- Risolve il percorso richiesto rispetto a una directory base
- Garantisce che il percorso risolto rimanga all'interno della directory base
- Blocca qualsiasi percorso che esce dalla directory prevista

**Applicato a:**
- Download foto
- Download documenti
- Download messaggi vocali
- Qualsiasi operazione file system

## Blocco File Sensibili

I seguenti pattern di file sono bloccati dal download:

| Pattern | Motivo |
|---------|--------|
| `.env`, `.env.local`, `.env.*` | Variabili ambiente con segreti |
| `.ssh/`, `id_rsa`, `id_ed25519`, `authorized_keys` | Credenziali SSH |
| `.pem`, `.key`, `.p12`, `.pfx` | Certificati e chiavi SSL/TLS |
| `credentials`, `secrets`, `secret`, `token` | File credenziali |
| `.aws/`, `.docker/`, `.netrc`, `.htpasswd` | Credenziali servizio |

**Implementazione:** La funzione `is_sensitive()` verifica i nomi file contro questa blocklist.

## Privacy Vocale

La trascrizione vocale è **100% locale**. Nessun dato audio viene inviato a API cloud:

- **Modello:** `faster-whisper` con modello "small"
- **Esecuzione:** Solo CPU, quantizzazione int8
- **Storage:** File modello cachati in `storage/models/`
- **File audio:** Temporanei in `storage/temp/` e auto-puliti

**Garanzia privacy:** I tuoi messaggi vocali non lasciano mai la tua macchina.

## Pulizia File Temporanei

Ad ogni avvio, i file in `storage/temp/` più vecchi di 1 ora vengono eliminati:

```python
def _clean_temp():
    cutoff = time.time() - 3600
    for entry in temp_dir.iterdir():
        if entry.is_file() and entry.stat().st_mtime < cutoff:
            entry.unlink()
```

**Scopo:**
- Prevenire esaurimento spazio disco
- Rimuovere file temporanei potenzialmente sensibili
- Mantenere stato storage pulito

## Isolamento `.opencode/`

Il bot **non scrive mai** in `.opencode/`. Questa directory è riservata alla configurazione locale OpenCode:

- **Sola lettura:** Il bot legge la configurazione agente
- **Nessuna modifica:** L'utente gestisce la configurazione manualmente
- **Separazione compiti:** Runtime bot vs. configurazione AI

## Variabili d'Ambiente

Il file `.env` non viene mai letto dal bot dopo l'avvio:

- **Caricamento unico:** Tutti i valori caricati in dataclass `Config` immutabile all'avvio
- **Nessuna modifica runtime:** La configurazione non può essere modificata durante l'esecuzione
- **Validazione:** Formato token e campi richiesti validati al caricamento

### Gestione Sicura `.env`

**Best practices:**
- Non committare mai `.env` al version control
- Usa permessi file restrittivi (`chmod 600 .env`)
- Ruota i token bot periodicamente
- Usa password forti per auth server OpenCode

## Gestione Sessioni

Le sessioni sono memorizzate **solo in memoria** (`dict[int, str]`):

- **Nessuna persistenza:** Dati sessione persi al riavvio
- **Nessun I/O file:** Sessioni mai scritte su disco
- **Isolamento per-chat:** Ogni chat ha sessione indipendente

**Beneficio sicurezza:** Nessun dato sessione sopravvive al riavvio bot.

## Permessi Skill

Le skill sono configurate in `.opencode/opencode.json`:

```json
"permission": {
  "skill": {
    "*": "allow"
  }
}
```

**Configurazione corrente:** Tutte le skill sono auto-allow.

**Considerazioni sicurezza skill:**
- Le skill forniscono solo guida — non eseguono codice
- Le skill non possono accedere direttamente ai file
- Le skill operano entro i confini permessi agente
- I permessi agente (read/bash/write) controllano operazioni effettive

### Permessi Agente

L'agente `file-parser` dimostra permessi ristretti:

```markdown
permission:
  edit: deny
  bash: deny
  skill:
    "*": deny
```

**Scopo:** Analisi file senza capacità di modifica o esecuzione.

## Sicurezza Rete

### Server OpenCode

Il bot comunica con il server OpenCode via HTTP:

- **Default:** `http://127.0.0.1:4096` (solo localhost)
- **Auth:** Supporto Basic Auth (username/password)
- **Raccomandazione:** Mantieni server su localhost, usa auth in produzione

### API Telegram

Il bot usa le Bot API di Telegram:

- **Crittografato:** Tutto il traffico Telegram è crittografato
- **Sicurezza token:** Il token bot deve essere mantenuto segreto
- **Rate limit:** Telegram applica rate limit API

## Sicurezza Storage

### Struttura Directory

```
storage/
├── logs/       # Log bot e server
├── models/     # Cache modello Whisper
├── temp/       # File temporanei (auto-puliti)
└── uploads/    # File caricati utenti
```

### Misure di Sicurezza

| Directory | Protezione |
|-----------|------------|
| `logs/` | Gitignorato, solo locale |
| `models/` | Cache modello sola lettura |
| `temp/` | Auto-pulito, accesso ristretto |
| `uploads/` | Nomi file sanitizzati, protezione path |

## Modello di Minaccia

### Minacce Mitigate

| Minaccia | Mitigazione |
|----------|-------------|
| Accesso non autorizzato | Restrizione `ALLOWED_CHAT_ID` |
| Path traversal | Validazione `safe_path()` |
| Esposizione credenziali | Blocklist file sensibili |
| Esaurimento disco | Auto-pulizia temp |
| Privacy vocale | Solo trascrizione locale |
| Hijacking sessione | Sessioni in memoria, nessuna persistenza |

### Minacce Non Mitigate

| Minaccia | Motivo |
|----------|--------|
| Token bot compromesso | Responsabilità utente |
| Compromissione API Telegram | Dipendenza esterna |
| Compromissione server OpenCode | Dipendenza esterna |
| Upload file malevoli | Limitato da restrizioni tipo file |

## Checklist Sicurezza

Prima di distribuire:

- [ ] Imposta `ALLOWED_CHAT_ID` al tuo chat ID
- [ ] Verifica token bot sia segreto e ruotato
- [ ] Imposta credenziali auth server OpenCode
- [ ] Assicurati `.env` sia gitignorato
- [ ] Imposta permessi restrittivi su `.env` (`chmod 600`)
- [ ] Verifica server `opencode` giri solo su localhost
- [ ] Review permessi skill in `.opencode/opencode.json`

## Risposta Incidenti

### Se Token Bot è Compromesso

1. Revocha token via @BotFather
2. Genera nuovo token
3. Aggiorna `.env` con nuovo token
4. Riavvia bot

### Se Rilevato Accesso Non Autorizzato

1. Controlla configurazione `ALLOWED_CHAT_ID`
2. Review log bot per attività sospette
3. Revocha e rigenera token bot
4. Audit accesso server OpenCode

## Note Compliance

### GDPR

- **Elaborazione dati:** Trascrizione vocale è locale (nessun trasferimento dati)
- **Conservazione dati:** File temp auto-eliminati dopo 1 ora
- **Minimizzazione dati:** Nessuno storage sessione persistente

### Elaborazione Dati

| Tipo Dato | Elaborazione | Storage | Conservazione |
|-----------|--------------|---------|---------------|
| Audio vocale | Trascrizione locale | Temp (max 1h) | Auto-eliminato |
| Foto | Inviate a OpenCode | Temp (max 1h) | Auto-eliminato |
| Documenti | Inviati a OpenCode | Temp (max 1h) | Auto-eliminato |
| Messaggi testo | Inviati a OpenCode | In-memoria | Fino a riavvio |
| ID sessione | Tracking in-memoria | In-memoria | Fino a riavvio |

## Aggiornamenti Sicurezza

Le patch sicurezza sono rilasciate secondo necessità. Monitora il repository per security advisory.

### Segnalare Problemi Sicurezza

**Non** segnalare problemi sicurezza tramite canali pubblici. Contatta direttamente il maintainer.
