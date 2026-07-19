# LeanMD Viewer

A small, local-first Markdown viewer that renders LaTeX written with either
`\(...\)` and `\[...\]` or `$...$` and `$$...$$`.

## Workspace layout

- Viewer source: `index.html` and `src/`
- Windows desktop wrapper and installer scripts: `desktop/LeanMD/`
- Proof-DAG authoring rules and canonical sample: `samples/`
- Proof-DAG validation and supporting scripts: `scripts/`
- Automated tests: `test/`

The tracked package metadata, executable metadata, application manifest, and
installer display version are kept in sync at `1.3.0`.

## Features

- Standard Markdown through `markdown-it`
- Inline mathematics with `\(...\)`
- Display mathematics with `\[...\]`
- Inline mathematics with `$...$`
- Display mathematics with `$$...$$`
- KaTeX rendering with no remote font or script requests
- File picker, drag and drop, light/dark theme, and print styles
- In-app navigation for relative Markdown links and a visited-path exploration map
- Undiscovered reference links open an independent viewer window and start a new map
- Recursive map layout that keeps sibling subtrees ordered as branches grow
- Drag-to-pan map navigation with slider, button, fit, and wheel zoom controls
- First-discovery-only map edges and a marker for the previously viewed document
- Code spans and fenced code blocks are excluded from math rendering
- Raw HTML in Markdown is disabled

Use a standard Markdown link title to choose the navigation behavior. A
`"reference"` link opens a new window only when its target has not been
discovered on the current map; otherwise it reuses the current window. A
`"proof"` link and an unlabelled Markdown link continue in the current window.

```md
[Detailed proof](./details.md "proof")
[Earlier definition](./definition.md "reference")
```

Every Markdown document in a proof-DAG sample has an adjacent
`<document>.md.leanmd.json` sidecar containing only its outgoing `"proof"`
links. The generated `.leanmd/dependencies.json` manifest combines those
sidecars into the complete proof DAG. `"reference"` links remain navigation
metadata in Markdown and are ignored by proof-DAG validation.

The sample directory itself is the root document's folder. Every non-root
document lives in a same-named child folder of its canonical proof parent. If
another parent uses that document, the second location contains a portable
`shortcut.leanmd.json` pointing to the canonical Markdown file instead of a
duplicate. OS-specific `.lnk` and symbolic links are not required.

Validate a sample, or regenerate its document sidecars and complete manifest
after editing proof links, with:

```sh
node scripts/validate-proof-dag.js samples/continuous_interval_dag
node scripts/validate-proof-dag.js samples/continuous_interval_dag --write
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
