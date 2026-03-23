# doqtor

Your docs are lying. Doqtor keeps them in sync with your code, automatically.

Doqtor detects documentation drift after code changes and opens pull requests with fixes. It doesn't generate docs from scratch. It makes sure your existing docs stay correct.

## The Problem

Documentation goes stale the moment code changes. Developers update function signatures, rename parameters, remove APIs, and the docs keep referencing the old version. Nobody notices until a user hits a broken example.

## How It Works

```
PR Merged > Webhook > Diff Analysis > Doc Matching > Drift Detection > Fix Generation > Docs PR
```

1. A PR merges into your repo
2. Doqtor analyzes the diff to find changed functions, parameters, and types
3. It scans your documentation for references to those symbols
4. It detects mismatches like wrong signatures, outdated examples, removed APIs
5. It opens a PR with the fixes

Only processes what changed. No full-repo scans.

## What It Catches

| Drift Type | Example |
|---|---|
| Signature mismatch | `createUser(name, email)` changed to `createUser(name)` |
| Removed symbol | Docs reference a deleted function |
| Renamed symbol | `getUsers` renamed to `fetchUsers` but docs still say `getUsers` |
| Outdated example | Code block calls a function with wrong parameters |

Each detection includes a confidence score so reviewers can prioritize.

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

### CLI

```bash
# Check for documentation drift in your local changes
bun run --cwd apps/cli src/index.ts check

# Apply fixes
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
| `ai.enabled` | Use an LLM for fix generation | `false` |
| `ai.provider` | Provider to use (`openai` or `anthropic`) | `"openai"` |
| `autoPR` | Create PRs with fixes automatically | `true` |

## Development

```bash
bun run dev          # Watch mode for all packages
bun run build        # Build all packages
bun run test         # Run all tests
bun run lint         # Lint all packages
bun run format       # Format with Prettier
bun run typecheck    # Type check all packages
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
