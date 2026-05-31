# Oleshko's Test Utils

VSCode extension providing handy testing helpers. The flagship feature is a
**"Run" CodeLens** rendered above each `describe` / `it` / `test` block in test
files, letting you run a single block on click. Targets `*.spec.{js,ts}` and
`*.test.{js,ts}`. Supports **Vitest** and **Jest**.

## TL;DR

- **Stack**: Node 22 · TypeScript 6 (`--noEmit`) · ESM · tsdown (Rolldown +
  oxc) · tsyringe · Zod · pino.
- **DI**: every dependency is an abstract base class. Concrete impls register
  via picker functions in each domain's `index.ts`. All `container.register`
  calls live in [src/main.ts](src/main.ts).
- **File layout**: domain-sliced, not layer-sliced. `base-*.ts` + concrete
  impls + `index.ts` (picker) per domain.
- **Test discovery**: parse the active document for `describe`/`it`/`test`
  calls; no whole-workspace scan. The CodeLens provider works per open file.
- **Runner**: build the runner command (Vitest / Jest) and run it in the VS
  Code integrated terminal, scoped to the chosen test by name + file path.

## Documentation index

Detailed docs live under [`docs/`](./docs/). Read them in order if you are new
to the project.

| Document                                       | Read this if you want to…                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [docs/architecture.md](./docs/architecture.md) | Understand domain layout, data flow, how the CodeLens provider feeds the runner.                  |
| [docs/build.md](./docs/build.md)               | Build, watch, debug, or change the toolchain (why tsdown, why ESM, decorator metadata, bundling). |
| [docs/conventions.md](./docs/conventions.md)   | Follow the code style — file naming, DI rules, logging discipline, comment policy.                |
| [docs/extending.md](./docs/extending.md)       | Add a new domain, a new provider, or a new picker variant without breaking the architecture.      |

## Hard rules (no exceptions)

1. **Files are kebab-case.** Classes are PascalCase. File = class.
2. **Never log via `console.*`** — always through the injected `Logger`.
3. **No comments by default.** Add one only when _why_ is non-obvious.
4. **DI registration is centralised in `src/main.ts`.** Don't sprinkle
   `container.register` across modules.
5. **Every togglable dependency has a noop variant.** Callers never write
   `if (telemetry)` — they call the method.
6. **Config is the Zod schema** in [src/config/schema.ts](./src/config/schema.ts).
   Workspace settings flow through `loadConfig` → `ConfigService`. Adding a
   field updates both Zod and `package.json::contributes.configuration`.
7. **Diagrams in docs are mermaid**, not ASCII. GitHub renders them inline.
   No `pre`-formatted boxes, no images for things mermaid can express.
8. **In-file ordering is fixed.** Lay out every file top-to-bottom in this
   order (omit sections that don't apply):
    - **Source files**: types/interfaces → constants/variables → classes →
      functions.
    - **Test files**: types/interfaces → constants/variables → classes (test
      doubles, fixtures) → setup functions (helpers, factories) → test cases
      (`describe`/`it`).
