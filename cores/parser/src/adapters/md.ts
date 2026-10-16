/**
 * @description general markdown translator
 */

import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { type PluginOptions, remarkCodePlugin } from "../remarks/remark-code-plugin";
import { translate } from "../utils/translate";

export interface TranslateResult {
  content: string;
  /** true only when the translate service actually changed the content */
  translated: boolean;
}

async function processMD(markdown: string, ...codePluginParams: PluginOptions) {
  const md = await unified()
    .use(remarkParse)
    .use(remarkCodePlugin, ...codePluginParams)
    .use(remarkStringify)
    .process(markdown);
  return String(md);
}

export async function md(markdown: string, env: Env): Promise<TranslateResult> {
  // first sit all code nodes with position placeholders (protect code from the translator)
  const positionCodeMarkdown = await processMD(markdown);
  try {
    const translateContent = await translate(positionCodeMarkdown, env);
    if (translateContent?.length && translateContent !== positionCodeMarkdown) {
      // restore the original code blocks by position
      const fallbackCodeContent = await processMD(translateContent, true, markdown);
      return { content: String(fallbackCodeContent), translated: true };
    }
  } catch (e) {
    console.log(e);
  }

  // translate failed or is disabled: keep the original content, mark as untranslated
  return { content: markdown, translated: false };
}
