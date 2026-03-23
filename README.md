# doqtor

**Your docs are lying. Doqtor keeps them in sync with your code — automatically.**

Doqtor is a GitHub-native system that detects documentation drift after code changes and generates accurate, reviewable updates via pull requests. It doesn't generate docs from scratch — it ensures your existing docs never become incorrect.

## The Problem

Documentation goes stale the moment code changes. Developers update function signatures, rename parameters, remove APIs — and the docs keep referencing the old version. Nobody notices until a user hits a broken example.

Doqtor catches this automatically.

## How It Works

```
PR Merged → Webhook → Diff Analysis → Doc Matching → Drift Detection → Fix Generation → Docs PR
```

1. A PR merges into your repo
2. Doqtor analyzes the diff to find changed functions, parameters, and types
3. It scans your documentation for references to those symbols
4. It detects mismatches: wrong signatures, outdated examples, removed APIs
5. It generates fixes and opens a PR with the updates

No full-repo scans. No doc generation from scratch. Just precise, diff-based corrections.

## What It Catches

| Drift Type | Example |
|---|---|
| **Signature mismatch** | `createUser(name, email)` → `createUser(name)` |
| **Removed symbol** | Docs reference a deleted function |
| **Renamed symbol** | `getUsers` → `fetchUsers` but docs still say `getUsers` |
| **Outdated example** | Code block calls function with wrong parameters |

Each detection includes a **confidence score** so reviewers can prioritize.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.1+

### Installation

```bash
git clone https://github.com/cachevector/doqtor.git
cd doqtor
bun install
bun run build
bun run test
```

### CLI Usage

```bash
# Check for documentation drift in your local changes
bun run --cwd apps/cli src/index.ts check

# Apply fixes automatically
bun run --cwd apps/cli src/index.ts fix

# Preview fixes without applying
bun run --cwd apps/cli src/index.ts fix --dry-run

# Generate a default config file
bun run --cwd apps/cli src/index.ts init
```

### GitHub App (Backend)

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your GitHub App credentials

# Start the webhook server
bun run --cwd apps/backend dev
```

The backend listens for `pull_request.closed` webhook events and runs the full pipeline when a PR is merged.

## Configuration

Create a `doqtor.config.json` in your project root:

```json
{
  "docsPaths": ["README.md", "docs/"],
  "ignore": ["node_modules/", "dist/", ".git/"],
  "ai": {
    "enabled": false,
    "provider": "openai"
  },
  "autoPR": true
}
```

| Option | Description | Default |
|---|---|---|
| `docsPaths` | Files/directories to scan for documentation | `["README.md", "docs/"]` |
| `ignore` | Paths to exclude from analysis | `["node_modules/", "dist/", ".git/"]` |
| `ai.enabled` | Enable AI-assisted fix generation | `false` |
| `ai.provider` | AI provider (`openai` or `anthropic`) | `"openai"` |
| `autoPR` | Automatically create PRs with fixes | `true` |

## Architecture

```
doqtor/
├── apps/
│   ├── backend/          # Webhook server (Hono)
│   └── cli/              # CLI tool (Commander)
├── packages/
│   ├── core-engine/      # Shared types, diff analyzer, drift detector
│   ├── parser/           # TypeScript AST parsing (ts-morph)
│   ├── matcher/          # Doc ↔ code matching
│   ├── fixer/            # Fix generation (deterministic + AI)
│   └── github/           # GitHub App integration (Octokit)
├── config/
│   ├── default-config.json
│   └── config-schema.json
└── doqtor.config.json
```

### Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Parser  │ →  │   Diff   │ →  │ Matcher  │ →  │  Drift   │ →  │  Fixer   │
│(ts-morph)│    │ Analyzer │    │          │    │ Detector │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

- **Parser**: Extracts functions, classes, interfaces, types, and constants from TypeScript using AST analysis
- **Diff Analyzer**: Parses unified diffs, identifies changed symbols by comparing old/new ASTs
- **Matcher**: Scans markdown docs for symbol references by name, file proximity, and content
- **Drift Detector**: Compares code changes against doc references to find mismatches
- **Fixer**: Generates deterministic patches (signature replacement, renames, example updates) with optional AI fallback

## Development

```bash
bun run dev          # Watch mode for all packages
bun run build        # Build all packages
bun run test         # Run all tests (67 tests)
bun run lint         # Lint all packages
bun run format       # Format with Prettier
bun run typecheck    # Type check all packages
```

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict mode, no `any`)
- **Monorepo:** Turborepo
- **Backend:** Hono
- **CLI:** Commander
- **Parsing:** ts-morph
- **GitHub:** Octokit
- **Testing:** Vitest
- **Bundling:** tsup
- **Linting:** ESLint + Prettier

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and development guidelines.

## License

MIT
