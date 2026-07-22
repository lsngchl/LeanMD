import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [sourceArgument, destinationArgument] = process.argv.slice(2);
if (!sourceArgument || !destinationArgument) {
  throw new Error(
    "Usage: node leanmd-legacy/migrate-v1-document-set.js <legacy-directory> <flat-directory>",
  );
}

const sourceRoot = path.resolve(process.cwd(), sourceArgument);
const destinationRoot = path.resolve(process.cwd(), destinationArgument);
const legacyManifestPath = path.join(sourceRoot, ".leanmd", "dependencies.json");
const validatorPath = fileURLToPath(
  new URL("../leanmd/validate-why-dag.js", import.meta.url),
);
const nodeFilenamePattern = /^[a-z0-9][a-z0-9_-]*\.(?:md|markdown)$/u;
const markdownLinkPattern =
  /(\]\()([^\s)#?]+\.(?:md|markdown))((?:[?#][^\s)]*)?(?:\s+(?:"[^"]*"|'[^']*'))?\))/giu;

function fail(message) {
  throw new Error("Cannot migrate hierarchical LeanMD document set: " + message);
}

function normalizedPath(value) {
  return value.replaceAll("\\", "/");
}

function documentSidecar(document, extension) {
  return document.replace(/\.(?:md|markdown)$/iu, extension);
}

function allRelativeFiles(directory, relativeDirectory = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? allRelativeFiles(absolutePath, relativePath)
      : [relativePath];
  });
}

function sourcePath(document) {
  return path.join(sourceRoot, ...document.split("/"));
}

function destinationPath(document) {
  return path.join(destinationRoot, ...document.split("/"));
}

if (!existsSync(sourceRoot)) fail("source directory does not exist: " + sourceRoot);
if (!existsSync(legacyManifestPath)) {
  fail("source dependencies.json does not exist: " + legacyManifestPath);
}
if (existsSync(destinationRoot)) {
  fail("destination already exists: " + destinationRoot);
}

const legacyManifest = JSON.parse(readFileSync(legacyManifestPath, "utf8"));
if (
  typeof legacyManifest.root !== "string" ||
  !Array.isArray(legacyManifest.edges)
) {
  fail("source dependencies.json must contain root and edges");
}

const legacyRoot = normalizedPath(legacyManifest.root);
const documents = new Set([legacyRoot]);
for (const edge of legacyManifest.edges) {
  if (
    typeof edge?.from !== "string" ||
    typeof edge?.to !== "string" ||
    edge.kind !== "why"
  ) {
    fail("source dependencies.json contains an invalid edge");
  }
  documents.add(normalizedPath(edge.from));
  documents.add(normalizedPath(edge.to));
}

const authoredDocuments = allRelativeFiles(sourceRoot)
  .filter((file) => /\.(?:md|markdown)$/iu.test(file))
  .sort();
const manifestDocuments = [...documents].sort();
if (
  authoredDocuments.length !== manifestDocuments.length ||
  authoredDocuments.some((document, index) => document !== manifestDocuments[index])
) {
  fail("source Markdown documents do not exactly match dependencies.json");
}

const sourceToTarget = new Map();
const usedTargets = new Map();
for (const document of documents) {
  const absoluteSource = sourcePath(document);
  if (!existsSync(absoluteSource)) fail("source document is missing: " + document);

  const target =
    document === legacyRoot ? "root.md" : "nodes/" + path.posix.basename(document);
  const targetFilename = path.posix.basename(target);
  if (target !== "root.md" && !nodeFilenamePattern.test(targetFilename)) {
    fail("node filename is not a lowercase ASCII slug: " + targetFilename);
  }

  const targetKey = target.toLowerCase();
  if (usedTargets.has(targetKey)) {
    fail(
      "flat filename collision between " +
        usedTargets.get(targetKey) +
        " and " +
        document,
    );
  }
  usedTargets.set(targetKey, document);
  sourceToTarget.set(document, target);
}

function rewriteDocumentLinks(source, sourceDocument) {
  const flatSource = sourceToTarget.get(sourceDocument);
  return source.replace(
    markdownLinkPattern,
    (match, opening, rawTarget, ending) => {
      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(rawTarget);
      } catch {
        fail("invalid percent-encoded link in " + sourceDocument + ": " + rawTarget);
      }

      const linkedDocument = path.posix.normalize(
        path.posix.join(
          path.posix.dirname(sourceDocument),
          normalizedPath(decodedTarget),
        ),
      );
      const flatLinkedDocument = sourceToTarget.get(linkedDocument);
      if (!flatLinkedDocument) {
        fail(
          "Markdown link leaves the migrated document set: " +
            sourceDocument +
            " -> " +
            linkedDocument,
        );
      }

      let rewrittenTarget = path.posix.relative(
        path.posix.dirname(flatSource),
        flatLinkedDocument,
      );
      if (rewrittenTarget === "") {
        rewrittenTarget = path.posix.basename(flatSource);
      }
      if (!rewrittenTarget.startsWith(".")) rewrittenTarget = "./" + rewrittenTarget;
      return opening + rewrittenTarget + ending;
    },
  );
}

const unresolvedFiles = allRelativeFiles(sourceRoot).filter((file) =>
  file.endsWith(".unresolved"),
);
const unresolvedFileSet = new Set(unresolvedFiles);
const knownUnresolvedFiles = new Set(
  [...documents].map((document) => documentSidecar(document, ".unresolved")),
);
const orphanUnresolvedFiles = unresolvedFiles.filter(
  (file) => !knownUnresolvedFiles.has(file),
);
if (orphanUnresolvedFiles.length > 0) {
  fail("orphan unresolved markers: " + orphanUnresolvedFiles.join(", "));
}

mkdirSync(path.join(destinationRoot, "nodes"), { recursive: true });
for (const [sourceDocument, targetDocument] of sourceToTarget) {
  const migrated = rewriteDocumentLinks(
    readFileSync(sourcePath(sourceDocument), "utf8"),
    sourceDocument,
  );
  writeFileSync(destinationPath(targetDocument), migrated, "utf8");

  const sourceUnresolved = documentSidecar(sourceDocument, ".unresolved");
  if (unresolvedFileSet.has(sourceUnresolved)) {
    const targetUnresolved = documentSidecar(targetDocument, ".unresolved");
    copyFileSync(sourcePath(sourceUnresolved), destinationPath(targetUnresolved));
  }
}

const validation = spawnSync(
  process.execPath,
  [validatorPath, destinationRoot, "--write"],
  { cwd: process.cwd(), stdio: "inherit" },
);
if (validation.error) throw validation.error;
if (validation.status !== 0) {
  fail("flat-layout validation failed for the generated document set");
}

console.log(
  "Migrated " +
    documents.size +
    " documents and " +
    unresolvedFiles.length +
    " unresolved markers to " +
    destinationRoot +
    ".",
);
