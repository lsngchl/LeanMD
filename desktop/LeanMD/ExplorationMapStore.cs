using System.Text;
using System.Text.Json;

namespace LeanMD;

internal sealed record ExplorationMapState(
    string RootPath,
    IReadOnlyList<string> Nodes,
    IReadOnlyList<ExplorationMapEdge> Edges,
    IReadOnlyList<string> VisitedNodes,
    string? DependenciesFingerprint);

internal static class ExplorationMapStore
{
    internal const string StateFileName = "exploration-map.json";
    private const int CurrentSchemaVersion = 2;
    private const int MaximumStateFileBytes = 4 * 1024 * 1024;
    private const int MaximumNodeCount = 10_000;
    private const int MaximumEdgeCount = 20_000;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    private sealed class PersistedMapState
    {
        public int SchemaVersion { get; set; }
        public string? DependenciesFingerprint { get; set; }
        public string? Root { get; set; }
        public List<string>? Nodes { get; set; }
        public List<PersistedMapEdge>? Edges { get; set; }
        public List<string>? Visited { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }

    private sealed class PersistedMapEdge
    {
        public string? From { get; set; }
        public string? To { get; set; }
    }

    public static ExplorationMapState? Load(string metadataDirectory)
    {
        try
        {
            string? workspaceRoot = Directory.GetParent(metadataDirectory)?.FullName;
            if (workspaceRoot is null) return null;

            string statePath = Path.Combine(metadataDirectory, StateFileName);
            var stateFile = new FileInfo(statePath);
            if (!stateFile.Exists || stateFile.Length > MaximumStateFileBytes) return null;

            PersistedMapState? persisted = JsonSerializer.Deserialize<PersistedMapState>(
                File.ReadAllText(statePath),
                JsonOptions);
            if (persisted is null ||
                persisted.SchemaVersion is < 1 or > CurrentSchemaVersion ||
                string.IsNullOrWhiteSpace(persisted.Root) ||
                persisted.Nodes is null ||
                persisted.Edges is null ||
                persisted.Nodes.Count is 0 or > MaximumNodeCount ||
                persisted.Edges.Count > MaximumEdgeCount)
            {
                return null;
            }

            string? rootPath = LeanMdStructure.ResolveDocumentPath(
                workspaceRoot,
                persisted.Root);
            if (rootPath is null) return null;

            var nodes = ResolveUniquePaths(workspaceRoot, persisted.Nodes);
            if (nodes is null ||
                !nodes.Contains(rootPath, StringComparer.OrdinalIgnoreCase))
            {
                return null;
            }
            nodes.RemoveAll(path => LeanMdStructure.PathsEqual(path, rootPath));
            nodes.Insert(0, rootPath);

            var nodeSet = new HashSet<string>(nodes, StringComparer.OrdinalIgnoreCase);
            var edges = new List<ExplorationMapEdge>();
            var edgeSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (PersistedMapEdge persistedEdge in persisted.Edges)
            {
                string? from = LeanMdStructure.ResolveDocumentPath(
                    workspaceRoot,
                    persistedEdge.From);
                string? to = LeanMdStructure.ResolveDocumentPath(
                    workspaceRoot,
                    persistedEdge.To);
                if (from is null ||
                    to is null ||
                    LeanMdStructure.PathsEqual(from, to) ||
                    !nodeSet.Contains(from) ||
                    !nodeSet.Contains(to))
                {
                    continue;
                }

                string key = $"{from}\0{to}";
                if (edgeSet.Add(key)) edges.Add(new ExplorationMapEdge(from, to));
            }

            List<string>? visited = persisted.SchemaVersion == 1
                ? [.. nodes]
                : ResolveUniquePaths(workspaceRoot, persisted.Visited ?? []);
            if (visited is null) return null;
            visited.RemoveAll(path => !nodeSet.Contains(path));

            return new ExplorationMapState(
                rootPath,
                nodes,
                edges,
                visited,
                persisted.DependenciesFingerprint);
        }
        catch
        {
            // Persisted exploration state is optional and untrusted.
            return null;
        }
    }

    public static void Save(string metadataDirectory, ExplorationMapState state)
    {
        string? temporaryPath = null;
        try
        {
            string? workspaceRoot = Directory.GetParent(metadataDirectory)?.FullName;
            if (workspaceRoot is null ||
                state.Nodes.Count is 0 or > MaximumNodeCount ||
                state.Edges.Count > MaximumEdgeCount)
            {
                return;
            }

            string? root = LeanMdStructure.RelativeDocumentPath(
                workspaceRoot,
                state.RootPath);
            if (root is null) return;

            List<string>? nodes = RelativeUniquePaths(workspaceRoot, state.Nodes);
            List<string>? visited = RelativeUniquePaths(workspaceRoot, state.VisitedNodes);
            if (nodes is null || visited is null) return;
            var nodeSet = new HashSet<string>(nodes, StringComparer.OrdinalIgnoreCase);
            if (!nodeSet.Contains(root) || visited.Any(path => !nodeSet.Contains(path))) return;

            var edges = new List<PersistedMapEdge>();
            var edgeSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (ExplorationMapEdge edge in state.Edges)
            {
                string? from = LeanMdStructure.RelativeDocumentPath(workspaceRoot, edge.From);
                string? to = LeanMdStructure.RelativeDocumentPath(workspaceRoot, edge.To);
                if (from is null ||
                    to is null ||
                    from.Equals(to, StringComparison.OrdinalIgnoreCase) ||
                    !nodeSet.Contains(from) ||
                    !nodeSet.Contains(to))
                {
                    return;
                }

                string key = $"{from}\0{to}";
                if (!edgeSet.Add(key)) continue;
                edges.Add(new PersistedMapEdge { From = from, To = to });
            }

            var persisted = new PersistedMapState
            {
                SchemaVersion = CurrentSchemaVersion,
                DependenciesFingerprint = state.DependenciesFingerprint,
                Root = root,
                Nodes = nodes,
                Edges = edges,
                Visited = visited,
                UpdatedAt = DateTimeOffset.Now,
            };

            string json = JsonSerializer.Serialize(persisted, JsonOptions) + "\n";
            string statePath = Path.Combine(metadataDirectory, StateFileName);
            temporaryPath = Path.Combine(
                metadataDirectory,
                $".exploration-map.{Guid.NewGuid():N}.tmp");
            File.WriteAllText(temporaryPath, json, new UTF8Encoding(false));
            File.Move(temporaryPath, statePath, overwrite: true);
        }
        catch
        {
            // Map persistence must never prevent document navigation.
        }
        finally
        {
            try
            {
                if (temporaryPath is not null && File.Exists(temporaryPath))
                {
                    File.Delete(temporaryPath);
                }
            }
            catch
            {
                // A later save can replace an abandoned temporary file.
            }
        }
    }

    private static List<string>? ResolveUniquePaths(
        string workspaceRoot,
        IEnumerable<string> paths)
    {
        var resolved = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string path in paths)
        {
            string? fullPath = LeanMdStructure.ResolveDocumentPath(workspaceRoot, path);
            if (fullPath is null || !seen.Add(fullPath)) return null;
            resolved.Add(fullPath);
        }
        return resolved;
    }

    private static List<string>? RelativeUniquePaths(
        string workspaceRoot,
        IEnumerable<string> paths)
    {
        var relative = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string path in paths)
        {
            string? relativePath = LeanMdStructure.RelativeDocumentPath(workspaceRoot, path);
            if (relativePath is null || !seen.Add(relativePath)) return null;
            relative.Add(relativePath);
        }
        return relative;
    }
}
