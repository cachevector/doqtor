import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  noExternal: [
    "@doqtor/core-engine",
    "@doqtor/fixer",
    "@doqtor/matcher",
    "@doqtor/parser",
  ],
  external: [
    "ts-morph",
  ],
});
