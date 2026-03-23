import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { DoqtorConfig } from "@doqtor/core-engine";

const CONFIG_FILE_NAMES = ["doqtor.config.json", ".doqtorrc.json"];

const DEFAULT_CONFIG: DoqtorConfig = {
  docsPaths: ["README.md", "docs/"],
  ignore: ["node_modules/", "dist/", ".git/"],
  ai: { enabled: false },
  autoPR: true,
};

export function loadConfig(cwd: string = process.cwd()): DoqtorConfig {
  for (const name of CONFIG_FILE_NAMES) {
    const configPath = join(cwd, name);
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<DoqtorConfig>;
      return mergeConfig(DEFAULT_CONFIG, parsed);
    }
  }

  return DEFAULT_CONFIG;
}

function mergeConfig(base: DoqtorConfig, override: Partial<DoqtorConfig>): DoqtorConfig {
  return {
    docsPaths: override.docsPaths ?? base.docsPaths,
    ignore: override.ignore ?? base.ignore,
    ai: {
      enabled: override.ai?.enabled ?? base.ai.enabled,
      provider: override.ai?.provider ?? base.ai.provider,
    },
    autoPR: override.autoPR ?? base.autoPR,
  };
}

export function getDefaultConfig(): DoqtorConfig {
  return { ...DEFAULT_CONFIG };
}
