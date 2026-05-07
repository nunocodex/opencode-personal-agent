# OpenCode Agents

A personal AI agent project powered by the [OpenCode](https://opencode.ai) CLI and the `agents-opencode` plugin.

This repository provides a project-scoped configuration of specialized AI agents for development, documentation, content creation, and compliance tasks.

## Quick Links

- [📖 Usage Guide](docs/usage-guide.md)
- [🇮🇹 Guida all'Uso](docs/usage-guide.it.md)
- [⚙️ AGENTS.md](AGENTS.md) — Agent and project conventions

## Daily Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript (`src/` → `dist/`) |
| `npm run dev` | Watch mode (`tsc --watch`) |
| `npm start` | Run compiled CLI entry point |

> Run `build` before `start`; there is no pre-build hook.

## Tech Stack

- TypeScript 5.7+ (strict, ESM, Node16 resolution)
- Node.js 22+
- OpenCode CLI + `agents-opencode` plugin

## Project Structure

```
.
├── src/              # TypeScript source (entry: index.ts)
├── dist/             # Compiled output
├── docs/             # Documentation (usage guides)
├── .opencode/        # Agent configs, commands, skills
├── opencode.json     # OpenCode CLI configuration
├── tsconfig.json     # TypeScript configuration
└── package.json      # Project manifest
```

## License

MIT
