import sampleMarkdown from "../samples/closed_bounded_interval_is_compact.md?raw";
import "./styles.css";

const SAMPLE_NAME = "closed_bounded_interval_is_compact.md";

const elements = {
  documentName: document.querySelector("#documentName"),
  dropOverlay: document.querySelector("#dropOverlay"),
  emptyState: document.querySelector("#emptyState"),
  fileInput: document.querySelector("#fileInput"),
  openButton: document.querySelector("#openButton"),
  preview: document.querySelector("#preview"),
  sampleButton: document.querySelector("#sampleButton"),
  status: document.querySelector("#status"),
  themeButton: document.querySelector("#themeButton"),
  viewerLoading: document.querySelector("#viewerLoading"),
};

const webViewHost = window.chrome?.webview;
let renderGeneration = 0;
let rendererPromise;

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

elements.sampleButton.addEventListener("click", () => {
  renderWithLoading(sampleMarkdown, SAMPLE_NAME);
});

elements.themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(next);
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
    event.preventDefault();
    requestOpenFile();
  }
});

for (const eventName of ["dragenter", "dragover"]) {
  window.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropOverlay.classList.add("is-visible");
    elements.dropOverlay.setAttribute("aria-hidden", "false");
  });
}

window.addEventListener("dragleave", (event) => {
  if (event.relatedTarget !== null) return;
  elements.dropOverlay.classList.remove("is-visible");
  elements.dropOverlay.setAttribute("aria-hidden", "true");
});

window.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.dropOverlay.classList.remove("is-visible");
  elements.dropOverlay.setAttribute("aria-hidden", "true");
  openFile(event.dataTransfer?.files?.[0]);
});

window.LeanMD = Object.freeze({
  openMarkdown(source, name = "Untitled.md") {
    if (typeof source !== "string") return;
    return renderWithLoading(source, typeof name === "string" ? name : "Untitled.md");
  },
  openSample() {
    return renderWithLoading(sampleMarkdown, SAMPLE_NAME);
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
    } else if (message?.type === "open-sample") {
      window.LeanMD.openSample();
    } else if (message?.type === "show-empty-state") {
      window.LeanMD.showEmptyState();
    } else if (message?.type === "host-window-visible") {
      await waitForPaint();
      webViewHost.postMessage({ type: "viewer-window-painted" });
    }
  });

  waitForPaint().then(() => {
    webViewHost.postMessage({ type: "viewer-shell-painted" });
  });
}
