import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sampleRoot = path.resolve(
  fileURLToPath(new URL("../samples/tree_layout_stress/", import.meta.url)),
);
const rootDocument = path.join(sampleRoot, "00_tree_root.md");

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
  });
}

test("the layout stress sample is one large strict tree", () => {
  const files = markdownFiles(sampleRoot).map((file) => path.resolve(file));
  const fileSet = new Set(files);
  const outgoing = new Map(files.map((file) => [file, []]));
  const incomingCount = new Map(files.map((file) => [file, 0]));
  let edgeCount = 0;

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const links = [...source.matchAll(/\]\(([^)#?]+\.md)(?:[?#][^)]*)?\)/giu)];

    for (const match of links) {
      const target = path.resolve(path.dirname(file), decodeURIComponent(match[1]));
      assert.ok(
        target.startsWith(`${sampleRoot}${path.sep}`),
        `Link leaves the sample tree: ${target}`,
      );
      assert.ok(existsSync(target), `Missing linked document: ${target}`);
      assert.ok(fileSet.has(target), `Linked document was not discovered: ${target}`);
      outgoing.get(file).push(target);
      incomingCount.set(target, incomingCount.get(target) + 1);
      edgeCount += 1;
    }
  }

  assert.equal(files.length, 49);
  assert.equal(edgeCount, files.length - 1);
  assert.equal(incomingCount.get(rootDocument), 0);
  for (const file of files) {
    if (file === rootDocument) continue;
    assert.equal(incomingCount.get(file), 1, `Expected one parent: ${file}`);
  }

  const visited = new Set();
  const active = new Set();
  function visit(file) {
    assert.ok(!active.has(file), `Cycle found at ${file}`);
    if (visited.has(file)) return;
    active.add(file);
    for (const child of outgoing.get(file)) visit(child);
    active.delete(file);
    visited.add(file);
  }

  visit(rootDocument);
  assert.equal(visited.size, files.length, "Every document must be reachable from the root");
});
