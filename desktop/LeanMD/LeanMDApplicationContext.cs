namespace LeanMD;

internal sealed class LeanMDApplicationContext : ApplicationContext
{
    private int _openWindowCount;

    public LeanMDApplicationContext(string? markdownPath)
    {
        ShowWindow(markdownPath, recallSource: null);
    }

    private void OpenRecallWindow(string markdownPath, MainForm recallSource)
    {
        ShowWindow(markdownPath, recallSource);
    }

    private void ShowWindow(string? markdownPath, MainForm? recallSource)
    {
        var window = new MainForm(markdownPath, OpenRecallWindow, recallSource);
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
