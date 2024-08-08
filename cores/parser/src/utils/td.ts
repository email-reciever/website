import turndownService from './turndown.es';
import TurnDown, { type Options, type Node } from 'turndown';

// https://mixmark-io.github.io/turndown/
const td = turndownService as unknown as typeof TurnDown;

export { td };

export type { Options, Node };
