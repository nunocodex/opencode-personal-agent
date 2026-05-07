# OpenCode Agents — Guida all'Uso

Guida completa all'uso dell'OpenCode CLI, degli agenti, dei comandi slash e delle skill in questo progetto.

> **Lingua:** Questa guida è disponibile anche in [inglese 🇬🇧](usage-guide.md).

## Indice

- [Prerequisiti](#prerequisiti)
- [Configurazione del Progetto](#configurazione-del-progetto)
- [Avvio Rapido](#avvio-rapido)
- [Agenti](#agenti)
- [Comandi Slash](#comandi-slash)
- [Skill](#skill)
- [Estendere il Progetto](#estendere-il-progetto)
- [Struttura del Progetto](#struttura-del-progetto)
- [Note Importanti](#note-importanti)

---

## Prerequisiti

- **Node.js 22+**
- **OpenCode CLI** installato globalmente (`npm install -g @opencode-ai/cli`)
- Le dipendenze del progetto sotto `.opencode/` sono già installate

## Configurazione del Progetto

```bash
# Compila il codice TypeScript in dist/
npm run build

# Avvia il punto di ingresso CLI compilato
npm start

# Modalità watch per lo sviluppo (ricompila automaticamente ai cambiamenti)
npm run dev
```

> **Nota:** `npm start` richiede prima `npm run build`. Non c'è un hook pre-build.

## Avvio Rapido

1. Avvia la sessione interattiva di OpenCode:
   ```bash
   opencode
   ```
2. Inizializza il contesto del progetto:
   ```bash
   /init
   ```
3. Invoca un agente o un comando (vedi esempi sotto).

---

## Agenti

Gli agenti si invocano con `@nome-agente` seguito dalla richiesta.

### `@codebase` — Implementazione Funzionalità e Test
Implementa funzionalità, rifattorizza codice e genera test.

**Esempio:**
```
@codebase Crea una funzione utility TypeScript che valida indirizzi email usando Zod, con unit test.
```

### `@planner` — Pianificazione Architettura e Refactoring
Produce analisi in sola lettura e piani passo-passo senza modificare il codice.

**Esempio:**
```
@planner Pianifica un refactoring per dividere il monolitico src/index.ts in moduli separati per parsing argomenti CLI, logging e logica di business.
```

### `@review` — Sicurezza, Performance e Qualità
Audita il codice per vulnerabilità, colli di bottiglia prestazionali e problemi di stile.

**Esempio:**
```
@review Revisiona src/index.ts per le best practice di sicurezza e suggerisci miglioramenti.
```

### `@docs` — Generazione Documentazione
Crea README, documentazione API, Architecture Decision Records (ADR) e guide.

**Esempio:**
```
@docs Genera la documentazione API per tutte le funzioni esportate in src/.
```

### `@orchestrator` — Coordinamento Multi-Fase
Coordina task complessi attraverso più agenti con loop di verifica.

**Esempio:**
```
@orchestrator Implementa un sistema di autenticazione utente con login, registrazione e token JWT. Usa @planner per l'architettura, @codebase per l'implementazione e @review per la validazione.
```

### `@blogger` — Stesura Contenuti Tech
Scrive post di blog, articoli, script video e podcast.

**Esempio:**
```
@blogger Scrivi un post di blog intitolato "Iniziare con OpenCode Agents" che copra setup, agenti e comandi.
```

### `@brutal-critic` — Controllo Qualità Contenuti
Fornisce critiche dure ma costruttive su contenuti, codice o documentazione.

**Esempio:**
```
@brutal-critic Revisiona il file README.md e indica ogni debolezza, ambiguità o dettaglio mancante.
```

### `@em-advisor` — Guida Engineering Management
Aiuta con leadership, 1-on-1, dinamiche di team e prioritizzazione.

**Esempio:**
```
@em-advisor Prepara un'agenda per un 1-on-1 con il mio sviluppatore junior che ha difficoltà con TypeScript strict mode.
```

### `@legal-advisor` — Audit Licenze e Compliance
Revisiona licenze, proprietà intellettuale e privacy dei dati (GDPR, CCPA, ecc.).

**Esempio:**
```
@legal-advisor Fai un audit delle dipendenze in package.json per la compatibilità delle licenze con MIT e segnala eventuali conflitti GPL o proprietari.
```

---

## Comandi Slash

I comandi slash sono scorciatoie definite in `.opencode/commands/`. Eseguili con `/nome-comando` nella TUI di OpenCode.

### Pianificazione ed Esecuzione

| Comando | Esempio |
|---------|---------|
| `/plan-project` | `/plan-project Aggiungi autenticazione OAuth2 con provider GitHub e Google` |
| `/execution-loop` | `/execution-loop Rifattorizza tutte le funzioni utility per usare async/await` |
| `/stop-loop` | `/stop-loop La logica di autenticazione è verificata e completa` |

### Qualità del Codice e Test

| Comando | Esempio |
|---------|---------|
| `/code-review` | `/code-review src/utils/validator.ts` |
| `/generate-tests` | `/generate-tests src/utils/validator.ts` |
| `/security-audit` | `/security-audit src/auth/` |
| `/architecture-review` | `/architecture-review Proposta di split in microservizi` |

### Documentazione

| Comando | Esempio |
|---------|---------|
| `/api-docs` | `/api-docs src/routes/` |
| `/create-readme` | `/create-readme` |
| `/architecture-decision` | `/architecture-decision Migrazione da REST a GraphQL` |

### Contenuti e Compliance

| Comando | Esempio |
|---------|---------|
| `/blog-post` | `/blog-post Come costruire API scalabili con Node.js` |
| `/content-review` | `/content-review README.md` |
| `/legal-review` | `/legal-review package.json` |

### Management

| Comando | Esempio |
|---------|---------|
| `/1-on-1-prep` | `/1-on-1-prep Alice Problemi con la migrazione a TypeScript` |

---

## Skill

Le skill sono set di istruzioni specializzate per domini specifici. Caricale on-demand quando lavori su un task pertinente.

**Come caricare una skill:**
```
Usa la skill typescript per rifattorizzare questo codice in strict mode.
```

**Skill disponibili:**
- `typescript` — TypeScript strict mode, pattern moderni, type safety
- `node-express` — Best practice per API Node.js & Express
- `react-next` — React & Next.js con TypeScript e accessibilità
- `python` — Type hints, testing, struttura Python
- `go` — Moduli Go, error handling, concurrency
- `rust` — Ownership Rust, error handling, performance
- `java-spring` — Spring Boot, DI, validation, testing
- `dotnet` — Clean Architecture, convenzioni C#
- `ruby-rails` — Rails MVC, ActiveRecord, testing
- `flutter` — Riverpod, Freezed, architettura feature-based
- `sql-migrations` — Cambiamenti schema sicuri, best practice migration
- `ux-responsive` — Design responsive, accessibilità-first
- `blogger` — Creazione contenuti tech
- `brutal-critic` — Framework di review contenuti
- `docs-validation` — Controlli qualità documentazione
- `agent-diagnostics` — Validazione config agent e setup
- `project-bootstrap` — Creazione contesto baseline OpenCode

**Aggiungere una nuova skill:**
1. Crea `.opencode/skills/<nome>/SKILL.md`
2. Scrivi istruzioni ed esempi specifici del dominio
3. Riferiscila nella conversazione quando necessario

---

## Estendere il Progetto

### Aggiungere un Agente Personalizzato

1. Crea `.opencode/agents/<nome-agente>.md`
2. Definisci scopo, istruzioni e vincoli dell'agente
3. Invoca con `@nome-agente`

### Aggiungere un Comando Slash Personalizzato

1. Crea `.opencode/commands/<nome-comando>.md`
2. Aggiungi il frontmatter:
   ```yaml
   ---
   description: Cosa fa questo comando
   agent: agente-consigliato
   subtask: true
   ---
   ```
3. Scrivi il template del prompt nel corpo
4. Esegui con `/nome-comando` nella TUI

### Aggiungere Logica di Runtime

Il punto di ingresso CLI compilato è `src/index.ts`. Estendilo per comportamenti runtime personalizzati. Ricorda di eseguire `npm run build` prima di testare con `npm start`.

---

## Struttura del Progetto

```
.
├── src/                          # Sorgente TypeScript
│   └── index.ts                  # Punto di ingresso CLI
├── dist/                         # Output compilato (da tsc)
├── docs/                         # Documentazione progetto
│   ├── usage-guide.md            # Questa guida (inglese)
│   └── usage-guide.it.md         # Versione italiana
├── .opencode/
│   ├── agents/                   # File di configurazione agenti
│   ├── commands/                 # Definizioni comandi slash
│   ├── skills/                   # Skill pack specifici di dominio
│   └── package.json              # Dipendenze plugin
├── opencode.json                 # Configurazione OpenCode CLI
├── tsconfig.json                 # TypeScript strict, ESM, Node16
└── package.json                  # Manifest progetto
```

---

## Note Importanti

- **Permessi:** `opencode.json` nega scritture `external_directory` e `doom_loop`. Gli agenti non possono scrivere fuori da questo workspace o eseguire loop iterativi illimitati per default.
- **Nessun hook pre-build:** Esegui sempre `npm run build` prima di `npm start`.
- **Nessun test/lint/CI configurato:** Non è ancora configurato alcun test runner, linter, formatter o pipeline CI.
- **Le config agent sono globali:** Modificare i file sotto `.opencode/agents/` cambia permanentemente il comportamento degli agenti per questo progetto.
