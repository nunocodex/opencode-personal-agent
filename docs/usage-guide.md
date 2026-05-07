# OpenCode Agents — Usage Guide

> **Language:** This guide is also available in [Italian 🇮🇹](usage-guide.it.md).

## The Golden Rule

**Agents do nothing on their own.**  
You must always type a prompt and tell the agent what to do.  
Think of them as expert colleagues: you give them a task, they execute it.

---

## Quick Start (Real Example)

**Goal:** You want to add a function that validates emails and get it tested.

**Step 1 — Open the TUI**
```bash
opencode
```

**Step 2 — Initialize context**
```
/init
```

**Step 3 — Ask the agent to implement**
```
@codebase Create a TypeScript function `isValidEmail(email: string): boolean` in `src/utils/validators.ts`. Use a simple regex. Export it.
```

**Step 4 — Ask the agent to generate tests**
```
@generate-tests src/utils/validators.ts
```

**Step 5 — Review what was generated**
```
@code-review src/utils/validators.ts
```

> **Note:** You typed three separate prompts. The agents did not talk to each other automatically.

---

## Real-World Workflows

### Workflow 1: "I Need Documentation for My Code"

**Scenario:** You just wrote `src/auth/login.ts` and want a README section.

**What you type:**
```
@docs Read src/auth/login.ts and write a "Authentication" section for README.md. Include: purpose, how to call it, expected inputs/outputs, and one usage example.
```

**Want a harsh review of your docs?**
```
@brutal-critic Review the "Authentication" section in README.md. List every ambiguity, missing detail, or weakness a new developer would face.
```

---

### Workflow 2: "I Want to Refactor, But I Need a Plan First"

**Scenario:** `src/index.ts` is a 300-line mess and you are afraid to break things.

**What you type:**
```
@planner I want to split src/index.ts into: cli.ts (argument parsing), logger.ts (logging), and index.ts (orchestration). Do not edit files. Just give me a numbered step-by-step plan.
```

**After you like the plan, execute it:**
```
@codebase Follow the refactoring plan from @planner exactly. Create the new files and update imports.
```

---

### Workflow 3: "I Need a Blog Post About This Project"

**What you type:**
```
@blogger Write a 800-word blog post titled "How I Use OpenCode Agents to Speed Up Development". Target audience: developers who have never used AI agents. Include: what OpenCode is, one concrete example with @codebase, and a tip for beginners.
```

**Then make it better with criticism:**
```
@brutal-critic Review the blog post. Be harsh but constructive. Tell me what is boring, generic, or missing.
```

---

### Workflow 4: "I Need to Check Licenses Before Publishing"

**What you type:**
```
@legal-advisor Read package.json and .opencode/package.json. Check all dependencies for license compatibility with MIT. Flag any GPL, proprietary, or unclear licenses.
```

---

### Workflow 5: "I Have a Complex Feature That Needs Multiple Agents"

**What you type:**
```
@orchestrator I need a user authentication system with: registration, login, JWT tokens, and password hashing. Plan the architecture first, then implement it, then review it for security. Report back what was done at each step.
```

> **What happens:** Orchestrator calls @planner → @codebase → @review in sequence. You still gave ONE prompt, but the orchestrator managed the chain.

---

## How Agents Work (The Honest Version)

| Myth | Reality |
|------|---------|
| Agents scan my code automatically | ❌ No. They only read what you ask them to read. |
| Agents fix bugs while I sleep | ❌ No. You must prompt them to do it. |
| Slash commands are magic buttons | ⚠️ Kind of. They are pre-written prompts. You still run them manually. |
| Skills make the agent smarter automatically | ❌ No. You ask the agent to "use the X skill". Otherwise it ignores it. |

---

## Common Tasks — Exact Prompts You Can Copy

### `@codebase`
```
@codebase Create a TypeScript class UserService in src/services/user.ts with methods: createUser, getUserById, updateUser. Use in-memory storage for now.
```

```
@codebase Add error handling to src/services/user.ts. Throw custom errors for "not found" and "invalid input".
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
@docs Generate API docs for everything exported from src/services/ and write them to docs/api.md.
```

### `@create-readme`
```
/create-readme
```

### `@blog-post`
```
/blog-post Why TypeScript Strict Mode Saves Hours of Debugging
```

### `@1-on-1-prep`
```
/1-on-1-prep Alice She seems overwhelmed by the new codebase
```

---

## What Are Skills? (And How to Actually Use Them)

A **skill** is a pack of domain-specific best practices. It does **nothing** until you mention it.

**Wrong:**  
*(You do nothing. The skill is not active.)*

**Right:**
```
@codebase Refactor this to follow TypeScript strict mode best practices. Use the typescript skill.
```

**Another example:**
```
@planner Plan a REST API for a blog. Use the node-express skill for routing conventions.
```

---

## Project Commands (Outside the TUI)

These are plain npm scripts. Run them in your normal terminal, not inside `opencode`.

| Command | When to use it |
|---------|---------------|
| `npm run build` | Before running `npm start`, after any code change |
| `npm run dev` | While developing (auto-rebuild on save) |
| `npm start` | Run the compiled CLI. Only works after `build` |

**Typical session:**
```bash
npm run dev    # In terminal 1: watch mode
opencode       # In terminal 2: talk to agents
```

---

## File Layout That Matters

```
.
├── src/                  # Your TypeScript code (edit here)
├── dist/                 # Compiled JS (do not edit, generated by tsc)
├── docs/                 # Documentation you write or generate
├── .opencode/agents/     # Agent personalities (rarely edit)
├── .opencode/commands/   # Slash command templates
├── .opencode/skills/     # Domain knowledge packs
├── AGENTS.md             # Agent conventions for this repo
└── opencode.json         # CLI config (permissions, plugin)
```

> **Important:** `opencode.json` forbids agents from writing outside this folder (`external_directory: deny`) and blocks unbounded loops (`doom_loop: deny`). If an agent asks for permission, that is why.

---

## Checklist Before You Start

- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] You launched `opencode` and ran `/init`
- [ ] You know which agent handles your task (use the table below)

| I want to... | Use this |
|-------------|----------|
| Write or refactor code | `@codebase` |
| Plan before touching code | `@planner` |
| Check security/quality | `@review`, `/security-audit`, `/code-review` |
| Write docs or README | `@docs`, `/api-docs`, `/create-readme` |
| Write a blog post | `@blogger`, `/blog-post` |
| Get harsh feedback | `@brutal-critic`, `/content-review` |
| Coordinate a big feature | `@orchestrator`, `/plan-project` |
| Check licenses | `@legal-advisor`, `/legal-review` |
| Prepare a 1-on-1 | `@em-advisor`, `/1-on-1-prep` |

---

## Still Stuck?

If you are unsure which agent to use, ask the orchestrator:
```
@orchestrator I need to [describe your goal]. Which agent should I use, and what should I ask them?
```
