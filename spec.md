# Docs Integrity Engine — Technical Specification (`spec.md`)

---

# 1. Product Overview

## 1.1 Vision

Build a **GitHub-native system** that ensures documentation is always aligned with code by automatically detecting changes and generating updates after PR merges.

> We do not generate docs from scratch.
> We ensure docs never become incorrect.

---

## 1.2 Problem Statement

* Documentation becomes outdated quickly
* Developers do not update docs during PRs
* Broken examples reduce trust in codebases
* No automated system enforces documentation correctness

---

## 1.3 Core Philosophy

* **Accuracy > Intelligence**
* **Automation without friction**
* **Human-in-the-loop (via PR review)**
* **Diff-based, not full-repo processing**

---

# 2. System Architecture

## 2.1 High-Level Flow

```
PR Merged
   ↓
GitHub Webhook (App)
   ↓
Backend Server (TS)
   ↓
Diff Analyzer (AST)
   ↓
Doc Matcher
   ↓
Drift Detection
   ↓
Fix Generator (AI optional)
   ↓
Create Docs PR
```

---

## 2.2 Components

### 2.2.1 GitHub App

* Handles authentication (JWT + installation tokens)
* Receives webhook events
* Triggers backend processing

---

### 2.2.2 Backend Server

* Webhook receiver
* Orchestrator
* Responsible for:

  * diff extraction
  * processing pipeline
  * PR creation

---

### 2.2.3 Core Engine (CLI-compatible)

* Diff analysis
* AST parsing
* Drift detection
* Fix generation

---

### 2.2.4 AI Layer (Optional)

* Used for:

  * natural language fixes
  * example regeneration
* Supports:

  * built-in provider
  * BYO API keys

---

### 2.2.5 GitHub Integration Layer

* PR creation
* Comments
* Commit patches

---

# 3. Feature Set

---

## 3.1 Core Features (Must-Have)

### 3.1.1 GitHub Integration

* GitHub App installation per repo/org
* Webhook support:

  * `pull_request.closed`
* Detect merged PRs

---

### 3.1.2 Diff-Based Analysis

* Analyze only changed files
* Extract:

  * modified functions
  * renamed symbols
  * changed parameters

---

### 3.1.3 Code Parsing (AST)

* Use tree-sitter
* Extract:

  * function names
  * parameters
  * return values

---

### 3.1.4 Documentation Discovery

* Identify docs:

  * `README.md`
  * `/docs/**`
  * inline examples

---

### 3.1.5 Drift Detection

Detect mismatches:

* function signatures
* parameter changes
* removed APIs
* outdated examples

---

### 3.1.6 Auto Fix Generation

* Deterministic updates:

  * signature replacement
  * param updates
* AI-assisted updates (optional)

---

### 3.1.7 Auto PR Creation

* Create PR:

  * `docs: update after #<PR_NUMBER>`
* Include:

  * updated files
  * summary

---

### 3.1.8 PR Summary

Example:

```
Changes:
- Updated createUser(email, name) → createUser(email)
- Fixed example in README
- Removed deprecated parameter
```

---

### 3.1.9 Configuration System

File: `docs-integrity.config.json`

```json
{
  "docsPaths": ["README.md", "docs/"],
  "ignore": ["internal/"],
  "ai": {
    "enabled": true,
    "provider": "openai"
  },
  "autoPR": true
}
```

---

## 3.2 Strong Features (Early Enhancements)

### 3.2.1 BYO AI Support

* User provides API keys
* Supported providers:

  * OpenAI
  * Anthropic

---

### 3.2.2 Confidence Scoring

* Each fix includes:

  * confidence %
  * reasoning

---

### 3.2.3 PR Batching

* Aggregate multiple changes
* Reduce PR spam

---

### 3.2.4 Ignore Rules

* File/path-based exclusions

---

### 3.2.5 CLI Tool

Commands:

```
docs-integrity check
docs-integrity fix
```

---

## 3.3 Advanced Features (Future)

### 3.3.1 Executable Docs Validation

* Run code blocks from docs
* Detect failures

---

### 3.3.2 API Contract Validation

* Compare actual vs documented responses

---

### 3.3.3 Drift Analytics

* Track doc health over time

---

### 3.3.4 Multi-Repo Dashboard

* Org-level insights

---

### 3.3.5 IDE Integration

* VSCode extension
* real-time feedback

---

# 4. Tech Stack

---

## 4.1 Backend

* **Language:** TypeScript
* **Runtime:** Node.js
* **Framework:** Hono (preferred)

---

## 4.2 GitHub Integration

* Octokit SDK
* GitHub App (webhooks + auth)

---

## 4.3 Parsing

* tree-sitter
* Language support:

  * Phase 1: TypeScript
  * Phase 2: Python

---

## 4.4 CLI

* TypeScript
* Bundler:

  * tsup / esbuild

---

## 4.5 AI Layer

* OpenAI / Anthropic APIs
* Abstract provider interface

---

## 4.6 Hosting

* Railway (primary)
* Render (alternative)

---

## 4.7 Storage

* MVP: none
* Future:

  * PostgreSQL
  * Redis (queue)

---

# 5. Project Structure

```
/apps
  /backend
  /cli

/packages
  /core-engine
  /parser
  /matcher
  /fixer
  /github

/config
  default-config.json
```

---

# 6. Core Modules

---

## 6.1 Parser Module

* Uses tree-sitter
* Extracts AST
* Outputs structured data

---

## 6.2 Diff Analyzer

* Compares:

  * old vs new AST
* Outputs change set

---

## 6.3 Matcher

* Maps code → docs
* Heuristic-based

---

## 6.4 Drift Detector

* Identifies inconsistencies

---

## 6.5 Fix Generator

* Deterministic fixes
* AI fallback

---

## 6.6 GitHub Service

* PR creation
* comments
* file updates

---

# 7. Coding Standards

---

## 7.1 General Principles

* Write **deterministic logic first**
* AI is optional, never core dependency
* Prefer clarity over cleverness

---

## 7.2 TypeScript Standards

* Strict mode enabled
* No `any`
* Use interfaces over types where possible
* Prefer small pure functions

---

## 7.3 Error Handling

* No silent failures
* All errors must:

  * be logged
  * include context

---

## 7.4 Logging

* Structured logs
* Include:

  * repo
  * PR number
  * operation stage

---

## 7.5 Testing

* Unit tests for:

  * parser
  * diff analyzer
  * matcher
* Snapshot tests for:

  * doc updates

---

## 7.6 Code Style

* Use ESLint + Prettier
* Consistent naming:

  * camelCase (variables)
  * PascalCase (classes)

---

# 8. Security Practices

---

## 8.1 GitHub App Security

* Validate webhook signatures
* Use short-lived tokens

---

## 8.2 API Keys

* Never store plaintext keys
* Use environment variables

---

## 8.3 Input Validation

* Sanitize all external inputs

---

# 9. Performance Guidelines

---

* Always use diff-based processing
* Avoid full repo scans
* Cache AST where possible
* Limit AI calls

---

# 10. Non-Goals (Important)

* No full doc generation
* No heavy UI in early stages
* No multi-language support initially
* No self-hosted LLM

---

# 11. Future Architecture Evolution

---

## Phase 1

* CLI + GitHub Action

## Phase 2

* GitHub App + Backend

## Phase 3

* Queue system
* Analytics

## Phase 4

* Hybrid engine (TS + Rust/Go)

---

# 12. Key Design Principles

---

## 12.1 Trust First

If wrong even 10% of time → product fails

---

## 12.2 Minimal Intrusion

* No blocking PRs
* No forced workflows

---

## 12.3 Incremental Intelligence

* deterministic → AI enhancement

---

# 13. Final Definition

> A GitHub-native system that automatically detects documentation drift after code changes and generates accurate, reviewable updates via pull requests.

---

# 14. Success Criteria

* Works on real repos
* Produces correct updates >90% of time
* Requires minimal user setup
* Integrates seamlessly into GitHub workflow

---

END OF SPEC
