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

```
doqtor/
├── apps/
│   ├── backend/         Hono webhook server (deployed on Railway)
│   └── cli/             CLI tool (published as @doqtor/cli on npm)
├── packages/
│   ├── core-engine/     Shared types, diff analyzer, drift detector
│   ├── parser/          TypeScript AST parsing via ts-morph
│   ├── matcher/         Maps code changes to documentation files
│   ├── fixer/           Generates documentation fixes (deterministic + AI)
│   └── github/          GitHub App integration (auth, webhooks, PRs)
├── tests/
│   └── simulation/      End-to-end integration tests
└── docs/                Documentation and assets
```

## Common Commands

```bash
bun run dev          # Watch mode for all packages
bun run build        # Build all packages
bun run test         # Run all tests
bun run lint         # Lint all packages
bun run lint:fix     # Auto-fix lint issues
bun run format       # Format with Prettier
bun run typecheck    # Type check all packages
```

### Running a single package

```bash
bun run --filter=@doqtor/parser test
bun run --filter=@doqtor/cli build
```

### Running simulations

```bash
bun run simulate              # Default simulation
bun run simulate:validatorjs  # ValidatorJS scenario
bun run simulate:statestream  # StateStream scenario
```

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
bun run --filter=@doqtor/parser test

# Watch mode
bun run test:watch
```

Tests live next to the source files or in a `__tests__` directory within each package.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `test:` adding or updating tests
- `refactor:` code changes that neither fix a bug nor add a feature
- `chore:` maintenance tasks

## Pull Requests

- One feature or fix per PR
- Include a description of what changed and why
- Link related issues if applicable
- Make sure all checks pass before requesting review

## Questions?

Open an issue if you have questions or want to discuss a feature before working on it.
