using System.Diagnostics;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace LeanMD;

internal sealed class MainForm : Form
{
    private const string ViewerHostName = "leanmd.local";
    private string? _markdownPath;
    private readonly WebView2 _webView;
    private Task<string>? _initialMarkdownReadTask;
    private bool _initialContentSent;
    private bool _windowRevealed;

    public MainForm(string? markdownPath)
    {
        _markdownPath = markdownPath;
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
            ? null
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
        bool showEmptyStateOnFailure = false)
    {
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
            _markdownPath = markdownPath;
            _initialMarkdownReadTask = null;
            PostViewerMessage(new
            {
                type = "open-markdown",
                source,
                name = Path.GetFileName(markdownPath),
            });
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
