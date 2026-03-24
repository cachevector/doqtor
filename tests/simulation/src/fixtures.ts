/**
 * Fixtures simulating a real open-source project.
 *
 * Scenario: An HTTP client library called "fetchkit" ships a breaking change.
 * The maintainer renamed a function, changed a signature, removed a deprecated
 * method, and the docs haven't been updated yet.
 */

// ─── Before: src/client.ts (v1.0) ────────────────────────────────

export const BEFORE_CLIENT = `
import { RequestOptions, Response } from "./types";

/**
 * Create a new HTTP client instance.
 * @param baseUrl - The base URL for all requests
 * @param timeout - Request timeout in milliseconds
 */
export function createClient(baseUrl: string, timeout: number = 5000) {
  return new HttpClient(baseUrl, timeout);
}

/**
 * Send a GET request.
 * @param url - The URL to fetch
 * @param headers - Optional request headers
 * @returns The response object
 */
export function get(url: string, headers?: Record<string, string>): Promise<Response> {
  return fetch(url, { headers }).then(r => r.json());
}

/**
 * Send a POST request with a JSON body.
 * @param url - The URL to post to
 * @param body - The request body
 * @param headers - Optional request headers
 * @returns The response object
 */
export function post(url: string, body: unknown, headers?: Record<string, string>): Promise<Response> {
  return fetch(url, { method: "POST", body: JSON.stringify(body), headers }).then(r => r.json());
}

/**
 * @deprecated Use \`get\` instead. Will be removed in v2.0.
 */
export function fetchJson(url: string): Promise<unknown> {
  return fetch(url).then(r => r.json());
}

export class HttpClient {
  constructor(private baseUrl: string, private timeout: number) {}

  request(path: string, options?: RequestOptions): Promise<Response> {
    return fetch(this.baseUrl + path, options as any).then(r => r.json());
  }
}
`.trim();

// ─── After: src/client.ts (v2.0) ─────────────────────────────────

export const AFTER_CLIENT = `
import { FetchOptions, Response } from "./types";

/**
 * Create a new HTTP client instance.
 * @param baseUrl - The base URL for all requests
 * @param options - Client configuration options
 */
export function createClient(baseUrl: string, options?: FetchOptions) {
  return new HttpClient(baseUrl, options);
}

/**
 * Send a GET request.
 * @param url - The URL to fetch
 * @param options - Request options including headers, timeout, retries
 * @returns The response object
 */
export function get(url: string, options?: FetchOptions): Promise<Response> {
  return fetch(url, options).then(r => r.json());
}

/**
 * Send a POST request with a JSON body.
 * @param url - The URL to post to
 * @param body - The request body
 * @param options - Request options including headers, timeout, retries
 * @returns The response object
 */
export function post(url: string, body: unknown, options?: FetchOptions): Promise<Response> {
  return fetch(url, { method: "POST", body: JSON.stringify(body), ...options }).then(r => r.json());
}

export class HttpClient {
  constructor(private baseUrl: string, private options?: FetchOptions) {}

  send(path: string, options?: FetchOptions): Promise<Response> {
    return fetch(this.baseUrl + path, { ...this.options, ...options }).then(r => r.json());
  }
}
`.trim();

// ─── Before: src/retry.ts (v1.0) ─────────────────────────────────

export const BEFORE_RETRY = `
/**
 * Retry a function with exponential backoff.
 * @param fn - The function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  return attempt(fn, 0, maxRetries, baseDelay);
}

function attempt<T>(
  fn: () => Promise<T>,
  current: number,
  max: number,
  delay: number
): Promise<T> {
  return fn().catch(err => {
    if (current >= max) throw err;
    return new Promise(r => setTimeout(r, delay * Math.pow(2, current)))
      .then(() => attempt(fn, current + 1, max, delay));
  });
}
`.trim();

// ─── After: src/retry.ts (v2.0) ──────────────────────────────────

export const AFTER_RETRY = `
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

/**
 * Retry a function with exponential backoff.
 * @param fn - The function to retry
 * @param options - Retry configuration
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY, ...options };
  return attempt(fn, 0, opts);
}

function attempt<T>(
  fn: () => Promise<T>,
  current: number,
  opts: RetryOptions
): Promise<T> {
  return fn().catch(err => {
    if (current >= opts.maxAttempts) throw err;
    opts.onRetry?.(err, current);
    const delay = Math.min(opts.baseDelay * Math.pow(2, current), opts.maxDelay);
    return new Promise(r => setTimeout(r, delay))
      .then(() => attempt(fn, current + 1, opts));
  });
}
`.trim();

// ─── Documentation: README.md ─────────────────────────────────────

export const README_DOC = `
# fetchkit

A lightweight HTTP client for Node.js and the browser.

## Installation

\`\`\`bash
npm install fetchkit
\`\`\`

## Quick Start

\`\`\`typescript
import { createClient, get, post } from "fetchkit";

// Simple requests
const data = await get("https://api.example.com/users", { "Authorization": "Bearer token" });

// With a client instance
const client = createClient("https://api.example.com", 5000);
const response = await client.request("/users");
\`\`\`

## API Reference

### \`createClient(baseUrl, timeout)\`

Creates a new HTTP client instance.

- \`baseUrl\` (string) - The base URL for all requests
- \`timeout\` (number, default: 5000) - Request timeout in milliseconds

### \`get(url, headers)\`

Sends a GET request.

\`\`\`typescript
const users = await get("https://api.example.com/users");
const authed = await get("https://api.example.com/me", { "Authorization": "Bearer token" });
\`\`\`

### \`post(url, body, headers)\`

Sends a POST request with a JSON body.

\`\`\`typescript
const result = await post("https://api.example.com/users", { name: "Alice" }, { "Content-Type": "application/json" });
\`\`\`

### \`fetchJson(url)\`

> **Deprecated**: Use \`get\` instead.

Fetches JSON from a URL. Will be removed in v2.0.

\`\`\`typescript
const data = await fetchJson("https://api.example.com/data");
\`\`\`

### \`withRetry(fn, maxRetries, baseDelay)\`

Retries a function with exponential backoff.

- \`fn\` - The async function to retry
- \`maxRetries\` (number, default: 3) - Maximum retry attempts
- \`baseDelay\` (number, default: 1000) - Base delay in ms

\`\`\`typescript
const data = await withRetry(() => get("https://flaky-api.com/data"), 5, 2000);
\`\`\`

## Migration from v1.x

See CHANGELOG.md for breaking changes.
`.trim();

// ─── Documentation: docs/guide.md ─────────────────────────────────

export const GUIDE_DOC = `
# Getting Started with fetchkit

## Making Your First Request

The simplest way to use fetchkit is with the \`get\` and \`post\` functions:

\`\`\`typescript
import { get, post, fetchJson } from "fetchkit";

// GET request with headers
const users = await get("/api/users", { "Accept": "application/json" });

// POST request
await post("/api/users", { name: "Bob", email: "bob@example.com" }, { "Content-Type": "application/json" });

// Legacy method (deprecated)
const old = await fetchJson("/api/legacy");
\`\`\`

## Using the Client

For repeated requests to the same API, create a client:

\`\`\`typescript
import { createClient } from "fetchkit";

const api = createClient("https://api.example.com", 10000);
const users = await api.request("/users");
const posts = await api.request("/posts");
\`\`\`

## Error Handling with Retries

Use \`withRetry\` to handle transient failures:

\`\`\`typescript
import { withRetry, get } from "fetchkit";

const data = await withRetry(
  () => get("https://unreliable-api.com/data"),
  3,
  1000
);
\`\`\`

The function will retry up to \`maxRetries\` times with exponential backoff
starting from \`baseDelay\` milliseconds.
`.trim();

// ─── The unified diff (what would come from `git diff`) ───────────

export const UNIFIED_DIFF = `diff --git a/src/client.ts b/src/client.ts
--- a/src/client.ts
+++ b/src/client.ts
@@ -1,48 +1,40 @@
-import { RequestOptions, Response } from "./types";
+import { FetchOptions, Response } from "./types";

 /**
  * Create a new HTTP client instance.
  * @param baseUrl - The base URL for all requests
- * @param timeout - Request timeout in milliseconds
+ * @param options - Client configuration options
  */
-export function createClient(baseUrl: string, timeout: number = 5000) {
-  return new HttpClient(baseUrl, timeout);
+export function createClient(baseUrl: string, options?: FetchOptions) {
+  return new HttpClient(baseUrl, options);
 }

 /**
  * Send a GET request.
  * @param url - The URL to fetch
- * @param headers - Optional request headers
+ * @param options - Request options including headers, timeout, retries
  * @returns The response object
  */
-export function get(url: string, headers?: Record<string, string>): Promise<Response> {
-  return fetch(url, { headers }).then(r => r.json());
+export function get(url: string, options?: FetchOptions): Promise<Response> {
+  return fetch(url, options).then(r => r.json());
 }

 /**
  * Send a POST request with a JSON body.
  * @param url - The URL to post to
  * @param body - The request body
- * @param headers - Optional request headers
+ * @param options - Request options including headers, timeout, retries
  * @returns The response object
  */
-export function post(url: string, body: unknown, headers?: Record<string, string>): Promise<Response> {
-  return fetch(url, { method: "POST", body: JSON.stringify(body), headers }).then(r => r.json());
-}
-
-/**
- * @deprecated Use \`get\` instead. Will be removed in v2.0.
- */
-export function fetchJson(url: string): Promise<unknown> {
-  return fetch(url).then(r => r.json());
+export function post(url: string, body: unknown, options?: FetchOptions): Promise<Response> {
+  return fetch(url, { method: "POST", body: JSON.stringify(body), ...options }).then(r => r.json());
 }

 export class HttpClient {
-  constructor(private baseUrl: string, private timeout: number) {}
+  constructor(private baseUrl: string, private options?: FetchOptions) {}

-  request(path: string, options?: RequestOptions): Promise<Response> {
-    return fetch(this.baseUrl + path, options as any).then(r => r.json());
+  send(path: string, options?: FetchOptions): Promise<Response> {
+    return fetch(this.baseUrl + path, { ...this.options, ...options }).then(r => r.json());
   }
 }
diff --git a/src/retry.ts b/src/retry.ts
--- a/src/retry.ts
+++ b/src/retry.ts
@@ -1,27 +1,38 @@
+export interface RetryOptions {
+  maxAttempts: number;
+  baseDelay: number;
+  maxDelay: number;
+  onRetry?: (error: Error, attempt: number) => void;
+}
+
+const DEFAULT_RETRY: RetryOptions = {
+  maxAttempts: 3,
+  baseDelay: 1000,
+  maxDelay: 30000,
+};
+
 /**
  * Retry a function with exponential backoff.
  * @param fn - The function to retry
- * @param maxRetries - Maximum number of retries
- * @param baseDelay - Base delay in milliseconds
+ * @param options - Retry configuration
  */
 export function withRetry<T>(
   fn: () => Promise<T>,
-  maxRetries: number = 3,
-  baseDelay: number = 1000
+  options: Partial<RetryOptions> = {}
 ): Promise<T> {
-  return attempt(fn, 0, maxRetries, baseDelay);
+  const opts = { ...DEFAULT_RETRY, ...options };
+  return attempt(fn, 0, opts);
 }

 function attempt<T>(
   fn: () => Promise<T>,
   current: number,
-  max: number,
-  delay: number
+  opts: RetryOptions
 ): Promise<T> {
   return fn().catch(err => {
-    if (current >= max) throw err;
-    return new Promise(r => setTimeout(r, delay * Math.pow(2, current)))
-      .then(() => attempt(fn, current + 1, max, delay));
+    if (current >= opts.maxAttempts) throw err;
+    opts.onRetry?.(err, current);
+    const delay = Math.min(opts.baseDelay * Math.pow(2, current), opts.maxDelay);
+    return new Promise(r => setTimeout(r, delay))
+      .then(() => attempt(fn, current + 1, opts));
   });
 }
`;
