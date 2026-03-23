# doqtor

**Your docs are lying. Doqtor keeps them in sync with your code — automatically.**

Doqtor is a GitHub-native system that detects documentation drift after code changes and generates accurate, reviewable updates via pull requests. It doesn't generate docs from scratch — it ensures your existing docs never become incorrect.

## How It Works

```
PR Merged → Webhook → Diff Analysis → Doc Matching → Drift Detection → Fix Generation → Docs PR
```

1. A PR merges into your repo
2. Doqtor analyzes the diff to find changed functions, parameters, and types
3. It scans your documentation for references to those symbols
4. It detects mismatches: wrong signatures, outdated examples, removed APIs
5. It generates fixes and opens a PR with the updates

## Features

- **Diff-based analysis** — only processes what changed, not the entire repo
- **AST-powered parsing** — understands your code structure, not just text
- **Smart doc matching** — finds related docs by symbol name, file proximity, and content
- **Deterministic fixes** — signature and parameter updates applied automatically
- **AI-assisted fixes** (optional) — natural language rewrites for complex changes
- **GitHub-native** — runs as a GitHub App, creates PRs for review
- **CLI tool** — run locally with `doqtor check` and `doqtor fix`
- **Configurable** — control which docs to scan, what to ignore, and how fixes are generated

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.1+
- Node.js 20+

### Installation

```bash
# Clone the repo
git clone https://github.com/cachevector/doqtor.git
cd doqtor

# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun run test
```

### CLI Usage

```bash
# Check for documentation drift in your local changes
doqtor check

# Apply fixes automatically
doqtor fix

# Generate a default config file
doqtor init
```

### Configuration

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
|--------|-------------|---------|
| `docsPaths` | Files/directories to scan for documentation | `["README.md", "docs/"]` |
| `ignore` | Paths to exclude from analysis | `["node_modules/", "dist/", ".git/"]` |
| `ai.enabled` | Enable AI-assisted fix generation | `false` |
| `ai.provider` | AI provider (`openai` or `anthropic`) | `"openai"` |
| `autoPR` | Automatically create PRs with fixes | `true` |

## Project Structure

```
doqtor/
├── apps/
│   ├── backend/          # Webhook server (Hono)
│   └── cli/              # CLI tool (Commander)
├── packages/
│   ├── core-engine/      # Shared types + diff analyzer + drift detector
│   ├── parser/           # AST parsing (ts-morph)
│   ├── matcher/          # Doc ↔ code matching
│   ├── fixer/            # Fix generation (deterministic + AI)
│   └── github/           # GitHub App integration (Octokit)
├── config/
│   ├── default-config.json
│   └── config-schema.json
├── turbo.json
└── package.json
```

## Development

```bash
# Run all packages in dev mode
bun run dev

# Lint
bun run lint

# Format
bun run format

# Type check
bun run typecheck
```

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict mode)
- **Monorepo:** Turborepo
- **Backend:** Hono
- **CLI:** Commander
- **Parsing:** ts-morph
- **GitHub:** Octokit
- **Testing:** Vitest
- **Bundling:** tsup

## License

MIT
