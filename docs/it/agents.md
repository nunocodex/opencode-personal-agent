# Agenti, Plugin e Skill

Riferimento completo per tutti gli agenti, plugin e skill OpenCode disponibili nel bot Telegram.

## Agenti

Il bot utilizza il sistema multi-agente di OpenCode con 14 agenti specializzati. Ogni agente è ottimizzato per compiti specifici e utilizza un modello dedicato.

### Configurazione Agenti

Gli agenti sono configurati in `.opencode/opencode.json`. L'agente predefinito è `build`.

### Tabella di Riferimento Agenti

| Agente | Modello | Scopo | Quando Usare |
|--------|---------|-------|--------------|
| `build` | deepseek-v4-flash | Costruire nuove funzionalità e codice | Creare nuovo codice, implementare feature |
| `plan` | glm-5.1 | Pianificazione architettura e implementazione | Pianificazione alto livello, system design |
| `explore` | deepseek-v4-flash | Esplorare e comprendere codebase | Comprendere codice esistente, trovare pattern |
| `scout` | qwen3.6-plus | Trovare file e pattern specifici | Localizzare file, cercare nelle codebase |
| `orchestrator` | kimi-k2.6 | Coordinare compiti complessi multi-step | Refactoring grandi, modifiche multi-file |
| `planner` | glm-5.1 | Creare piani di implementazione dettagliati | Pianificazione implementazione step-by-step |
| `codebase` | kimi-k2.6 | Modificare ed estendere codice esistente | Aggiungere feature a codice esistente |
| `review` | glm-5.1 | Revisione codice e analisi sicurezza | Revisionare codice, trovare vulnerabilità |
| `docs` | qwen3.5-plus | Generare documentazione | Scrivere API docs, file README |
| `em-advisor` | qwen3.6-plus | Consulenza engineering management | Processi team, struttura progetto |
| `blogger` | qwen3.5-plus | Scrivere post blog e contenuti | Creazione contenuti, post social media |
| `brutal-critic` | glm-5.1 | Revisione critica e feedback | Critica onesta ma costruttiva |
| `legal-advisor` | glm-5.1 | Guida legale e compliance | Licensing, GDPR, domande legali |
| `file-parser` | kimi-k2.6 | Analizzare immagini, documenti, video | Analisi file, OCR, estrazione contenuti |

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

#### explore

**Scopo:** Esplorare e comprendere codebase esistenti.

**Prompt di esempio:**
- "Explore this codebase and tell me how authentication works"
- "Find all the API endpoints in this project"
- "Understand the data flow from frontend to database"

**Risposta attesa:** Analisi codebase, spiegazioni flussi, posizioni file chiave.

#### scout

**Scopo:** Trovare file e pattern specifici nelle codebase.

**Prompt di esempio:**
- "Find all files related to database configuration"
- "Locate all TODO comments in the codebase"
- "Find where the email sending logic is implemented"

**Risposta attesa:** Percorsi file, numeri di riga, snippet codice.

#### orchestrator

**Scopo:** Coordinare compiti complessi multi-step.

**Prompt di esempio:**
- "I need to refactor my bot handlers - coordinate the full plan"
- "Migrate this project from JavaScript to TypeScript"
- "Upgrade all dependencies and fix breaking changes"

**Risposta attesa:** Flusso di lavoro multi-agente coordinato, breakdown compiti.

#### planner

**Scopo:** Creare piani di implementazione dettagliati.

**Prompt di esempio:**
- "Create a detailed implementation plan for adding user authentication"
- "Plan the steps to add caching to this API"
- "Create a roadmap for adding dark mode to the UI"

**Risposta attesa:** Piano di implementazione step-by-step con priorità.

#### codebase

**Scopo:** Modificare ed estendere codice esistente.

**Prompt di esempio:**
- "Add a new command handler for /stats that shows usage statistics"
- "Implement rate limiting for the API endpoints"
- "Add input validation to the user registration form"

**Risposta attesa:** Modifiche codice con spiegazioni.

#### review

**Scopo:** Revisione codice e analisi sicurezza.

**Prompt di esempio:**
- "Review this pull request for security issues"
- "Analyze this code for potential bugs and edge cases"
- "Review my code for performance improvements"

**Risposta attesa:** Risultati sicurezza, report bug, suggerimenti miglioramento.

#### docs

**Scopo:** Generare documentazione.

**Prompt di esempio:**
- "Generate API documentation for the OpenCode client module"
- "Write a README for this Python project"
- "Create inline documentation for these functions"

**Risposta attesa:** Documentazione ben strutturata in markdown o docstring.

#### em-advisor

**Scopo:** Consulenza engineering management.

**Prompt di esempio:**
- "What's the best way to structure a Python async project?"
- "How should I organize my team's code review process?"
- "What metrics should I track for my SaaS application?"

**Risposta attesa:** Best practices, consigli organizzativi, raccomandazioni.

#### blogger

**Scopo:** Scrivere post blog e contenuti.

**Prompt di esempio:**
- "Write a blog post about how I built this Telegram AI bot"
- "Create a LinkedIn post announcing my new open source project"
- "Write a technical tutorial on async Python programming"

**Risposta attesa:** Contenuti coinvolgenti e ben strutturati, pronti per la pubblicazione.

#### brutal-critic

**Scopo:** Revisione critica e feedback.

**Prompt di esempio:**
- "Critique my project README and suggest improvements"
- "Review my blog post draft and be brutally honest"
- "Analyze my code and tell me what's wrong with it"

**Risposta attesa:** Critica onesta e diretta con miglioramenti azionabili.

#### legal-advisor

**Scopo:** Guida legale e compliance.

**Prompt di esempio:**
- "What licenses should I consider for an open source AI tool?"
- "What are GDPR requirements for user data collection?"
- "Do I need a privacy policy for my SaaS?"

**Risposta attesa:** Guida legale, requisiti compliance, raccomandazioni.

**Disclaimer:** Questo agente fornisce guida informativa only, non consulenza legale.

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

## Plugin

Tre plugin OpenCode estendono le capacità del bot:

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

### agents-opencode

**Descrizione:** Sistema di orchestrazione multi-agente.

**Funzionalità:**
- Selezione agente basata sul tipo di compito
- Collaborazione multi-agente
- Routing compiti ad agenti specializzati

**Quando usato:** Automaticamente instrada i compiti agli agenti appropriati.

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

### Skill Contenuti

| Skill | Dominio | Esempio Utilizzo |
|-------|---------|------------------|
| `career-content` | Resume, LinkedIn, lettere | "Optimize my resume for ATS systems" |
| `blogger` | Creazione contenuti | "Write a LinkedIn post about this project" |
| `brutal-critic` | Revisione contenuti | "Review my blog post draft" |

### Skill Professionali

| Skill | Dominio | Esempio Utilizzo |
|-------|---------|------------------|
| `legal-advisor` | Ricerca legale e compliance | "What GDPR rules apply to my SaaS?" |

### Skill di Sviluppo

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

#### career-content

```
Prompt: "Optimize my resume for ATS systems"

Atteso: Formattazione resume e ottimizzazione keyword
per Applicant Tracking Systems.
```

#### blogger

```
Prompt: "Write a LinkedIn post about launching my project"

Atteso: Contenuti social media coinvolgenti con formattazione
appropriata e call-to-action.
```

#### brutal-critic

```
Prompt: "Review my README and be brutally honest"

Atteso: Feedback diretto e onesto con suggerimenti
di miglioramento specifici.
```

#### legal-advisor

```
Prompt: "What GDPR rules apply to my SaaS application?"

Atteso: Requisiti compliance GDPR, linee guida gestione dati,
e considerazioni legali.

Disclaimer: Guida informativa only, non consulenza legale.
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

Oppure lascia che l'orchestrator selezioni automaticamente l'agente migliore per il tuo compito.

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
