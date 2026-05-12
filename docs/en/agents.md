# Agents, Plugins, and Skills

Complete reference for all OpenCode agents, plugins, and skills available in the Telegram bot.

## Agents

The bot uses OpenCode's multi-agent system with 14 specialized agents. Each agent is optimized for specific tasks and uses a dedicated model.

### Agent Configuration

Agents are configured in `.opencode/opencode.json`. The default agent is `build`.

### Agent Reference Table

| Agent | Model | Purpose | When to Use |
|-------|-------|---------|-------------|
| `build` | deepseek-v4-flash | Build new features and code | Creating new code, implementing features |
| `plan` | glm-5.1 | Architecture and implementation planning | High-level planning, system design |
| `explore` | deepseek-v4-flash | Explore and understand codebases | Understanding existing code, finding patterns |
| `scout` | qwen3.6-plus | Find specific files and patterns | Locating files, searching codebases |
| `orchestrator` | kimi-k2.6 | Coordinate complex multi-step tasks | Large refactoring, multi-file changes |
| `planner` | glm-5.1 | Create detailed implementation plans | Step-by-step implementation planning |
| `codebase` | kimi-k2.6 | Modify and extend existing code | Adding features to existing code |
| `review` | glm-5.1 | Code review and security analysis | Reviewing code, finding vulnerabilities |
| `docs` | qwen3.5-plus | Generate documentation | Writing API docs, README files |
| `em-advisor` | qwen3.6-plus | Engineering management advice | Team processes, project structure |
| `blogger` | qwen3.5-plus | Write blog posts and content | Content creation, social media posts |
| `brutal-critic` | glm-5.1 | Critical review and feedback | Harsh but constructive criticism |
| `legal-advisor` | glm-5.1 | Legal and compliance guidance | Licensing, GDPR, legal questions |
| `file-parser` | kimi-k2.6 | Analyze images, documents, video | File analysis, OCR, content extraction |

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

#### explore

**Purpose:** Explore and understand existing codebases.

**Example prompts:**
- "Explore this codebase and tell me how authentication works"
- "Find all the API endpoints in this project"
- "Understand the data flow from frontend to database"

**Expected response:** Codebase analysis, flow explanations, key file locations.

#### scout

**Purpose:** Find specific files and patterns in codebases.

**Example prompts:**
- "Find all files related to database configuration"
- "Locate all TODO comments in the codebase"
- "Find where the email sending logic is implemented"

**Expected response:** File paths, line numbers, code snippets.

#### orchestrator

**Purpose:** Coordinate complex multi-step tasks.

**Example prompts:**
- "I need to refactor my bot handlers - coordinate the full plan"
- "Migrate this project from JavaScript to TypeScript"
- "Upgrade all dependencies and fix breaking changes"

**Expected response:** Coordinated multi-agent workflow, task breakdown.

#### planner

**Purpose:** Create detailed implementation plans.

**Example prompts:**
- "Create a detailed implementation plan for adding user authentication"
- "Plan the steps to add caching to this API"
- "Create a roadmap for adding dark mode to the UI"

**Expected response:** Step-by-step implementation plan with priorities.

#### codebase

**Purpose:** Modify and extend existing code.

**Example prompts:**
- "Add a new command handler for /stats that shows usage statistics"
- "Implement rate limiting for the API endpoints"
- "Add input validation to the user registration form"

**Expected response:** Code modifications with explanations.

#### review

**Purpose:** Code review and security analysis.

**Example prompts:**
- "Review this pull request for security issues"
- "Analyze this code for potential bugs and edge cases"
- "Review my code for performance improvements"

**Expected response:** Security findings, bug reports, improvement suggestions.

#### docs

**Purpose:** Generate documentation.

**Example prompts:**
- "Generate API documentation for the OpenCode client module"
- "Write a README for this Python project"
- "Create inline documentation for these functions"

**Expected response:** Well-structured documentation in markdown or docstrings.

#### em-advisor

**Purpose:** Engineering management advice.

**Example prompts:**
- "What's the best way to structure a Python async project?"
- "How should I organize my team's code review process?"
- "What metrics should I track for my SaaS application?"

**Expected response:** Best practices, organizational advice, recommendations.

#### blogger

**Purpose:** Write blog posts and content.

**Example prompts:**
- "Write a blog post about how I built this Telegram AI bot"
- "Create a LinkedIn post announcing my new open source project"
- "Write a technical tutorial on async Python programming"

**Expected response:** Engaging, well-structured content ready to publish.

#### brutal-critic

**Purpose:** Critical review and feedback.

**Example prompts:**
- "Critique my project README and suggest improvements"
- "Review my blog post draft and be brutally honest"
- "Analyze my code and tell me what's wrong with it"

**Expected response:** Honest, direct criticism with actionable improvements.

#### legal-advisor

**Purpose:** Legal and compliance guidance.

**Example prompts:**
- "What licenses should I consider for an open source AI tool?"
- "What are GDPR requirements for user data collection?"
- "Do I need a privacy policy for my SaaS?"

**Expected response:** Legal guidance, compliance requirements, recommendations.

**Disclaimer:** This agent provides informational guidance only, not legal advice.

#### file-parser

**Purpose:** Analyze file attachments (images, documents, video).

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

## Plugins

Three OpenCode plugins extend the bot's capabilities:

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

### agents-opencode

**Description:** Multi-agent orchestration system.

**Features:**
- Agent selection based on task type
- Multi-agent collaboration
- Task routing to specialized agents

**When used:** Automatically routes tasks to appropriate agents.

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

### Content Skills

| Skill | Domain | Example Use |
|-------|--------|-------------|
| `career-content` | Resumes, LinkedIn, cover letters | "Optimize my resume for ATS systems" |
| `blogger` | Content creation | "Write a LinkedIn post about this project" |
| `brutal-critic` | Content review | "Review my blog post draft" |

### Professional Skills

| Skill | Domain | Example Use |
|-------|--------|-------------|
| `legal-advisor` | Legal research and compliance | "What GDPR rules apply to my SaaS?" |

### Development Skills

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

#### career-content

```
Prompt: "Optimize my resume for ATS systems"

Expected: Resume formatting and keyword optimization
for Applicant Tracking Systems.
```

#### blogger

```
Prompt: "Write a LinkedIn post about launching my project"

Expected: Engaging social media content with proper
formatting and call-to-action.
```

#### brutal-critic

```
Prompt: "Review my README and be brutally honest"

Expected: Direct, honest feedback with specific
improvement suggestions.
```

#### legal-advisor

```
Prompt: "What GDPR rules apply to my SaaS application?"

Expected: GDPR compliance requirements, data handling
guidelines, and legal considerations.

Disclaimer: Informational guidance only, not legal advice.
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

Or let the orchestrator automatically select the best agent for your task.

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
