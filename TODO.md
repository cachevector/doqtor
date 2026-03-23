# Doqtor — Implementation TODO

---

## Phase 0: Project Scaffolding

- [ ] Initialize pnpm workspace (pnpm-workspace.yaml + root package.json)
- [ ] Set up TypeScript config (base tsconfig + per-package extends)
- [ ] Set up ESLint + Prettier (shared config)
- [ ] Set up Vitest for testing
- [ ] Create package stubs for: `@doqtor/core-engine`, `@doqtor/parser`, `@doqtor/matcher`, `@doqtor/fixer`, `@doqtor/github`
- [ ] Create app stubs for: `apps/backend`, `apps/cli`
- [ ] Add `doqtor.config.json` schema and default config
- [ ] Set up tsup for CLI bundling

---

## Phase 1: Core Engine — Parser Module (`packages/parser`)

- [ ] Set up ts-morph (TypeScript Compiler API) for AST parsing
- [ ] Extract function declarations (name, params, return type)
- [ ] Extract exported symbols (classes, interfaces, type aliases, constants)
- [ ] Extract inline JSDoc comments
- [ ] Define `ParsedSymbol` interface (shared types in `packages/core-engine`)
- [ ] Unit tests: parse sample .ts files, assert extracted symbols

---

## Phase 2: Core Engine — Diff Analyzer (`packages/core-engine`)

- [ ] Accept a unified diff (string) as input
- [ ] Parse diff to identify changed files and hunks
- [ ] For each changed .ts file: parse old and new versions via parser
- [ ] Produce a `ChangeSet`: added/removed/modified symbols with before/after
- [ ] Unit tests: given sample diffs, assert correct ChangeSet output

---

## Phase 3: Core Engine — Matcher (`packages/matcher`)

- [ ] Documentation discovery: scan configured paths for .md files
- [ ] Symbol-name matching: grep docs for function/class names from ChangeSet
- [ ] File-proximity matching: check for docs co-located with changed code
- [ ] Build `DocReference[]` mapping: symbol → doc file + line range
- [ ] Unit tests: given sample docs + ChangeSet, assert correct mappings

---

## Phase 4: Core Engine — Drift Detector (`packages/core-engine`)

- [ ] Compare ChangeSet symbols against matched DocReferences
- [ ] Detect: signature mismatch (params changed, return type changed)
- [ ] Detect: removed/renamed symbols still referenced in docs
- [ ] Detect: outdated code examples (function calls with wrong args)
- [ ] Produce `DriftReport[]` with type, location, old value, new value
- [ ] Confidence scoring: assign % based on match quality
- [ ] Unit tests: given ChangeSet + DocReferences, assert correct drift items

---

## Phase 5: Core Engine — Fix Generator (`packages/fixer`)

- [ ] Deterministic fixes: signature replacement in docs
- [ ] Deterministic fixes: parameter name/count updates
- [ ] Deterministic fixes: remove references to deleted symbols
- [ ] AI-assisted fixes (optional): set up abstract provider interface
- [ ] AI-assisted fixes: OpenAI provider implementation
- [ ] AI-assisted fixes: Anthropic provider implementation
- [ ] Produce `DocPatch[]`: file, line range, old text, new text
- [ ] Unit tests: given DriftReport, assert correct patches
- [ ] Snapshot tests: full doc update scenarios

---

## Phase 6: CLI (`apps/cli`)

- [ ] Set up CLI framework (commander or citty)
- [ ] `doqtor check` — run pipeline on local git diff, output drift report
- [ ] `doqtor fix` — run pipeline + apply patches locally
- [ ] `doqtor init` — generate default `doqtor.config.json`
- [ ] Config loader: read and validate `doqtor.config.json`
- [ ] Respect ignore rules from config
- [ ] Human-readable output formatting (table/colored diff)
- [ ] Integration tests: run CLI against fixture repos

---

## Phase 7: GitHub Integration (`packages/github`)

- [ ] GitHub App: JWT auth + installation token exchange (Octokit)
- [ ] Webhook receiver: validate signatures, parse `pull_request.closed`
- [ ] Fetch PR diff via GitHub API
- [ ] Fetch file contents (old + new) for changed files
- [ ] Create branch + commit patched doc files
- [ ] Create PR with summary (title: `docs: update after #<PR_NUMBER>`)
- [ ] Add PR body with change summary
- [ ] Handle rate limiting (retry with backoff)

---

## Phase 8: Backend Server (`apps/backend`)

- [ ] Set up Hono (or Fastify — TBD) server
- [ ] Webhook endpoint: receive + validate GitHub events
- [ ] Orchestrator: wire webhook → diff analyzer → matcher → drift → fixer → PR
- [ ] Sequential webhook processing (in-memory queue for MVP)
- [ ] Config: read repo-level `doqtor.config.json` via GitHub API
- [ ] Structured logging (repo, PR number, pipeline stage)
- [ ] Error handling: log failures, don't crash on bad input
- [ ] Health check endpoint
- [ ] Deploy to Railway

---

## Phase 9: Testing & Hardening

- [ ] End-to-end test: mock webhook → full pipeline → assert PR created
- [ ] Test against real open-source repos (manual validation)
- [ ] Edge cases: empty diffs, binary files, massive PRs, no docs found
- [ ] Rate limit handling verification
- [ ] Webhook signature validation tests

---

## Phase 10: Polish & Ship

- [ ] Write README with setup instructions
- [ ] GitHub App manifest for easy installation
- [ ] Example `doqtor.config.json` in repo
- [ ] npm publish CLI package
- [ ] Deploy backend, verify on a real repo

---

## Deferred / Future

- [ ] PR batching (aggregate multiple webhook events)
- [ ] Python support via tree-sitter
- [ ] Executable docs validation (run code blocks)
- [ ] Drift analytics dashboard
- [ ] PostgreSQL for history / Redis for queue
- [ ] Multi-repo org dashboard
- [ ] VSCode extension
