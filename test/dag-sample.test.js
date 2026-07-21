import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import MarkdownIt from "markdown-it";
import { mathPlugin } from "../src/math-plugin.js";

const configuredDocumentSet = process.env.LEANMD_DOCUMENT_SET;
if (!configuredDocumentSet) {
  throw new Error(
    "LEANMD_DOCUMENT_SET is required; run npm test -- <document-set-directory>",
  );
}
const documentSetRoot = path.resolve(configuredDocumentSet);

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

function unresolvedFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return unresolvedFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".unresolved") ? [entryPath] : [];
  });
}

test("renders every document in the configured LeanMD document set", () => {
  const renderer = new MarkdownIt({ html: false }).use(mathPlugin, {
    engine: katex,
    katexOptions: { strict: false },
  });
  const files = markdownFiles(documentSetRoot);

  assert.ok(files.length > 0, "Expected at least one Markdown document");
  for (const file of files) {
    const html = renderer.render(readFileSync(file, "utf8"));
    assert.match(html, /<h1>/, `Expected a level-one heading in ${file}`);
    assert.doesNotMatch(html, /class="(?:math|katex)-error"/, `Invalid math in ${file}`);
  }
});

test("stores per-document and aggregate why-only DAG metadata", () => {
  const files = markdownFiles(documentSetRoot);
  const manifest = JSON.parse(
    readFileSync(path.join(documentSetRoot, ".leanmd", "dependencies.json"), "utf8"),
  );

  for (const file of files) {
    const sidecarPath = `${file}.leanmd.json`;
    assert.ok(existsSync(sidecarPath), `Missing why sidecar for ${file}`);

    const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8"));
    const document = path.relative(documentSetRoot, file).replaceAll("\\", "/");
    assert.equal(sidecar.document, document);
    assert.ok(Array.isArray(sidecar.whyLinks));
    assert.deepEqual(
      sidecar.whyLinks,
      manifest.edges
        .filter((edge) => edge.from === document)
        .sort((left, right) => left.order - right.order)
        .map((edge) => edge.to),
    );
    assert.equal(Object.hasOwn(sidecar, "recallLinks"), false);
  }

  assert.ok(manifest.edges.every((edge) => edge.kind === "why"));
  assert.ok(
    manifest.edges.every(
      (edge) => Number.isInteger(edge.order) && edge.order >= 0,
    ),
  );
  assert.doesNotMatch(JSON.stringify(manifest), /recall/i);
});

test("keeps unresolved markers adjacent to their Markdown documents", () => {
  for (const markerPath of unresolvedFiles(documentSetRoot)) {
    const markdownPath = `${markerPath.slice(0, -".unresolved".length)}.md`;
    assert.ok(existsSync(markdownPath), `Orphan unresolved marker ${markerPath}`);
    assert.equal(readFileSync(markerPath, "utf8").trim(), "status: unresolved");
  }
});

test("owns each why document in a node folder and uses shortcuts for shared children", () => {
  const files = markdownFiles(documentSetRoot);
  const manifest = JSON.parse(
    readFileSync(path.join(documentSetRoot, ".leanmd", "dependencies.json"), "utf8"),
  );
  const rootDocument = path.join(documentSetRoot, manifest.root);

  assert.ok(existsSync(rootDocument), `Missing root document ${manifest.root}`);

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
  const expectedShortcutCount = manifest.edges.filter((edge) => {
    const sourceDirectory = path.posix.dirname(edge.from);
    const targetParentDirectory = path.posix.dirname(
      path.posix.dirname(edge.to),
    );
    return sourceDirectory !== targetParentDirectory;
  }).length;

  assert.equal(shortcuts.length, expectedShortcutCount);
  for (const shortcutPath of shortcuts) {
    const shortcut = JSON.parse(readFileSync(shortcutPath, "utf8"));
    assert.equal(shortcut.kind, "why-shortcut");
    assert.ok(existsSync(path.join(documentSetRoot, shortcut.source)));
    assert.ok(existsSync(path.join(documentSetRoot, shortcut.target)));
    assert.equal(Object.hasOwn(shortcut, "recall"), false);
  }
});
