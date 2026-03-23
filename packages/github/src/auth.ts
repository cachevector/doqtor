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
