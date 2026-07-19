import "./styles.css";
import {
  layoutExplorationMap,
  routeExplorationMapEdges,
} from "./map-layout.js";

const elements = {
  documentName: document.querySelector("#documentName"),
  dropOverlay: document.querySelector("#dropOverlay"),
  emptyState: document.querySelector("#emptyState"),
  fileInput: document.querySelector("#fileInput"),
  keyGuideButton: document.querySelector("#keyGuideButton"),
  keyGuideCloseButton: document.querySelector("#keyGuideCloseButton"),
  keyGuidePanel: document.querySelector("#keyGuidePanel"),
  mapButton: document.querySelector("#mapButton"),
  mapCloseButton: document.querySelector("#mapCloseButton"),
  mapCount: document.querySelector("#mapCount"),
  mapEdgeLayer: document.querySelector("#mapEdgeLayer"),
  mapEdges: document.querySelector("#mapEdges"),
  mapNodeLayer: document.querySelector("#mapNodeLayer"),
  mapOverlay: document.querySelector("#mapOverlay"),
  mapResetButton: document.querySelector("#mapResetButton"),
  mapResetConfirmButton: document.querySelector("#mapResetConfirmButton"),
  mapResetDialog: document.querySelector("#mapResetDialog"),
  mapSurface: document.querySelector("#mapSurface"),
  mapViewport: document.querySelector("#mapViewport"),
  mapZoomFitButton: document.querySelector("#mapZoomFitButton"),
  mapZoomInButton: document.querySelector("#mapZoomInButton"),
  mapZoomOutButton: document.querySelector("#mapZoomOutButton"),
  mapZoomSlider: document.querySelector("#mapZoomSlider"),
  mapZoomValue: document.querySelector("#mapZoomValue"),
  openButton: document.querySelector("#openButton"),
  preview: document.querySelector("#preview"),
  status: document.querySelector("#status"),
  themeButton: document.querySelector("#themeButton"),
  viewerLoading: document.querySelector("#viewerLoading"),
};

const webViewHost = window.chrome?.webview;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const MAP_NODE_WIDTH = 220;
const MAP_NODE_HEIGHT = 72;
const MAP_HORIZONTAL_STEP = 300;
const MAP_VERTICAL_STEP = 104;
const MAP_MIN_ZOOM = 0.2;
const MAP_MAX_ZOOM = 2;
const MAP_ZOOM_STEP = 0.1;
let renderGeneration = 0;
let rendererPromise;
let renderedMapLayout = null;
let mapPanPointer = null;
let mapCamera = {
  sessionId: null,
  x: 0,
  y: 0,
  zoom: 1,
  initialized: false,
};
let mapState = {
  sessionId: null,
  root: null,
  current: null,
  previous: null,
  nodes: [],
  edges: [],
};

function loadRenderer() {
  rendererPromise ??= import("./renderer.js");
  return rendererPromise;
}

function renderDocument(source, name, renderMarkdown) {
  setEmptyStateVisible(false);
  elements.preview.innerHTML = renderMarkdown(source);
  elements.documentName.textContent = name;

  for (const link of elements.preview.querySelectorAll("a[href]")) {
    if (/^https?:/i.test(link.href)) {
      link.target = "_blank";
      link.rel = "noreferrer noopener";
    }
  }

  document.title = `${name} — LeanMD`;
  announce(`${name} rendered.`);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function isRelativeMarkdownLink(href) {
  if (!href || href.startsWith("#") || /^[a-z][a-z\d+.-]*:/i.test(href)) {
    return false;
  }

  const path = href.split(/[?#]/u, 1)[0];
  if (!path || path.startsWith("//")) return false;

  try {
    return /\.(?:md|markdown)$/iu.test(decodeURIComponent(path));
  } catch {
    return false;
  }
}

function setMapState(nextState) {
  if (!nextState || !Array.isArray(nextState.nodes) || !Array.isArray(nextState.edges)) {
    return;
  }

  if (mapCamera.sessionId !== nextState.sessionId) {
    mapCamera = {
      sessionId: nextState.sessionId,
      x: 0,
      y: 0,
      zoom: 1,
      initialized: false,
    };
  }

  mapState = {
    sessionId: nextState.sessionId,
    root: typeof nextState.root === "string" ? nextState.root : null,
    current: typeof nextState.current === "string" ? nextState.current : null,
    previous: typeof nextState.previous === "string" ? nextState.previous : null,
    nodes: nextState.nodes,
    edges: nextState.edges,
  };

  const count = mapState.nodes.length;
  elements.mapButton.disabled = count === 0;
  elements.mapCount.textContent = String(count);
  elements.mapResetButton.disabled = count === 0;

  if (count === 0 && !elements.mapOverlay.hidden) {
    closeMap();
  }

  renderMap();

  if (!elements.mapOverlay.hidden && !mapCamera.initialized) {
    window.requestAnimationFrame(centerCurrentMapNode);
  }
}

function renderMap() {
  const layout = layoutExplorationMap(mapState.nodes, mapState.edges, mapState.root, {
    nodeWidth: MAP_NODE_WIDTH,
    nodeHeight: MAP_NODE_HEIGHT,
    horizontalStep: MAP_HORIZONTAL_STEP,
    verticalStep: MAP_VERTICAL_STEP,
  });
  renderedMapLayout = layout;
  elements.mapNodeLayer.replaceChildren();
  elements.mapEdgeLayer.replaceChildren();

  elements.mapSurface.style.width = `${layout.width}px`;
  elements.mapSurface.style.height = `${layout.height}px`;
  elements.mapEdges.setAttribute("width", String(layout.width));
  elements.mapEdges.setAttribute("height", String(layout.height));
  elements.mapEdges.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);

  const routes = routeExplorationMapEdges(mapState.edges, layout, {
    nodeWidth: MAP_NODE_WIDTH,
    nodeHeight: MAP_NODE_HEIGHT,
  });
  for (const route of routes) {
    const path = document.createElementNS(SVG_NAMESPACE, "path");
    path.setAttribute("d", route.path);
    path.setAttribute("marker-end", "url(#mapArrow)");
    path.classList.toggle("is-secondary", !route.primary);
    elements.mapEdgeLayer.append(path);
  }

  for (const node of [...mapState.nodes].sort((a, b) => a.order - b.order)) {
    const position = layout.positions.get(node.id);
    if (!position) continue;

    const button = document.createElement("button");
    button.className = "map-node";
    button.type = "button";
    button.style.transform = `translate(${position.x}px, ${position.y}px)`;
    const isCurrent = node.id === mapState.current;
    const isPrevious = node.id === mapState.previous;
    const stateDescription = isCurrent
      ? "Current document. "
      : isPrevious
        ? "Previous document. "
        : "";
    button.title = isPrevious ? `Previous · ${node.detail}` : node.detail;
    button.setAttribute(
      "aria-label",
      `${node.label}. ${stateDescription}${node.detail}`,
    );
    button.classList.toggle("is-root", node.id === mapState.root);
    button.classList.toggle("is-current", isCurrent);
    button.classList.toggle("is-previous", isPrevious);

    const label = document.createElement("strong");
    label.textContent = node.label;
    const detail = document.createElement("span");
    detail.textContent = node.detail;
    button.append(label, detail);

    button.addEventListener("click", () => {
      if (!webViewHost) return;
      closeMap();
      webViewHost.postMessage({ type: "open-map-node", id: node.id });
    });

    elements.mapNodeLayer.append(button);
  }

  constrainMapCamera();
  applyMapCamera();
}

function clampMapZoom(zoom) {
  return Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, zoom));
}

function constrainMapCamera() {
  if (!renderedMapLayout) return;

  const viewportWidth = elements.mapViewport.clientWidth;
  const viewportHeight = elements.mapViewport.clientHeight;
  if (viewportWidth === 0 || viewportHeight === 0) return;

  const visibleMargin = Math.min(100, viewportWidth * 0.25, viewportHeight * 0.25);
  const scaledWidth = renderedMapLayout.width * mapCamera.zoom;
  const scaledHeight = renderedMapLayout.height * mapCamera.zoom;
  mapCamera.x = Math.min(
    viewportWidth - visibleMargin,
    Math.max(visibleMargin - scaledWidth, mapCamera.x),
  );
  mapCamera.y = Math.min(
    viewportHeight - visibleMargin,
    Math.max(visibleMargin - scaledHeight, mapCamera.y),
  );
}

function applyMapCamera() {
  elements.mapSurface.style.transform =
    `translate(${mapCamera.x}px, ${mapCamera.y}px) scale(${mapCamera.zoom})`;
  const percentage = Math.round(mapCamera.zoom * 100);
  elements.mapZoomSlider.value = String(percentage);
  elements.mapZoomValue.textContent = `${percentage}%`;
  elements.mapZoomOutButton.disabled = mapCamera.zoom <= MAP_MIN_ZOOM;
  elements.mapZoomInButton.disabled = mapCamera.zoom >= MAP_MAX_ZOOM;
}

function setMapZoom(nextZoom, anchorX, anchorY) {
  const zoom = clampMapZoom(nextZoom);
  if (zoom === mapCamera.zoom) return;

  const viewportWidth = elements.mapViewport.clientWidth;
  const viewportHeight = elements.mapViewport.clientHeight;
  const fixedX = Number.isFinite(anchorX) ? anchorX : viewportWidth / 2;
  const fixedY = Number.isFinite(anchorY) ? anchorY : viewportHeight / 2;
  const contentX = (fixedX - mapCamera.x) / mapCamera.zoom;
  const contentY = (fixedY - mapCamera.y) / mapCamera.zoom;
  mapCamera.zoom = zoom;
  mapCamera.x = fixedX - contentX * zoom;
  mapCamera.y = fixedY - contentY * zoom;
  mapCamera.initialized = true;
  constrainMapCamera();
  applyMapCamera();
}

function centerCurrentMapNode() {
  if (!renderedMapLayout) return;

  const position = renderedMapLayout.positions.get(mapState.current);
  if (!position) return;

  mapCamera.x =
    elements.mapViewport.clientWidth / 2 -
    (position.x + MAP_NODE_WIDTH / 2) * mapCamera.zoom;
  mapCamera.y =
    elements.mapViewport.clientHeight / 2 -
    (position.y + MAP_NODE_HEIGHT / 2) * mapCamera.zoom;
  mapCamera.initialized = true;
  constrainMapCamera();
  applyMapCamera();
}

function fitMapToViewport() {
  if (!renderedMapLayout) return;

  const viewportWidth = elements.mapViewport.clientWidth;
  const viewportHeight = elements.mapViewport.clientHeight;
  if (viewportWidth === 0 || viewportHeight === 0) return;

  mapCamera.zoom = clampMapZoom(
    Math.min(
      (viewportWidth - 64) / renderedMapLayout.width,
      (viewportHeight - 64) / renderedMapLayout.height,
    ),
  );
  mapCamera.x = (viewportWidth - renderedMapLayout.width * mapCamera.zoom) / 2;
  mapCamera.y = (viewportHeight - renderedMapLayout.height * mapCamera.zoom) / 2;
  mapCamera.initialized = true;
  constrainMapCamera();
  applyMapCamera();
}

function startMapPan(event) {
  if (event.button !== 0 || event.target.closest(".map-node")) return;

  event.preventDefault();
  mapPanPointer = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
  elements.mapViewport.setPointerCapture(event.pointerId);
  elements.mapViewport.classList.add("is-panning");
}

function moveMapPan(event) {
  if (!mapPanPointer || event.pointerId !== mapPanPointer.id) return;

  event.preventDefault();
  mapCamera.x += event.clientX - mapPanPointer.x;
  mapCamera.y += event.clientY - mapPanPointer.y;
  mapPanPointer.x = event.clientX;
  mapPanPointer.y = event.clientY;
  mapCamera.initialized = true;
  constrainMapCamera();
  applyMapCamera();
}

function endMapPan(event) {
  if (!mapPanPointer || event.pointerId !== mapPanPointer.id) return;

  if (elements.mapViewport.hasPointerCapture(event.pointerId)) {
    elements.mapViewport.releasePointerCapture(event.pointerId);
  }
  mapPanPointer = null;
  elements.mapViewport.classList.remove("is-panning");
}

function openMap() {
  if (elements.mapButton.disabled) return;

  closeKeyGuide();
  elements.mapOverlay.hidden = false;
  elements.mapButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("map-is-open");
  renderMap();

  window.requestAnimationFrame(centerCurrentMapNode);
}

function closeMap() {
  if (elements.mapResetDialog.open) elements.mapResetDialog.close();
  if (
    mapPanPointer &&
    elements.mapViewport.hasPointerCapture(mapPanPointer.id)
  ) {
    elements.mapViewport.releasePointerCapture(mapPanPointer.id);
  }
  mapPanPointer = null;
  elements.mapViewport.classList.remove("is-panning");
  elements.mapOverlay.hidden = true;
  elements.mapButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("map-is-open");
}

function toggleMap() {
  if (elements.mapButton.disabled) return;

  if (elements.mapOverlay.hidden) {
    openMap();
  } else {
    closeMap();
  }
}

function openKeyGuide() {
  elements.keyGuidePanel.hidden = false;
  elements.keyGuideButton.setAttribute("aria-expanded", "true");
}

function closeKeyGuide() {
  elements.keyGuidePanel.hidden = true;
  elements.keyGuideButton.setAttribute("aria-expanded", "false");
}

function toggleKeyGuide() {
  if (elements.keyGuidePanel.hidden) {
    openKeyGuide();
  } else {
    closeKeyGuide();
  }
}

function isEditableTarget(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function setDropOverlay(visible) {
  elements.dropOverlay.classList.toggle("is-visible", visible);
  elements.dropOverlay.setAttribute("aria-hidden", String(!visible));
}

function showRenderError(error) {
  setEmptyStateVisible(false);
  elements.preview.replaceChildren();
  const message = document.createElement("p");
  message.className = "render-error";
  message.textContent = "This document could not be rendered.";
  elements.preview.append(message);
  announce(error instanceof Error ? error.message : "Rendering failed.");
}

async function openFile(file) {
  if (!file) return;

  setDocumentLoading(true);
  await waitForPaint();

  try {
    const source = await file.text();
    await renderWithLoading(source, file.name || "Untitled.md");
  } catch {
    announce("The selected file could not be read.");
    setDocumentLoading(false);
  } finally {
    elements.fileInput.value = "";
  }
}

async function renderWithLoading(source, name) {
  const generation = ++renderGeneration;
  setDocumentLoading(true);
  await waitForPaint();

  try {
    const { renderMarkdown } = await loadRenderer();
    if (generation !== renderGeneration) return;
    renderDocument(source, name, renderMarkdown);
  } catch (error) {
    if (generation !== renderGeneration) return;
    showRenderError(error);
    setDocumentLoading(false);
    return;
  }

  try {
    await document.fonts?.ready;
  } catch {
    // Font readiness is a visual enhancement, not a rendering requirement.
  }

  await waitForPaint();
  if (generation !== renderGeneration) return;

  setDocumentLoading(false);
}

function showEmptyState() {
  ++renderGeneration;
  elements.preview.replaceChildren();
  elements.documentName.textContent = "No document open";
  document.title = "LeanMD Viewer";
  setEmptyStateVisible(true);
  setDocumentLoading(false);
  announce("No document open. Drop a Markdown file or use Open .md.");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function setEmptyStateVisible(visible) {
  elements.emptyState.hidden = !visible;
  elements.preview.hidden = visible;
}

function setDocumentLoading(visible) {
  elements.viewerLoading.classList.toggle("is-visible", visible);
  elements.viewerLoading.setAttribute("aria-hidden", String(!visible));
}

function waitForPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

function announce(message) {
  elements.status.textContent = "";
  window.setTimeout(() => {
    elements.status.textContent = message;
  }, 10);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  elements.themeButton.textContent = theme === "dark" ? "Light" : "Dark";
  elements.themeButton.setAttribute(
    "aria-label",
    `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
  );

  try {
    localStorage.setItem("leanmd-theme", theme);
  } catch {
    // Storage may be unavailable for a local file; the theme still works.
  }
}

function initialTheme() {
  try {
    const saved = localStorage.getItem("leanmd-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Fall through to the operating-system preference.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function requestOpenFile() {
  if (webViewHost) {
    webViewHost.postMessage({ type: "open-file-dialog" });
    return;
  }

  elements.fileInput.click();
}

elements.fileInput.addEventListener("change", (event) => {
  openFile(event.target.files?.[0]);
});

elements.openButton.addEventListener("click", (event) => {
  if (!webViewHost) return;

  event.preventDefault();
  requestOpenFile();
});

elements.preview.addEventListener("click", (event) => {
  if (!webViewHost || event.defaultPrevented || event.button !== 0) return;

  const target = event.target instanceof Element ? event.target : null;
  const link = target?.closest("a[href]");
  if (!link || !elements.preview.contains(link)) return;

  const href = link.getAttribute("href");
  if (!isRelativeMarkdownLink(href)) return;

  event.preventDefault();
  const role = link.getAttribute("title")?.trim().toLowerCase() ?? "";
  webViewHost.postMessage({ type: "open-markdown-link", href, role });
});

elements.mapButton.addEventListener("click", toggleMap);
elements.mapCloseButton.addEventListener("click", closeMap);
elements.mapResetButton.addEventListener("click", () => {
  if (!elements.mapResetButton.disabled) elements.mapResetDialog.showModal();
});
elements.mapResetConfirmButton.addEventListener("click", () => {
  webViewHost?.postMessage({ type: "reset-map" });
});
elements.mapOverlay.addEventListener("click", (event) => {
  if (event.target === elements.mapOverlay) closeMap();
});
elements.mapViewport.addEventListener("pointerdown", startMapPan);
elements.mapViewport.addEventListener("pointermove", moveMapPan);
elements.mapViewport.addEventListener("pointerup", endMapPan);
elements.mapViewport.addEventListener("pointercancel", endMapPan);
elements.mapViewport.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const bounds = elements.mapViewport.getBoundingClientRect();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    setMapZoom(
      mapCamera.zoom * zoomFactor,
      event.clientX - bounds.left,
      event.clientY - bounds.top,
    );
  },
  { passive: false },
);
elements.mapZoomOutButton.addEventListener("click", () => {
  setMapZoom(mapCamera.zoom - MAP_ZOOM_STEP);
});
elements.mapZoomInButton.addEventListener("click", () => {
  setMapZoom(mapCamera.zoom + MAP_ZOOM_STEP);
});
elements.mapZoomSlider.addEventListener("input", (event) => {
  setMapZoom(Number(event.target.value) / 100);
});
elements.mapZoomFitButton.addEventListener("click", fitMapToViewport);
elements.keyGuideButton.addEventListener("click", toggleKeyGuide);
elements.keyGuideCloseButton.addEventListener("click", closeKeyGuide);

document.addEventListener("click", (event) => {
  if (elements.keyGuidePanel.hidden) return;

  const target = event.target instanceof Node ? event.target : null;
  if (
    target &&
    (elements.keyGuidePanel.contains(target) || elements.keyGuideButton.contains(target))
  ) {
    return;
  }

  closeKeyGuide();
});

elements.themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(next);
});

document.addEventListener("keydown", (event) => {
  if (elements.mapResetDialog.open) return;

  if (event.key === "Escape" && !elements.keyGuidePanel.hidden) {
    event.preventDefault();
    closeKeyGuide();
    return;
  }

  if (event.key === "Escape" && !elements.mapOverlay.hidden) {
    event.preventDefault();
    closeMap();
    return;
  }

  if (
    !event.repeat &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    event.key.toLowerCase() === "m"
  ) {
    event.preventDefault();
    closeKeyGuide();
    toggleMap();
    return;
  }

  if (
    webViewHost &&
    !event.repeat &&
    (event.key === "Backspace" || event.key === ",") &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    elements.keyGuidePanel.hidden &&
    !isEditableTarget(event.target)
  ) {
    event.preventDefault();
    closeMap();
    webViewHost.postMessage({ type: "go-back" });
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
    event.preventDefault();
    requestOpenFile();
  }
});

for (const eventName of ["dragenter", "dragover"]) {
  window.addEventListener(eventName, (event) => {
    event.preventDefault();
    setDropOverlay(true);
  });
}

window.addEventListener("dragleave", (event) => {
  if (event.relatedTarget !== null) return;
  setDropOverlay(false);
});

window.addEventListener("drop", (event) => {
  event.preventDefault();
  setDropOverlay(false);
  const file = event.dataTransfer?.files?.[0];
  if (
    file &&
    webViewHost &&
    typeof webViewHost.postMessageWithAdditionalObjects === "function"
  ) {
    webViewHost.postMessageWithAdditionalObjects(
      { type: "open-dropped-file" },
      [file],
    );
    return;
  }

  openFile(file);
});

window.LeanMD = Object.freeze({
  openMarkdown(source, name = "Untitled.md") {
    if (typeof source !== "string") return;
    return renderWithLoading(source, typeof name === "string" ? name : "Untitled.md");
  },
  showEmptyState,
});

setTheme(initialTheme());
showEmptyState();

if (webViewHost) {
  webViewHost.addEventListener("message", async (event) => {
    const message = event.data;
    if (message?.type === "open-markdown") {
      window.LeanMD.openMarkdown(message.source, message.name);
    } else if (message?.type === "show-empty-state") {
      window.LeanMD.showEmptyState();
    } else if (message?.type === "host-window-visible") {
      await waitForPaint();
      webViewHost.postMessage({ type: "viewer-window-painted" });
    } else if (message?.type === "map-state") {
      setMapState(message);
    }
  });

  waitForPaint().then(() => {
    webViewHost.postMessage({ type: "viewer-shell-painted" });
  });
}
