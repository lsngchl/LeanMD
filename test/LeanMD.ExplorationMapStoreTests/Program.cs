using System.Text.Json;
using LeanMD;

string testRoot = Path.Combine(
    Path.GetTempPath(),
    $"LeanMD-exploration-map-tests-{Guid.NewGuid():N}");

try
{
    string workspace = Path.Combine(testRoot, "workspace");
    string metadata = Path.Combine(workspace, ".leanmd");
    string rootDocument = WriteDocument(workspace, "root.md");
    string branchA = WriteDocument(workspace, "a/a.md");
    string branchB = WriteDocument(workspace, "b/b.md");
    string intermediate = WriteDocument(workspace, "a/x/x.md");
    string deepTarget = WriteDocument(workspace, "a/x/target.md");
    Directory.CreateDirectory(metadata);

    string unresolvedSidecar = UnresolvedStateStore.SidecarPath(branchA);
    Assert(unresolvedSidecar == Path.ChangeExtension(branchA, ".unresolved"),
        "The unresolved marker should replace the Markdown extension.");
    Assert(!UnresolvedStateStore.IsUnresolved(branchA),
        "A document without a marker should start resolved.");
    UnresolvedStateStore.SetUnresolved(branchA, unresolved: true);
    Assert(UnresolvedStateStore.IsUnresolved(branchA) && File.Exists(unresolvedSidecar),
        "Setting unresolved should create the adjacent marker.");
    Assert(File.ReadAllText(unresolvedSidecar) == "status: unresolved\n",
        "New markers should use the documented readable contents.");
    UnresolvedStateStore.SetUnresolved(branchA, unresolved: true);
    Assert(UnresolvedStateStore.IsUnresolved(branchA),
        "Setting an existing unresolved marker should be idempotent.");
    UnresolvedStateStore.SetUnresolved(branchA, unresolved: false);
    Assert(!File.Exists(unresolvedSidecar),
        "Clearing unresolved should remove the marker.");

    using (JsonDocument positionMessage = JsonDocument.Parse(
        """{"position":{"sourceLine":17,"offset":-12.5,"scrollY":640.25}}"""))
    {
        Assert(DocumentPosition.TryRead(
                positionMessage.RootElement,
                "position",
                out DocumentPosition position) &&
            position.SourceLine == 17 &&
            position.Offset == -12.5 &&
            position.ScrollY == 640.25,
            "Navigation positions should preserve their source anchor and pixel fallback.");
    }
    using (JsonDocument invalidPositionMessage = JsonDocument.Parse(
        """{"position":{"sourceLine":0,"offset":0,"scrollY":-1}}"""))
    {
        Assert(!DocumentPosition.TryRead(
                invalidPositionMessage.RootElement,
                "position",
                out _),
            "Invalid navigation positions should be rejected.");
    }

    WriteDependencies(
        metadata,
        "root.md",
        ("root.md", "a/a.md"),
        ("root.md", "b/b.md"),
        ("a/a.md", "a/x/x.md"),
        ("a/x/x.md", "a/x/target.md"));

    LeanMdStructure? structure = LeanMdStructure.Load(metadata);
    Assert(structure is not null, "A valid dependencies manifest should load.");
    Assert(PathsMatch(
            structure!.FindShortestConnectorPath([rootDocument, branchA], branchB),
            rootDocument,
            branchB),
        "Opening sibling B after A should add root -> B, never A -> B.");
    Assert(PathsMatch(
            structure.FindShortestConnectorPath(
                [rootDocument, branchA, branchB],
                deepTarget),
            branchA,
            intermediate,
            deepTarget),
        "A deep target should reveal the shortest route from its nearest revealed ancestor.");
    Assert(structure.GetEdgeOrder(rootDocument, branchA) == 0 &&
        structure.GetEdgeOrder(rootDocument, branchB) == 1,
        "Structure edges should retain their source-link order.");

    WriteDependencies(
        metadata,
        "root.md",
        ("root.md", "b/b.md"),
        ("root.md", "a/a.md"),
        ("a/a.md", "a/x/x.md"),
        ("a/x/x.md", "a/x/target.md"));
    LeanMdStructure? reorderedStructure = LeanMdStructure.Load(metadata);
    Assert(reorderedStructure is not null &&
        reorderedStructure.GetEdgeOrder(rootDocument, branchB) == 0 &&
        reorderedStructure.GetEdgeOrder(rootDocument, branchA) == 1 &&
        reorderedStructure.GetDocumentOrder(branchB) <
            reorderedStructure.GetDocumentOrder(branchA),
        "Reordering source links should deterministically reorder map branches.");
    WriteDependencies(
        metadata,
        "root.md",
        ("root.md", "a/a.md"),
        ("root.md", "b/b.md"),
        ("a/a.md", "a/x/x.md"),
        ("a/x/x.md", "a/x/target.md"));

    var mapState = new ExplorationMapState(
        rootDocument,
        [rootDocument, branchA, branchB, intermediate, deepTarget],
        [
            new ExplorationMapEdge(rootDocument, branchA),
            new ExplorationMapEdge(rootDocument, branchB),
            new ExplorationMapEdge(branchA, intermediate),
            new ExplorationMapEdge(intermediate, deepTarget),
        ],
        [branchA, branchB, deepTarget],
        structure.Fingerprint);
    ExplorationMapStore.Save(metadata, mapState);

    string statePath = Path.Combine(metadata, ExplorationMapStore.StateFileName);
    Assert(File.Exists(statePath), "Save should create exploration-map.json.");
    string json = File.ReadAllText(statePath);
    Assert(!json.Contains(workspace, StringComparison.OrdinalIgnoreCase),
        "Persisted paths must be relative to the document set.");
    Assert(json.Contains("\"schemaVersion\": 2", StringComparison.Ordinal),
        "The current state schema should be version 2.");

    ExplorationMapState? loaded = ExplorationMapStore.Load(metadata);
    Assert(loaded is not null, "The document set should restore the saved map.");
    Assert(loaded!.Nodes.Count == 5 && loaded.Edges.Count == 4,
        "The restored map should preserve its partial structural projection.");
    Assert(loaded.VisitedNodes.Count == 3 &&
        loaded.VisitedNodes.Any(path => PathsEqual(path, branchB)) &&
        !loaded.VisitedNodes.Any(path => PathsEqual(path, intermediate)),
        "Visited and inferred nodes must remain distinguishable after restore.");
    Assert(loaded.DependenciesFingerprint == structure.Fingerprint,
        "The manifest fingerprint should be persisted with the projection.");

    string relocatedWorkspace = Path.Combine(testRoot, "relocated-workspace");
    Directory.Move(workspace, relocatedWorkspace);
    string relocatedMetadata = Path.Combine(relocatedWorkspace, ".leanmd");
    loaded = ExplorationMapStore.Load(relocatedMetadata);
    Assert(loaded is not null &&
        PathsEqual(loaded.RootPath, Path.Combine(relocatedWorkspace, "root.md")),
        "Relative state should survive moving the document set.");

    string inserted = WriteDocument(relocatedWorkspace, "inserted/inserted.md");
    WriteDependencies(
        relocatedMetadata,
        "root.md",
        ("root.md", "a/a.md"),
        ("a/a.md", "inserted/inserted.md"),
        ("inserted/inserted.md", "b/b.md"),
        ("a/a.md", "a/x/x.md"),
        ("a/x/x.md", "a/x/target.md"));
    LeanMdStructure? changedStructure = LeanMdStructure.Load(relocatedMetadata);
    Assert(changedStructure is not null &&
        changedStructure.Fingerprint != structure.Fingerprint,
        "Changing dependencies should produce a new structure fingerprint.");
    Assert(PathsMatch(
            changedStructure!.FindShortestConnectorPath(
                [
                    Path.Combine(relocatedWorkspace, "root.md"),
                    Path.Combine(relocatedWorkspace, "a", "a.md"),
                ],
                Path.Combine(relocatedWorkspace, "b", "b.md")),
            Path.Combine(relocatedWorkspace, "a", "a.md"),
            inserted,
            Path.Combine(relocatedWorkspace, "b", "b.md")),
        "An inserted dependency should be exposed as a new inferred intermediate node.");

    File.WriteAllText(statePath = Path.Combine(
        relocatedMetadata,
        ExplorationMapStore.StateFileName), "{ invalid");
    Assert(ExplorationMapStore.Load(relocatedMetadata) is null,
        "Malformed state should fall back to a new projection.");

    string outsideDocument = WriteDocument(testRoot, "outside.md");
    File.WriteAllText(
        statePath,
        JsonSerializer.Serialize(new
        {
            schemaVersion = 2,
            root = "../../outside.md",
            nodes = new[] { "../../outside.md" },
            edges = Array.Empty<object>(),
            visited = Array.Empty<string>(),
            updatedAt = DateTimeOffset.Now,
        }));
    Assert(File.Exists(outsideDocument) &&
        ExplorationMapStore.Load(relocatedMetadata) is null,
        "Persisted paths must not escape the document set.");

    Console.WriteLine("LeanMD structure, exploration-map, and unresolved-state tests passed.");
}
finally
{
    if (Directory.Exists(testRoot)) Directory.Delete(testRoot, recursive: true);
}

static void WriteDependencies(
    string metadataDirectory,
    string root,
    params (string From, string To)[] edges)
{
    Directory.CreateDirectory(metadataDirectory);
    var nextOrderBySource = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    object[] orderedEdges = edges.Select(edge =>
    {
        int order = nextOrderBySource.GetValueOrDefault(edge.From);
        nextOrderBySource[edge.From] = order + 1;
        return (object)new
        {
            from = edge.From,
            to = edge.To,
            kind = "why",
            order,
        };
    }).ToArray();
    File.WriteAllText(
        Path.Combine(metadataDirectory, "dependencies.json"),
        JsonSerializer.Serialize(new
        {
            root,
            edges = orderedEdges,
        }, new JsonSerializerOptions { WriteIndented = true }));
}

static string WriteDocument(string root, string relativePath)
{
    string path = Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar));
    Directory.CreateDirectory(Path.GetDirectoryName(path)!);
    File.WriteAllText(path, $"# {Path.GetFileNameWithoutExtension(path)}\n");
    return path;
}

static bool PathsMatch(IReadOnlyList<string>? actual, params string[] expected)
{
    return actual is not null &&
        actual.Count == expected.Length &&
        actual.Zip(expected).All(pair => PathsEqual(pair.First, pair.Second));
}

static bool PathsEqual(string left, string right)
{
    return Path.GetFullPath(left).Equals(
        Path.GetFullPath(right),
        StringComparison.OrdinalIgnoreCase);
}

static void Assert(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}
