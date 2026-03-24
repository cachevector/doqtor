/**
 * Scenario: "statestream" - a reactive state management library.
 *
 * The maintainer merged a PR that:
 *   - Renamed class `StateContainer` to `StateStore` + methods `dispatch`->`emit`, `getSnapshot`->`getState`
 *   - Renamed class `MiddlewarePipeline` to `MiddlewareChain` + factory `createPipeline`->`createChain`
 *   - Removed `disconnect()` method
 *   - Renamed `selectAsync` to `selectDeferred` (substring trap with `select`)
 *   - Changed type alias `StateSnapshot<T>` to `StateSlice<T>`
 *   - Changed `Subscription` interface to `Unsubscribe` type alias
 *   - Renamed constant `VERSION` to `LIB_VERSION`
 *   - Renamed constant `DEFAULT_OPTIONS` to `DEFAULT_CONFIG`
 *   - Changed `createStore` return type from `StateContainer<T>` to `StateStore<T>`
 *   - Added overload signature to `createStore`
 *
 * The README has a migration guide that intentionally shows both old and new APIs.
 */

export const BEFORE_STORE = `
import { StateSnapshot, Subscription } from './types';
import { MiddlewarePipeline } from './middleware';
import { DEFAULT_OPTIONS } from './constants';

/**
 * StateContainer holds application state and provides methods
 * to read, update, and observe state changes.
 */
export class StateContainer<T extends object> {
  private _state: T;
  private _listeners: Set<(snapshot: StateSnapshot<T>) => void>;
  private _pipeline: MiddlewarePipeline;
  private _options: typeof DEFAULT_OPTIONS;

  constructor(initialState: T, pipeline?: MiddlewarePipeline) {
    this._state = initialState;
    this._listeners = new Set();
    this._pipeline = pipeline ?? new MiddlewarePipeline();
    this._options = DEFAULT_OPTIONS;
  }

  /**
   * Dispatch an action to update state.
   * @param updater - A function that receives current state and returns new state
   */
  dispatch(updater: (state: T) => Partial<T>): void {
    const next = { ...this._state, ...updater(this._state) };
    const processed = this._pipeline.run(this._state, next);
    this._state = processed;
    this._listeners.forEach(fn => fn(this.getSnapshot()));
  }

  /**
   * Get a snapshot of the current state.
   */
  getSnapshot(): StateSnapshot<T> {
    return { ...this._state } as StateSnapshot<T>;
  }

  /**
   * Subscribe to state changes.
   * Returns a Subscription object with an unsubscribe method.
   */
  subscribe(listener: (snapshot: StateSnapshot<T>) => void): Subscription {
    this._listeners.add(listener);
    return {
      unsubscribe: () => this._listeners.delete(listener),
    };
  }

  /**
   * Disconnect all listeners from this container.
   */
  disconnect(): void {
    this._listeners.clear();
  }

  /**
   * Select a derived value from state.
   */
  select<R>(selector: (state: T) => R): R {
    return selector(this._state);
  }

  /**
   * Asynchronously select a derived value, running selector in a microtask.
   */
  selectAsync<R>(selector: (state: T) => Promise<R>): Promise<R> {
    return Promise.resolve().then(() => selector(this._state));
  }
}

/**
 * Create a new StateContainer with the given initial state.
 */
export function createStore<T extends object>(
  initialState: T,
  pipeline?: MiddlewarePipeline
): StateContainer<T> {
  return new StateContainer(initialState, pipeline);
}
`.trim();

export const AFTER_STORE = `
import { StateSlice, Unsubscribe } from './types';
import { MiddlewareChain } from './middleware';
import { DEFAULT_CONFIG } from './constants';

/**
 * StateStore holds application state and provides methods
 * to read, update, and observe state changes.
 */
export class StateStore<T extends object> {
  private _state: T;
  private _listeners: Set<(slice: StateSlice<T>) => void>;
  private _chain: MiddlewareChain;
  private _config: typeof DEFAULT_CONFIG;

  constructor(initialState: T, chain?: MiddlewareChain) {
    this._state = initialState;
    this._listeners = new Set();
    this._chain = chain ?? new MiddlewareChain();
    this._config = DEFAULT_CONFIG;
  }

  /**
   * Emit an action to update state.
   * @param updater - A function that receives current state and returns new state
   */
  emit(updater: (state: T) => Partial<T>): void {
    const next = { ...this._state, ...updater(this._state) };
    const processed = this._chain.run(this._state, next);
    this._state = processed;
    this._listeners.forEach(fn => fn(this.getState()));
  }

  /**
   * Get the current state slice.
   */
  getState(): StateSlice<T> {
    return { ...this._state } as StateSlice<T>;
  }

  /**
   * Subscribe to state changes.
   * Returns an Unsubscribe function - call it directly to stop receiving updates.
   */
  subscribe(listener: (slice: StateSlice<T>) => void): Unsubscribe {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Select a derived value from state.
   */
  select<R>(selector: (state: T) => R): R {
    return selector(this._state);
  }

  /**
   * Asynchronously select a derived value, running selector in a microtask.
   */
  selectDeferred<R>(selector: (state: T) => Promise<R>): Promise<R> {
    return Promise.resolve().then(() => selector(this._state));
  }
}

/**
 * Create a new StateStore with the given initial state.
 *
 * @overload
 */
export function createStore<T extends object>(initialState: T): StateStore<T>;
export function createStore<T extends object>(
  initialState: T,
  chain?: MiddlewareChain
): StateStore<T>;
export function createStore<T extends object>(
  initialState: T,
  chain?: MiddlewareChain
): StateStore<T> {
  return new StateStore(initialState, chain);
}
`.trim();

export const BEFORE_MIDDLEWARE = `
import { StateSnapshot } from './types';

export type MiddlewareFn<T> = (
  prev: StateSnapshot<T>,
  next: StateSnapshot<T>
) => StateSnapshot<T>;

/**
 * MiddlewarePipeline composes a series of middleware functions
 * that process state transitions.
 */
export class MiddlewarePipeline {
  private _fns: MiddlewareFn<any>[];

  constructor(...fns: MiddlewareFn<any>[]) {
    this._fns = fns;
  }

  /**
   * Add a middleware function to the pipeline.
   */
  use(fn: MiddlewareFn<any>): this {
    this._fns.push(fn);
    return this;
  }

  /**
   * Run the pipeline against a state transition.
   */
  run<T>(prev: T, next: T): T {
    return this._fns.reduce(
      (acc, fn) => fn(prev as any, acc as any) as T,
      next
    );
  }
}

export function createPipeline(...fns: MiddlewareFn<any>[]): MiddlewarePipeline {
  return new MiddlewarePipeline(...fns);
}
`.trim();

export const AFTER_MIDDLEWARE = `
import { StateSlice } from './types';

export type MiddlewareFn<T> = (
  prev: StateSlice<T>,
  next: StateSlice<T>
) => StateSlice<T>;

/**
 * MiddlewareChain composes a series of middleware functions
 * that process state transitions.
 */
export class MiddlewareChain {
  private _fns: MiddlewareFn<any>[];

  constructor(...fns: MiddlewareFn<any>[]) {
    this._fns = fns;
  }

  /**
   * Add a middleware function to the chain.
   */
  use(fn: MiddlewareFn<any>): this {
    this._fns.push(fn);
    return this;
  }

  /**
   * Run the chain against a state transition.
   */
  run<T>(prev: T, next: T): T {
    return this._fns.reduce(
      (acc, fn) => fn(prev as any, acc as any) as T,
      next
    );
  }
}

export function createChain(...fns: MiddlewareFn<any>[]): MiddlewareChain {
  return new MiddlewareChain(...fns);
}
`.trim();

export const BEFORE_TYPES = `
/**
 * A snapshot of a StateContainer's state at a point in time.
 */
export type StateSnapshot<T> = Readonly<T>;

/**
 * Returned by StateContainer.subscribe(). Call .unsubscribe() to stop
 * receiving updates.
 */
export interface Subscription {
  unsubscribe(): void;
}

export type Updater<T> = (state: T) => Partial<T>;
export type Selector<T, R> = (state: T) => R;
`.trim();

export const AFTER_TYPES = `
/**
 * A slice of a StateStore's state at a point in time.
 */
export type StateSlice<T> = Readonly<T>;

/**
 * Returned by StateStore.subscribe(). Call it directly to stop
 * receiving updates.
 */
export type Unsubscribe = () => void;

export type Updater<T> = (state: T) => Partial<T>;
export type Selector<T, R> = (state: T) => R;
`.trim();

export const BEFORE_CONSTANTS = `
export const VERSION = '1.4.2';

export const DEFAULT_OPTIONS = {
  batchUpdates: false,
  devtools: false,
  freeze: true,
} as const;

export const MAX_LISTENERS = 100;
`.trim();

export const AFTER_CONSTANTS = `
export const LIB_VERSION = '2.0.0';

export const DEFAULT_CONFIG = {
  batchUpdates: false,
  devtools: false,
  freeze: true,
} as const;

export const MAX_LISTENERS = 100;
`.trim();

export const BEFORE_INDEX = `
export { StateContainer, createStore } from './store';
export { MiddlewarePipeline, createPipeline } from './middleware';
export type { StateSnapshot, Subscription, Updater, Selector } from './types';
export { VERSION, DEFAULT_OPTIONS, MAX_LISTENERS } from './constants';
`.trim();

export const AFTER_INDEX = `
export { StateStore, createStore } from './store';
export { MiddlewareChain, createChain } from './middleware';
export type { StateSlice, Unsubscribe, Updater, Selector } from './types';
export { LIB_VERSION, DEFAULT_CONFIG, MAX_LISTENERS } from './constants';
`.trim();

export const STATESTREAM_README = `
# statestream

> Lightweight reactive state management for TypeScript applications.

[![npm](https://img.shields.io/npm/v/statestream)](https://npmjs.com/package/statestream)
![version](https://img.shields.io/badge/version-1.4.2-blue)

---

## Overview

**statestream** provides a simple, composable model for managing application state.
At the core is the \`StateContainer\` class, which holds your state, processes
updates through an optional \`MiddlewarePipeline\`, and notifies subscribers when
state changes.

The library exports a small surface area: \`StateContainer\`, \`createStore\`,
\`MiddlewarePipeline\`, \`createPipeline\`, and a handful of utility types like
\`StateSnapshot\` and \`Subscription\`.

Current release: **VERSION 1.4.2**. See \`VERSION\` for the constant.

---

## Installation

\`\`\`bash
npm install statestream
\`\`\`

---

## Quick Start

\`\`\`typescript
import { createStore } from 'statestream';

interface AppState {
  count: number;
  user: string | null;
}

const store = createStore<AppState>({ count: 0, user: null });

// Subscribe to changes
const sub = store.subscribe((snapshot) => {
  console.log('State changed:', snapshot);
});

// Dispatch an update
store.dispatch(state => ({ count: state.count + 1 }));

// Read current state
const snapshot = store.getSnapshot();
console.log(snapshot.count); // 1

// Unsubscribe when done
sub.unsubscribe();
\`\`\`

---

## Core Concepts

### StateContainer

The \`StateContainer<T>\` class is the primary building block of statestream.
It wraps your state object and exposes a controlled interface for reads and writes.

A \`StateContainer\` is created via the \`createStore\` factory function (preferred)
or directly with \`new StateContainer(initialState)\`.

**Key methods:**

| Method | Signature | Description |
|---|---|---|
| \`dispatch\` | \`(updater: Updater<T>) => void\` | Apply a state update |
| \`getSnapshot\` | \`() => StateSnapshot<T>\` | Read current state |
| \`subscribe\` | \`(listener) => Subscription\` | Listen for changes |
| \`disconnect\` | \`() => void\` | Remove all listeners |
| \`select\` | \`<R>(selector) => R\` | Derive a value |
| \`selectAsync\` | \`<R>(selector) => Promise<R>\` | Derive a value asynchronously |

#### dispatch

\`\`\`typescript
store.dispatch(state => ({ count: state.count + 1 }));
\`\`\`

The updater function receives the current state and returns a **partial** state
object. statestream merges the partial back into the full state before passing
it through the \`MiddlewarePipeline\`.

#### getSnapshot

\`\`\`typescript
const snap: StateSnapshot<AppState> = store.getSnapshot();
\`\`\`

Returns a \`StateSnapshot<T>\` - a frozen, shallow copy of the current state.
\`StateSnapshot<T>\` is defined as \`Readonly<T>\`.

#### subscribe

\`\`\`typescript
const sub: Subscription = store.subscribe(snapshot => {
  renderUI(snapshot);
});

// Later:
sub.unsubscribe();
\`\`\`

\`subscribe\` returns a \`Subscription\` object. Call \`subscription.unsubscribe()\`
to stop receiving updates. To remove **all** listeners at once, call
\`store.disconnect()\`.

#### select and selectAsync

\`\`\`typescript
const count = store.select(s => s.count);

const label = await store.selectAsync(async s => {
  const user = await fetchUser(s.userId);
  return user.displayName;
});
\`\`\`

Use \`select\` for synchronous projections and \`selectAsync\` for projections
that require async work. Note that \`select\` and \`selectAsync\` are distinct
methods - \`selectAsync\` always returns a \`Promise\`.

---

### MiddlewarePipeline

The \`MiddlewarePipeline\` class lets you intercept and transform state transitions
before they are committed. Each middleware function receives the previous and next
\`StateSnapshot<T>\` and returns the (possibly modified) next snapshot.

\`\`\`typescript
import { createPipeline, createStore } from 'statestream';

const pipeline = createPipeline(
  (prev, next) => {
    console.log('Transition:', prev, '->', next);
    return next;
  },
  (prev, next) => {
    // Freeze protection example
    return Object.freeze(next);
  }
);

const store = createStore({ count: 0 }, pipeline);
\`\`\`

You can also build a \`MiddlewarePipeline\` imperatively:

\`\`\`typescript
import { MiddlewarePipeline } from 'statestream';

const pipeline = new MiddlewarePipeline()
  .use(loggingMiddleware)
  .use(freezeMiddleware);
\`\`\`

The \`MiddlewarePipeline.use()\` method is chainable, so you can compose pipelines
in a fluent style.

---

## API Reference

### \`createStore(initialState, pipeline?)\`

**Signature:**
\`\`\`typescript
function createStore<T extends object>(
  initialState: T,
  pipeline?: MiddlewarePipeline
): StateContainer<T>
\`\`\`

Creates and returns a new \`StateContainer<T>\`. The \`pipeline\` argument is
optional; if omitted, a default empty \`MiddlewarePipeline\` is used internally.

Use \`DEFAULT_OPTIONS\` to inspect the built-in defaults:
\`\`\`typescript
import { DEFAULT_OPTIONS } from 'statestream';
console.log(DEFAULT_OPTIONS.freeze); // true
\`\`\`

### \`createPipeline(...fns)\`

\`\`\`typescript
function createPipeline(...fns: MiddlewareFn[]): MiddlewarePipeline
\`\`\`

Convenience factory for \`MiddlewarePipeline\`.

---

## Types

### \`StateSnapshot<T>\`

\`\`\`typescript
type StateSnapshot<T> = Readonly<T>;
\`\`\`

Represents a read-only view of a \`StateContainer\`'s state.

### \`Subscription\`

\`\`\`typescript
interface Subscription {
  unsubscribe(): void;
}
\`\`\`

Returned by \`StateContainer.subscribe()\`. Holds a reference to the listener
so it can be removed cleanly.

---

## Constants

| Name | Value | Description |
|---|---|---|
| \`VERSION\` | \`"1.4.2"\` | Current library version |
| \`DEFAULT_OPTIONS\` | \`{ batchUpdates, devtools, freeze }\` | Default configuration |
| \`MAX_LISTENERS\` | \`100\` | Maximum listeners per container |

---

## Advanced: Method Chaining with Middleware

The real power of \`MiddlewarePipeline\` shows when you chain multiple concerns:

\`\`\`typescript
import { MiddlewarePipeline, createStore } from 'statestream';

const store = createStore(
  { items: [], loading: false },
  new MiddlewarePipeline()
    .use(validationMiddleware)
    .use(loggingMiddleware)
    .use(persistenceMiddleware)
);

// Chain dispatches
store
  .dispatch(s => ({ loading: true }))
  .dispatch(s => ({ items: fetchedItems, loading: false }));
\`\`\`
`.trim();

export const STATESTREAM_GUIDE = `
# statestream - Getting Started Guide

## Introduction

Welcome to statestream! This guide walks you through building a small counter
application using the statestream library. By the end, you will understand how
\`StateContainer\`, \`MiddlewarePipeline\`, and subscriptions work together.

## Step 1: Create Your Store

The \`createStore\` function is the recommended entry point. It returns a
\`StateContainer\` bound to your initial state.

\`\`\`typescript
import { createStore } from 'statestream';

const store = createStore({ count: 0, label: 'hello' });
\`\`\`

The \`StateContainer\` class accepts any plain object as state.

## Step 2: Read State

To read the current state, call \`getSnapshot()\`:

\`\`\`typescript
const snapshot = store.getSnapshot();
console.log(snapshot.count); // 0
\`\`\`

\`getSnapshot\` returns a \`StateSnapshot<T>\`, which is a \`Readonly\` copy.
You cannot mutate a \`StateSnapshot\` directly.

## Step 3: Update State

Use \`dispatch\` to apply updates:

\`\`\`typescript
store.dispatch(state => ({ count: state.count + 1 }));
\`\`\`

The updater receives the current state and returns a partial new state.
The \`StateContainer\` merges the partial into the full state object.

## Step 4: Subscribe to Changes

\`subscribe\` registers a listener that fires every time state changes.
It returns a \`Subscription\` - keep it so you can unsubscribe later.

\`\`\`typescript
const sub: Subscription = store.subscribe(snapshot => {
  document.getElementById('counter')!.textContent = String(snapshot.count);
});

// When the component unmounts:
sub.unsubscribe();
\`\`\`

If you want to remove all listeners at once, call \`store.disconnect()\`.
This is useful during testing or when tearing down an entire module.

## Step 5: Selectors

The \`select\` method lets you project state into a derived value:

\`\`\`typescript
const doubled = store.select(s => s.count * 2);
\`\`\`

For async projections, use \`selectAsync\`:

\`\`\`typescript
const enriched = await store.selectAsync(async s => {
  const extra = await loadExtra(s.label);
  return { ...s, extra };
});
\`\`\`

Note: \`select\` and \`selectAsync\` are separate methods. Do not confuse them -
\`selectAsync\` always returns a \`Promise\` while \`select\` is synchronous.

## Step 6: Add Middleware

A \`MiddlewarePipeline\` lets you intercept state transitions. Use
\`createPipeline\` to build one:

\`\`\`typescript
import { createPipeline, createStore } from 'statestream';

const pipeline = createPipeline(
  (prev, next) => {
    console.log('[statestream] transition', prev, '=>', next);
    return next;
  }
);

const store = createStore({ count: 0 }, pipeline);
\`\`\`

You can also use \`MiddlewarePipeline\` directly and chain \`.use()\` calls:

\`\`\`typescript
import { MiddlewarePipeline } from 'statestream';

const pipeline = new MiddlewarePipeline()
  .use(logMiddleware)
  .use(validateMiddleware);
\`\`\`

## Step 7: Configuration and Constants

Use \`DEFAULT_OPTIONS\` to understand the defaults that \`StateContainer\` uses:

\`\`\`typescript
import { DEFAULT_OPTIONS, VERSION } from 'statestream';

console.log(\`statestream \${VERSION}\`);
console.log('Defaults:', DEFAULT_OPTIONS);
\`\`\`

## Full Counter Example

\`\`\`typescript
import {
  createStore,
  createPipeline,
  StateContainer,
  MiddlewarePipeline,
  DEFAULT_OPTIONS,
  VERSION,
} from 'statestream';
import type { StateSnapshot, Subscription } from 'statestream';

interface CounterState {
  count: number;
  history: number[];
}

const historyMiddleware = (
  prev: StateSnapshot<CounterState>,
  next: StateSnapshot<CounterState>
) => ({ ...next, history: [...next.history, next.count] });

const pipeline = createPipeline(historyMiddleware);
const store: StateContainer<CounterState> = createStore(
  { count: 0, history: [] },
  pipeline
);

console.log(\`Running statestream \${VERSION}\`);
console.log('Config:', DEFAULT_OPTIONS);

const sub: Subscription = store.subscribe(snap => {
  console.log('Count:', snap.count, 'History:', snap.history);
});

store.dispatch(s => ({ count: s.count + 1 }));
store.dispatch(s => ({ count: s.count + 1 }));
store.dispatch(s => ({ count: s.count + 1 }));

const current: StateSnapshot<CounterState> = store.getSnapshot();
console.log('Final state:', current);

const doubled = store.select(s => s.count * 2);
console.log('Doubled:', doubled);

sub.unsubscribe();
store.disconnect();
\`\`\`
`.trim();

export const STATESTREAM_DIFF = `diff --git a/src/store.ts b/src/store.ts
--- a/src/store.ts
+++ b/src/store.ts
@@ -1,76 +1,80 @@
-import { StateSnapshot, Subscription } from './types';
-import { MiddlewarePipeline } from './middleware';
-import { DEFAULT_OPTIONS } from './constants';
+import { StateSlice, Unsubscribe } from './types';
+import { MiddlewareChain } from './middleware';
+import { DEFAULT_CONFIG } from './constants';

 /**
- * StateContainer holds application state and provides methods
+ * StateStore holds application state and provides methods
  * to read, update, and observe state changes.
  */
-export class StateContainer<T extends object> {
+export class StateStore<T extends object> {
   private _state: T;
-  private _listeners: Set<(snapshot: StateSnapshot<T>) => void>;
-  private _pipeline: MiddlewarePipeline;
-  private _options: typeof DEFAULT_OPTIONS;
+  private _listeners: Set<(slice: StateSlice<T>) => void>;
+  private _chain: MiddlewareChain;
+  private _config: typeof DEFAULT_CONFIG;

-  constructor(initialState: T, pipeline?: MiddlewarePipeline) {
+  constructor(initialState: T, chain?: MiddlewareChain) {
     this._state = initialState;
     this._listeners = new Set();
-    this._pipeline = pipeline ?? new MiddlewarePipeline();
-    this._options = DEFAULT_OPTIONS;
+    this._chain = chain ?? new MiddlewareChain();
+    this._config = DEFAULT_CONFIG;
   }

   /**
-   * Dispatch an action to update state.
+   * Emit an action to update state.
    * @param updater - A function that receives current state and returns new state
    */
-  dispatch(updater: (state: T) => Partial<T>): void {
+  emit(updater: (state: T) => Partial<T>): void {
     const next = { ...this._state, ...updater(this._state) };
-    const processed = this._pipeline.run(this._state, next);
+    const processed = this._chain.run(this._state, next);
     this._state = processed;
-    this._listeners.forEach(fn => fn(this.getSnapshot()));
+    this._listeners.forEach(fn => fn(this.getState()));
   }

   /**
-   * Get a snapshot of the current state.
+   * Get the current state slice.
    */
-  getSnapshot(): StateSnapshot<T> {
-    return { ...this._state } as StateSnapshot<T>;
+  getState(): StateSlice<T> {
+    return { ...this._state } as StateSlice<T>;
   }

   /**
    * Subscribe to state changes.
-   * Returns a Subscription object with an unsubscribe method.
+   * Returns an Unsubscribe function - call it directly to stop receiving updates.
    */
-  subscribe(listener: (snapshot: StateSnapshot<T>) => void): Subscription {
+  subscribe(listener: (slice: StateSlice<T>) => void): Unsubscribe {
     this._listeners.add(listener);
-    return {
-      unsubscribe: () => this._listeners.delete(listener),
-    };
+    return () => this._listeners.delete(listener);
   }

-  /**
-   * Disconnect all listeners from this container.
-   */
-  disconnect(): void {
-    this._listeners.clear();
-  }
-
   /**
    * Select a derived value from state.
    */
   select<R>(selector: (state: T) => R): R {
     return selector(this._state);
   }

   /**
    * Asynchronously select a derived value, running selector in a microtask.
    */
-  selectAsync<R>(selector: (state: T) => Promise<R>): Promise<R> {
+  selectDeferred<R>(selector: (state: T) => Promise<R>): Promise<R> {
     return Promise.resolve().then(() => selector(this._state));
   }
 }

 /**
- * Create a new StateContainer with the given initial state.
+ * Create a new StateStore with the given initial state.
+ *
+ * @overload
  */
+export function createStore<T extends object>(initialState: T): StateStore<T>;
+export function createStore<T extends object>(
+  initialState: T,
+  chain?: MiddlewareChain
+): StateStore<T>;
 export function createStore<T extends object>(
   initialState: T,
-  pipeline?: MiddlewarePipeline
-): StateContainer<T> {
-  return new StateContainer(initialState, pipeline);
+  chain?: MiddlewareChain
+): StateStore<T> {
+  return new StateStore(initialState, chain);
 }
diff --git a/src/middleware.ts b/src/middleware.ts
--- a/src/middleware.ts
+++ b/src/middleware.ts
@@ -1,34 +1,34 @@
-import { StateSnapshot } from './types';
+import { StateSlice } from './types';

 export type MiddlewareFn<T> = (
-  prev: StateSnapshot<T>,
-  next: StateSnapshot<T>
-) => StateSnapshot<T>;
+  prev: StateSlice<T>,
+  next: StateSlice<T>
+) => StateSlice<T>;

 /**
- * MiddlewarePipeline composes a series of middleware functions
+ * MiddlewareChain composes a series of middleware functions
  * that process state transitions.
  */
-export class MiddlewarePipeline {
+export class MiddlewareChain {
   private _fns: MiddlewareFn<any>[];

   constructor(...fns: MiddlewareFn<any>[]) {
     this._fns = fns;
   }

   /**
-   * Add a middleware function to the pipeline.
+   * Add a middleware function to the chain.
    */
   use(fn: MiddlewareFn<any>): this {
     this._fns.push(fn);
     return this;
   }

   /**
-   * Run the pipeline against a state transition.
+   * Run the chain against a state transition.
    */
   run<T>(prev: T, next: T): T {
     return this._fns.reduce(
       (acc, fn) => fn(prev as any, acc as any) as T,
       next
     );
   }
 }

-export function createPipeline(...fns: MiddlewareFn<any>[]): MiddlewarePipeline {
-  return new MiddlewarePipeline(...fns);
+export function createChain(...fns: MiddlewareFn<any>[]): MiddlewareChain {
+  return new MiddlewareChain(...fns);
 }
diff --git a/src/types.ts b/src/types.ts
--- a/src/types.ts
+++ b/src/types.ts
@@ -1,12 +1,10 @@
-/**
- * A snapshot of a StateContainer's state at a point in time.
- */
-export type StateSnapshot<T> = Readonly<T>;
+/**
+ * A slice of a StateStore's state at a point in time.
+ */
+export type StateSlice<T> = Readonly<T>;

-/**
- * Returned by StateContainer.subscribe(). Call .unsubscribe() to stop
- * receiving updates.
- */
-export interface Subscription {
-  unsubscribe(): void;
-}
+/**
+ * Returned by StateStore.subscribe(). Call it directly to stop
+ * receiving updates.
+ */
+export type Unsubscribe = () => void;

 export type Updater<T> = (state: T) => Partial<T>;
 export type Selector<T, R> = (state: T) => R;
diff --git a/src/constants.ts b/src/constants.ts
--- a/src/constants.ts
+++ b/src/constants.ts
@@ -1,6 +1,6 @@
-export const VERSION = '1.4.2';
+export const LIB_VERSION = '2.0.0';

-export const DEFAULT_OPTIONS = {
+export const DEFAULT_CONFIG = {
   batchUpdates: false,
   devtools: false,
   freeze: true,
 } as const;

 export const MAX_LISTENERS = 100;
diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,5 @@
-export { StateContainer, createStore } from './store';
-export { MiddlewarePipeline, createPipeline } from './middleware';
-export type { StateSnapshot, Subscription, Updater, Selector } from './types';
-export { VERSION, DEFAULT_OPTIONS, MAX_LISTENERS } from './constants';
+export { StateStore, createStore } from './store';
+export { MiddlewareChain, createChain } from './middleware';
+export type { StateSlice, Unsubscribe, Updater, Selector } from './types';
+export { LIB_VERSION, DEFAULT_CONFIG, MAX_LISTENERS } from './constants';
`;
