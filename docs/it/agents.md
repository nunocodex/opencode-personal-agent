# Agenti, Plugin e Skill

Riferimento completo per tutti gli agenti, plugin e skill OpenCode disponibili nel bot Telegram.

## Agenti

Il bot utilizza il sistema multi-agente di OpenCode con 10 agenti specializzati. Ogni agente è ottimizzato per compiti specifici e utilizza un modello dedicato. Le definizioni degli agenti vivono come file `.md` indipendenti in `.agents/agents/` e sono collegate simbolicamente in `.opencode/agents/` per la scoperta da parte di OpenCode.

### Configurazione Agenti

Le definizioni degli agenti sono in `.agents/agents/*.md` (formato cross-tool compatibile). L'agente predefinito è `build`.

### Tabella di Riferimento Agenti

| Agente | Modello | Scopo | Quando Usare |
|--------|---------|-------|--------------|
| `build` | deepseek-v4-flash | Costruire nuove funzionalità e codice | Creare nuovo codice, implementare feature (default) |
| `plan` | deepseek-v4-flash | Pianificazione architettura e implementazione | Pianificazione standard, system design |
| `ultraplan` | deepseek-v4-pro | Pianificazione multi-fase approfondita tramite skill ultraplan | Sistemi complessi, architetture grandi |
| `explore` | deepseek-v4-flash | Esplorare e comprendere codebase | Comprendere codice esistente, trovare pattern |
| `debug` | deepseek-v4-pro | Debug sistematico e analisi cause radice | Investigare bug, test falliti, comportamento inaspettato |
| `review` | deepseek-v4-pro | Revisione codice e analisi sicurezza | Revisionare codice, trovare vulnerabilità |
| `docs` | deepseek-v4-pro | Generare documentazione | Scrivere API docs, file README |
| `file-parser` | qwen3.6-plus | Analizzare immagini, documenti, video (multimodale) | Analisi file, OCR, estrazione contenuti |
| `scout` | deepseek-v4-flash | Ricerca documentazione esterna e dipendenze | Investigare codice librerie, confrontare con upstream |
| `general` | deepseek-v4-flash | Ricerca generica e task multi-step | Domande complesse, esplorazione aperta |

### Esempi di Utilizzo per Agente

#### build

**Scopo:** Costruire nuove funzionalità e implementare codice.

**Prompt di esempio:**
- "Build a new Python CLI tool for task management with add/list/complete commands"
- "Create a FastAPI endpoint that accepts file uploads and stores them in S3"
- "Build a React component that displays a sortable data table"

**Risposta attesa:** Implementazione codice funzionante con spiegazioni.

#### plan

**Scopo:** Pianificazione architettura e implementazione ad alto livello.

**Prompt di esempio:**
- "Plan the architecture for a microservice that processes invoices"
- "Design a database schema for a multi-tenant SaaS application"
- "Plan the migration strategy from monolith to microservices"

**Risposta attesa:** Diagrammi architettura, breakdown componenti, raccomandazioni tecnologiche.

#### ultraplan

**Scopo:** Pianificazione multi-fase approfondita per sistemi complessi usando la skill ultraplan. Esegue 6 fasi (UNDERSTAND, RESEARCH, PLAN, REVIEW, VALIDATE, OUTPUT) con subagenti di ricerca paralleli e discovery esaustiva.

**Prompt di esempio:**
- "Design a comprehensive migration strategy from monolith to microservices"
- "Plan the full architecture for a multi-tenant SaaS platform with detailed component boundaries"
- "Create an exhaustive implementation plan for adding end-to-end encryption"

**Risposta attesa:** Directory `.ultraplan/` completa con PRD, piano tecnico, matrice tracciabilità e sommario.

#### explore

**Scopo:** Esplorare e comprendere codebase esistenti.

**Prompt di esempio:**
- "Explore this codebase and tell me how authentication works"
- "Find all the API endpoints in this project"
- "Understand the data flow from frontend to database"

**Risposta attesa:** Analisi codebase, spiegazioni flussi, posizioni file chiave.

#### debug

**Scopo:** Debug sistematico e analisi causa radice.

**Prompt di esempio:**
- "Investigate why the API endpoint returns 500 errors"
- "Find the root cause of this test failure"
- "Debug the memory leak in the background worker"

**Risposta attesa:** Analisi causa radice con evidenze, passi riproduzione, raccomandazioni fix.

#### review

**Scopo:** Revisione codice e analisi sicurezza.

**Prompt di esempio:**
- "Review this pull request for security issues"
- "Analyze this code for potential bugs and edge cases"
- "Review my code for performance improvements"

**Risposta attesa:** Risultati sicurezza, report bug, suggerimenti miglioramento.

#### scout

**Scopo:** Agente read-only per documentazione esterna e ricerca dipendenze.

**Prompt di esempio:**
- "Research the API of a third-party library we depend on"
- "Clone repo X and inspect how they handle authentication"
- "Cross-reference our implementation with an upstream library"

**Risposta attesa:** Analisi codice esterno, insight dipendenze, risultati documentazione.

#### docs

**Scopo:** Generare documentazione.

**Prompt di esempio:**
- "Generate API documentation for the OpenCode client module"
- "Write a README for this Python project"
- "Create inline documentation for these functions"

**Risposta attesa:** Documentazione ben strutturata in markdown o docstring.

#### file-parser

**Scopo:** Analizzare allegati file (immagini, documenti, video).

**Capacità:**
- **Immagini e Foto:** Analizzare contenuti visivi, estrarre testo (OCR), descrivere scene
- **Documenti:** Leggere PDF, TXT, DOCX, file codice; riassumere ed estrarre info chiave
- **Video e Audio:** Analizzare frame e contenuti audio quando supportato

**Prompt di esempio:**
- [Invia foto] "Analyze this image and describe its contents"
- [Invia documento] "Extract the key points from this PDF report"
- [Invia screenshot] "What does this error message mean?"
- [Invia file codice] "Explain what this code does"

**Risposta attesa:** Analisi strutturata con tipo file, descrizione dettagliata, punti chiave.

**Vincoli:**
- Può leggere file dal filesystem locale
- Non può modificare file o eseguire comandi (imposto: `edit: deny`, `bash: deny`, `skill: deny all`)
- Nota contenuti sensibili senza esporli

#### general

**Scopo:** Ricerca generica e task complessi multi-step.

**Prompt di esempio:**
- "Research the best Python libraries for async web scraping"
- "Compare PostgreSQL vs SQLite for a single-user desktop app"
- "Explain the differences between asyncio and threading in Python"

**Risposta attesa:** Analisi completa con trade-off e raccomandazioni.

## Plugin

Due plugin OpenCode estendono le capacità del bot:

### superpowers

**Descrizione:** Capacità AI avanzate e strumenti potenziati.

**Funzionalità:**
- Set di strumenti esteso per operazioni complesse
- Capacità di ragionamento avanzate
- Strumenti avanzati di manipolazione file

**Quando usato:** Automaticamente disponibile per tutti gli agenti.

### @asidorenko/openslimedit

**Descrizione:** Operazioni di modifica file efficienti.

**Funzionalità:**
- Modifica file precisa con modifiche minime
- Modifiche codice sicure
- Rischio ridotto di introdurre bug

**Quando usato:** Automaticamente usato dagli agenti quando modificano file.

## Skill

Le skill forniscono guida specifica per dominio e best practices. Tutte le skill sono auto-allow nella configurazione.

### Skill Linguaggi di Programmazione

| Skill | Dominio | Esempio Utilizzo |
|-------|---------|------------------|
| `python` | Best practices Python | "Write a Python function to parse JSON config files" |
| `react-next` | React e Next.js | "Create a responsive dashboard component" |
| `flutter` | Flutter/Dart con Riverpod | "Set up Riverpod state management" |
| `go` | Best practices Go | "Implement a REST API handler in Go" |
| `rust` | Best practices Rust | "Write a CLI tool in Rust with clap" |
| `dotnet` | .NET Clean Architecture | "Set up Clean Architecture in .NET" |
| `java-spring` | Java Spring Boot | "Create a REST controller with validation" |
| `node-express` | Node.js e Express | "Design an Express.js middleware for auth" |
| `ruby-rails` | Ruby on Rails | "Generate a migration for user profiles" |
| `typescript` | TypeScript strict mode | "Define strict types for an API response" |

### Skill di Dominio

| Skill | Dominio | Esempio Utilizzo |
|-------|---------|------------------|
| `sql-migrations` | Modifiche schema database | "Write a safe migration to add an index" |
| `ux-responsive` | Design UX responsive | "Make this component responsive for mobile" |

### Skill di Sviluppo

| Skill | Dominio | Esempio Utilizzo |
|-------|---------|------------------|
| `docs-validation` | Controlli qualità documentazione | "Check our docs for broken links" |
| `agent-diagnostics` | Validazione setup agenti | "Check my OpenCode config for issues" |
| `project-bootstrap` | Scaffold progetto | "Create AGENTS.md for a new project" |

| Skill | Dominio | Esempio Utilizzo |
|-------|---------|------------------|
| `docs-validation` | Controlli qualità documentazione | "Check our docs for broken links" |
| `agent-diagnostics` | Validazione setup agenti | "Check my OpenCode config for issues" |
| `project-bootstrap` | Scaffold progetto | "Create AGENTS.md for a new project" |

### Esempi di Utilizzo Skill

#### python

```
Prompt: "Write a Python function to parse JSON config files with validation"

Atteso: Codice Python ben strutturato con type hints, gestione errori,
e docstring seguendo PEP 8 e best practices.
```

#### react-next

```
Prompt: "Create a responsive dashboard component with charts"

Atteso: Componente React/Next.js con design responsive,
usando hook moderni e best practices.
```

#### flutter

```
Prompt: "Set up Riverpod state management for a counter app"

Atteso: Codice Flutter con provider Riverpod appropriati,
gestione stato e struttura widget.
```

#### go

```
Prompt: "Implement a REST API handler in Go with validation"

Atteso: Codice Go seguendo pattern idiomatici,
con gestione errori e struttura appropriate.
```

#### rust

```
Prompt: "Write a CLI tool in Rust with clap for argument parsing"

Atteso: Codice Rust con gestione errori appropriata,
configurazione clap e pattern idiomatici.
```

#### dotnet

```
Prompt: "Set up Clean Architecture for a .NET Web API"

Atteso: Struttura progetto .NET con layering appropriato,
dependency injection e separation of concerns.
```

#### java-spring

```
Prompt: "Create a Spring Boot REST controller with validation"

Atteso: Codice Spring Boot con annotazioni appropriate,
validazione e gestione eccezioni.
```

#### node-express

```
Prompt: "Design an Express.js middleware for JWT authentication"

Atteso: Middleware Node.js/Express con gestione errori
e pratiche di sicurezza appropriate.
```

#### ruby-rails

```
Prompt: "Generate a Rails migration for user profiles"

Atteso: Migrazione Rails con modifiche schema appropriate,
indici e supporto rollback.
```

#### typescript

```
Prompt: "Define strict types for a paginated API response"

Atteso: Interfacce TypeScript con generics appropriati,
compliance strict mode e type safety.
```

#### sql-migrations

```
Prompt: "Write a safe migration to add an index on users.email"

Atteso: Migrazione SQL con sintassi appropriata,
capacità rollback e considerazioni performance.
```

#### ux-responsive

```
Prompt: "Make this navigation component responsive for mobile"

Atteso: CSS/media queries o modifiche componente
per design responsive mobile-first.
```

#### docs-validation

```
Prompt: "Check our documentation for broken links"

Atteso: Report di link rotti, file mancanti,
e problemi qualità documentazione.
```

#### agent-diagnostics

```
Prompt: "Check my OpenCode configuration for issues"

Atteso: Report validazione config agente,
setup skill e potenziali problemi.
```

#### project-bootstrap

```
Prompt: "Create AGENTS.md for a new Python project"

Atteso: File AGENTS.md scaffoldato con struttura
appropriata e contenuti specifici per progetto.
```

## Selezione Agente

Il bot utilizza l'agente `build` di default. Per usare un agente specifico, menzionalo nel prompt:

```
"Using the review agent: please analyze this code for security issues"
```

## Selezione Skill

Le skill sono automaticamente applicate basandosi sul contesto del compito. Per richiedere esplicitamente una skill:

```
"Using the python skill: write a function to parse JSON"
```

## Combinare Agenti e Skill

Per risultati migliori, combina agenti con skill rilevanti:

```
"Using the docs agent with the python skill: generate API documentation
for this Python module with proper docstrings"
```
