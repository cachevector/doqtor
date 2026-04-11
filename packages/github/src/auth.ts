import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
}

export function createAppOctokit(config: GitHubAppConfig): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.appId,
      privateKey: config.privateKey,
    },
  });
}

export async function createInstallationOctokit(
  config: GitHubAppConfig,
  installationId: number,
): Promise<Octokit> {
  const appAuth = createAppAuth({
    appId: config.appId,
    privateKey: config.privateKey,
  });

  const { token } = await appAuth({
    type: "installation",
    installationId,
  });

  return new Octokit({ auth: token });
}

export async function convertManifestCode(code: string): Promise<{
  id: number;
  slug: string;
  node_id: string;
  client_id: string;
  client_secret: string;
  webhook_secret: string;
  pem: string;
}> {
  const response = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to convert manifest code: ${response.statusText}`);
  }

  return response.json() as any;
}
