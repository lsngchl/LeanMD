namespace LeanMD;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();

        string? markdownPath = args.FirstOrDefault(argument =>
            !string.IsNullOrWhiteSpace(argument) && !argument.StartsWith("--", StringComparison.Ordinal));

        if (markdownPath is not null)
        {
            try
            {
                markdownPath = Path.GetFullPath(markdownPath.Trim('"'));
            }
            catch
            {
                markdownPath = null;
            }
        }

        Application.Run(new MainForm(markdownPath));
    }
}
