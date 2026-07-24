using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace LeanMD;

internal readonly record struct ExplorationMapEdge(string From, string To, int Order = 0);

internal sealed class LeanMdStructure
{
    private readonly HashSet<string> _documents;
    private readonly Dictionary<string, int> _edgeOrders;
    private readonly Dictionary<string, int> _documentOrders;

    private LeanMdStructure(
        string metadataDirectory,
        string workspaceRoot,
        string rootPath,
        string fingerprint,
        IReadOnlyList<ExplorationMapEdge> edges,
        HashSet<string> documents,
        Dictionary<string, int> edgeOrders,
        Dictionary<string, int> documentOrders)
    {
        MetadataDirectory = metadataDirectory;
        WorkspaceRoot = workspaceRoot;
        RootPath = rootPath;
        Fingerprint = fingerprint;
        Edges = edges;
        _documents = documents;
        _edgeOrders = edgeOrders;
        _documentOrders = documentOrders;
    }

    public string MetadataDirectory { get; }
    public string WorkspaceRoot { get; }
    public string RootPath { get; }
    public string Fingerprint { get; }
    public IReadOnlyCollection<string> Documents => _documents;
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
            var edgeOrders = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var edges = new List<ExplorationMapEdge>();
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

                int order = children.TryGetValue(from, out List<string>? existingTargets)
                    ? existingTargets.Count
                    : 0;
                if (edgeElement.TryGetProperty("order", out JsonElement orderElement))
                {
                    if (orderElement.ValueKind != JsonValueKind.Number ||
                        !orderElement.TryGetInt32(out order) ||
                        order < 0)
                    {
                        return null;
                    }
                }

                documents.Add(from);
                documents.Add(to);
                edgeOrders.Add(key, order);
                edges.Add(new ExplorationMapEdge(from, to, order));
                AddToLookup(children, from, to);
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

            var documentOrders = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var traversal = new Stack<string>();
            traversal.Push(rootPath);
            while (traversal.Count > 0)
            {
                string current = traversal.Pop();
                if (!documentOrders.TryAdd(current, documentOrders.Count) ||
                    !children.TryGetValue(current, out List<string>? targets))
                {
                    continue;
                }

                string[] orderedTargets = targets
                    .OrderBy(target => edgeOrders[EdgeKey(current, target)])
                    .ThenBy(target => target, StringComparer.OrdinalIgnoreCase)
                    .ToArray();
                for (int index = orderedTargets.Length - 1; index >= 0; index--)
                {
                    traversal.Push(orderedTargets[index]);
                }
            }

            string fingerprint = Convert.ToHexString(
                SHA256.HashData(Encoding.UTF8.GetBytes(source)));
            return new LeanMdStructure(
                metadataDirectory,
                workspaceRoot,
                rootPath,
                fingerprint,
                edges,
                documents,
                edgeOrders,
                documentOrders);
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

    public int GetEdgeOrder(string from, string to)
    {
        return _edgeOrders.TryGetValue(EdgeKey(from, to), out int order)
            ? order
            : int.MaxValue;
    }

    public int GetDocumentOrder(string documentPath)
    {
        return _documentOrders.TryGetValue(Path.GetFullPath(documentPath), out int order)
            ? order
            : int.MaxValue;
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
