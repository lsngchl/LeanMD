const DEFAULT_LAYOUT = Object.freeze({
  nodeWidth: 220,
  nodeHeight: 72,
  horizontalStep: 300,
  verticalStep: 104,
  paddingX: 60,
  paddingY: 48,
  minimumWidth: 960,
  minimumHeight: 620,
});

const DEFAULT_MAXIMUM_UNFOLDED_NODES = 50_000;

function normalizedOptions(options) {
  return { ...DEFAULT_LAYOUT, ...options };
}

function nodeOrder(node, fallback) {
  return Number.isFinite(node.order) ? node.order : fallback;
}

function edgeOrder(edge, fallback) {
  return Number.isFinite(edge?.order) ? edge.order : fallback;
}

export function unfoldExplorationMap(nodes, edges, root, options = {}) {
  const maximumNodeCount =
    Number.isInteger(options.maximumNodeCount) && options.maximumNodeCount > 0
      ? options.maximumNodeCount
      : DEFAULT_MAXIMUM_UNFOLDED_NODES;
  const orderedDocuments = [];
  const documentById = new Map();

  for (const [index, node] of nodes.entries()) {
    if (!node || typeof node.id !== "string" || documentById.has(node.id)) continue;
    const normalized = { ...node, order: nodeOrder(node, index) };
    orderedDocuments.push(normalized);
    documentById.set(normalized.id, normalized);
  }

  orderedDocuments.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  if (orderedDocuments.length === 0) {
    return { nodes: [], edges: [], root: null, truncated: false };
  }

  const outgoing = new Map(orderedDocuments.map((node) => [node.id, []]));
  for (const [index, edge] of edges.entries()) {
    if (!documentById.has(edge?.from) || !documentById.has(edge?.to)) continue;
    outgoing.get(edge.from).push({
      edge,
      order: edgeOrder(edge, index),
      targetOrder: documentById.get(edge.to).order,
    });
  }
  for (const sourceEdges of outgoing.values()) {
    sourceEdges.sort(
      (a, b) =>
        a.order - b.order ||
        a.targetOrder - b.targetOrder ||
        a.edge.to.localeCompare(b.edge.to),
    );
  }

  const unfoldedNodes = [];
  const unfoldedEdges = [];
  const representedDocuments = new Set();
  let unfoldedRoot = null;
  let truncated = false;

  function createOccurrence(documentId) {
    if (unfoldedNodes.length >= maximumNodeCount) {
      truncated = true;
      return null;
    }

    const documentNode = documentById.get(documentId);
    const occurrenceId = `map-occurrence-${unfoldedNodes.length}`;
    unfoldedNodes.push({
      ...documentNode,
      id: occurrenceId,
      documentId,
    });
    representedDocuments.add(documentId);
    return occurrenceId;
  }

  function expandComponent(startDocumentId) {
    const startOccurrenceId = createOccurrence(startDocumentId);
    if (startOccurrenceId === null) return null;

    const stack = [
      {
        documentId: startDocumentId,
        occurrenceId: startOccurrenceId,
        ancestors: new Set([startDocumentId]),
      },
    ];

    while (stack.length > 0 && !truncated) {
      const current = stack.pop();
      const childFrames = [];
      for (const sourceEdge of outgoing.get(current.documentId)) {
        const childDocumentId = sourceEdge.edge.to;
        if (current.ancestors.has(childDocumentId)) continue;

        const childOccurrenceId = createOccurrence(childDocumentId);
        if (childOccurrenceId === null) break;

        unfoldedEdges.push({
          ...sourceEdge.edge,
          from: current.occurrenceId,
          to: childOccurrenceId,
          order: sourceEdge.order,
        });
        const ancestors = new Set(current.ancestors);
        ancestors.add(childDocumentId);
        childFrames.push({
          documentId: childDocumentId,
          occurrenceId: childOccurrenceId,
          ancestors,
        });
      }

      for (let index = childFrames.length - 1; index >= 0; index -= 1) {
        stack.push(childFrames[index]);
      }
    }

    return startOccurrenceId;
  }

  const preferredRoot = documentById.has(root) ? root : orderedDocuments[0].id;
  unfoldedRoot = expandComponent(preferredRoot);
  for (const documentNode of orderedDocuments) {
    if (truncated) break;
    if (!representedDocuments.has(documentNode.id)) {
      expandComponent(documentNode.id);
    }
  }

  return {
    nodes: unfoldedNodes,
    edges: unfoldedEdges,
    root: unfoldedRoot,
    truncated,
  };
}

export function layoutExplorationMap(nodes, edges, root, options = {}) {
  const settings = normalizedOptions(options);
  const orderedNodes = [];
  const nodeById = new Map();

  for (const [index, node] of nodes.entries()) {
    if (!node || typeof node.id !== "string" || nodeById.has(node.id)) continue;
    const normalized = { ...node, order: nodeOrder(node, index) };
    orderedNodes.push(normalized);
    nodeById.set(normalized.id, normalized);
  }

  orderedNodes.sort((a, b) => a.order - b.order);
  if (orderedNodes.length === 0) {
    return {
      positions: new Map(),
      primaryParents: new Map(),
      subtreeRanges: new Map(),
      width: settings.minimumWidth,
      height: settings.minimumHeight,
    };
  }

  const outgoing = new Map(orderedNodes.map((node) => [node.id, []]));
  for (const [index, edge] of edges.entries()) {
    if (!nodeById.has(edge?.from) || !nodeById.has(edge?.to)) continue;
    outgoing.get(edge.from).push({
      id: edge.to,
      order: edgeOrder(edge, index),
    });
  }

  for (const targets of outgoing.values()) {
    targets.sort(
      (a, b) =>
        a.order - b.order ||
        nodeById.get(a.id).order - nodeById.get(b.id).order ||
        a.id.localeCompare(b.id),
    );
  }

  const primaryParents = new Map();
  const primaryChildOrders = new Map();
  const depths = new Map();
  const preferredRoot = nodeById.has(root) ? root : orderedNodes[0].id;

  function discoverComponent(startId) {
    const queue = [startId];
    depths.set(startId, 0);

    for (let index = 0; index < queue.length; index += 1) {
      const sourceId = queue[index];
      const childDepth = depths.get(sourceId) + 1;

      for (const target of outgoing.get(sourceId)) {
        const targetId = target.id;
        if (depths.has(targetId)) continue;
        depths.set(targetId, childDepth);
        primaryParents.set(targetId, sourceId);
        primaryChildOrders.set(targetId, target.order);
        queue.push(targetId);
      }
    }
  }

  discoverComponent(preferredRoot);
  for (const node of orderedNodes) {
    if (!depths.has(node.id)) discoverComponent(node.id);
  }

  const children = new Map(orderedNodes.map((node) => [node.id, []]));
  for (const [childId, parentId] of primaryParents) {
    children.get(parentId).push(childId);
  }
  for (const childIds of children.values()) {
    childIds.sort(
      (a, b) =>
        primaryChildOrders.get(a) - primaryChildOrders.get(b) ||
        nodeById.get(a).order - nodeById.get(b).order ||
        a.localeCompare(b),
    );
  }

  const componentRoots = orderedNodes
    .filter((node) => !primaryParents.has(node.id))
    .sort((a, b) => {
      if (a.id === preferredRoot) return -1;
      if (b.id === preferredRoot) return 1;
      return a.order - b.order;
    });
  const subtreeRanges = new Map();
  let nextLeafRow = 0;

  function placeSubtree(nodeId) {
    const childIds = children.get(nodeId);
    if (childIds.length === 0) {
      const range = { first: nextLeafRow, last: nextLeafRow };
      subtreeRanges.set(nodeId, range);
      nextLeafRow += 1;
      return range;
    }

    const firstChildRange = placeSubtree(childIds[0]);
    let lastChildRange = firstChildRange;
    for (const childId of childIds.slice(1)) {
      lastChildRange = placeSubtree(childId);
    }

    const range = { first: firstChildRange.first, last: lastChildRange.last };
    subtreeRanges.set(nodeId, range);
    return range;
  }

  for (const [index, componentRoot] of componentRoots.entries()) {
    if (index > 0) nextLeafRow += 1;
    placeSubtree(componentRoot.id);
  }

  const contentHeight =
    Math.max(0, nextLeafRow - 1) * settings.verticalStep + settings.nodeHeight;
  const topOffset = Math.max(
    settings.paddingY,
    (settings.minimumHeight - contentHeight) / 2,
  );
  const positions = new Map();
  let maximumDepth = 0;

  for (const node of orderedNodes) {
    const depth = depths.get(node.id);
    const range = subtreeRanges.get(node.id);
    const centerRow = (range.first + range.last) / 2;
    maximumDepth = Math.max(maximumDepth, depth);
    positions.set(node.id, {
      x: settings.paddingX + depth * settings.horizontalStep,
      y: topOffset + centerRow * settings.verticalStep,
      depth,
    });
  }

  return {
    positions,
    primaryParents,
    subtreeRanges,
    width: Math.max(
      settings.minimumWidth,
      settings.paddingX * 2 + maximumDepth * settings.horizontalStep + settings.nodeWidth,
    ),
    height: Math.max(settings.minimumHeight, contentHeight + settings.paddingY * 2),
  };
}

function distributedOffset(index, count, nodeHeight) {
  if (count <= 1) return 0;
  const span = Math.min(nodeHeight - 24, (count - 1) * 12);
  return -span / 2 + (span * index) / (count - 1);
}

export function routeExplorationMapEdges(edges, layout, options = {}) {
  const settings = normalizedOptions(options);
  const validEdges = edges.filter(
    (edge) => layout.positions.has(edge?.from) && layout.positions.has(edge?.to),
  );
  const outgoing = new Map();
  const incoming = new Map();

  for (const edge of validEdges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  }

  for (const sourceEdges of outgoing.values()) {
    sourceEdges.sort((a, b) => {
      const aPosition = layout.positions.get(a.to);
      const bPosition = layout.positions.get(b.to);
      return aPosition.y - bPosition.y || aPosition.x - bPosition.x;
    });
  }
  for (const targetEdges of incoming.values()) {
    targetEdges.sort((a, b) => {
      const aPosition = layout.positions.get(a.from);
      const bPosition = layout.positions.get(b.from);
      return aPosition.y - bPosition.y || aPosition.x - bPosition.x;
    });
  }

  return validEdges.map((edge) => {
    const source = layout.positions.get(edge.from);
    const target = layout.positions.get(edge.to);
    const sourceEdges = outgoing.get(edge.from);
    const targetEdges = incoming.get(edge.to);
    const sourceY =
      source.y +
      settings.nodeHeight / 2 +
      distributedOffset(sourceEdges.indexOf(edge), sourceEdges.length, settings.nodeHeight);
    const targetY =
      target.y +
      settings.nodeHeight / 2 +
      distributedOffset(targetEdges.indexOf(edge), targetEdges.length, settings.nodeHeight);
    const isForward = target.x > source.x;
    const sourceX = isForward ? source.x + settings.nodeWidth : source.x;
    const targetX = isForward ? target.x : target.x + settings.nodeWidth;
    const curve = Math.max(54, Math.abs(targetX - sourceX) * 0.45);
    const firstControlX = isForward ? sourceX + curve : sourceX - curve;
    const secondControlX = isForward ? targetX - curve : targetX + curve;

    return {
      edge,
      sourceY,
      targetY,
      path: `M ${sourceX} ${sourceY} C ${firstControlX} ${sourceY}, ${secondControlX} ${targetY}, ${targetX} ${targetY}`,
    };
  });
}
