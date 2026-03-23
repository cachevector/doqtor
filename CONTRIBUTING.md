# Contributing to Doqtor

Thanks for your interest in contributing to Doqtor! This guide will help you get set up and make your first contribution.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.1+
- [Node.js](https://nodejs.org) 20+
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

This is a monorepo managed with Turborepo and Bun workspaces.

| Package | Description |
|---------|-------------|
| `packages/core-engine` | Shared types, diff analyzer, drift detector |
| `packages/parser` | TypeScript AST parsing via ts-morph |
| `packages/matcher` | Maps code changes to documentation files |
| `packages/fixer` | Generates documentation fixes |
| `packages/github` | GitHub App integration |
| `apps/backend` | Webhook server |
| `apps/cli` | CLI tool |

## Development Workflow

1. Create a branch from `master`
2. Make your changes
3. Write or update tests
4. Ensure all checks pass:
   ```bash
   bun run test
   bun run lint
   bun run typecheck
   ```
5. Submit a pull request

## Code Standards

- **TypeScript strict mode** — no `any` types
- **ESLint + Prettier** — run `bun run lint:fix` and `bun run format` before committing
- **Consistent type imports** — use `import type { ... }` for type-only imports
- **Small, pure functions** — prefer testable units over large classes
- **No silent failures** — all errors must be logged with context
- **Tests required** — unit tests for all new logic, snapshot tests for doc update scenarios

## Testing

```bash
# Run all tests
bun run test

# Run tests for a specific package
cd packages/parser && bun run test

# Watch mode
bun run test:watch
```

We use [Vitest](https://vitest.dev) for testing. Tests live next to the source files or in a `__tests__` directory within each package.

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add parameter diffing to parser`
- `fix: handle empty diff input in core-engine`
- `docs: update CLI usage examples`
- `test: add matcher edge case tests`
- `chore: update dependencies`

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Include a description of what changed and why
- Link related issues if applicable
- Ensure CI passes before requesting review

## Questions?

Open an issue if you have questions or want to discuss a feature before implementing it.
