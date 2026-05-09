# Sicurezza

## Panoramica

Il bot è progettato come **interfaccia mobile** per OpenCode, non come servizio AI general-purpose. Le misure di sicurezza si concentrano su:

1. **Controllo accessi** — solo utenti Telegram autorizzati
2. **Prevenzione path traversal** — gestione sicura dei file
3. **Blocco file sensibili** — prevenire esposizione credenziali
4. **Auto-pulizia** — prevenire accumulo file temporanei

## Controllo Accessi

Il bot usa `ALLOWED_CHAT_ID` per limitare l'accesso a una singola chat Telegram:

```python
if chat.id != allowed_chat_id:
    await update.effective_message.reply_text("Access denied.")
```

**Raccomandazione:** Imposta sempre `ALLOWED_CHAT_ID`. Puoi ottenere il tuo chat ID mandando un messaggio a [@userinfobot](https://t.me/userinfobot) su Telegram.

## Protezione Path Traversal

La funzione `safe_path()` previene attacchi di directory traversal:

```python
safe_path("photo.jpg", Path("storage/temp"))     # ✅ OK
safe_path("../../etc/passwd", Path("storage/temp"))  # ❌ Bloccato
```

Risolve il percorso richiesto rispetto a una directory base e garantisce che il risultato rimanga al suo interno.

## Blocco File Sensibili

I seguenti pattern di file sono bloccati dal download:

- `.env`, `.env.local`, `.env.*`
- `.ssh/`, `id_rsa`, `id_ed25519`, `authorized_keys`
- `.pem`, `.key`, `.p12`, `.pfx`
- `credentials`, `secrets`, `secret`, `token`
- `.aws/`, `.docker/`, `.netrc`, `.htpasswd`

## Privacy Vocale

La trascrizione vocale è **100% locale**. Nessun dato audio viene inviato a API cloud:
- Usa `faster-whisper` con modello "small" su CPU (quantizzazione int8)
- File modello cachati in `storage/models/`
- File audio temporanei in `storage/temp/` e auto-puliti

## Pulizia File Temporanei

Ad ogni avvio, i file in `storage/temp/` più vecchi di 1 ora vengono eliminati:

```python
def _clean_temp():
    cutoff = time.time() - 3600
    for entry in temp_dir.iterdir():
        if entry.is_file() and entry.stat().st_mtime < cutoff:
            entry.unlink()
```

## Isolamento `.opencode/`

Il bot **non scrive mai** in `.opencode/`. Questa directory è riservata alla configurazione locale di OpenCode.

## Variabili d'Ambiente

Il file `.env` non viene mai letto dal bot dopo l'avvio. Tutti i valori sono caricati in un dataclass `Config` immutabile.

## Gestione Sessioni

Le sessioni sono memorizzate **solo in memoria** (`dict[int, str]`). Nessun dato di sessione persiste oltre il riavvio del bot.
