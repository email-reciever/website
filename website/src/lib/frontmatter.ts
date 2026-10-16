import type { Frontmatter } from "@email.reciever/types/markdown-extends";
import { load as yamlLoad } from "js-yaml";

/** parser writes this contract — see packages/dts/src/markdown-extends.d.ts */
export interface ParsedFrontmatter extends Partial<Frontmatter> {
  [key: string]: unknown;
}

/**
 * Split `--- yaml --- body` markdown into frontmatter + body.
 * Frontmatter is written by the parser with a real YAML dumper,
 * so parsing it back with js-yaml is lossless.
 */
export function splitFrontmatter(raw: string): { frontmatter: ParsedFrontmatter; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) {
    return { frontmatter: {}, body: raw };
  }
  let frontmatter: ParsedFrontmatter = {};
  try {
    frontmatter = (yamlLoad(match[1]) as ParsedFrontmatter) ?? {};
  } catch {
    // malformed yaml — render the raw body anyway
  }
  return { frontmatter, body: raw.slice(match[0].length) };
}
