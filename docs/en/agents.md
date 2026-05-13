# Agents, Plugins, and Skills

Complete reference for all OpenCode agents, plugins, and skills available in the Telegram bot.

## Agents

The bot uses OpenCode's multi-agent system with 10 specialized agents. Each agent is optimized for specific tasks and uses a dedicated model. Agent definitions live as standalone `.md` files in `.agents/agents/` and are symlinked into `.opencode/agents/` for OpenCode discovery.

### Agent Configuration

Agent definitions are in `.agents/agents/*.md` (cross-tool compatible format). The default agent is `build`.

### Agent Reference Table

| Agent | Model | Purpose | When to Use |
|-------|-------|---------|-------------|
| `build` | deepseek-v4-flash | Build new features and code | Creating new code, implementing features (default) |
| `plan` | deepseek-v4-flash | Architecture and implementation planning | Standard planning, system design |
| `ultraplan` | deepseek-v4-pro | Deep, multi-phase planning via the ultraplan skill | Complex systems, large architecture |
| `explore` | deepseek-v4-flash | Explore and understand codebases | Understanding existing code, finding patterns |
| `debug` | deepseek-v4-pro | Systematic debugging and root cause analysis | Investigating bugs, test failures, unexpected behavior |
| `review` | deepseek-v4-pro | Code review and security analysis | Reviewing code, finding vulnerabilities |
| `docs` | deepseek-v4-pro | Generate documentation | Writing API docs, README files |
| `file-parser` | qwen3.6-plus | Analyze images, documents, video (multimodal) | File analysis, OCR, content extraction |
| `scout` | deepseek-v4-flash | External docs and dependency research | Investigating library source, cross-referencing upstream code |
| `general` | deepseek-v4-flash | General-purpose research and multi-step tasks | Complex questions, open-ended exploration |

### Agent Use Case Examples

#### build

**Purpose:** Build new features and implement code.

**Example prompts:**
- "Build a new Python CLI tool for task management with add/list/complete commands"
- "Create a FastAPI endpoint that accepts file uploads and stores them in S3"
- "Build a React component that displays a sortable data table"

**Expected response:** Working code implementation with explanations.

#### plan

**Purpose:** Architecture and high-level implementation planning.

**Example prompts:**
- "Plan the architecture for a microservice that processes invoices"
- "Design a database schema for a multi-tenant SaaS application"
- "Plan the migration strategy from monolith to microservices"

**Expected response:** Architecture diagrams, component breakdown, technology recommendations.

#### ultraplan

**Example prompts:**
- "Design a comprehensive migration strategy from monolith to microservices"
- "Plan the full architecture for a multi-tenant SaaS platform with detailed component boundaries"
- "Create an exhaustive implementation plan for adding end-to-end encryption"

**Expected response:** Complete `.ultraplan/` directory with PRD, tech plan, traceability matrix, and summary.

#### explore

**Purpose:** Explore and understand existing codebases.

**Example prompts:**
- "Explore this codebase and tell me how authentication works"
- "Find all the API endpoints in this project"
- "Understand the data flow from frontend to database"

**Expected response:** Codebase analysis, flow explanations, key file locations.

#### debug

**Purpose:** Systematic debugging and root cause analysis.

**Example prompts:**
- "Investigate why the API endpoint returns 500 errors"
- "Find the root cause of this test failure"
- "Debug the memory leak in the background worker"

**Expected response:** Root cause analysis with evidence, reproduction steps, fix recommendations.

#### review

**Purpose:** Code review and security analysis.

**Example prompts:**
- "Review this pull request for security issues"
- "Analyze this code for potential bugs and edge cases"
- "Review my code for performance improvements"

**Expected response:** Security findings, bug reports, improvement suggestions.

#### scout

**Purpose:** Read-only agent for external docs and dependency research.

**Example prompts:**
- "Research the API of a third-party library we depend on"
- "Clone repo X and inspect how they handle authentication"
- "Cross-reference our implementation with an upstream library"

**Expected response:** External code analysis, dependency insights, documentation findings.

#### docs

**Purpose:** Generate documentation.

**Example prompts:**
- "Generate API documentation for the OpenCode client module"
- "Write a README for this Python project"
- "Create inline documentation for these functions"

**Expected response:** Well-structured documentation in markdown or docstrings.

#### file-parser

**Purpose:** Analyze file attachments (images, documents, video) using a multimodal model.

**Capabilities:**
- **Images & Photos:** Analyze visual content, extract text (OCR), describe scenes
- **Documents:** Read PDF, TXT, DOCX, code files; summarize and extract key info
- **Video & Audio:** Analyze frames and audio content when supported

**Example prompts:**
- [Send photo] "Analyze this image and describe its contents"
- [Send document] "Extract the key points from this PDF report"
- [Send screenshot] "What does this error message mean?"
- [Send code file] "Explain what this code does"

**Expected response:** Structured analysis with file type, detailed description, key takeaways.

**Constraints:**
- Can read files from local filesystem
- Cannot modify files or execute commands (enforced: `edit: deny`, `bash: deny`, `skill: deny all`)
- Notes sensitive content without exposing it

#### general

**Purpose:** General-purpose research and complex multi-step tasks.

**Example prompts:**
- "Research the best Python libraries for async web scraping"
- "Compare PostgreSQL vs SQLite for a single-user desktop app"
- "Explain the differences between asyncio and threading in Python"

**Expected response:** Comprehensive analysis with trade-offs and recommendations.

## Plugins

Two OpenCode plugins extend the bot's capabilities:

### superpowers

**Description:** Enhanced AI capabilities and advanced tools.

**Features:**
- Extended tool set for complex operations
- Enhanced reasoning capabilities
- Advanced file manipulation tools

**When used:** Automatically available for all agents.

### @asidorenko/openslimedit

**Description:** Efficient file editing operations.

**Features:**
- Precise file editing with minimal changes
- Safe code modifications
- Reduced risk of introducing bugs

**When used:** Automatically used by agents when editing files.

## Skills

Skills provide domain-specific guidance and best practices. All skills are auto-allowed in the configuration.

### Programming Language Skills

| Skill | Domain | Example Use |
|-------|--------|-------------|
| `python` | Python best practices | "Write a Python function to parse JSON config files" |
| `react-next` | React and Next.js | "Create a responsive dashboard component" |
| `flutter` | Flutter/Dart with Riverpod | "Set up Riverpod state management" |
| `go` | Go best practices | "Implement a REST API handler in Go" |
| `rust` | Rust best practices | "Write a CLI tool in Rust with clap" |
| `dotnet` | .NET Clean Architecture | "Set up Clean Architecture in .NET" |
| `java-spring` | Java Spring Boot | "Create a REST controller with validation" |
| `node-express` | Node.js and Express | "Design an Express.js middleware for auth" |
| `ruby-rails` | Ruby on Rails | "Generate a migration for user profiles" |
| `typescript` | TypeScript strict mode | "Define strict types for an API response" |

### Domain Skills

| Skill | Domain | Example Use |
|-------|--------|-------------|
| `sql-migrations` | Database schema changes | "Write a safe migration to add an index" |
| `ux-responsive` | Responsive UX design | "Make this component responsive for mobile" |

### Development Skills

| Skill | Domain | Example Use |
|-------|--------|-------------|
| `docs-validation` | Documentation quality checks | "Check our docs for broken links" |
| `agent-diagnostics` | Agent setup validation | "Check my OpenCode config for issues" |
| `project-bootstrap` | Project scaffolding | "Create AGENTS.md for a new project" |

| Skill | Domain | Example Use |
|-------|--------|-------------|
| `docs-validation` | Documentation quality checks | "Check our docs for broken links" |
| `agent-diagnostics` | Agent setup validation | "Check my OpenCode config for issues" |
| `project-bootstrap` | Project scaffolding | "Create AGENTS.md for a new project" |

### Skill Usage Examples

#### python

```
Prompt: "Write a Python function to parse JSON config files with validation"

Expected: Well-structured Python code with type hints, error handling,
and docstrings following PEP 8 and best practices.
```

#### react-next

```
Prompt: "Create a responsive dashboard component with charts"

Expected: React/Next.js component with responsive design,
using modern hooks and best practices.
```

#### flutter

```
Prompt: "Set up Riverpod state management for a counter app"

Expected: Flutter code with proper Riverpod providers,
state management, and widget structure.
```

#### go

```
Prompt: "Implement a REST API handler in Go with validation"

Expected: Go code following idiomatic patterns,
with proper error handling and structure.
```

#### rust

```
Prompt: "Write a CLI tool in Rust with clap for argument parsing"

Expected: Rust code with proper error handling,
clap configuration, and idiomatic patterns.
```

#### dotnet

```
Prompt: "Set up Clean Architecture for a .NET Web API"

Expected: .NET project structure with proper layering,
dependency injection, and separation of concerns.
```

#### java-spring

```
Prompt: "Create a Spring Boot REST controller with validation"

Expected: Spring Boot code with proper annotations,
validation, and exception handling.
```

#### node-express

```
Prompt: "Design an Express.js middleware for JWT authentication"

Expected: Node.js/Express middleware with proper
error handling and security practices.
```

#### ruby-rails

```
Prompt: "Generate a Rails migration for user profiles"

Expected: Rails migration with proper schema changes,
indexes, and rollback support.
```

#### typescript

```
Prompt: "Define strict types for a paginated API response"

Expected: TypeScript interfaces with proper generics,
strict mode compliance, and type safety.
```

#### sql-migrations

```
Prompt: "Write a safe migration to add an index on users.email"

Expected: SQL migration with proper syntax,
rollback capability, and performance considerations.
```

#### ux-responsive

```
Prompt: "Make this navigation component responsive for mobile"

Expected: CSS/media queries or component changes
for mobile-first responsive design.
```

#### docs-validation

```
Prompt: "Check our documentation for broken links"

Expected: Report of broken links, missing files,
and documentation quality issues.
```

#### agent-diagnostics

```
Prompt: "Check my OpenCode configuration for issues"

Expected: Validation report of agent config,
skill setup, and potential problems.
```

#### project-bootstrap

```
Prompt: "Create AGENTS.md for a new Python project"

Expected: Scaffolded AGENTS.md file with proper
structure and project-specific content.
```

## Agent Selection

The bot uses the `build` agent by default. To use a specific agent, mention it in your prompt:

```
"Using the review agent: please analyze this code for security issues"
```

## Skill Selection

Skills are automatically applied based on the task context. To explicitly request a skill:

```
"Using the python skill: write a function to parse JSON"
```

## Combining Agents and Skills

For best results, combine agents with relevant skills:

```
"Using the docs agent with the python skill: generate API documentation
for this Python module with proper docstrings"
```
