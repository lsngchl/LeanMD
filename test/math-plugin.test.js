import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import MarkdownIt from "markdown-it";
import { mathPlugin } from "../src/math-plugin.js";
import { sourceMapPlugin } from "../src/source-map-plugin.js";

function createRenderer() {
  return new MarkdownIt({ html: false }).use(mathPlugin, {
    engine: katex,
    katexOptions: { strict: false },
  });
}

test("renders bracket-delimited inline mathematics", () => {
  const html = createRenderer().render("The value is \\(x^2+1\\).");

  assert.match(html, /class="math-inline"/);
  assert.match(html, /class="katex"/);
  assert.doesNotMatch(html, /\\\(x\^2\+1\\\)/);
});

test("renders multiline bracket-delimited display mathematics", () => {
  const source = ["Before", "", "\\[", "\\int_0^1 x^2\\,dx=\\frac13", "\\]", "", "After"].join("\n");
  const html = createRenderer().render(source);

  assert.match(html, /class="math-display"/);
  assert.match(html, /class="katex-display"/);
  assert.match(html, /Before/);
  assert.match(html, /After/);
});

test("renders single-dollar inline mathematics", () => {
  const html = createRenderer().render("Euler wrote $e^{i\\pi}+1=0$.");

  assert.match(html, /class="math-inline"/);
  assert.match(html, /class="katex"/);
  assert.doesNotMatch(html, />\$e\^/);
});

test("renders double-dollar display mathematics", () => {
  const source = ["Before", "", "$$", "\\sum_{n=1}^{\\infty} \\frac{1}{n^2}=\\frac{\\pi^2}{6}", "$$", "", "After"].join("\n");
  const html = createRenderer().render(source);

  assert.match(html, /class="math-display"/);
  assert.match(html, /class="katex-display"/);
  assert.match(html, /Before/);
  assert.match(html, /After/);
});

test("renders same-line double-dollar display mathematics", () => {
  const html = createRenderer().render("$$x^2+y^2=z^2$$");

  assert.match(html, /class="math-display"/);
  assert.match(html, /class="katex-display"/);
});

test("renders bracket and dollar inline mathematics in the same paragraph", () => {
  const html = createRenderer().render("Bracket \\(x+1\\), dollar $y-1$, done.");
  const inlineCount = (html.match(/class="math-inline"/g) ?? []).length;

  assert.equal(inlineCount, 2);
});

test("does not render either delimiter style inside inline or fenced code", () => {
  const source = ["`\\(inline code\\)` and `$inline dollar$`", "", "```text", "\\[block code\\]", "$$block dollar$$", "```"].join("\n");
  const html = createRenderer().render(source);

  assert.doesNotMatch(html, /class="math-(?:inline|display)"/);
  assert.match(html, /<code>\\\(inline code\\\)<\/code>/);
  assert.match(html, /<code>\$inline dollar\$<\/code>/);
  assert.match(html, /\\\[block code\\\]/);
  assert.match(html, /\$\$block dollar\$\$/);
});

test("leaves currency and escaped dollar signs as text", () => {
  const html = createRenderer().render("It costs $5 and \\$10, not $20 or $30.");

  assert.doesNotMatch(html, /class="math-inline"/);
  assert.match(html, /It costs \$5 and \$10, not \$20 or \$30\./);
});

test("keeps ordinary Markdown behavior", () => {
  const source = ["# Heading", "", "**bold** and [link](https://example.com)", "", "| A | B |", "|---|---|", "| 1 | 2 |"].join("\n");
  const html = createRenderer().render(source);

  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<a href="https:\/\/example.com">link<\/a>/);
  assert.match(html, /<table>/);
});

test("preserves an unmatched inline opening delimiter", () => {
  const html = createRenderer().render("Unfinished \\(x+1");

  assert.match(html, /Unfinished \\\(x\+1/);
  assert.doesNotMatch(html, /class="math-inline"/);
});

test("annotates rendered blocks with one-based source line ranges", () => {
  const renderer = createRenderer().use(sourceMapPlugin);
  const source = [
    "# Heading",
    "",
    "Paragraph",
    "",
    "\\[",
    "x^2",
    "\\]",
    "",
    "```text",
    "code",
    "```",
  ].join("\n");
  const html = renderer.render(source);

  assert.match(
    html,
    /<h1 data-source-start-line="1" data-source-end-line="1">/,
  );
  assert.match(
    html,
    /<p data-source-start-line="3" data-source-end-line="3">/,
  );
  assert.match(
    html,
    /class="math-display" data-source-start-line="5" data-source-end-line="7"/,
  );
  assert.match(
    html,
    /<code data-source-start-line="9" data-source-end-line="11"/,
  );
});
