import assert from "node:assert/strict";
import test from "node:test";

import {
  layoutExplorationMap,
  routeExplorationMapEdges,
} from "../src/map-layout.js";

const options = {
  minimumWidth: 0,
  minimumHeight: 0,
  paddingX: 0,
  paddingY: 0,
};

function node(id, order) {
  return { id, order };
}

function edge(from, to, order) {
  return Number.isFinite(order) ? { from, to, order } : { from, to };
}

test("uses source-link order instead of discovery order for siblings", () => {
  const nodes = [node("root", 0), node("lower", 1), node("upper", 2)];
  const edges = [edge("root", "lower", 1), edge("root", "upper", 0)];
  const layout = layoutExplorationMap(nodes, edges, "root", options);

  assert.ok(layout.positions.get("upper").y < layout.positions.get("lower").y);
});

test("keeps source order when a link is inserted between revealed siblings", () => {
  const nodes = [
    node("root", 0),
    node("lower", 1),
    node("upper", 2),
    node("middle", 3),
  ];
  const edges = [
    edge("root", "lower", 2),
    edge("root", "upper", 0),
    edge("root", "middle", 1),
  ];
  const layout = layoutExplorationMap(nodes, edges, "root", options);

  assert.ok(layout.positions.get("upper").y < layout.positions.get("middle").y);
  assert.ok(layout.positions.get("middle").y < layout.positions.get("lower").y);
});

test("keeps sibling subtrees in order when a middle branch grows", () => {
  const originalNodes = [
    node("A", 0),
    node("B", 1),
    node("C", 2),
    node("D", 3),
    ...[1, 2, 3, 4].map((index) => node(`B${index}`, 3 + index)),
    ...[1, 2, 3, 4, 5].map((index) => node(`D${index}`, 7 + index)),
  ];
  const originalEdges = [
    edge("A", "B"),
    edge("A", "C"),
    edge("A", "D"),
    ...[1, 2, 3, 4].map((index) => edge("B", `B${index}`)),
    ...[1, 2, 3, 4, 5].map((index) => edge("D", `D${index}`)),
  ];
  const before = layoutExplorationMap(originalNodes, originalEdges, "A", options);
  const expandedNodes = [
    ...originalNodes,
    node("C1", 13),
    node("C2", 14),
    node("C3", 15),
  ];
  const expandedEdges = [
    ...originalEdges,
    edge("C", "C1"),
    edge("C", "C2"),
    edge("C", "C3"),
  ];
  const after = layoutExplorationMap(expandedNodes, expandedEdges, "A", options);

  assert.ok(after.positions.get("B4").y < after.positions.get("C1").y);
  assert.ok(after.positions.get("C3").y < after.positions.get("D1").y);
  assert.ok(after.positions.get("B").y < after.positions.get("C").y);
  assert.ok(after.positions.get("C").y < after.positions.get("D").y);
  assert.equal(after.positions.get("B1").y, before.positions.get("B1").y);
  assert.ok(after.positions.get("D1").y > before.positions.get("D1").y);
  assert.notEqual(after.positions.get("A").y, before.positions.get("A").y);
});

test("assigns ordered, separate ports to child arrows", () => {
  const nodes = [node("A", 0), node("B", 1), node("C", 2), node("D", 3)];
  const edges = [edge("A", "B"), edge("A", "C"), edge("A", "D")];
  const layout = layoutExplorationMap(nodes, edges, "A", options);
  const routes = routeExplorationMapEdges(edges, layout);

  assert.deepEqual(
    routes.map((route) => route.sourceY),
    [...routes.map((route) => route.sourceY)].sort((a, b) => a - b),
  );
  assert.equal(new Set(routes.map((route) => route.sourceY)).size, routes.length);
  assert.deepEqual(
    routes.map((route) => route.targetY),
    [...routes.map((route) => route.targetY)].sort((a, b) => a - b),
  );
});
