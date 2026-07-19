import MarkdownIt from "markdown-it";
import katex from "katex";
import "katex/dist/katex.min.css";
import { mathPlugin } from "./math-plugin.js";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
}).use(mathPlugin, {
  engine: katex,
  katexOptions: {
    strict: false,
  },
});

export function renderMarkdown(source) {
  return markdown.render(source);
}
