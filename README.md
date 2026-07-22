# LeanMD Viewer

**Latest release: 1.4.1**

A small, local-first Markdown viewer that renders LaTeX written with either
`\(...\)` and `\[...\]` or `$...$` and `$$...$$`.

## Workspace layout

- Viewer source: `index.html` and `src/`
- Windows desktop wrapper and installer scripts: `desktop/LeanMD/`
- LeanMD document workspace: `leanmd/`
- Application asset scripts: `scripts/`
- Automated tests: `test/`

The tracked package metadata, executable metadata, application manifest, and
installer display version are kept in sync with the latest release shown above.

## Features

- Standard Markdown through `markdown-it`
- Inline mathematics with `\(...\)`
- Display mathematics with `\[...\]`
- Inline mathematics with `$...$`
- Display mathematics with `$$...$$`
- KaTeX rendering with no remote font or script requests
- File picker, drag and drop, light/dark theme, and print styles
- In-app navigation for relative Markdown links and a structure-aware exploration map
- Undiscovered links inside the current LeanMD structure reuse the current viewer window
- Recursive map layout that keeps sibling subtrees ordered as branches grow
- Map branches ordered by their source links rather than discovery order
- Drag-to-pan map navigation with slider, button, fit, and wheel zoom controls
- Inferred `?` nodes on the shortest structural route to newly opened documents
- Persistent exploration maps for structured LeanMD document sets
- Per-document unresolved toggles with composable map badges
- External-link icons for web references that open in the system browser
- Source-anchored reading-position restoration when navigating back
- Code spans and fenced code blocks are excluded from math rendering
- Markdown footnotes with linked references and backreferences
- Raw HTML in Markdown is disabled

Use a standard Markdown link title to express the question that following the
link answers. A `"why"` link answers “Why does this hold?” by opening a more
detailed argument. A `"recall"` link answers “What was this again?” by returning
to a definition, notation, or earlier context. Link roles do not determine map
topology: any target in the current `.leanmd/dependencies.json` structure opens
in the same window and is placed by the why DAG. An undiscovered `"recall"`
target outside that structure still opens an independent window.

```md
[Why this holds](./details.md "why")
[What this meant](./definition.md "recall")
```

Every Markdown document in a structured LeanMD document set has an adjacent
`<document>.md.leanmd.json` sidecar containing only its outgoing `"why"` links.
The generated `.leanmd/dependencies.json` manifest combines those sidecars into
the complete why DAG. `"recall"` links remain navigation metadata in Markdown
and are ignored by why-DAG validation.

When the desktop viewer finds `.leanmd/dependencies.json` in the current
document's directory or one of its ancestors, it treats that directory as a
structured LeanMD document set. The active document, visible source-line range,
and selected passage are written to the ignored
`.leanmd/current-context.json` file for local Codex context sharing. Ordinary
Markdown files outside a structured document set are still viewed and
automatically reloaded without creating this context file.

The primary viewer window saves its partial structural projection as the ignored
`.leanmd/exploration-map.json` file. Opening an unseen document reveals the
shortest route from an already visible ancestor; unopened intermediate documents
appear as `?` nodes until opened. Sibling documents remain sibling branches under
their structural parent. The viewer watches `dependencies.json`, keeps existing
valid display paths stable, and repairs paths invalidated by dependency changes.
Resetting retains only the current document plus its inferred route from the
structure root. Independent recall windows keep temporary maps.

An adjacent `<document>.unresolved` marker records that a document is not yet
understood. The desktop viewer creates or removes this marker from the document
toolbar and reflects it on every visible occurrence of the node in the map.
Unresolved state is independent of exploration state: resetting the map may hide
the node, but the marker remains and is shown again when the node is revealed.

The document-set directory itself is the root document's folder. Every non-root
document lives in a same-named child folder of its canonical why parent. If
another parent uses that document, the second location contains a portable
`shortcut.leanmd.json` pointing to the canonical Markdown file instead of a
duplicate. OS-specific `.lnk` and symbolic links are not required.

Validate any document set, or regenerate its document sidecars and complete manifest after
editing why links, by passing its path:

```sh
node leanmd/validate-why-dag.js path/to/document_set
node leanmd/validate-why-dag.js path/to/document_set --write
```

Run the complete test suite against one or more document sets with:

```sh
npm test -- path/to/document_set
npm test -- path/to/first_document_set path/to/second_document_set
```

## Run locally

```sh
pnpm install
pnpm dev
```

## Build the desktop viewer assets

```sh
pnpm build
```

The build writes the cacheable HTML, JavaScript, CSS, and WOFF2 math-font assets
directly to `dist-desktop/`. The Windows desktop project packages that directory
into its `Viewer/` output. A standalone single-HTML build is not produced.

## Windows app

The Windows desktop wrapper accepts a Markdown path as its first command-line
argument and loads cacheable viewer assets in WebView2.

```powershell
dotnet publish desktop/LeanMD/LeanMD.csproj -c Release -r win-x64 --self-contained false -o release/LeanMD-<version>
```

Official release folders use the `release/LeanMD-<version>/` naming convention.
Replace `<version>` in the command above with the latest release shown at the top
of this README. After publishing, run `Install-LeanMD.cmd` from that release
folder to install the app for the current user.
The installer registers LeanMD as an available handler for `.md` and `.markdown`,
but does not open Windows Default Apps settings or change the existing default app.
Administrator privileges are not required.

On first launch, the desktop window uses most of the primary monitor's working
area. On subsequent launches it restores the last normal size and position,
including whether the window was maximized. If the saved monitor is no longer
available, LeanMD falls back to a large centered window on the primary display.
The window remains transparent while WebView2 prepares the viewer shell. It is
revealed only after the shell has painted, and Markdown rendering starts after
the visible loading state has painted once.
