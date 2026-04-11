<p align="center">
  <img src="docs/logo.png" alt="Doqtor" width="150" />
</p>

<h1 align="center">doqtor</h1>

<p align="center">
  Your docs are lying. Doqtor keeps them in sync with your code, automatically.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@doqtor/cli"><img src="https://img.shields.io/npm/v/@doqtor/cli" alt="npm version" /></a>
  <a href="https://github.com/cachevector/doqtor/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license" /></a>
</p>

---

Doqtor detects documentation drift after code changes and opens pull requests with fixes. It doesn't generate docs from scratch. It makes sure your existing docs stay correct.

## The Problem

Documentation goes stale the moment code changes. Developers update function signatures, rename parameters, remove APIs, and the docs keep referencing the old version. Nobody notices until a user hits a broken example.

## How It Works

```
PR Merged → Webhook → Diff Analysis → Doc Matching → Drift Detection → Fix Generation → Docs PR
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

### CLI

Install from npm:

```bash
npm install -g @doqtor/cli
```

Then run in any git repo with documentation:

```bash
# Check for documentation drift in your local changes
doqtor check

# Apply fixes
doqtor fix

# Preview fixes without applying
doqtor fix --dry-run

# Generate a default config file
doqtor init
```

Or use without installing:

```bash
npx @doqtor/cli check
```

### GitHub App

Install the [Doqtor GitHub App](https://github.com/apps/doqtor-bot) on your repository. Once installed, Doqtor automatically monitors merged PRs and creates follow-up PRs when documentation drift is detected.

### Self-Hosting

To run your own instance of the backend:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/cachevector/doqtor.git
    cd doqtor
    bun install
    bun run build
    ```

2.  **Start the server in setup mode:**
    ```bash
    bun run --cwd apps/backend dev
    ```

3.  **Create your GitHub App:**
    Visit `https://github.com/settings/apps/new?manifest=` followed by the content of `github-app-manifest.json` (URL-encoded).
    
    *Alternatively, once the server is running, the [one-click setup](http://localhost:3000/setup-complete) link will be pre-configured if you use the manifest flow.*

4.  **Configure environment:**
    After creating the app, you'll be redirected back to the server. Copy the generated environment variables into a `.env` file in the root directory.

5.  **Restart the server:**
    Restart the backend to load the new credentials.

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

## API

### Parser

Use `parseSource(filePath, content)` to extract symbols from a TypeScript file:

```ts
import { parseSource } from "@doqtor/parser";

const symbols = parseSource("src/index.ts", sourceCode);
```

Returns an array of `ParsedSymbol` objects with name, kind, parameters, and return type.

## Development and Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, development commands, and guidelines.

## License

MIT
