/**
 * Scenario: "validatorjs" - a schema validation library.
 *
 * The maintainer merged a PR that:
 *   - Changed validate(data, schema) to validate(data, schema, options?)
 *   - Renamed `StringRule` to `StringSchema`
 *   - Removed `validateSync` (was deprecated)
 *   - Changed `createSchema` return type from Schema to SchemaBuilder
 *   - Added a new `coerce` parameter to `parseField`
 *   - Renamed class `Validator` method `check` to `run`
 */

export const BEFORE_VALIDATOR = `
import type { Schema, ValidationResult, Rule } from "./types";

/**
 * Validate data against a schema.
 * @param data - The data to validate
 * @param schema - The validation schema
 * @returns Validation result with errors array
 */
export function validate(data: unknown, schema: Schema): ValidationResult {
  const errors = [];
  for (const [key, rule] of Object.entries(schema.rules)) {
    const value = (data as Record<string, unknown>)[key];
    if (!rule.check(value)) {
      errors.push({ field: key, message: rule.message });
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * @deprecated Use validate() instead. Will be removed in v3.
 */
export function validateSync(data: unknown, schema: Schema): ValidationResult {
  return validate(data, schema);
}

/**
 * Create a new schema definition.
 * @param name - Schema name for error messages
 * @returns A new Schema instance
 */
export function createSchema(name: string): Schema {
  return { name, rules: {} };
}

/**
 * Parse and validate a single field value.
 * @param value - The raw value
 * @param rule - The validation rule to apply
 * @returns The parsed value or throws
 */
export function parseField(value: unknown, rule: Rule): unknown {
  if (!rule.check(value)) {
    throw new Error(rule.message);
  }
  return value;
}

export class StringRule {
  minLength(n: number): StringRule { return this; }
  maxLength(n: number): StringRule { return this; }
  pattern(regex: RegExp): StringRule { return this; }
  check(value: unknown): boolean { return typeof value === "string"; }
  message = "Must be a string";
}

export class Validator {
  constructor(private schema: Schema) {}

  check(data: unknown): ValidationResult {
    return validate(data, this.schema);
  }
}
`.trim();

export const AFTER_VALIDATOR = `
import type { Schema, SchemaBuilder, ValidationResult, ValidationOptions, Rule } from "./types";

/**
 * Validate data against a schema.
 * @param data - The data to validate
 * @param schema - The validation schema
 * @param options - Validation options (abortEarly, stripUnknown)
 * @returns Validation result with errors array
 */
export function validate(data: unknown, schema: Schema, options?: ValidationOptions): ValidationResult {
  const errors = [];
  for (const [key, rule] of Object.entries(schema.rules)) {
    const value = (data as Record<string, unknown>)[key];
    if (!rule.check(value)) {
      errors.push({ field: key, message: rule.message });
      if (options?.abortEarly) break;
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Create a new schema builder.
 * @param name - Schema name for error messages
 * @returns A SchemaBuilder for chaining rules
 */
export function createSchema(name: string): SchemaBuilder {
  return { name, rules: {}, build: () => ({ name, rules: {} }) };
}

/**
 * Parse and validate a single field value.
 * @param value - The raw value
 * @param rule - The validation rule to apply
 * @param coerce - Whether to coerce the value to the expected type
 * @returns The parsed value or throws
 */
export function parseField(value: unknown, rule: Rule, coerce: boolean = false): unknown {
  if (coerce && rule.coerce) {
    value = rule.coerce(value);
  }
  if (!rule.check(value)) {
    throw new Error(rule.message);
  }
  return value;
}

export class StringSchema {
  minLength(n: number): StringSchema { return this; }
  maxLength(n: number): StringSchema { return this; }
  pattern(regex: RegExp): StringSchema { return this; }
  email(): StringSchema { return this; }
  check(value: unknown): boolean { return typeof value === "string"; }
  message = "Must be a string";
}

export class Validator {
  constructor(private schema: Schema) {}

  run(data: unknown, options?: ValidationOptions): ValidationResult {
    return validate(data, this.schema, options);
  }
}
`.trim();

export const BEFORE_UTILS = `
/**
 * Check if a value is empty (null, undefined, empty string, empty array).
 * @param value - The value to check
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Format validation errors into a human-readable string.
 * @param errors - Array of validation errors
 * @param separator - Line separator
 */
export function formatErrors(errors: Array<{ field: string; message: string }>, separator: string = "\\n"): string {
  return errors.map(e => \`\${e.field}: \${e.message}\`).join(separator);
}
`.trim();

export const AFTER_UTILS = `
/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object).
 * @param value - The value to check
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

/**
 * Format validation errors into a structured output.
 * @param errors - Array of validation errors
 * @param options - Formatting options
 */
export function formatErrors(errors: Array<{ field: string; message: string }>, options?: { separator?: string; includeField?: boolean }): string {
  const sep = options?.separator ?? "\\n";
  if (options?.includeField === false) {
    return errors.map(e => e.message).join(sep);
  }
  return errors.map(e => \`\${e.field}: \${e.message}\`).join(sep);
}
`.trim();

export const VALIDATORJS_README = `
# validatorjs

A lightweight schema validation library for TypeScript.

## Installation

\`\`\`bash
npm install validatorjs
\`\`\`

## Basic Usage

\`\`\`typescript
import { validate, createSchema, StringRule } from "validatorjs";

const schema = createSchema("user");
const rule = new StringRule();
rule.minLength(3);

const result = validate({ name: "Al" }, schema);
if (!result.valid) {
  console.log(result.errors);
}
\`\`\`

## API

### \`validate(data, schema)\`

Validates data against a schema. Returns a \`ValidationResult\` with \`valid\` (boolean) and \`errors\` (array).

\`\`\`typescript
const result = validate(userData, userSchema);
\`\`\`

### \`validateSync(data, schema)\`

> Deprecated: use \`validate()\` instead.

Synchronous validation. Same behavior as \`validate\`.

\`\`\`typescript
const result = validateSync(formData, formSchema);
\`\`\`

### \`createSchema(name)\`

Creates a new Schema instance for defining validation rules.

\`\`\`typescript
const userSchema = createSchema("user");
\`\`\`

### \`parseField(value, rule)\`

Validates a single value against a rule. Throws on failure.

\`\`\`typescript
const parsed = parseField(input, new StringRule());
\`\`\`

### \`StringRule\`

String validation rule with chainable methods:

\`\`\`typescript
const rule = new StringRule()
  .minLength(2)
  .maxLength(100)
  .pattern(/^[a-z]+$/i);
\`\`\`

### \`Validator\`

Class-based validation wrapper:

\`\`\`typescript
const v = new Validator(schema);
const result = v.check(data);
\`\`\`

## Utilities

### \`formatErrors(errors, separator)\`

Formats an error array into a readable string.

\`\`\`typescript
import { formatErrors } from "validatorjs/utils";

const msg = formatErrors(result.errors, "; ");
// "name: too short; email: required"
\`\`\`

### \`isEmpty(value)\`

Checks if a value is empty (null, undefined, empty string, or empty array).

\`\`\`typescript
isEmpty("");       // true
isEmpty([]);       // true
isEmpty(null);     // true
isEmpty("hello");  // false
\`\`\`
`.trim();

export const VALIDATORJS_GUIDE = `
# Validation Guide

## Defining Schemas

Use \`createSchema\` to define a validation schema:

\`\`\`typescript
import { createSchema, StringRule } from "validatorjs";

const loginSchema = createSchema("login");
\`\`\`

## Adding Rules

Use \`StringRule\` for string validation:

\`\`\`typescript
const emailRule = new StringRule().pattern(/^.+@.+\\..+$/);
const passwordRule = new StringRule().minLength(8).maxLength(64);
\`\`\`

## Running Validation

Pass your data and schema to \`validate\`:

\`\`\`typescript
import { validate } from "validatorjs";

const result = validate(formData, loginSchema);
if (!result.valid) {
  console.error(formatErrors(result.errors, "\\n"));
}
\`\`\`

## Single Field Validation

Use \`parseField\` to validate one value at a time:

\`\`\`typescript
import { parseField, StringRule } from "validatorjs";

try {
  const name = parseField(input, new StringRule().minLength(1));
} catch (err) {
  console.error("Invalid:", err.message);
}
\`\`\`

## Class-based Approach

If you prefer OOP style, use the \`Validator\` class:

\`\`\`typescript
import { Validator, createSchema } from "validatorjs";

const schema = createSchema("profile");
const v = new Validator(schema);
const result = v.check(profileData);
\`\`\`

## Deprecated: validateSync

\`validateSync\` is deprecated and will be removed in v3. Use \`validate\` instead.
`.trim();

export const VALIDATORJS_DIFF = `diff --git a/src/validator.ts b/src/validator.ts
--- a/src/validator.ts
+++ b/src/validator.ts
@@ -1,59 +1,63 @@
-import type { Schema, ValidationResult, Rule } from "./types";
+import type { Schema, SchemaBuilder, ValidationResult, ValidationOptions, Rule } from "./types";

 /**
  * Validate data against a schema.
  * @param data - The data to validate
  * @param schema - The validation schema
+ * @param options - Validation options (abortEarly, stripUnknown)
  * @returns Validation result with errors array
  */
-export function validate(data: unknown, schema: Schema): ValidationResult {
+export function validate(data: unknown, schema: Schema, options?: ValidationOptions): ValidationResult {
   const errors = [];
   for (const [key, rule] of Object.entries(schema.rules)) {
     const value = (data as Record<string, unknown>)[key];
     if (!rule.check(value)) {
       errors.push({ field: key, message: rule.message });
+      if (options?.abortEarly) break;
     }
   }
   return { valid: errors.length === 0, errors };
 }

-/**
- * @deprecated Use validate() instead. Will be removed in v3.
- */
-export function validateSync(data: unknown, schema: Schema): ValidationResult {
-  return validate(data, schema);
-}
-
 /**
- * Create a new schema definition.
+ * Create a new schema builder.
  * @param name - Schema name for error messages
- * @returns A new Schema instance
+ * @returns A SchemaBuilder for chaining rules
  */
-export function createSchema(name: string): Schema {
-  return { name, rules: {} };
+export function createSchema(name: string): SchemaBuilder {
+  return { name, rules: {}, build: () => ({ name, rules: {} }) };
 }

 /**
  * Parse and validate a single field value.
  * @param value - The raw value
  * @param rule - The validation rule to apply
+ * @param coerce - Whether to coerce the value to the expected type
  * @returns The parsed value or throws
  */
-export function parseField(value: unknown, rule: Rule): unknown {
+export function parseField(value: unknown, rule: Rule, coerce: boolean = false): unknown {
+  if (coerce && rule.coerce) {
+    value = rule.coerce(value);
+  }
   if (!rule.check(value)) {
     throw new Error(rule.message);
   }
   return value;
 }

-export class StringRule {
-  minLength(n: number): StringRule { return this; }
-  maxLength(n: number): StringRule { return this; }
-  pattern(regex: RegExp): StringRule { return this; }
+export class StringSchema {
+  minLength(n: number): StringSchema { return this; }
+  maxLength(n: number): StringSchema { return this; }
+  pattern(regex: RegExp): StringSchema { return this; }
+  email(): StringSchema { return this; }
   check(value: unknown): boolean { return typeof value === "string"; }
   message = "Must be a string";
 }

 export class Validator {
   constructor(private schema: Schema) {}

-  check(data: unknown): ValidationResult {
-    return validate(data, this.schema);
+  run(data: unknown, options?: ValidationOptions): ValidationResult {
+    return validate(data, this.schema, options);
   }
 }
diff --git a/src/utils.ts b/src/utils.ts
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,19 +1,23 @@
 /**
- * Check if a value is empty (null, undefined, empty string, empty array).
+ * Check if a value is empty (null, undefined, empty string, empty array, empty object).
  * @param value - The value to check
  */
 export function isEmpty(value: unknown): boolean {
   if (value == null) return true;
   if (typeof value === "string") return value.trim() === "";
   if (Array.isArray(value)) return value.length === 0;
+  if (typeof value === "object") return Object.keys(value as object).length === 0;
   return false;
 }

 /**
- * Format validation errors into a human-readable string.
+ * Format validation errors into a structured output.
  * @param errors - Array of validation errors
- * @param separator - Line separator
+ * @param options - Formatting options
  */
-export function formatErrors(errors: Array<{ field: string; message: string }>, separator: string = "\\n"): string {
-  return errors.map(e => \`\${e.field}: \${e.message}\`).join(separator);
+export function formatErrors(errors: Array<{ field: string; message: string }>, options?: { separator?: string; includeField?: boolean }): string {
+  const sep = options?.separator ?? "\\n";
+  if (options?.includeField === false) {
+    return errors.map(e => e.message).join(sep);
+  }
+  return errors.map(e => \`\${e.field}: \${e.message}\`).join(sep);
 }
`;
