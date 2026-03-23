# Contributing to Doqtor

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.1+
- Git

### Setup

```bash
git clone https://github.com/cachevector/doqtor.git
cd doqtor
bun install
bun run build
```

### Verify your setup

```bash
bun run test
bun run lint
bun run typecheck
```

## Project Structure

Monorepo managed with Turborepo and Bun workspaces.

| Package | Description |
|---------|-------------|
| `packages/core-engine` | Shared types, diff analyzer, drift detector |
| `packages/parser` | TypeScript AST parsing |
| `packages/matcher` | Maps code changes to documentation files |
| `packages/fixer` | Generates documentation fixes |
| `packages/github` | GitHub App integration |
| `apps/backend` | Webhook server |
| `apps/cli` | CLI tool |

## Development Workflow

1. Create a branch from `master`
2. Make your changes
3. Write or update tests
4. Make sure all checks pass:
   ```bash
   bun run test
   bun run lint
   bun run typecheck
   ```
5. Submit a pull request

## Code Standards

- TypeScript strict mode, no `any` types
- Run `bun run lint:fix` and `bun run format` before committing
- Use `import type { ... }` for type-only imports
- Prefer small, testable functions over large classes
- All errors must be logged with context
- Unit tests required for all new logic

## Testing

```bash
# Run all tests
bun run test

# Run tests for a specific package
cd packages/parser && bun run test

# Watch mode
bun run test:watch
```

Tests live next to the source files or in a `__tests__` directory within each package.

## Commit Messages

- `feat: add parameter diffing to parser`
- `fix: handle empty diff input in core-engine`
- `docs: update CLI usage examples`
- `test: add matcher edge case tests`
- `chore: update dependencies`

## Pull Requests

- One feature or fix per PR
- Include a description of what changed and why
- Link related issues if applicable
- Make sure CI passes before requesting review

## Questions?

Open an issue if you have questions or want to discuss a feature before working on it.
