# OpenCode Agents — Usage Guide

A complete guide to using the OpenCode CLI, agents, slash commands, and skills in this project.

> **Language:** This guide is also available in [Italian 🇮🇹](usage-guide.it.md).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Quick Start](#quick-start)
- [Agents](#agents)
- [Slash Commands](#slash-commands)
- [Skills](#skills)
- [Extending the Project](#extending-the-project)
- [Project Structure](#project-structure)
- [Important Notes](#important-notes)

---

## Prerequisites

- **Node.js 22+**
- **OpenCode CLI** installed globally (`npm install -g @opencode-ai/cli`)
- The project dependencies under `.opencode/` are already installed

## Project Setup

```bash
# Compile TypeScript source to dist/
npm run build

# Start the compiled CLI entry point
npm start

# Watch mode for development (auto-rebuild on changes)
npm run dev
```

> **Note:** `npm start` requires `npm run build` first. There is no pre-build hook.

## Quick Start

1. Start the OpenCode interactive session:
   ```bash
   opencode
   ```
2. Initialize the project context:
   ```bash
   /init
   ```
3. Invoke an agent or command (see examples below).

---

## Agents

Agents are invoked with `@agent-name` followed by your request.

### `@codebase` — Feature Implementation & Testing
Implements features, refactors code, and generates tests.

**Example:**
```
@codebase Create a TypeScript utility function that validates email addresses using Zod, with unit tests.
```

### `@planner` — Architecture & Refactoring Plans
Produces read-only analysis and step-by-step plans without modifying code.

**Example:**
```
@planner Plan a refactoring to split the monolithic src/index.ts into separate modules for CLI argument parsing, logging, and business logic.
```

### `@review` — Security, Performance & Quality
Audits code for vulnerabilities, performance bottlenecks, and style issues.

**Example:**
```
@review Review src/index.ts for security best practices and suggest improvements.
```

### `@docs` — Documentation Generation
Creates READMEs, API docs, Architecture Decision Records (ADRs), and guides.

**Example:**
```
@docs Generate API documentation for all exported functions in src/.
```

### `@orchestrator` — Multi-Phase Coordination
Coordinates complex tasks across multiple agents with verification loops.

**Example:**
```
@orchestrator Implement a user authentication system with login, registration, and JWT tokens. Use @planner for the architecture, @codebase for implementation, and @review for validation.
```

### `@blogger` — Tech Content Drafting
Writes blog posts, articles, video scripts, and podcasts.

**Example:**
```
@blogger Write a blog post titled "Getting Started with OpenCode Agents" covering setup, agents, and commands.
```

### `@brutal-critic` — Content Quality Gate
Provides harsh but constructive criticism of content, code, or documentation.

**Example:**
```
@brutal-critic Review the README.md file and point out every weakness, ambiguity, or missing detail.
```

### `@em-advisor` — Engineering Management Guidance
Helps with leadership, 1-on-1s, team dynamics, and prioritization.

**Example:**
```
@em-advisor Prepare a 1-on-1 agenda with my junior developer who is struggling with TypeScript strict mode.
```

### `@legal-advisor` — License & Compliance Audits
Reviews licenses, intellectual property, and data privacy (GDPR, CCPA, etc.).

**Example:**
```
@legal-advisor Audit the dependencies in package.json for license compatibility with MIT and flag any GPL or proprietary conflicts.
```

---

## Slash Commands

Slash commands are shortcuts defined in `.opencode/commands/`. Run them with `/command-name` in the OpenCode TUI.

### Planning & Execution

| Command | Example |
|---------|---------|
| `/plan-project` | `/plan-project Add OAuth2 authentication with GitHub and Google providers` |
| `/execution-loop` | `/execution-loop Refactor all utility functions to use async/await` |
| `/stop-loop` | `/stop-loop Authentication logic is verified and complete` |

### Code Quality & Testing

| Command | Example |
|---------|---------|
| `/code-review` | `/code-review src/utils/validator.ts` |
| `/generate-tests` | `/generate-tests src/utils/validator.ts` |
| `/security-audit` | `/security-audit src/auth/` |
| `/architecture-review` | `/architecture-review Proposed microservices split` |

### Documentation

| Command | Example |
|---------|---------|
| `/api-docs` | `/api-docs src/routes/` |
| `/create-readme` | `/create-readme` |
| `/architecture-decision` | `/architecture-decision Migrate from REST to GraphQL` |

### Content & Compliance

| Command | Example |
|---------|---------|
| `/blog-post` | `/blog-post How to build scalable APIs with Node.js` |
| `/content-review` | `/content-review README.md` |
| `/legal-review` | `/legal-review package.json` |

### Management

| Command | Example |
|---------|---------|
| `/1-on-1-prep` | `/1-on-1-prep Alice TypeScript migration concerns` |

---

## Skills

Skills are specialized instruction sets for specific domains. Load them on-demand when working on a relevant task.

**How to load a skill:**
```
Use the typescript skill to refactor this code to strict mode.
```

**Available skills:**
- `typescript` — TypeScript strict mode, modern patterns, type safety
- `node-express` — Node.js & Express API best practices
- `react-next` — React & Next.js with TypeScript and accessibility
- `python` — Python type hints, testing, structure
- `go` — Go modules, error handling, concurrency
- `rust` — Rust ownership, error handling, performance
- `java-spring` — Spring Boot, DI, validation, testing
- `dotnet` — Clean Architecture, C# conventions
- `ruby-rails` — Rails MVC, ActiveRecord, testing
- `flutter` — Riverpod, Freezed, feature-based architecture
- `sql-migrations` — Safe schema changes, migration best practices
- `ux-responsive` — Responsive design, accessibility-first
- `blogger` — Tech content creation
- `brutal-critic` — Content review frameworks
- `docs-validation` — Documentation quality checks
- `agent-diagnostics` — Validate agent configs and setup
- `project-bootstrap` — Create baseline OpenCode project context

**Adding a new skill:**
1. Create `.opencode/skills/<name>/SKILL.md`
2. Write domain-specific instructions and examples
3. Reference it in conversation when needed

---

## Extending the Project

### Adding a Custom Agent

1. Create `.opencode/agents/<agent-name>.md`
2. Define the agent's purpose, instructions, and constraints
3. Invoke with `@agent-name`

### Adding a Custom Slash Command

1. Create `.opencode/commands/<command-name>.md`
2. Add frontmatter:
   ```yaml
   ---
   description: What this command does
   agent: recommended-agent
   subtask: true
   ---
   ```
3. Write the prompt template in the body
4. Run with `/command-name` in the TUI

### Adding Runtime Logic

The compiled CLI entry point is `src/index.ts`. Extend it for custom runtime behavior. Remember to run `npm run build` before testing with `npm start`.

---

## Project Structure

```
.
├── src/                          # TypeScript source
│   └── index.ts                  # CLI entry point
├── dist/                         # Compiled output (from tsc)
├── docs/                         # Project documentation
│   ├── usage-guide.md            # This guide
│   └── usage-guide.it.md         # Italian version
├── .opencode/
│   ├── agents/                   # Agent configuration files
│   ├── commands/                 # Slash command definitions
│   ├── skills/                   # Domain-specific skill packs
│   └── package.json              # Plugin dependencies
├── opencode.json                 # OpenCode CLI configuration
├── tsconfig.json                 # TypeScript strict, ESM, Node16
└── package.json                  # Project manifest
```

---

## Important Notes

- **Permissions:** `opencode.json` denies `external_directory` writes and `doom_loop`. Agents cannot write outside this workspace or run unbounded iterative loops by default.
- **No pre-build hook:** Always run `npm run build` before `npm start`.
- **No test/lint/CI configured:** There is no test runner, linter, formatter, or CI pipeline set up yet.
- **Agent configs are global:** Editing files under `.opencode/agents/` changes agent behavior for this project permanently.
