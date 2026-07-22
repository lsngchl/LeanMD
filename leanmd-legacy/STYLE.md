# LeanMD Writing Style

## 1. One node answers one question

Each node should immediately answer the question that led the reader to open it.

- A parent node states **what holds**.
- A `why` child explains **why it holds**.
- A concept node explains **what the concept means**.
- A source node gives **the exact cited statement and its source**.

Do not mix unrelated purposes in one node.

## 2. Do not hide the core argument behind child nodes

Keep short, direct calculations and connections essential to understanding the overall argument in the current node.

Move material to a child node only when it is an independently meaningful nontrivial fact, a long technical proof, a concept worth explaining separately, or a result imported from an external source.

The depth of the document tree should reflect the reader's natural questions, not merely the formal complexity of the proof.

## 3. Use only the necessary level of generality

A statement should not depend on notation accidental to one application, but it should not import generality that the argument does not use.

State results at the minimum useful level of generality. When applying a general result, explicitly identify the parameters, objects, and hypotheses in the current setting.

## 4. State exact facts instead of vague abstractions

Make clear what the objects are, where a claim holds, which hypotheses are used, and what the conclusion is. Prefer direct formulas and specific names over phrases that require the reader to reconstruct the referent.

Use expressions such as `this condition`, `the source`, or `the relevant theorem` only when their referents are immediate and unambiguous.

## 5. Separate statement, proof, and interpretation

- A statement contains only what is asserted.
- A proof explains why the assertion holds.
- Interpretation and intuition belong in a `Remark`.
- The application of a general result may be placed in a separate application section when the correspondence is not immediate.

Place definitions and hypotheses where they are needed to understand the statement, but do not mix explanatory or proof material into the statement itself.

## 6. Introduce notation and names only when they are useful

Introduce a symbol or name only when it will actually be reused.

- Do not create abbreviations used only once.
- Remove unused notation.
- Prefer established terminology when it exists.
- Do not present a project-local theorem name as standard terminology.
- Do not assign multiple roles to the same symbol.

Notation should reduce what the reader must process, not add another layer to decode.

## 7. Use links to express logical dependence

A `why` link is not merely a related-document link; it identifies the justification for the current claim.

- The linked phrase and the child node's statement should correspond directly.
- The reader should find the expected answer near the beginning of the child node.
- Keep the exact statement and citation of an external result in a source node.
- Do not duplicate the same source or justification through multiple link styles.

## Summary

Each node should have one clear role, state exact facts at the minimum useful level of generality, and delegate only meaningful supporting details through precise `why` links.
