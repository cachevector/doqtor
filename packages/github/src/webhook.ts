import { Webhooks } from "@octokit/webhooks";

export interface PullRequestEvent {
  action: string;
  number: number;
  merged: boolean;
  owner: string;
  repo: string;
  installationId: number;
  baseBranch: string;
  headBranch: string;
}

export function createWebhookHandler(secret: string) {
  return new Webhooks({ secret });
}

export function parsePullRequestEvent(
  payload: Record<string, unknown>,
): PullRequestEvent | null {
  const action = payload.action as string | undefined;
  const pr = payload.pull_request as Record<string, unknown> | undefined;
  const installation = payload.installation as Record<string, unknown> | undefined;
  const repo = payload.repository as Record<string, unknown> | undefined;

  if (!pr || !repo || !installation) return null;

  const merged = pr.merged as boolean;
  const repoOwner = (repo.owner as Record<string, unknown>)?.login as string;
  const repoName = repo.name as string;

  return {
    action: action ?? "",
    number: pr.number as number,
    merged,
    owner: repoOwner,
    repo: repoName,
    installationId: installation.id as number,
    baseBranch: (pr.base as Record<string, unknown>)?.ref as string,
    headBranch: (pr.head as Record<string, unknown>)?.ref as string,
  };
}

export async function verifyWebhookSignature(
  webhooks: Webhooks,
  signature: string,
  payload: string,
): Promise<boolean> {
  try {
    await webhooks.verify(payload, signature);
    return true;
  } catch {
    return false;
  }
}
