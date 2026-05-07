# OpenCode Agents

Progetto personale di agenti AI basato sull'[OpenCode](https://opencode.ai) CLI e il plugin `agents-opencode`.

Questo repository fornisce una configurazione project-scoped di agenti AI specializzati per sviluppo, documentazione, creazione di contenuti e attività di compliance.

## Link Rapidi

- [📖 Usage Guide](docs/usage-guide.md) (inglese)
- [🇮🇹 Guida all'Uso](docs/usage-guide.it.md)
- [⚙️ AGENTS.md](AGENTS.md) — Convenzioni agenti e progetto

## Comandi Quotidiani

| Comando | Descrizione |
|---------|-------------|
| `npm run build` | Compila TypeScript (`src/` → `dist/`) |
| `npm run dev` | Modalità watch (`tsc --watch`) |
| `npm start` | Avvia il punto di ingresso CLI compilato |

> Esegui `build` prima di `start`; non c'è un hook pre-build.

## Tech Stack

- TypeScript 5.7+ (strict, ESM, risoluzione Node16)
- Node.js 22+
- OpenCode CLI + plugin `agents-opencode`

## Struttura del Progetto

```
.
├── src/              # Sorgente TypeScript (entry: index.ts)
├── dist/             # Output compilato
├── docs/             # Documentazione (guide d'uso)
├── .opencode/        # Config agenti, comandi, skill
├── opencode.json     # Configurazione OpenCode CLI
├── tsconfig.json     # Configurazione TypeScript
└── package.json      # Manifest progetto
```

## Licenza

MIT
