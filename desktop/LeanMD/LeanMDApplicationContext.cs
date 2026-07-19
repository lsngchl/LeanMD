namespace LeanMD;

internal sealed class LeanMDApplicationContext : ApplicationContext
{
    private int _openWindowCount;

    public LeanMDApplicationContext(string? markdownPath)
    {
        ShowWindow(markdownPath, referenceSource: null);
    }

    private void OpenReferenceWindow(string markdownPath, MainForm referenceSource)
    {
        ShowWindow(markdownPath, referenceSource);
    }

    private void ShowWindow(string? markdownPath, MainForm? referenceSource)
    {
        var window = new MainForm(markdownPath, OpenReferenceWindow, referenceSource);
        _openWindowCount++;
        window.FormClosed += OnWindowClosed;
        window.Show();
    }

    private void OnWindowClosed(object? sender, FormClosedEventArgs eventArgs)
    {
        _openWindowCount--;
        if (_openWindowCount == 0)
        {
            ExitThread();
        }
    }
}
