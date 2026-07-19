# Tree Layout Stress Test

This sample set contains a strict parent-to-child tree. It intentionally has no
cycles, return links, or cross-links.

## Main branches

1. [Branch B](./b/b.md)
2. [Branch C](./c/c.md)
3. [Branch D](./d/d.md)

## Suggested exploration order

Explore Branch B and its descendants first, return here with **Backspace**, and
then explore Branch D. Explore Branch C last. As the middle branch grows, its
new descendants should remain between the B and D subtrees, while the D subtree
and the necessary ancestor nodes move to make room.
