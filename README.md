# LeanMD Viewer

A small, local-first Markdown viewer that renders LaTeX written with either
`\(...\)` and `\[...\]` or `$...$` and `$$...$$`.

## Workspace layout

- Viewer source: `index.html` and `src/`
- Windows desktop wrapper and installer scripts: `desktop/LeanMD/`
- Why-DAG authoring rules and canonical sample: `samples/`
- Why-DAG validation and supporting scripts: `scripts/`
- Automated tests: `test/`

The tracked package metadata, executable metadata, application manifest, and
installer display version are kept in sync at `1.3.1`.

## Features

- Standard Markdown through `markdown-it`
- Inline mathematics with `\(...\)`
- Display mathematics with `\[...\]`
- Inline mathematics with `$...$`
- Display mathematics with `$$...$$`
- KaTeX rendering with no remote font or script requests
- File picker, drag and drop, light/dark theme, and print styles
- In-app navigation for relative Markdown links and a visited-path exploration map
- Undiscovered recall links open an independent viewer window and start a new map
- Recursive map layout that keeps sibling subtrees ordered as branches grow
- Drag-to-pan map navigation with slider, button, fit, and wheel zoom controls
- First-discovery-only map edges and a marker for the previously viewed document
- Code spans and fenced code blocks are excluded from math rendering
- Raw HTML in Markdown is disabled

Use a standard Markdown link title to express the question that following the
link answers. A `"why"` link answers “Why does this hold?” by opening a more
detailed argument. A `"recall"` link answers “What was this again?” by returning
to a definition, notation, or earlier context. An undiscovered `"recall"` target
opens in a new window and starts a new map; otherwise the current window is
reused. A `"why"` link and an unlabelled Markdown link continue in the current
window.

```md
[Why this holds](./details.md "why")
[What this meant](./definition.md "recall")
```

Every Markdown document in a why-DAG sample has an adjacent
`<document>.md.leanmd.json` sidecar containing only its outgoing `"why"` links.
The generated `.leanmd/dependencies.json` manifest combines those sidecars into
the complete why DAG. `"recall"` links remain navigation metadata in Markdown
and are ignored by why-DAG validation.

The sample directory itself is the root document's folder. Every non-root
document lives in a same-named child folder of its canonical why parent. If
another parent uses that document, the second location contains a portable
`shortcut.leanmd.json` pointing to the canonical Markdown file instead of a
duplicate. OS-specific `.lnk` and symbolic links are not required.

Validate a sample, or regenerate its document sidecars and complete manifest
after editing why links, with:

```sh
node scripts/validate-why-dag.js samples/continuous_interval_dag
node scripts/validate-why-dag.js samples/continuous_interval_dag --write
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
dotnet publish desktop/LeanMD/LeanMD.csproj -c Release -r win-x64 --self-contained false
```

After publishing, run `Install-LeanMD.cmd` from the publish output directory to
install the app for the current user.
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
