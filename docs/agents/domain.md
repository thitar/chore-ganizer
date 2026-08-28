# Domain Docs

Layout: **single-context** — one `CONTEXT.md` at the repo root plus ADRs under
`docs/adr/`. This fits the repo (it is a single package, not a monorepo).

## Consumer rules

- `CONTEXT.md` holds the project's shared language: terms, invariants, and the
  vocabulary skills and code should use. Read it before naming things or writing
  specs.
- ADRs (Architectural Decision Records) live in `docs/adr/` as
  `NNNN-kebab-title.md`. Each records one decision, its context, and trade-offs.
- Skills (`to-spec`, `grill-with-docs`, `domain-modeling`, etc.) read these files
  and may update them in place when a decision or term changes. Don't let them
  drift from the code.
