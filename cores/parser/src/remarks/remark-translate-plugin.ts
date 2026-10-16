import type { Plugin } from "unified";
import type { Test } from "unist-util-is";
import { visit } from "unist-util-visit";

import { SITGNODETYPE, type VisitNode } from "./remark-words-sitg-plugin";

export type TranslatedSitg = () => Record<string, string>;

export const remarkTranslatePlugin: Plugin<[TranslatedSitg]> = (translatedSitg: TranslatedSitg) => {
  return (tree) => {
    visit<VisitNode, Test>(tree, SITGNODETYPE, (node) => {
      if (node.value) {
        // due to closure. use fn make latest value
        const translatedValue = translatedSitg()[node.value];
        if (translatedValue) {
          node.value = translatedValue;
        }
      }
    });
  };
};
