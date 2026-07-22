const buildData = JSON.parse(
  document.querySelector("#leanmd-build-data").textContent,
);

const elements = {
  backButton: document.querySelector("#backButton"),
  documentName: document.querySelector("#documentName"),
  mapButton: document.querySelector("#mapButton"),
  mapCloseButton: document.querySelector("#mapCloseButton"),
  mapCount: document.querySelector("#mapCount"),
  mapNodeLayer: document.querySelector("#mapNodeLayer"),
  mapOverlay: document.querySelector("#mapOverlay"),
  mapSurface: document.querySelector("#mapSurface"),
  mapViewport: document.querySelector("#mapViewport"),
  mapZoomFitButton: document.querySelector("#mapZoomFitButton"),
  mapZoomInButton: document.querySelector("#mapZoomInButton"),
  mapZoomOutButton: document.querySelector("#mapZoomOutButton"),
  mapZoomSlider: document.querySelector("#mapZoomSlider"),
  mapZoomValue: document.querySelector("#mapZoomValue"),
  preview: document.querySelector("#preview"),
  status: document.querySelector("#status"),
  themeButton: document.querySelector("#themeButton"),
  unresolvedStatus: document.querySelector("#unresolvedStatus"),
};

const documents = new Map(
  buildData.documents.map((document) => [document.id, document]),
);
const templates = new Map(
  [...document.querySelectorAll("template[data-document-id]")].map(
    (template) => [template.dataset.documentId, template],
  ),
);
const mapNodes = new Map(
  [...elements.mapNodeLayer.querySelectorAll(".map-node[data-document-id]")].map(
    (node) => [node.dataset.documentId, node],
  ),
);

const MAP_MIN_ZOOM = 0.2;
const MAP_MAX_ZOOM = 2;
const MAP_ZOOM_STEP = 0.1;
const MAP_NODE_WIDTH = 220;
const MAP_NODE_HEIGHT = 72;
let currentDocumentId = null;
let previousDocumentId = null;
let navigationDepth = 0;
let mapPanPointer = null;
let mapCamera = {
  x: 0,
  y: 0,
  zoom: 1,
  initialized: false,
};

function documentHash(documentId, anchor = "") {
  const parameters = new URLSearchParams({ document: documentId });
  if (anchor) parameters.set("anchor", anchor);
  return `#${parameters}`;
}

function routeFromLocation() {
  const parameters = new URLSearchParams(window.location.hash.slice(1));
  const documentId = parameters.get("document");
  return {
    documentId: documents.has(documentId) ? documentId : buildData.root,
    anchor: parameters.get("anchor") ?? "",
  };
}

function normalizedDocumentTarget(sourceId, href) {
  if (typeof href !== "string" || !href) return null;

  const [encodedPath] = href.split(/[?#]/u, 1);
  if (!encodedPath || encodedPath.startsWith("/") || encodedPath.startsWith("//")) {
    return null;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(encodedPath).replaceAll("\\", "/");
  } catch {
    return null;
  }

  if (!/\.(?:md|markdown)$/iu.test(decodedPath)) return null;

  const segments = sourceId.split("/");
  segments.pop();
  for (const segment of decodedPath.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  const targetId = segments.join("/");
  return documents.has(targetId) ? targetId : null;
}

function hrefFragment(href) {
  const hashAt = href.indexOf("#");
  if (hashAt < 0) return "";
  try {
    return decodeURIComponent(href.slice(hashAt + 1));
  } catch {
    return href.slice(hashAt + 1);
  }
}

function scrollToAnchor(anchor) {
  if (!anchor) return false;
  const target = document.getElementById(anchor) ??
    [...elements.preview.querySelectorAll("[name]")].find(
      (candidate) => candidate.getAttribute("name") === anchor,
    );
  if (!target || !elements.preview.contains(target)) return false;
  target.scrollIntoView({ block: "start", behavior: "auto" });
  return true;
}

function prepareDocumentLinks() {
  for (const link of elements.preview.querySelectorAll("a[href]")) {
    const originalHref = link.getAttribute("href");
    const targetId = normalizedDocumentTarget(currentDocumentId, originalHref);
    if (targetId) {
      const anchor = hrefFragment(originalHref);
      link.dataset.documentId = targetId;
      link.dataset.documentAnchor = anchor;
      link.setAttribute("href", documentHash(targetId, anchor));
      continue;
    }

    if (/^https?:\/\//iu.test(originalHref)) {
      link.target = "_blank";
      link.rel = "noreferrer noopener";
    }
  }
}

function updateMapDocumentState() {
  for (const [documentId, node] of mapNodes) {
    const isCurrent = documentId === currentDocumentId;
    const isPrevious = documentId === previousDocumentId;
    node.classList.toggle("is-current", isCurrent);
    node.classList.toggle("is-previous", isPrevious);

    const metadata = documents.get(documentId);
    const descriptions = [];
    if (isCurrent) descriptions.push("Current document.");
    if (isPrevious) descriptions.push("Previous document.");
    if (metadata.unresolved) descriptions.push("Unresolved at build time.");
    node.setAttribute(
      "aria-label",
      `${metadata.title}. ${descriptions.join(" ")} ${metadata.detail}`.trim(),
    );
  }
}

function showDocument(documentId, { anchor = "", resetScroll = true } = {}) {
  const metadata = documents.get(documentId);
  const template = templates.get(documentId);
  if (!metadata || !template) return false;

  previousDocumentId = currentDocumentId === documentId
    ? previousDocumentId
    : currentDocumentId;
  currentDocumentId = documentId;
  elements.preview.replaceChildren(template.content.cloneNode(true));
  elements.documentName.textContent = metadata.title;
  elements.unresolvedStatus.hidden = !metadata.unresolved;
  document.title = `${metadata.title} — LeanMD build`;
  prepareDocumentLinks();
  updateMapDocumentState();

  if (!scrollToAnchor(anchor) && resetScroll) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  elements.status.textContent = `${metadata.title} opened.`;
  return true;
}

function navigateToDocument(documentId, anchor = "") {
  if (!documents.has(documentId)) return;
  if (documentId === currentDocumentId) {
    scrollToAnchor(anchor);
    return;
  }

  window.history.pushState(
    { leanmdDocument: documentId, anchor },
    "",
    documentHash(documentId, anchor),
  );
  navigationDepth += 1;
  elements.backButton.disabled = false;
  showDocument(documentId, { anchor });
}

function openMap() {
  elements.mapOverlay.hidden = false;
  elements.mapButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("map-is-open");
  window.requestAnimationFrame(() => {
    if (!mapCamera.initialized) fitMapToViewport();
  });
}

function closeMap() {
  elements.mapOverlay.hidden = true;
  elements.mapButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("map-is-open");
}

function toggleMap() {
  if (elements.mapOverlay.hidden) openMap();
  else closeMap();
}

function clampMapZoom(zoom) {
  return Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, zoom));
}

function constrainMapCamera() {
  const viewportWidth = elements.mapViewport.clientWidth;
  const viewportHeight = elements.mapViewport.clientHeight;
  if (viewportWidth === 0 || viewportHeight === 0) return;

  const visibleMargin = Math.min(100, viewportWidth * 0.25, viewportHeight * 0.25);
  const scaledWidth = buildData.map.width * mapCamera.zoom;
  const scaledHeight = buildData.map.height * mapCamera.zoom;
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

function fitMapToViewport() {
  const viewportWidth = elements.mapViewport.clientWidth;
  const viewportHeight = elements.mapViewport.clientHeight;
  if (viewportWidth === 0 || viewportHeight === 0) return;

  mapCamera.zoom = clampMapZoom(
    Math.min(
      (viewportWidth - 64) / buildData.map.width,
      (viewportHeight - 64) / buildData.map.height,
    ),
  );
  mapCamera.x = (viewportWidth - buildData.map.width * mapCamera.zoom) / 2;
  mapCamera.y = (viewportHeight - buildData.map.height * mapCamera.zoom) / 2;
  mapCamera.initialized = true;
  constrainMapCamera();
  applyMapCamera();
}

function startMapPan(event) {
  if (event.button !== 0 || event.target.closest(".map-node")) return;
  event.preventDefault();
  mapPanPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
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

function initialTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  elements.themeButton.textContent = theme === "dark" ? "Light" : "Dark";
}

elements.preview.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  const target = event.target instanceof Element ? event.target : null;
  const link = target?.closest("a[href]");
  if (!link || !elements.preview.contains(link)) return;

  const documentId = link.dataset.documentId;
  if (documentId) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateToDocument(documentId, link.dataset.documentAnchor ?? "");
    return;
  }

  const href = link.getAttribute("href");
  if (href?.startsWith("#")) {
    event.preventDefault();
    scrollToAnchor(hrefFragment(href));
  }
});

elements.backButton.addEventListener("click", () => {
  if (navigationDepth > 0) window.history.back();
});
elements.mapButton.addEventListener("click", toggleMap);
elements.mapCloseButton.addEventListener("click", closeMap);
elements.mapOverlay.addEventListener("click", (event) => {
  if (event.target === elements.mapOverlay) closeMap();
});
elements.mapViewport.addEventListener("pointerdown", startMapPan);
elements.mapViewport.addEventListener("pointermove", moveMapPan);
elements.mapViewport.addEventListener("pointerup", endMapPan);
elements.mapViewport.addEventListener("pointercancel", endMapPan);
elements.mapViewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  const bounds = elements.mapViewport.getBoundingClientRect();
  setMapZoom(
    mapCamera.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1),
    event.clientX - bounds.left,
    event.clientY - bounds.top,
  );
}, { passive: false });
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
elements.themeButton.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

for (const node of mapNodes.values()) {
  node.addEventListener("click", () => {
    closeMap();
    navigateToDocument(node.dataset.documentId);
  });
}

document.addEventListener("keydown", (event) => {
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
    toggleMap();
    return;
  }
  if (
    !event.repeat &&
    navigationDepth > 0 &&
    (event.key === "Backspace" || event.key === ",") &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !(event.target instanceof HTMLInputElement) &&
    !(event.target instanceof HTMLTextAreaElement) &&
    !event.target?.isContentEditable
  ) {
    event.preventDefault();
    window.history.back();
  }
});

window.addEventListener("popstate", () => {
  const route = routeFromLocation();
  navigationDepth = Math.max(0, navigationDepth - 1);
  elements.backButton.disabled = navigationDepth === 0;
  showDocument(route.documentId, { anchor: route.anchor });
});

elements.mapCount.textContent = String(documents.size);
setTheme(initialTheme());
const initialRoute = routeFromLocation();
window.history.replaceState(
  { leanmdDocument: initialRoute.documentId, anchor: initialRoute.anchor },
  "",
  documentHash(initialRoute.documentId, initialRoute.anchor),
);
showDocument(initialRoute.documentId, { anchor: initialRoute.anchor });
