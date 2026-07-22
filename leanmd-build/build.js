import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown } from "../src/renderer.js";
import {
  layoutExplorationMap,
  routeExplorationMapEdges,
} from "../src/map-layout.js";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.dirname(SCRIPT_DIRECTORY);
const MAP_OPTIONS = Object.freeze({
  nodeWidth: 220,
  nodeHeight: 72,
  horizontalStep: 300,
  verticalStep: 104,
});

function fail(message) {
  throw new Error(message);
}

function normalizeDocumentId(value, context) {
  if (typeof value !== "string" || !value || value.includes("\\")) {
    fail(`${context} must be a non-empty forward-slash path.`);
  }

  const normalized = path.posix.normalize(value);
  if (
    normalized !== value ||
    path.posix.isAbsolute(value) ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    fail(`${context} escapes or does not use the canonical document-set path.`);
  }

  if (
    normalized !== "root.md" &&
    !/^nodes\/[a-z0-9][a-z0-9_-]*\.md$/u.test(normalized)
  ) {
    fail(`${context} must be root.md or a flat lowercase ASCII file under nodes/.`);
  }

  return normalized;
}

function documentFilePath(documentSetDirectory, documentId) {
  return path.join(
    documentSetDirectory,
    ...documentId.split("/"),
  );
}

function unresolvedFilePath(documentPath) {
  return documentPath.replace(/\.(?:md|markdown)$/iu, ".unresolved");
}

async function authoredDocumentIds(documentSetDirectory) {
  const rootPath = path.join(documentSetDirectory, "root.md");
  if (!existsSync(rootPath)) fail("The document set must contain root.md.");

  const nodesDirectory = path.join(documentSetDirectory, "nodes");
  const entries = await readdir(nodesDirectory, { withFileTypes: true });
  const ids = ["root.md"];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      fail(`nodes/${entry.name} is a directory; the build format requires flat nodes.`);
    }
    if (entry.isFile() && /\.md$/iu.test(entry.name)) {
      ids.push(normalizeDocumentId(`nodes/${entry.name}`, `nodes/${entry.name}`));
    }
  }

  return ids.sort((left, right) => left.localeCompare(right));
}

function validateGraph(rootId, edges, documentIds) {
  const documents = new Set(documentIds);
  const outgoing = new Map(documentIds.map((id) => [id, []]));
  const edgeKeys = new Set();

  for (const edge of edges) {
    if (!documents.has(edge.from) || !documents.has(edge.to)) {
      fail(`Dependency edge ${edge.from} -> ${edge.to} references an unknown document.`);
    }
    if (edge.from === edge.to) {
      fail(`Dependency edge ${edge.from} -> ${edge.to} is a self-cycle.`);
    }
    const key = `${edge.from}\0${edge.to}`;
    if (!edgeKeys.add(key)) fail(`Duplicate dependency edge ${edge.from} -> ${edge.to}.`);
    outgoing.get(edge.from).push(edge);
  }

  for (const sourceEdges of outgoing.values()) {
    sourceEdges.sort(
      (left, right) => left.order - right.order || left.to.localeCompare(right.to),
    );
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(documentId) {
    if (visiting.has(documentId)) fail(`The why graph contains a cycle at ${documentId}.`);
    if (visited.has(documentId)) return;
    visiting.add(documentId);
    for (const edge of outgoing.get(documentId)) visit(edge.to);
    visiting.delete(documentId);
    visited.add(documentId);
  }
  visit(rootId);

  if (visited.size !== documents.size) {
    const unreachable = documentIds.filter((id) => !visited.has(id));
    fail(`Documents are unreachable from root.md: ${unreachable.join(", ")}`);
  }

  const ordered = [];
  const discovered = new Set();
  function order(documentId) {
    if (discovered.has(documentId)) return;
    discovered.add(documentId);
    ordered.push(documentId);
    for (const edge of outgoing.get(documentId)) order(edge.to);
  }
  order(rootId);
  return { outgoing, ordered };
}

async function loadDocumentSet(documentSetDirectory) {
  const manifestPath = path.join(documentSetDirectory, ".leanmd", "dependencies.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    fail(`Cannot read ${manifestPath}: ${error.message}`);
  }

  if (manifest?.formatVersion !== 2 || manifest?.layout !== "flat") {
    fail("The builder requires a flat formatVersion 2 dependencies.json manifest.");
  }
  const rootId = normalizeDocumentId(manifest.root, "Manifest root");
  if (rootId !== "root.md") fail("The flat LeanMD entry document must be root.md.");
  if (!Array.isArray(manifest.edges)) fail("Manifest edges must be an array.");

  const edges = manifest.edges.map((edge, index) => {
    if (!edge || edge.kind !== "why") {
      fail(`Manifest edge ${index} must have kind \"why\".`);
    }
    if (!Number.isInteger(edge.order) || edge.order < 0) {
      fail(`Manifest edge ${index} must have a non-negative integer order.`);
    }
    return {
      from: normalizeDocumentId(edge.from, `Manifest edge ${index} from`),
      to: normalizeDocumentId(edge.to, `Manifest edge ${index} to`),
      order: edge.order,
    };
  });

  const authoredIds = await authoredDocumentIds(documentSetDirectory);
  const graphIds = new Set([rootId]);
  for (const edge of edges) {
    graphIds.add(edge.from);
    graphIds.add(edge.to);
  }
  const missingFromGraph = authoredIds.filter((id) => !graphIds.has(id));
  const missingFromDisk = [...graphIds].filter((id) => !authoredIds.includes(id));
  if (missingFromGraph.length || missingFromDisk.length) {
    fail([
      missingFromGraph.length
        ? `Authored documents missing from the manifest: ${missingFromGraph.join(", ")}`
        : null,
      missingFromDisk.length
        ? `Manifest documents missing from disk: ${missingFromDisk.join(", ")}`
        : null,
    ].filter(Boolean).join(" "));
  }

  const graph = validateGraph(rootId, edges, authoredIds);
  const orderById = new Map(graph.ordered.map((id, index) => [id, index]));
  const documents = [];

  for (const documentId of graph.ordered) {
    const documentPath = documentFilePath(documentSetDirectory, documentId);
    const source = await readFile(documentPath, "utf8");
    const titleMatch = source.match(/^\uFEFF?#\s+(.+?)\s*#*\s*$/mu);
    const fallbackTitle = path.posix.basename(documentId, ".md").replaceAll("_", " ");
    const title = titleMatch?.[1]?.trim() || fallbackTitle;
    documents.push({
      id: documentId,
      title,
      detail: documentId === rootId ? "Root document" : "Supporting document",
      unresolved: existsSync(unresolvedFilePath(documentPath)),
      order: orderById.get(documentId),
      html: renderMarkdown(source),
    });
  }

  return { rootId, edges, documents };
}

async function inlineKatexCss() {
  const katexDirectory = path.join(REPOSITORY_ROOT, "node_modules", "katex", "dist");
  let css = await readFile(path.join(katexDirectory, "katex.min.css"), "utf8");
  const sourceDeclarations = [...css.matchAll(/src:([^}]*)/gu)];
  const embeddedByDeclaration = new Map();

  for (const match of sourceDeclarations) {
    const woff2 = match[1].match(/url\((?:["']?)fonts\/([^)'" ]+\.woff2)(?:["']?)\)\s*format\("woff2"\)/u);
    if (!woff2) continue;
    const font = await readFile(path.join(katexDirectory, "fonts", woff2[1]));
    embeddedByDeclaration.set(
      match[0],
      `src:url(data:font/woff2;base64,${font.toString("base64")}) format("woff2")`,
    );
  }

  for (const [declaration, embedded] of embeddedByDeclaration) {
    css = css.replace(declaration, embedded);
  }
  if (/url\((?!data:)/iu.test(css)) {
    fail("KaTeX CSS still contains an external resource URL after font embedding.");
  }
  return css;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function scriptSafeJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function renderMapMarkup(documents, edges, rootId) {
  const layout = layoutExplorationMap(documents, edges, rootId, MAP_OPTIONS);
  const routes = routeExplorationMapEdges(edges, layout, MAP_OPTIONS);
  const paths = routes.map((route) => `
                <path d="${escapeHtml(route.path)}" marker-end="url(#mapArrow)"${route.primary ? "" : ' class="is-secondary"'}></path>`).join("");
  const nodes = [...documents]
    .sort((left, right) => left.order - right.order)
    .map((document) => {
      const position = layout.positions.get(document.id);
      const classes = [
        "map-node",
        document.id === rootId ? "is-root is-current" : "",
        document.unresolved ? "is-unresolved" : "",
      ].filter(Boolean).join(" ");
      const title = [
        document.unresolved ? "Unresolved at build time" : null,
        document.detail,
      ].filter(Boolean).join(" · ");
      return `
              <button
                class="${classes}"
                type="button"
                data-document-id="${escapeHtml(document.id)}"
                style="transform:translate(${position.x}px,${position.y}px)"
                title="${escapeHtml(title)}"
              >
                <strong>${escapeHtml(document.title)}</strong>
                <span>${escapeHtml(document.detail)}</span>
              </button>`;
    })
    .join("");

  return { layout, paths, nodes };
}

function renderHtml({
  rootId,
  documents,
  edges,
  appCss,
  katexCss,
  snapshotCss,
  runtime,
}) {
  const rootDocument = documents.find((document) => document.id === rootId);
  const map = renderMapMarkup(documents, edges, rootId);
  const metadata = {
    formatVersion: 1,
    root: rootId,
    documents: documents.map(({ html, ...document }) => document),
    edges,
    map: { width: map.layout.width, height: map.layout.height },
  };
  const templates = documents.map((document) => `
    <template data-document-id="${escapeHtml(document.id)}">${document.html}</template>`).join("");
  const runtimeSource = runtime.replace(/<\/script/giu, "<\\/script");

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="A self-contained, read-only LeanMD document build."
    />
    <title>${escapeHtml(rootDocument.title)} — LeanMD build</title>
    <style>${katexCss}\n${appCss}\n${snapshotCss}</style>
  </head>
  <body>
    <header class="topbar">
      <div class="brand" aria-label="LeanMD build"><span>LeanMD</span></div>
      <div class="topbar-actions">
        <span class="build-badge">Read-only build</span>
        <button id="backButton" class="quiet-button snapshot-back-button" type="button" disabled>
          Back
        </button>
        <button
          id="mapButton"
          class="quiet-button map-button"
          type="button"
          aria-controls="mapOverlay"
          aria-expanded="false"
          aria-keyshortcuts="M"
          title="Toggle complete map (M)"
        >
          <span>Map</span>
          <span id="mapCount" class="map-count" aria-hidden="true">${documents.length}</span>
        </button>
        <button id="themeButton" class="quiet-button" type="button">Dark</button>
      </div>
    </header>

    <main class="app-shell">
      <section class="document-card" aria-label="Compiled LeanMD document viewer">
        <div class="document-toolbar">
          <div class="document-identity">
            <p id="documentName" class="document-name">${escapeHtml(rootDocument.title)}</p>
          </div>
          <span
            id="unresolvedStatus"
            class="document-readonly-state"
            title="This document was unresolved when the HTML was built"
            ${rootDocument.unresolved ? "" : "hidden"}
          >Unresolved at build time</span>
        </div>
        <div class="document-content">
          <article id="preview" class="markdown-body" aria-live="polite">${rootDocument.html}</article>
        </div>
      </section>
    </main>

    <div id="mapOverlay" class="map-overlay" hidden>
      <section class="map-panel" role="dialog" aria-modal="true" aria-labelledby="mapTitle">
        <header class="map-header">
          <div>
            <p class="map-eyebrow">Complete proof map</p>
            <h2 id="mapTitle">All documents and dependencies</h2>
          </div>
          <div class="map-actions">
            <button id="mapCloseButton" class="map-action-button" type="button">Close</button>
          </div>
        </header>

        <div id="mapViewport" class="map-viewport">
          <div
            id="mapSurface"
            class="map-surface"
            style="width:${map.layout.width}px;height:${map.layout.height}px"
          >
            <svg
              id="mapEdges"
              class="map-edges"
              width="${map.layout.width}"
              height="${map.layout.height}"
              viewBox="0 0 ${map.layout.width} ${map.layout.height}"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <marker
                  id="mapArrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z"></path>
                </marker>
              </defs>
              <g id="mapEdgeLayer">${map.paths}
              </g>
            </svg>
            <div id="mapNodeLayer" class="map-node-layer">${map.nodes}
            </div>
          </div>
        </div>

        <footer class="map-footer">
          <div class="map-footer-info">
            <span class="snapshot-map-summary">Complete build-time DAG · Drag to move · Mouse wheel to zoom</span>
          </div>
          <div class="map-zoom-controls" aria-label="Map zoom controls">
            <button id="mapZoomOutButton" class="map-zoom-button" type="button" aria-label="Zoom out">−</button>
            <input
              id="mapZoomSlider"
              class="map-zoom-slider"
              type="range"
              min="20"
              max="200"
              step="5"
              value="100"
              aria-label="Map zoom"
            />
            <button id="mapZoomInButton" class="map-zoom-button" type="button" aria-label="Zoom in">+</button>
            <output id="mapZoomValue" class="map-zoom-value" for="mapZoomSlider">100%</output>
            <button id="mapZoomFitButton" class="map-fit-button" type="button">Fit</button>
          </div>
        </footer>
      </section>
    </div>

    <p id="status" class="visually-hidden" role="status" aria-live="polite"></p>${templates}
    <script id="leanmd-build-data" type="application/json">${scriptSafeJson(metadata)}</script>
    <script>${runtimeSource}</script>
  </body>
</html>
`;
}

async function build(documentSetArgument, outputArgument) {
  const documentSetDirectory = path.resolve(documentSetArgument);
  const outputPath = path.resolve(
    outputArgument ?? path.join(SCRIPT_DIRECTORY, `${path.basename(documentSetDirectory)}.html`),
  );
  const documentSet = await loadDocumentSet(documentSetDirectory);
  const [appCss, katexCss, snapshotCss, runtime] = await Promise.all([
    readFile(path.join(REPOSITORY_ROOT, "src", "styles.css"), "utf8"),
    inlineKatexCss(),
    readFile(path.join(SCRIPT_DIRECTORY, "snapshot.css"), "utf8"),
    readFile(path.join(SCRIPT_DIRECTORY, "runtime.js"), "utf8"),
  ]);
  const html = renderHtml({ ...documentSet, appCss, katexCss, snapshotCss, runtime });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  return { outputPath, documentCount: documentSet.documents.length, edgeCount: documentSet.edges.length };
}

const [documentSetArgument, outputArgument] = process.argv.slice(2);
if (!documentSetArgument) {
  console.error("Usage: node leanmd-build/build.js <document-set> [output.html]");
  process.exitCode = 1;
} else {
  try {
    const result = await build(documentSetArgument, outputArgument);
    console.log(
      `Built ${result.outputPath} (${result.documentCount} documents, ${result.edgeCount} edges).`,
    );
  } catch (error) {
    console.error(`LeanMD build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
