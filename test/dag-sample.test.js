import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import katex from "katex";
import MarkdownIt from "markdown-it";
import { mathPlugin } from "../src/math-plugin.js";

const documentSetRoot = fileURLToPath(
  new URL("../leanmd-example/continuous_interval_dag/", import.meta.url),
);

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
  });
}

function shortcutFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return shortcutFiles(entryPath);
    return entry.isFile() && entry.name === "shortcut.leanmd.json"
      ? [entryPath]
      : [];
  });
}

test("renders every document in the complete LeanMD example", () => {
  const renderer = new MarkdownIt({ html: false }).use(mathPlugin, {
    engine: katex,
    katexOptions: { strict: false },
  });
  const files = markdownFiles(documentSetRoot);

  assert.equal(files.length, 8);
  for (const file of files) {
    const html = renderer.render(readFileSync(file, "utf8"));
    assert.match(html, /<h1>/, `Expected a level-one heading in ${file}`);
    assert.doesNotMatch(html, /class="(?:math|katex)-error"/, `Invalid math in ${file}`);
  }
});

test("stores per-document and aggregate why-only DAG metadata", () => {
  const files = markdownFiles(documentSetRoot);

  for (const file of files) {
    const sidecarPath = `${file}.leanmd.json`;
    assert.ok(existsSync(sidecarPath), `Missing why sidecar for ${file}`);

    const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8"));
    const document = path.relative(documentSetRoot, file).replaceAll("\\", "/");
    assert.equal(sidecar.document, document);
    assert.ok(Array.isArray(sidecar.whyLinks));
    assert.equal(Object.hasOwn(sidecar, "recallLinks"), false);
  }

  const manifest = JSON.parse(
    readFileSync(path.join(documentSetRoot, ".leanmd", "dependencies.json"), "utf8"),
  );
  assert.ok(manifest.edges.every((edge) => edge.kind === "why"));
  assert.doesNotMatch(JSON.stringify(manifest), /recall/i);
});

test("owns each why document in a node folder and uses shortcuts for shared children", () => {
  const files = markdownFiles(documentSetRoot);
  const rootDocument = path.join(
    documentSetRoot,
    "continuous_interval_consequences.md",
  );

  for (const file of files) {
    if (file === rootDocument) continue;
    assert.equal(
      path.basename(path.dirname(file)),
      path.basename(file, path.extname(file)),
      `Expected a same-named node folder for ${file}`,
    );
    assert.doesNotMatch(file, /[\\/](?:arguments|shared)[\\/]/);
  }

  const shortcuts = shortcutFiles(documentSetRoot);
  assert.equal(shortcuts.length, 2);
  for (const shortcutPath of shortcuts) {
    const shortcut = JSON.parse(readFileSync(shortcutPath, "utf8"));
    assert.equal(shortcut.kind, "why-shortcut");
    assert.ok(existsSync(path.join(documentSetRoot, shortcut.source)));
    assert.ok(existsSync(path.join(documentSetRoot, shortcut.target)));
    assert.equal(Object.hasOwn(shortcut, "recall"), false);
  }
});
