# LeanMD Viewer

A small, local-first Markdown viewer that renders LaTeX written with either
`\(...\)` and `\[...\]` or `$...$` and `$$...$$`.

## Workspace layout

- Current development source: the workspace root
- Shared Markdown examples: `samples/`
- Official release folder: `release/LeanMD-1.0.0/`

`LeanMD-1.0.0` is a release-folder label. The preserved executable and the
current development source still carry the internal base version 0.2.8 until a
new development version is assigned.

## Features

- Standard Markdown through `markdown-it`
- Inline mathematics with `\(...\)`
- Display mathematics with `\[...\]`
- Inline mathematics with `$...$`
- Display mathematics with `$$...$$`
- KaTeX rendering with no remote font or script requests
- File picker, drag and drop, light/dark theme, and print styles
- Code spans and fenced code blocks are excluded from math rendering
- Raw HTML in Markdown is disabled

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
dotnet publish desktop/LeanMD/LeanMD.csproj -c Release -r win-x64 --self-contained false -o release/LeanMD-0.2.8
```

Run `release/LeanMD-0.2.8/Install-LeanMD.cmd` to install the app for the current user.
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
