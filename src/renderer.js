import MarkdownIt from "markdown-it";
import katex from "katex";
import footnotePlugin from "markdown-it-footnote";
import { mathPlugin } from "./math-plugin.js";
import { sourceMapPlugin } from "./source-map-plugin.js";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
}).use(mathPlugin, {
  engine: katex,
  katexOptions: {
    strict: false,
  },
})
  .use(footnotePlugin)
  .use(sourceMapPlugin);

export function renderMarkdown(source) {
  return markdown.render(source);
}
