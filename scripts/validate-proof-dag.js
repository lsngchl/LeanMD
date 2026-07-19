import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const sampleArgument = process.argv
  .slice(2)
  .find((argument) => !argument.startsWith("--"));
if (!sampleArgument) {
  throw new Error("Usage: node scripts/validate-proof-dag.js <sample-directory> [--write]");
}

const sampleDirectory = path.resolve(process.cwd(), sampleArgument);
const dependencyPath = path.join(sampleDirectory, ".leanmd", "dependencies.json");
const shouldWrite = process.argv.includes("--write");

function fail(message) {
  throw new Error(`Invalid proof DAG: ${message}`);
}

function normalizedRelativePath(value) {
  return value.replaceAll("\\", "/");
}

function documentDirectory(document) {
  const directory = path.posix.dirname(document);
  return directory === "." ? "" : directory;
}

function parentDirectory(directory) {
  if (directory.length === 0) return "";
  const parent = path.posix.dirname(directory);
  return parent === "." ? "" : parent;
}

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(entryPath);
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      return [];
    }
    return [normalizedRelativePath(path.relative(sampleDirectory, entryPath))];
  });
}

function proofShortcutFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return proofShortcutFiles(entryPath);
    if (!entry.isFile() || entry.name !== "shortcut.leanmd.json") return [];
    return [normalizedRelativePath(path.relative(sampleDirectory, entryPath))];
  });
}

function markdownLinks(sourceDocument) {
  const sourcePath = path.join(sampleDirectory, sourceDocument);
  const source = readFileSync(sourcePath, "utf8");
  const links = [];
  const linkPattern =
    /\]\(([^\s)#?]+\.md)(?:[?#][^\s)]*)?(?:\s+(?:"([^"]*)"|'([^']*)'))?\)/giu;

  for (const match of source.matchAll(linkPattern)) {
    const decodedTarget = decodeURIComponent(match[1]);
    const absoluteTarget = path.resolve(path.dirname(sourcePath), decodedTarget);
    links.push({
      source: sourceDocument,
      target: normalizedRelativePath(path.relative(sampleDirectory, absoluteTarget)),
      role: (match[2] ?? match[3] ?? "").trim().toLowerCase(),
    });
  }

  return links;
}

const documents = new Set(markdownFiles(sampleDirectory));
const allLinks = [...documents].flatMap(markdownLinks);
const proofLinks = allLinks.filter(({ role }) => role === "proof");

for (const link of proofLinks) {
  if (!documents.has(link.target)) {
    fail(`proof link leaves the document set: ${link.source} -> ${link.target}`);
  }
}

const proofEdgeKeys = new Set();
const proofEdges = [];
for (const link of proofLinks) {
  if (link.source === link.target) {
    fail(`self-dependency is not allowed: ${link.source}`);
  }

  const key = `${link.source}\u0000${link.target}`;
  if (proofEdgeKeys.has(key)) continue;
  proofEdgeKeys.add(key);
  proofEdges.push({ from: link.source, to: link.target, kind: "proof" });
}

const outgoing = new Map([...documents].map((document) => [document, []]));
const incomingCount = new Map([...documents].map((document) => [document, 0]));
for (const edge of proofEdges) {
  outgoing.get(edge.from).push(edge.to);
  incomingCount.set(edge.to, incomingCount.get(edge.to) + 1);
}

const state = new Map([...documents].map((document) => [document, "unvisited"]));
const activePath = [];

function checkForCycles(document) {
  state.set(document, "active");
  activePath.push(document);

  for (const target of outgoing.get(document)) {
    if (state.get(target) === "active") {
      const cycleStart = activePath.indexOf(target);
      const cycle = [...activePath.slice(cycleStart), target].join(" -> ");
      fail(`cycle found: ${cycle}`);
    }
    if (state.get(target) === "unvisited") checkForCycles(target);
  }

  activePath.pop();
  state.set(document, "complete");
}

for (const document of documents) {
  if (state.get(document) === "unvisited") checkForCycles(document);
}

const roots = [...incomingCount]
  .filter(([, count]) => count === 0)
  .map(([document]) => document);
if (roots.length !== 1) {
  fail(`expected one root, found ${roots.length}: ${roots.join(", ")}`);
}
const [root] = roots;

const reachable = new Set();
const depth = new Map([[root, 0]]);
function visit(document) {
  if (reachable.has(document)) return;
  reachable.add(document);
  for (const target of outgoing.get(document)) {
    depth.set(target, Math.min(depth.get(target) ?? Infinity, depth.get(document) + 1));
    visit(target);
  }
}
visit(root);

const unreachable = [...documents].filter((document) => !reachable.has(document));
if (unreachable.length > 0) {
  fail(`documents are unreachable from ${root}: ${unreachable.join(", ")}`);
}

for (const document of documents) {
  if (document === root) continue;
  const directory = documentDirectory(document);
  const folderName = path.posix.basename(directory);
  const documentName = path.posix.basename(document, path.posix.extname(document));
  if (folderName !== documentName) {
    fail(`document must live in its own same-named folder: ${document}`);
  }

  const canonicalParents = proofEdges.filter(
    (edge) =>
      edge.to === document &&
      documentDirectory(edge.from) === parentDirectory(directory),
  );
  if (canonicalParents.length !== 1) {
    fail(
      `${document} must have exactly one canonical parent folder, found ` +
        `${canonicalParents.length}`,
    );
  }
}

proofEdges.sort(
  (left, right) =>
    depth.get(left.from) - depth.get(right.from) ||
    left.from.localeCompare(right.from) ||
    left.to.localeCompare(right.to),
);

let updatedSidecarCount = 0;
for (const document of documents) {
  const sidecarPath = path.join(sampleDirectory, `${document}.leanmd.json`);
  const proofTargets = [...new Set(outgoing.get(document))].sort((left, right) =>
    left.localeCompare(right),
  );
  const generatedSidecar = `${JSON.stringify(
    { document, proofLinks: proofTargets },
    null,
    2,
  )}\n`;

  if (shouldWrite) {
    if (!existsSync(sidecarPath) || readFileSync(sidecarPath, "utf8") !== generatedSidecar) {
      writeFileSync(sidecarPath, generatedSidecar, "utf8");
      updatedSidecarCount += 1;
    }
  } else if (!existsSync(sidecarPath)) {
    fail(`${document}.leanmd.json is missing; run with --write to generate it`);
  } else if (readFileSync(sidecarPath, "utf8") !== generatedSidecar) {
    fail(`${document}.leanmd.json is stale; run with --write to regenerate it`);
  }
}

const shortcutEdges = proofEdges.filter(
  (edge) =>
    documentDirectory(edge.from) !== parentDirectory(documentDirectory(edge.to)),
);
const expectedShortcutPaths = new Set();
let updatedShortcutCount = 0;
for (const edge of shortcutEdges) {
  const shortcutDirectory = path.posix.join(
    documentDirectory(edge.from),
    path.posix.basename(documentDirectory(edge.to)),
  );
  const shortcutDocument = path.posix.join(shortcutDirectory, "shortcut.leanmd.json");
  if (expectedShortcutPaths.has(shortcutDocument)) {
    fail(`proof shortcut path collision: ${shortcutDocument}`);
  }
  expectedShortcutPaths.add(shortcutDocument);

  const shortcutPath = path.join(sampleDirectory, shortcutDocument);
  const generatedShortcut = `${JSON.stringify(
    { kind: "proof-shortcut", source: edge.from, target: edge.to },
    null,
    2,
  )}\n`;
  if (shouldWrite) {
    mkdirSync(path.dirname(shortcutPath), { recursive: true });
    if (!existsSync(shortcutPath) || readFileSync(shortcutPath, "utf8") !== generatedShortcut) {
      writeFileSync(shortcutPath, generatedShortcut, "utf8");
      updatedShortcutCount += 1;
    }
  } else if (!existsSync(shortcutPath)) {
    fail(`${shortcutDocument} is missing; run with --write to generate it`);
  } else if (readFileSync(shortcutPath, "utf8") !== generatedShortcut) {
    fail(`${shortcutDocument} is stale; run with --write to regenerate it`);
  }
}

const unexpectedShortcuts = proofShortcutFiles(sampleDirectory).filter(
  (shortcut) => !expectedShortcutPaths.has(shortcut),
);
if (unexpectedShortcuts.length > 0) {
  fail(`unexpected proof shortcuts: ${unexpectedShortcuts.join(", ")}`);
}

const generated = `${JSON.stringify({ root, edges: proofEdges }, null, 2)}\n`;
if (shouldWrite) {
  console.log(
    updatedSidecarCount > 0
      ? `Updated ${updatedSidecarCount} document proof sidecar files.`
      : "Document proof sidecar files are already up to date.",
  );
  console.log(
    updatedShortcutCount > 0
      ? `Updated ${updatedShortcutCount} proof shortcut files.`
      : "Proof shortcut files are already up to date.",
  );
  if (!existsSync(dependencyPath) || readFileSync(dependencyPath, "utf8") !== generated) {
    writeFileSync(dependencyPath, generated, "utf8");
    console.log("Updated dependencies.json from Markdown proof links.");
  } else {
    console.log("dependencies.json is already up to date.");
  }
} else if (!existsSync(dependencyPath)) {
  fail("dependencies.json is missing; run with --write to generate it");
} else if (readFileSync(dependencyPath, "utf8") !== generated) {
  fail("dependencies.json is stale; run with --write to regenerate it");
}

const sharedDocuments = [...incomingCount]
  .filter(([, count]) => count > 1)
  .map(([document, count]) => `${document} (${count} incoming proof edges)`);

console.log(
  `Valid proof DAG: ${documents.size} documents, ${proofEdges.length} proof edges, root ${root}.`,
);
console.log(
  sharedDocuments.length > 0
    ? `Shared documents: ${sharedDocuments.join(", ")}.`
    : "Shared documents: none.",
);
