import { type FileInfo, github, githubRead } from "../adapters/github";
import { local, localRead } from "../adapters/local";
import type { SenderType } from "../types";

export const metadataFileSuffix = "metadata.json";

export async function getMetaData<R extends Record<string, any>>(key: SenderType, env: Env) {
  let response: { content?: string; sha?: string } | undefined;
  const fileName = `${key}.${metadataFileSuffix}`;
  try {
    if (env.ENV === "dev") {
      response = await localRead(fileName, env);
    } else {
      response = await githubRead(fileName, env);
    }
  } catch {
    // a source's metadata file does not exist on its first run — Octokit 404s.
    // Treat it as empty; setMetaData will create the file on the first write.
    return { content: undefined, sha: undefined };
  }

  if (!response) return { content: undefined, sha: undefined };

  const { content = "{}", sha } = response;
  const safeContent = content?.replace?.(/\\r\\n$/, "");
  return {
    content: JSON.parse(safeContent) as R,
    sha,
  };
}

/** returns the sha of the committed file so callers can chain updates */
export async function setMetaData<R extends Record<string, any>>(
  key: SenderType,
  content: R,
  env: Env,
  sha?: string,
): Promise<{ sha?: string }> {
  const fileName = `${key}.${metadataFileSuffix}`;
  const payload: FileInfo = {
    content: JSON.stringify(content),
    path: fileName,
  };

  if (sha) {
    payload.sha = sha;
  }

  if (env.ENV === "dev") {
    await local(payload, env);
    return {};
  }

  const updated = await github(payload, env);
  return { sha: updated?.sha };
}
