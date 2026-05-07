# OpenCode Agents — Guida all'Uso

> **Lingua:** Questa guida è disponibile anche in [inglese 🇬🇧](usage-guide.md).

## La Regola d'Oro

**Gli agenti non fanno nulla da soli.**  
Devi SEMPRE scrivere un prompt e dirgli esplicitamente cosa fare.  
Pensali come colleghi esperti: tu gli dai un compito, loro lo eseguono.

---

## Avvio Rapido (Esempio Reale)

**Obiettivo:** Vuoi aggiungere una funzione che valida le email e ottenere i test.

**Passo 1 — Apri la TUI**
```bash
opencode
```

**Passo 2 — Inizializza il contesto**
```
/init
```

**Passo 3 — Chiedi all'agente di implementare**
```
@codebase Crea una funzione TypeScript `isValidEmail(email: string): boolean` in `src/utils/validators.ts`. Usa una semplice regex. Esportala.
```

**Passo 4 — Chiedi all'agente di generare i test**
```
@generate-tests src/utils/validators.ts
```

**Passo 5 — Revisiona ciò che è stato generato**
```
@code-review src/utils/validators.ts
```

> **Nota:** Hai scritto tre prompt separati. Gli agenti NON si sono parlati automaticamente tra loro.

---

## Flussi di Lavoro Reali

### Flusso 1: "Ho bisogno di documentazione per il mio codice"

**Scenario:** Hai appena scritto `src/auth/login.ts` e vuoi una sezione nel README.

**Cosa scrivi:**
```
@docs Leggi src/auth/login.ts e scrivi una sezione "Autenticazione" per README.md. Includi: scopo, come chiamarla, input/output attesi, e un esempio d'uso.
```

**Vuoi una critica spietata della tua documentazione?**
```
@brutal-critic Revisiona la sezione "Autenticazione" in README.md. Elenca ogni ambiguità, dettaglio mancante o punto debole che un nuovo sviluppatore incontrerebbe.
```

---

### Flusso 2: "Voglio rifattorizzare, ma prima ho bisogno di un piano"

**Scenario:** `src/index.ts` è un pasticcio di 300 righe e hai paura di rompere tutto.

**Cosa scrivi:**
```
@planner Voglio dividere src/index.ts in: cli.ts (parsing argomenti), logger.ts (logging), e index.ts (orchestrazione). Non modificare i file. Dammi solo un piano numerato passo-passo.
```

**Quando il piano ti convince, eseguilo:**
```
@codebase Segui esattamente il piano di refactoring di @planner. Crea i nuovi file e aggiorna gli import.
```

---

### Flusso 3: "Ho bisogno di un post di blog su questo progetto"

**Cosa scrivi:**
```
@blogger Scrivi un post di blog di 800 parole intitolato "Come uso OpenCode Agents per accelerare lo sviluppo". Pubblico target: sviluppatori che non hanno mai usato agenti AI. Includi: cos'è OpenCode, un esempio concreto con @codebase, e un consiglio per principianti.
```

**Poi miglioralo con una critica:**
```
@brutal-critic Revisiona il post di blog. Sii duro ma costruttivo. Dimmi cosa è noioso, generico o mancante.
```

---

### Flusso 4: "Devo controllare le licenze prima di pubblicare"

**Cosa scrivi:**
```
@legal-advisor Leggi package.json e .opencode/package.json. Controlla tutte le dipendenze per compatibilità licenze con MIT. Segnala eventuali licenze GPL, proprietarie o poco chiare.
```

---

### Flusso 5: "Ho una feature complessa che ha bisogno di più agenti"

**Cosa scrivi:**
```
@orchestrator Ho bisogno di un sistema di autenticazione utente con: registrazione, login, token JWT, e hashing password. Pianifica l'architettura prima, poi implementala, poi revisionala per sicurezza. Riporta cosa è stato fatto a ogni passo.
```

> **Cosa succede:** Orchestrator chiama @planner → @codebase → @review in sequenza. Hai dato UN solo prompt, ma l'orchestrator ha gestito la catena.

---

## Come Funzionano Gli Agenti (La Verità)

| Mito | Realtà |
|------|--------|
| Gli agenti scansionano il mio codice automaticamente | ❌ No. Leggono solo ciò che gli chiedi tu di leggere. |
| Gli agenti correggono bug mentre dormo | ❌ No. Devi scrivere tu un prompt per farlo. |
| I comandi slash sono pulsanti magici | ⚠️ Un po'. Sono prompt pre-scritti. Li devi comunque eseguire manualmente. |
| Le skill rendono l'agente più intelligente automaticamente | ❌ No. Devi chiedere all'agente di "usare la skill X". Altrimenti la ignora. |

---

## Compiti Comuni — Prompt Esatti da Copiare

### `@codebase`
```
@codebase Crea una classe TypeScript UserService in src/services/user.ts con metodi: createUser, getUserById, updateUser. Usa storage in-memory per ora.
```

```
@codebase Aggiungi gestione errori a src/services/user.ts. Lancia errori personalizzati per "not found" e "invalid input".
```

### `@generate-tests`
```
/generate-tests src/services/user.ts
```

### `@code-review`
```
/code-review src/services/user.ts
```

### `@security-audit`
```
/security-audit src/auth/
```

### `@docs`
```
@docs Genera documentazione API per tutto ciò che è esportato da src/services/ e scrivila in docs/api.md.
```

### `@create-readme`
```
/create-readme
```

### `@blog-post`
```
/blog-post Perché TypeScript Strict Mode fa risparmiare ore di debug
```

### `@1-on-1-prep`
```
/1-on-1-prep Alice Sembra sopraffatta dalla nuova codebase
```

---

## Cosa Sono Le Skill? (E Come Si Usano Davvero)

Una **skill** è un pacchetto di best practice specifiche di un dominio. Non fa **nulla** finché non la menzioni.

**Sbagliato:**  
*(Non fai nulla. La skill non è attiva.)*

**Corretto:**
```
@codebase Rifattorizza questo codice seguendo le best practice di TypeScript strict mode. Usa la skill typescript.
```

**Altro esempio:**
```
@planner Pianifica una REST API per un blog. Usa la skill node-express per le convenzioni di routing.
```

---

## Comandi del Progetto (Fuori dalla TUI)

Questi sono semplici script npm. Eseguili nel terminale normale, non dentro `opencode`.

| Comando | Quando usarlo |
|---------|--------------|
| `npm run build` | Prima di `npm start`, dopo ogni modifica al codice |
| `npm run dev` | Durante lo sviluppo (ricompila automaticamente al salvataggio) |
| `npm start` | Avvia la CLI compilata. Funziona solo dopo `build` |

**Sessione tipica:**
```bash
npm run dev    # Nel terminale 1: modalità watch
opencode       # Nel terminale 2: parla con gli agenti
```

---

## Struttura dei File che Conta

```
.
├── src/                  # Il tuo codice TypeScript (modifica qui)
├── dist/                 # JS compilato (non modificare, generato da tsc)
├── docs/                 # Documentazione che scrivi o generi
├── .opencode/agents/     # Personalità degli agenti (raramente da modificare)
├── .opencode/commands/   # Template dei comandi slash
├── .opencode/skills/     # Pacchetti di conoscenza di dominio
├── AGENTS.md             # Convenzioni agenti per questo repo
└── opencode.json         # Config CLI (permessi, plugin)
```

> **Importante:** `opencode.json` vieta agli agenti di scrivere fuori da questa cartella (`external_directory: deny`) e blocca loop illimitati (`doom_loop: deny`). Se un agente chiede permessi, è per questo motivo.

---

## Checklist Prima di Iniziare

- [ ] `npm run build` termina senza errori TypeScript
- [ ] Hai avviato `opencode` e eseguito `/init`
- [ ] Sai quale agente gestisce il tuo compito (usa la tabella sotto)

| Voglio... | Usa questo |
|-----------|-----------|
| Scrivere o rifattorizzare codice | `@codebase` |
| Pianificare prima di toccare il codice | `@planner` |
| Controllare sicurezza/qualità | `@review`, `/security-audit`, `/code-review` |
| Scrivere documentazione o README | `@docs`, `/api-docs`, `/create-readme` |
| Scrivere un post di blog | `@blogger`, `/blog-post` |
| Ricevere un feedback spietato | `@brutal-critic`, `/content-review` |
| Coordinare una feature grande | `@orchestrator`, `/plan-project` |
| Controllare licenze | `@legal-advisor`, `/legal-review` |
| Preparare un 1-on-1 | `@em-advisor`, `/1-on-1-prep` |

---

## Non Sai Da Dove Iniziare?

Se non sai quale agente usare, chiedilo all'orchestrator:
```
@orchestrator Ho bisogno di [descrivi il tuo obiettivo]. Quale agente dovrei usare, e cosa dovrei chiedergli?
```
