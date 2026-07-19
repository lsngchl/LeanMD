using System.Diagnostics;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace LeanMD;

internal sealed class MainForm : Form
{
    private const string ViewerHostName = "leanmd.local";
    private string? _markdownPath;
    private string? _lastMarkdownDirectory;
    private readonly WebView2 _webView;
    private readonly List<string> _mapNodes = [];
    private readonly List<(string From, string To)> _mapEdges = [];
    private readonly Stack<string> _documentHistory = new();
    private string? _mapRootPath;
    private int _mapSessionId;
    private Task<string>? _initialMarkdownReadTask;
    private bool _initialContentSent;
    private bool _windowRevealed;

    private enum OpenReason
    {
        Direct,
        Link,
        Map,
        History,
    }

    public MainForm(string? markdownPath)
    {
        _markdownPath = markdownPath;
        _lastMarkdownDirectory = markdownPath is null
            ? null
            : Path.GetDirectoryName(markdownPath);
        Text = "LeanMD";
        MinimumSize = new Size(720, 540);
        BackColor = Color.FromArgb(243, 241, 236);
        ApplyAppIcon();
        Opacity = 0;
        ApplyInitialWindowState();

        _webView = new WebView2
        {
            Dock = DockStyle.Fill,
            AllowExternalDrop = true,
            DefaultBackgroundColor = BackColor,
        };

        Controls.Add(_webView);
        Shown += OnShown;
        FormClosing += OnFormClosing;
    }

    private async void OnShown(object? sender, EventArgs eventArgs)
    {
        Shown -= OnShown;
        _initialMarkdownReadTask = StartInitialMarkdownRead();

        try
        {
            await InitializeViewerAsync();
        }
        catch (WebView2RuntimeNotFoundException)
        {
            ShowStartupError(
                "Microsoft Edge WebView2 Runtime is required. Install it from Microsoft, then reopen LeanMD.");
        }
        catch (Exception exception)
        {
            ShowStartupError($"LeanMD could not start.\n\n{exception.Message}");
        }
    }

    private async Task InitializeViewerAsync()
    {
        string userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "LeanMD",
            "WebView2");

        CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(
            browserExecutableFolder: null,
            userDataFolder: userDataFolder);

        await _webView.EnsureCoreWebView2Async(environment);
        ConfigureWebView(_webView.CoreWebView2);

        _webView.NavigationCompleted += (_, eventArgs) =>
        {
            if (!eventArgs.IsSuccess)
            {
                ShowStartupError("The LeanMD viewer could not be loaded.");
            }
        };
        _webView.CoreWebView2.DocumentTitleChanged += (_, _) =>
        {
            string title = _webView.CoreWebView2.DocumentTitle;
            if (!string.IsNullOrWhiteSpace(title)) Text = title;
        };

        string viewerDirectory = Path.Combine(AppContext.BaseDirectory, "Viewer");
        string viewerEntry = Path.Combine(viewerDirectory, "index.html");
        if (!File.Exists(viewerEntry))
        {
            throw new InvalidOperationException("The installed LeanMD viewer files were not found.");
        }

        _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            ViewerHostName,
            viewerDirectory,
            CoreWebView2HostResourceAccessKind.DenyCors);
        _webView.CoreWebView2.Navigate($"https://{ViewerHostName}/index.html");
    }

    private void ConfigureWebView(CoreWebView2 core)
    {
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultScriptDialogsEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.IsZoomControlEnabled = true;
        core.Settings.IsWebMessageEnabled = true;
        core.WebMessageReceived += OnWebMessageReceived;

        core.NewWindowRequested += (_, eventArgs) =>
        {
            eventArgs.Handled = true;
            OpenExternalUri(eventArgs.Uri);
        };

        core.NavigationStarting += (_, eventArgs) =>
        {
            if (eventArgs.Uri.Equals("about:blank", StringComparison.OrdinalIgnoreCase)) return;

            if (Uri.TryCreate(eventArgs.Uri, UriKind.Absolute, out Uri? uri) &&
                uri.Scheme == Uri.UriSchemeHttps &&
                uri.Host.Equals(ViewerHostName, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            if (uri is not null &&
                (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            {
                eventArgs.Cancel = true;
                OpenExternalUri(eventArgs.Uri);
            }
        };

        core.PermissionRequested += (_, eventArgs) =>
        {
            eventArgs.State = CoreWebView2PermissionState.Deny;
        };
    }

    private async void OnWebMessageReceived(
        object? sender,
        CoreWebView2WebMessageReceivedEventArgs eventArgs)
    {
        try
        {
            using JsonDocument message = JsonDocument.Parse(eventArgs.WebMessageAsJson);
            if (!message.RootElement.TryGetProperty("type", out JsonElement typeElement)) return;

            switch (typeElement.GetString())
            {
                case "viewer-shell-painted":
                    RevealWindow();
                    PostViewerMessage(new { type = "host-window-visible" });
                    break;
                case "viewer-window-painted":
                    await SendInitialContentAsync();
                    break;
                case "open-file-dialog":
                    await ShowOpenMarkdownDialogAsync();
                    break;
                case "open-markdown-link":
                    if (message.RootElement.TryGetProperty("href", out JsonElement hrefElement) &&
                        hrefElement.ValueKind == JsonValueKind.String)
                    {
                        await OpenLinkedMarkdownAsync(hrefElement.GetString());
                    }
                    break;
                case "open-dropped-file":
                    await OpenDroppedMarkdownAsync(eventArgs.AdditionalObjects);
                    break;
                case "open-map-node":
                    if (message.RootElement.TryGetProperty("id", out JsonElement idElement) &&
                        idElement.ValueKind == JsonValueKind.String)
                    {
                        await OpenMapNodeAsync(idElement.GetString());
                    }
                    break;
                case "go-back":
                    await GoBackAsync();
                    break;
                case "reset-map":
                    if (_markdownPath is not null)
                    {
                        StartMap(_markdownPath);
                    }
                    break;
            }
        }
        catch
        {
            // Ignore malformed messages from the embedded page.
        }
    }

    private async Task SendInitialContentAsync()
    {
        if (_initialContentSent) return;
        _initialContentSent = true;

        if (_markdownPath is null)
        {
            PostViewerMessage(new { type = "show-empty-state" });
            return;
        }

        await OpenMarkdownPathAsync(
            _markdownPath,
            _initialMarkdownReadTask,
            showEmptyStateOnFailure: true);
    }

    private async Task ShowOpenMarkdownDialogAsync()
    {
        using var dialog = new OpenFileDialog
        {
            AddExtension = true,
            CheckFileExists = true,
            CheckPathExists = true,
            DefaultExt = "md",
            Filter = "Markdown files (*.md;*.markdown)|*.md;*.markdown|All files (*.*)|*.*",
            Multiselect = false,
            RestoreDirectory = true,
            Title = "Open Markdown",
        };

        string? currentDirectory = _markdownPath is null
            ? _lastMarkdownDirectory
            : Path.GetDirectoryName(_markdownPath);
        if (currentDirectory is not null && Directory.Exists(currentDirectory))
        {
            dialog.InitialDirectory = currentDirectory;
        }

        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        await OpenMarkdownPathAsync(Path.GetFullPath(dialog.FileName));
    }

    private async Task OpenMarkdownPathAsync(
        string markdownPath,
        Task<string>? sourceTask = null,
        bool showEmptyStateOnFailure = false,
        OpenReason reason = OpenReason.Direct,
        string? linkSourcePath = null)
    {
        string? previousPath = _markdownPath;

        if (sourceTask is null && !File.Exists(markdownPath))
        {
            MessageBox.Show(
                this,
                $"The Markdown file was not found:\n{markdownPath}",
                "LeanMD",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
            if (showEmptyStateOnFailure)
            {
                PostViewerMessage(new { type = "show-empty-state" });
            }
            return;
        }

        try
        {
            string source = sourceTask is not null
                ? await sourceTask
                : await File.ReadAllTextAsync(markdownPath);
            markdownPath = Path.GetFullPath(markdownPath);
            _markdownPath = markdownPath;
            _lastMarkdownDirectory = Path.GetDirectoryName(markdownPath);
            _initialMarkdownReadTask = null;
            UpdateHistoryAfterOpen(reason, previousPath, markdownPath);
            PostViewerMessage(new
            {
                type = "open-markdown",
                source,
                name = Path.GetFileName(markdownPath),
            });
            UpdateMapAfterOpen(markdownPath, reason, linkSourcePath);
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                this,
                $"The Markdown file could not be opened.\n\n{exception.Message}",
                "LeanMD",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            if (showEmptyStateOnFailure)
            {
                PostViewerMessage(new { type = "show-empty-state" });
            }
        }
    }

    private async Task OpenLinkedMarkdownAsync(string? href)
    {
        if (_markdownPath is null || string.IsNullOrWhiteSpace(href)) return;

        string sourcePath = _markdownPath;

        int suffixStart = href.IndexOfAny(['?', '#']);
        string encodedPath = suffixStart >= 0 ? href[..suffixStart] : href;
        if (string.IsNullOrWhiteSpace(encodedPath)) return;

        try
        {
            string relativePath = Uri.UnescapeDataString(encodedPath)
                .Replace('/', Path.DirectorySeparatorChar);
            if (Path.IsPathRooted(relativePath)) return;

            string extension = Path.GetExtension(relativePath);
            if (!extension.Equals(".md", StringComparison.OrdinalIgnoreCase) &&
                !extension.Equals(".markdown", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            string? currentDirectory = Path.GetDirectoryName(_markdownPath);
            if (currentDirectory is null) return;

            string linkedPath = Path.GetFullPath(Path.Combine(currentDirectory, relativePath));
            await OpenMarkdownPathAsync(
                linkedPath,
                reason: OpenReason.Link,
                linkSourcePath: sourcePath);
        }
        catch (Exception exception) when (
            exception is ArgumentException or NotSupportedException or PathTooLongException or UriFormatException)
        {
            // Ignore malformed local links and keep the current document open.
        }
    }

    private async Task OpenMapNodeAsync(string? nodeId)
    {
        if (nodeId is null || !_mapNodes.Contains(nodeId, StringComparer.OrdinalIgnoreCase)) return;

        await OpenMarkdownPathAsync(nodeId, reason: OpenReason.Map);
    }

    private async Task GoBackAsync()
    {
        while (_documentHistory.Count > 0)
        {
            string previousPath = _documentHistory.Pop();
            if (!File.Exists(previousPath)) continue;

            await OpenMarkdownPathAsync(previousPath, reason: OpenReason.History);
            return;
        }
    }

    private void UpdateHistoryAfterOpen(
        OpenReason reason,
        string? previousPath,
        string markdownPath)
    {
        if (reason == OpenReason.Direct)
        {
            _documentHistory.Clear();
            return;
        }

        if ((reason == OpenReason.Link || reason == OpenReason.Map) &&
            previousPath is not null &&
            !previousPath.Equals(markdownPath, StringComparison.OrdinalIgnoreCase))
        {
            _documentHistory.Push(previousPath);
        }
    }

    private void UpdateMapAfterOpen(
        string markdownPath,
        OpenReason reason,
        string? linkSourcePath)
    {
        switch (reason)
        {
            case OpenReason.Direct:
                StartMap(markdownPath);
                return;
            case OpenReason.Link when linkSourcePath is not null:
                DiscoverMapLink(linkSourcePath, markdownPath);
                return;
            case OpenReason.Map:
            case OpenReason.History:
                PublishMapState();
                return;
        }
    }

    private void StartMap(string rootPath)
    {
        _mapSessionId++;
        _mapRootPath = rootPath;
        _documentHistory.Clear();
        _mapNodes.Clear();
        _mapEdges.Clear();
        _mapNodes.Add(rootPath);
        PublishMapState();
    }

    private void ClearMap()
    {
        _mapSessionId++;
        _mapRootPath = null;
        _documentHistory.Clear();
        _mapNodes.Clear();
        _mapEdges.Clear();
        PublishMapState();
    }

    private void DiscoverMapLink(string sourcePath, string targetPath)
    {
        if (_mapRootPath is null ||
            !_mapNodes.Contains(sourcePath, StringComparer.OrdinalIgnoreCase))
        {
            _mapSessionId++;
            _mapRootPath = sourcePath;
            _mapNodes.Clear();
            _mapEdges.Clear();
            _mapNodes.Add(sourcePath);
        }

        if (!_mapNodes.Contains(targetPath, StringComparer.OrdinalIgnoreCase))
        {
            _mapNodes.Add(targetPath);
        }

        if (!sourcePath.Equals(targetPath, StringComparison.OrdinalIgnoreCase) &&
            !_mapEdges.Any(edge =>
                edge.From.Equals(sourcePath, StringComparison.OrdinalIgnoreCase) &&
                edge.To.Equals(targetPath, StringComparison.OrdinalIgnoreCase)))
        {
            _mapEdges.Add((sourcePath, targetPath));
        }

        PublishMapState();
    }

    private void PublishMapState()
    {
        string? rootDirectory = _mapRootPath is null
            ? null
            : Path.GetDirectoryName(_mapRootPath);

        PostViewerMessage(new
        {
            type = "map-state",
            sessionId = _mapSessionId,
            root = _mapRootPath,
            current = _markdownPath,
            nodes = _mapNodes.Select((path, order) => new
            {
                id = path,
                label = Path.GetFileNameWithoutExtension(path).Replace('_', ' '),
                detail = path.Equals(_mapRootPath, StringComparison.OrdinalIgnoreCase)
                    ? "Starting document"
                    : rootDirectory is null
                        ? Path.GetFileName(path)
                        : Path.GetRelativePath(rootDirectory, path).Replace('\\', '/'),
                order,
            }),
            edges = _mapEdges.Select(edge => new
            {
                from = edge.From,
                to = edge.To,
            }),
        });
    }

    private async Task OpenDroppedMarkdownAsync(IReadOnlyList<object> additionalObjects)
    {
        if (additionalObjects.Count != 1 ||
            additionalObjects[0] is not CoreWebView2File droppedFile)
        {
            return;
        }

        string markdownPath = droppedFile.Path;
        string extension = Path.GetExtension(markdownPath);
        if (!extension.Equals(".md", StringComparison.OrdinalIgnoreCase) &&
            !extension.Equals(".markdown", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        await OpenMarkdownPathAsync(Path.GetFullPath(markdownPath));
    }

    private void PostViewerMessage(object message)
    {
        _webView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(message));
    }

    private void RevealWindow()
    {
        if (_windowRevealed) return;

        _windowRevealed = true;
        Opacity = 1;
        Activate();
    }

    private void ApplyAppIcon()
    {
        using Stream? stream = typeof(MainForm).Assembly.GetManifestResourceStream("LeanMD.AppIcon.ico");
        if (stream is null) return;

        using var embeddedIcon = new Icon(stream);
        Icon = (Icon)embeddedIcon.Clone();
    }

    private Task<string>? StartInitialMarkdownRead()
    {
        return _markdownPath is not null && File.Exists(_markdownPath)
            ? File.ReadAllTextAsync(_markdownPath)
            : null;
    }

    private static void OpenExternalUri(string uri)
    {
        if (!Uri.TryCreate(uri, UriKind.Absolute, out Uri? parsed) ||
            (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
        {
            return;
        }

        try
        {
            Process.Start(new ProcessStartInfo(uri) { UseShellExecute = true });
        }
        catch
        {
            // External links are optional; keep the local viewer running.
        }
    }

    private void ApplyInitialWindowState()
    {
        WindowStateData? saved = WindowStateStore.Load();
        if (saved is null || !TryRestoreSavedBounds(saved))
        {
            ApplyLargeDefaultBounds();
            return;
        }

        if (saved.Maximized)
        {
            WindowState = FormWindowState.Maximized;
        }
    }

    private bool TryRestoreSavedBounds(WindowStateData saved)
    {
        if (saved.Width < MinimumSize.Width || saved.Height < MinimumSize.Height)
        {
            return false;
        }

        var savedBounds = new Rectangle(saved.X, saved.Y, saved.Width, saved.Height);
        Screen? screen = Screen.AllScreens.FirstOrDefault(candidate =>
        {
            Rectangle visible = Rectangle.Intersect(candidate.WorkingArea, savedBounds);
            return visible.Width >= 120 && visible.Height >= 120;
        });

        if (screen is null) return false;

        Rectangle workingArea = screen.WorkingArea;
        int width = Math.Clamp(saved.Width, MinimumSize.Width, workingArea.Width);
        int height = Math.Clamp(saved.Height, MinimumSize.Height, workingArea.Height);
        int x = Math.Clamp(saved.X, workingArea.Left, workingArea.Right - width);
        int y = Math.Clamp(saved.Y, workingArea.Top, workingArea.Bottom - height);

        StartPosition = FormStartPosition.Manual;
        Bounds = new Rectangle(x, y, width, height);
        return true;
    }

    private void ApplyLargeDefaultBounds()
    {
        Rectangle workingArea = Screen.PrimaryScreen?.WorkingArea
            ?? Screen.FromPoint(Cursor.Position).WorkingArea;

        int maximumWidth = Math.Max(MinimumSize.Width, workingArea.Width - 48);
        int maximumHeight = Math.Max(MinimumSize.Height, workingArea.Height - 48);
        int width = Math.Min(maximumWidth, Math.Max(1120, (int)(workingArea.Width * 0.82)));
        int height = Math.Min(maximumHeight, Math.Max(760, (int)(workingArea.Height * 0.88)));
        int x = workingArea.Left + (workingArea.Width - width) / 2;
        int y = workingArea.Top + (workingArea.Height - height) / 2;

        StartPosition = FormStartPosition.Manual;
        Bounds = new Rectangle(x, y, width, height);
    }

    private void OnFormClosing(object? sender, FormClosingEventArgs eventArgs)
    {
        Rectangle boundsToSave = WindowState == FormWindowState.Normal
            ? Bounds
            : RestoreBounds;

        WindowStateStore.Save(
            boundsToSave,
            maximized: WindowState == FormWindowState.Maximized);
    }

    private void ShowStartupError(string message)
    {
        RevealWindow();
        MessageBox.Show(
            this,
            message,
            "LeanMD",
            MessageBoxButtons.OK,
            MessageBoxIcon.Error);
        Close();
    }
}
