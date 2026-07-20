using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace LeanMD;

internal readonly record struct ExplorationMapEdge(string From, string To);

internal sealed class LeanMdStructure
{
    private readonly HashSet<string> _documents;
    private readonly HashSet<string> _edgeKeys;
    private readonly Dictionary<string, List<string>> _parents;
    private readonly Dictionary<string, List<string>> _children;

    private LeanMdStructure(
        string metadataDirectory,
        string workspaceRoot,
        string rootPath,
        string fingerprint,
        IReadOnlyList<ExplorationMapEdge> edges,
        HashSet<string> documents,
        HashSet<string> edgeKeys,
        Dictionary<string, List<string>> parents,
        Dictionary<string, List<string>> children)
    {
        MetadataDirectory = metadataDirectory;
        WorkspaceRoot = workspaceRoot;
        RootPath = rootPath;
        Fingerprint = fingerprint;
        Edges = edges;
        _documents = documents;
        _edgeKeys = edgeKeys;
        _parents = parents;
        _children = children;
    }

    public string MetadataDirectory { get; }
    public string WorkspaceRoot { get; }
    public string RootPath { get; }
    public string Fingerprint { get; }
    public IReadOnlyList<ExplorationMapEdge> Edges { get; }

    public static LeanMdStructure? Load(string metadataDirectory)
    {
        try
        {
            metadataDirectory = Path.GetFullPath(metadataDirectory);
            string? workspaceRoot = Directory.GetParent(metadataDirectory)?.FullName;
            if (workspaceRoot is null) return null;

            string dependenciesPath = Path.Combine(metadataDirectory, "dependencies.json");
            string source = File.ReadAllText(dependenciesPath);
            using JsonDocument document = JsonDocument.Parse(source);
            JsonElement root = document.RootElement;
            if (!root.TryGetProperty("root", out JsonElement rootElement) ||
                rootElement.ValueKind != JsonValueKind.String ||
                !root.TryGetProperty("edges", out JsonElement edgesElement) ||
                edgesElement.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            string? rootPath = ResolveDocumentPath(workspaceRoot, rootElement.GetString());
            if (rootPath is null || !File.Exists(rootPath)) return null;

            var documents = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                rootPath,
            };
            var edgeKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var edges = new List<ExplorationMapEdge>();
            var parents = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
            var children = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

            foreach (JsonElement edgeElement in edgesElement.EnumerateArray())
            {
                if (!edgeElement.TryGetProperty("from", out JsonElement fromElement) ||
                    fromElement.ValueKind != JsonValueKind.String ||
                    !edgeElement.TryGetProperty("to", out JsonElement toElement) ||
                    toElement.ValueKind != JsonValueKind.String ||
                    !edgeElement.TryGetProperty("kind", out JsonElement kindElement) ||
                    kindElement.ValueKind != JsonValueKind.String ||
                    !string.Equals(kindElement.GetString(), "why", StringComparison.OrdinalIgnoreCase))
                {
                    return null;
                }

                string? from = ResolveDocumentPath(workspaceRoot, fromElement.GetString());
                string? to = ResolveDocumentPath(workspaceRoot, toElement.GetString());
                if (from is null ||
                    to is null ||
                    !File.Exists(from) ||
                    !File.Exists(to) ||
                    PathsEqual(from, to))
                {
                    return null;
                }

                string key = EdgeKey(from, to);
                if (!edgeKeys.Add(key)) continue;

                documents.Add(from);
                documents.Add(to);
                edges.Add(new ExplorationMapEdge(from, to));
                AddToLookup(children, from, to);
                AddToLookup(parents, to, from);
            }

            var reachable = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                rootPath,
            };
            var pending = new Queue<string>();
            pending.Enqueue(rootPath);
            while (pending.Count > 0)
            {
                string current = pending.Dequeue();
                if (!children.TryGetValue(current, out List<string>? targets)) continue;
                foreach (string target in targets)
                {
                    if (reachable.Add(target)) pending.Enqueue(target);
                }
            }

            if (reachable.Count != documents.Count) return null;

            string fingerprint = Convert.ToHexString(
                SHA256.HashData(Encoding.UTF8.GetBytes(source)));
            return new LeanMdStructure(
                metadataDirectory,
                workspaceRoot,
                rootPath,
                fingerprint,
                edges,
                documents,
                edgeKeys,
                parents,
                children);
        }
        catch
        {
            // Keep the last valid structure while an editor replaces the manifest.
            return null;
        }
    }

    public bool ContainsDocument(string documentPath)
    {
        return _documents.Contains(Path.GetFullPath(documentPath));
    }

    public bool ContainsEdge(ExplorationMapEdge edge)
    {
        return _edgeKeys.Contains(EdgeKey(edge.From, edge.To));
    }

    public IReadOnlyList<string>? FindShortestConnectorPath(
        IEnumerable<string> revealedDocuments,
        string targetPath)
    {
        targetPath = Path.GetFullPath(targetPath);
        if (!_documents.Contains(targetPath)) return null;

        var revealed = new HashSet<string>(
            revealedDocuments.Select(Path.GetFullPath),
            StringComparer.OrdinalIgnoreCase);
        if (revealed.Contains(targetPath)) return [targetPath];

        var pending = new Queue<string>();
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            targetPath,
        };
        var nextTowardTarget = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        pending.Enqueue(targetPath);

        while (pending.Count > 0)
        {
            string current = pending.Dequeue();
            if (revealed.Contains(current))
            {
                var path = new List<string> { current };
                while (nextTowardTarget.TryGetValue(current, out string? next))
                {
                    path.Add(next);
                    current = next;
                }
                return path;
            }

            if (!_parents.TryGetValue(current, out List<string>? parentPaths)) continue;
            foreach (string parent in parentPaths)
            {
                if (!visited.Add(parent)) continue;
                nextTowardTarget.Add(parent, current);
                pending.Enqueue(parent);
            }
        }

        return null;
    }

    internal static string? ResolveDocumentPath(string workspaceRoot, string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath) || Path.IsPathRooted(relativePath))
        {
            return null;
        }

        string fullPath = Path.GetFullPath(Path.Combine(
            workspaceRoot,
            relativePath.Replace('/', Path.DirectorySeparatorChar)));
        return IsDocumentPathWithinWorkspace(workspaceRoot, fullPath) ? fullPath : null;
    }

    internal static string? RelativeDocumentPath(string workspaceRoot, string documentPath)
    {
        string fullPath = Path.GetFullPath(documentPath);
        if (!IsDocumentPathWithinWorkspace(workspaceRoot, fullPath)) return null;
        return Path.GetRelativePath(workspaceRoot, fullPath)
            .Replace(Path.DirectorySeparatorChar, '/');
    }

    internal static bool PathsEqual(string left, string right)
    {
        return Path.GetFullPath(left).Equals(
            Path.GetFullPath(right),
            StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsDocumentPathWithinWorkspace(
        string workspaceRoot,
        string documentPath)
    {
        string extension = Path.GetExtension(documentPath);
        if (!extension.Equals(".md", StringComparison.OrdinalIgnoreCase) &&
            !extension.Equals(".markdown", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        string relativePath = Path.GetRelativePath(workspaceRoot, documentPath);
        return !Path.IsPathRooted(relativePath) &&
            relativePath != ".." &&
            !relativePath.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal) &&
            !relativePath.StartsWith($"..{Path.AltDirectorySeparatorChar}", StringComparison.Ordinal);
    }

    private static string EdgeKey(string from, string to) => $"{from}\0{to}";

    private static void AddToLookup(
        Dictionary<string, List<string>> lookup,
        string key,
        string value)
    {
        if (!lookup.TryGetValue(key, out List<string>? values))
        {
            values = [];
            lookup.Add(key, values);
        }
        values.Add(value);
    }
}
