/**
 * @description worker not support fs mode, use locale server write file
 */
import type { FileInfo } from "./github";

/** the deno `/read` endpoint responds with `{ status, content }` */
export interface LocalReadResult {
  status?: number;
  content?: string;
}

export async function localRead(fileName: string, env: Env): Promise<LocalReadResult | undefined> {
  try {
    return await fetch(`${env.TR_SERVE}/read`, {
      method: "POST",
      body: JSON.stringify({ fileName }),
    }).then((response) => response.json() as Promise<LocalReadResult>);
  } catch (error) {
    console.log("read file failed", error);
  }
}

export async function local(file: FileInfo, env: Env) {
  try {
    await fetch(`${env.TR_SERVE}/create`, {
      method: "POST",
      body: JSON.stringify(file),
    });
  } catch (error) {
    console.log("create blog failed", error);
  }
}
