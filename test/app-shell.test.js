import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const desktopHost = readFileSync(
  new URL("../desktop/LeanMD/MainForm.cs", import.meta.url),
  "utf8",
);

test("starts with a Markdown drop target instead of the bundled sample", () => {
  assert.match(html, /id="emptyState"/);
  assert.match(html, /Drop a Markdown file here/);
  assert.match(appSource, /showEmptyState\(\);/);
  assert.doesNotMatch(appSource, /else\s*{\s*window\.LeanMD\.openSample\(\)/);
  assert.match(desktopHost, /type = "show-empty-state"/);
});

test("does not calculate or display document statistics", () => {
  assert.doesNotMatch(html, /documentMeta|document-meta/);
  assert.doesNotMatch(
    appSource,
    /countWords|wordCount|equationCount|\.math-inline, \.math-display|rendered with/,
  );
});

test("keeps the bundled sample behind the Reload sample button", () => {
  assert.match(html, /id="sampleButton"/);
  assert.match(html, /Reload sample/);
  assert.match(appSource, /sampleButton\.addEventListener\("click"/);
  assert.match(appSource, /renderWithLoading\(sampleMarkdown, SAMPLE_NAME\)/);
});
