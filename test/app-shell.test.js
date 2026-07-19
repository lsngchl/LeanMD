import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const desktopHost = readFileSync(
  new URL("../desktop/LeanMD/MainForm.cs", import.meta.url),
  "utf8",
);
const desktopProgram = readFileSync(
  new URL("../desktop/LeanMD/Program.cs", import.meta.url),
  "utf8",
);
const desktopApplicationContext = readFileSync(
  new URL("../desktop/LeanMD/LeanMDApplicationContext.cs", import.meta.url),
  "utf8",
);

test("starts with a Markdown drop target", () => {
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

test("does not bundle a Markdown sample into the app", () => {
  assert.doesNotMatch(html, /sampleButton|Reload sample/);
  assert.doesNotMatch(
    appSource,
    /sampleMarkdown|SAMPLE_NAME|\?raw|openSample|open-sample|bundled-sample-opened/,
  );
  assert.doesNotMatch(desktopHost, /open-sample|bundled-sample-opened/);
});

test("opens relative Markdown links through the desktop host", () => {
  assert.match(appSource, /elements\.preview\.addEventListener\("click"/);
  assert.match(appSource, /link\.getAttribute\("title"\)/);
  assert.match(appSource, /type: "open-markdown-link", href, role/);
  assert.match(desktopHost, /case "open-markdown-link":/);
  assert.match(desktopHost, /OpenLinkedMarkdownAsync\(hrefElement\.GetString\(\), role\)/);
  assert.match(
    desktopHost,
    /Path\.GetFullPath\(Path\.Combine\(currentDirectory, relativePath\)\)/,
  );
});

test("opens only undiscovered recall Markdown links as independent windows", () => {
  assert.match(desktopHost, /role\?\.Equals\(\s*"recall"/);
  assert.match(desktopHost, /bool targetWasDiscovered = _mapNodes\.Contains/);
  assert.match(desktopHost, /if \(isRecall && !targetWasDiscovered\)/);
  assert.match(desktopHost, /_openRecallWindow\(linkedPath, this\)/);
  assert.match(desktopHost, /ApplyRecallWindowBounds\(recallSource\)/);
  assert.match(desktopProgram, /new LeanMDApplicationContext\(markdownPath\)/);
  assert.match(desktopApplicationContext, /new MainForm\(markdownPath, OpenRecallWindow/);
  assert.match(desktopApplicationContext, /if \(_openWindowCount == 0\)/);
});

test("desktop drag and drop keeps the source file path in the host", () => {
  assert.match(desktopHost, /AllowExternalDrop = true/);
  assert.match(appSource, /postMessageWithAdditionalObjects/);
  assert.match(appSource, /type: "open-dropped-file"/);
  assert.match(desktopHost, /eventArgs\.AdditionalObjects/);
  assert.match(desktopHost, /CoreWebView2File droppedFile/);
  assert.match(desktopHost, /droppedFile\.Path/);
});

test("records only followed Markdown links in an exploration map", () => {
  assert.match(html, /id="mapButton"/);
  assert.match(html, /id="mapOverlay"/);
  assert.match(html, /Unvisited Markdown files stay hidden/);
  assert.match(desktopHost, /DiscoverMapLink\(linkSourcePath, markdownPath\)/);
  assert.match(desktopHost, /case OpenReason\.Map:/);
  assert.match(desktopHost, /type = "map-state"/);
  assert.match(appSource, /function renderMap\(\)/);
  assert.match(appSource, /type: "open-map-node", id: node\.id/);
  assert.match(appSource, /layoutExplorationMap\(mapState\.nodes/);
  assert.doesNotMatch(appSource, /isMapPositionFree|mapPositions\.has/);
});

test("does not draw a new edge when revisiting a discovered node", () => {
  assert.match(desktopHost, /bool targetWasAlreadyDiscovered = _mapNodes\.Contains/);
  assert.match(desktopHost, /if \(!targetWasAlreadyDiscovered\)\s*{\s*_mapNodes\.Add\(targetPath\)/s);
  assert.match(
    desktopHost,
    /if \(!targetWasAlreadyDiscovered\)[\s\S]*?_mapEdges\.Add\(\(sourcePath, targetPath\)\);/,
  );
});

test("marks the immediately previous document on the map", () => {
  assert.match(desktopHost, /private string\? _previousMapPath/);
  assert.match(desktopHost, /previous = _previousMapPath/);
  assert.match(appSource, /previous: typeof nextState\.previous === "string"/);
  assert.match(appSource, /button\.classList\.toggle\("is-previous", isPrevious\)/);
  assert.match(stylesSource, /\.map-node\.is-previous::after\s*{/);
  assert.match(stylesSource, /content: "Previous"/);
});

test("toggles the map with M and closes it with Escape", () => {
  assert.match(html, /aria-keyshortcuts="M"/);
  assert.match(appSource, /function toggleMap\(\)/);
  assert.match(appSource, /mapButton\.addEventListener\("click", toggleMap\)/);
  assert.match(appSource, /event\.key\.toLowerCase\(\) === "m"/);
  assert.match(appSource, /event\.key === "Escape" && !elements\.mapOverlay\.hidden/);
  assert.doesNotMatch(appSource, /map(?:Button|CloseButton)\.focus\(\)/);
});

test("separates map reset from close and confirms before clearing the map", () => {
  const closePosition = html.indexOf('id="mapCloseButton"');
  const footerPosition = html.indexOf('<footer class="map-footer">');
  const resetPosition = html.indexOf('id="mapResetButton"');

  assert.ok(closePosition >= 0 && closePosition < footerPosition);
  assert.ok(resetPosition > footerPosition);
  assert.match(html, /id="mapResetDialog"/);
  assert.match(html, /The current document will become the new starting point/);
  assert.match(appSource, /mapResetDialog\.showModal\(\)/);
  assert.match(
    appSource,
    /mapResetConfirmButton\.addEventListener\("click",[\s\S]*type: "reset-map"/,
  );
});

test("pans the map by dragging and zooms without scrollbars", () => {
  assert.match(html, /id="mapZoomSlider"/);
  assert.match(html, /id="mapZoomOutButton"/);
  assert.match(html, /id="mapZoomInButton"/);
  assert.match(html, /id="mapZoomFitButton"/);
  assert.match(appSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(appSource, /addEventListener\("pointermove", moveMapPan\)/);
  assert.match(appSource, /function setMapZoom\(/);
  assert.match(appSource, /addEventListener\(\s*"wheel"/);
  assert.match(stylesSource, /\.map-viewport\s*{[^}]*overflow: hidden;/s);
  assert.match(stylesSource, /\.map-viewport\.is-panning\s*{[^}]*cursor: grabbing;/s);
});

test("returns to the previous document with Backspace or comma", () => {
  assert.match(appSource, /event\.key === "Backspace"/);
  assert.match(appSource, /event\.key === ","/);
  assert.match(appSource, /type: "go-back"/);
  assert.match(desktopHost, /Stack<string> _documentHistory/);
  assert.match(desktopHost, /case "go-back":/);
  assert.match(desktopHost, /await GoBackAsync\(\)/);
  assert.match(desktopHost, /OpenReason\.History/);
});

test("shows a keyboard shortcut guide from the top bar", () => {
  assert.match(html, /id="keyGuideButton"/);
  assert.match(html, /id="keyGuidePanel"/);
  assert.match(html, /<kbd>M<\/kbd>/);
  assert.match(html, /<kbd>Backspace<\/kbd>/);
  assert.match(html, /<kbd>,<\/kbd>/);
  assert.match(html, /<kbd>Esc<\/kbd>/);
  assert.match(appSource, /function toggleKeyGuide\(\)/);
});
