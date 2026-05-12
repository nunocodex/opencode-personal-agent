# Contributing

Thanks for your interest in contributing to OpenCode Personal Agent!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/opencode-personal-agent.git`
3. Set up the development environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\pip install -r requirements-dev.txt
   cp .env.example .env  # Configure your bot token
   ```
4. Create a branch: `git checkout -b feature/my-feature`

## Development

### Code Style

This project uses [ruff](https://github.com/astral-sh/ruff) for linting and formatting:

```bash
ruff check src/ tests/
ruff format src/ tests/
```

### Type Checking

```bash
mypy src/
```

### Testing

```bash
python -m src.cli test
# or
pytest tests/ --cov=src -v
```

Aim to maintain or improve the current coverage level.

### Pre-commit Checks

Before submitting, run:
```bash
pytest tests/ --cov=src -v && ruff check src/ tests/
```

## Pull Request Process

1. Ensure all tests pass and coverage doesn't drop
2. Update documentation if you add or change features
3. Update `CHANGELOG.md` with your changes under the `[Unreleased]` section
4. Create the PR against the `dev` branch (not `main`)
5. Keep PRs focused — one feature or fix per PR

## Conventional Commits

Use [conventional commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance
- `docs:` — documentation
- `test:` — testing
- `refactor:` — code restructuring

## Security

If you find a security vulnerability, **do not** open a public issue.
See [SECURITY.md](SECURITY.md) for reporting guidelines.
