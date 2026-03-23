import type { DocPatch } from "@doqtor/core-engine";

export class GitHubService {
  // TODO: Implement in Phase 7
  async createDocsPR(_patches: DocPatch[], _prNumber: number): Promise<string> {
    throw new Error("Not implemented");
  }
}
