# Doqtor — Implementation TODO

---

## Phase 0: Project Scaffolding

- [x] Initialize Bun workspace + Turborepo (root package.json + turbo.json)
- [x] Set up TypeScript config (base tsconfig + per-package extends)
- [x] Set up ESLint + Prettier (shared config)
- [x] Set up Vitest for testing
- [x] Create package stubs for: `@doqtor/core-engine`, `@doqtor/parser`, `@doqtor/matcher`, `@doqtor/fixer`, `@doqtor/github`
- [x] Create app stubs for: `apps/backend`, `apps/cli`
- [x] Add `doqtor.config.json` schema and default config
- [x] Set up tsup for CLI bundling

---

## Phase 1: Core Engine — Parser Module (`packages/parser`)

- [x] Set up ts-morph (TypeScript Compiler API) for AST parsing
- [x] Extract function declarations (name, params, return type)
- [x] Extract exported symbols (classes, interfaces, type aliases, constants)
- [x] Extract inline JSDoc comments
- [x] Define `ParsedSymbol` interface (shared types in `packages/core-engine`)
- [x] Unit tests: parse sample .ts files, assert extracted symbols

---

## Phase 2: Core Engine — Diff Analyzer (`packages/core-engine`)

- [x] Accept a unified diff (string) as input
- [x] Parse diff to identify changed files and hunks
- [x] For each changed .ts file: parse old and new versions via parser
- [x] Produce a `ChangeSet`: added/removed/modified symbols with before/after
- [x] Unit tests: given sample diffs, assert correct ChangeSet output

---

## Phase 3: Core Engine — Matcher (`packages/matcher`)

- [x] Documentation discovery: scan configured paths for .md files
- [x] Symbol-name matching: grep docs for function/class names from ChangeSet
- [x] File-proximity matching: check for docs co-located with changed code
- [x] Build `DocReference[]` mapping: symbol → doc file + line range
- [x] Unit tests: given sample docs + ChangeSet, assert correct mappings

---

## Phase 4: Core Engine — Drift Detector (`packages/core-engine`)

- [x] Compare ChangeSet symbols against matched DocReferences
- [x] Detect: signature mismatch (params changed, return type changed)
- [x] Detect: removed/renamed symbols still referenced in docs
- [x] Detect: outdated code examples (function calls with wrong args)
- [x] Produce `DriftReport[]` with type, location, old value, new value
- [x] Confidence scoring: assign % based on match quality
- [x] Unit tests: given ChangeSet + DocReferences, assert correct drift items

---

## Phase 5: Core Engine — Fix Generator (`packages/fixer`)

- [x] Deterministic fixes: signature replacement in docs
- [x] Deterministic fixes: parameter name/count updates
- [x] Deterministic fixes: remove references to deleted symbols
- [x] AI-assisted fixes (optional): set up abstract provider interface
- [x] AI-assisted fixes: OpenAI provider implementation
- [x] AI-assisted fixes: Anthropic provider implementation
- [x] Produce `DocPatch[]`: file, line range, old text, new text
- [x] Unit tests: given DriftReport, assert correct patches

---

## Phase 6: CLI (`apps/cli`)

- [x] Set up CLI framework (Commander)
- [x] `doqtor check` — run pipeline on local git diff, output drift report
- [x] `doqtor fix` — run pipeline + apply patches locally
- [x] `doqtor init` — generate default `doqtor.config.json`
- [x] Config loader: read and validate `doqtor.config.json`
- [x] Respect ignore rules from config
- [x] Human-readable output formatting (colored diff)

---

## Phase 7: GitHub Integration (`packages/github`)

- [x] GitHub App: JWT auth + installation token exchange (Octokit)
- [x] Webhook receiver: validate signatures, parse `pull_request.closed`
- [x] Fetch PR diff via GitHub API
- [x] Fetch file contents (old + new) for changed files
- [x] Create branch + commit patched doc files
- [x] Create PR with summary (title: `docs: update after #<PR_NUMBER>`)
- [x] Add PR body with change summary
- [x] Handle rate limiting (retry with backoff)

---

## Phase 8: Backend Server (`apps/backend`)

- [x] Set up Hono server
- [x] Webhook endpoint: receive + validate GitHub events
- [x] Orchestrator: wire webhook → diff analyzer → matcher → drift → fixer → PR
- [x] Sequential webhook processing (in-memory queue for MVP)
- [x] Config: read repo-level `doqtor.config.json` via GitHub API
- [x] Structured logging (repo, PR number, pipeline stage)
- [x] Error handling: log failures, don't crash on bad input
- [x] Health check endpoint
- [x] Deploy to Railway

---

## Phase 9: Testing & Hardening

- [x] End-to-end test: full pipeline integration test
- [x] Edge cases: empty diffs, binary files, .d.ts files, no docs found
- [x] Edge cases: arrow functions, generics, overloads, constructors
- [x] Webhook event parsing tests
- [x] Test against real open-source repos (manual validation)

---

## Phase 10: Polish & Ship

- [x] Write README with setup instructions
- [x] CONTRIBUTING.md
- [x] Example `doqtor.config.json` in repo
- [x] `.env.example` for backend
- [x] GitHub App Manifest: Create a manifest file to allow for easy one-click installation of the GitHub App.
- [x] npm publish CLI package (`@doqtor/cli` on npm)
- [x] Deploy backend, verify on a real repo

---

## Phase 11: Early Enhancements

- [x] PR batching (aggregate multiple webhook events)
- [x] Python support via filbert parser
- [ ] Executable docs validation (run code blocks)
- [ ] Drift analytics dashboard

---

## Phase 12: Advanced Features

- [ ] PostgreSQL for history / Redis for queue
- [ ] Multi-repo org dashboard
- [ ] VSCode extension
