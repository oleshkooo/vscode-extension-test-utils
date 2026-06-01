# Extending the extension

A cookbook for the common shapes of changes.

## Add a new domain

Use case: a new cross-cutting concern (a test runner, a parser, a metrics
layer, etc.).

1. `mkdir src/your-domain/`
2. Write the contract:
    ```ts
    // src/your-domain/base-your-thing.ts
    export abstract class YourThing {
        abstract doSomething(): Promise<void>
    }
    ```
3. Write a default impl:

    ```ts
    // src/your-domain/standard-your-thing.ts
    import { singleton } from 'tsyringe'
    import { Logger } from '../logger/base-logger'
    import { YourThing } from './base-your-thing'

    @singleton()
    export class StandardYourThing extends YourThing {
        constructor(private readonly logger: Logger) {
            super()
        }
        async doSomething(): Promise<void> {
            /* ... */
        }
    }
    ```

4. If togglable, write `noop-your-thing.ts` mirroring the contract with empty
   methods.
5. Add the picker:
    ```ts
    // src/your-domain/index.ts
    export function pickYourThing(cfg: ConfigService): ClassConstructor<YourThing> {
        return cfg.yourThing.enabled ? StandardYourThing : NoopYourThing
    }
    ```
6. Register in [`src/main.ts::registerInfrastructure`](../src/main.ts):
    ```ts
    container.register(YourThing as InjectionToken<YourThing>, {
        useToken: pickYourThing(config)
    })
    ```
7. Add a Zod field in [`src/config/schema.ts`](../src/config/schema.ts) and a
   matching entry in `package.json::contributes.configuration`.

That's it. Consumers inject `YourThing` in their constructor — no other file
changes.

## Add a test runner

Use case: support a new runner (e.g. Mocha, Node test runner) alongside Vitest,
Jest and Cypress.

A runner is **data, not a subclass**. The differences between runners (binary,
base args, name-pattern flag, config-file flag) live in `RUNNER_SPECS` in
[`src/runner/helpers/command.ts`](../src/runner/helpers/command.ts). The single
`TerminalTestRunner` builds the command from a spec and runs it.

1. Add a `RunnerKind` to [`src/runner/types.ts`](../src/runner/types.ts).
2. Add its `RunnerSpec` entry to `RUNNER_SPECS`. Set `nameFlag` to `null` if the
   runner can't filter by a single test name (Cypress is file-level only — its
   spec uses `nameFlag: null`, so a passed `testName` is ignored). Set
   `configFileFlag` if the runner takes a `--config-file`-style argument.
3. Teach `selectRunner` in
   [`src/runner/helpers/detect.ts`](../src/runner/helpers/detect.ts) how to
   detect it (which `package.json` dependency implies it, and/or which filename
   pattern — Cypress is matched by the `*.cy.{js,ts}` convention).
   `selectRunner` returns `RunnerKind | null`: `null` means "no known runner
   for this file in this project" and the CodeLens provider hides itself
   accordingly. Do **not** add a silent fallback to vitest/jest — explicit
   setting (`oleshkoTestUtils.runner.runner`) is the user's escape hatch.
4. Add the value to the `oleshkoTestUtils.runner.runner` enum in both
   `package.json` and `TEST_RUNNERS` in
   [`src/constants.ts`](../src/constants.ts). If the runner introduces a new
   file naming convention, extend `TEST_FILE_PATTERN` there too.
5. No consumer changes: the CodeLens command resolves `TestRunner` and calls it.

### Per-run prompts (Cypress environments)

Cypress projects often keep several config files (one per environment). The list
lives in `oleshkoTestUtils.cypress.configs` (a `{ name, configFile }[]` Zod
field). When a `*.cy.{js,ts}` file is run and more than one config is set,
`TerminalTestRunner.resolveCypressConfig` shows a `window.showQuickPick` and
passes the chosen `configFile` to `--config-file`. With zero configs it runs
plain; with one it uses it without prompting. The picker is shown fresh on every
run — no selection is persisted.

### File-level-only runners and the CodeLens shape

When a runner can only target a whole file (like Cypress today), the CodeLens
provider must reflect that — otherwise the per-block lenses all do the same
thing and read as a UX bug. The shape is declared on the spec itself
(`granularity: 'file' | 'block'` in [`RunnerSpec`](../src/runner/types.ts)) —
Vitest and Jest are `'block'`, Cypress is `'file'`. `RunCodeLensProvider`
dispatches off `RUNNER_SPECS[runner].granularity`: `'file'` emits a single
`"$(play) Run file"` lens pinned to line 0 and skips the parse entirely;
`'block'` walks the AST and emits one lens per `describe`/`it`. A new
file-level runner needs only `granularity: 'file'` on its spec — no provider
change, no per-runner predicate exported.

If a runner needs genuinely different _behaviour_ (not just a different
command string), that's when you reach for a second `TestRunner` implementation
and a branch in `pickRunner` — but a flag difference is not that.

## Add a new language provider

Use case: a code action, document symbols, decorations, etc.

1. Write the provider class in `src/providers/`:

    ```ts
    // src/providers/run-code-lens.provider.ts
    import { singleton } from 'tsyringe'
    import type { CodeLensProvider, TextDocument } from 'vscode'

    @singleton()
    export class RunCodeLensProvider implements CodeLensProvider {
        provideCodeLenses(document: TextDocument) {
            /* ... */
        }
    }
    ```

2. Register it in `src/main.ts` against the right document selector
   (`{ language: 'javascript' }`, `{ language: 'typescript' }`, scoped to the
   test-file pattern).

## Add a new picker variant

Use case: a logging-decorated runner, a recording variant of the parser for
tests, etc.

1. Write the alternative concrete class in the same domain folder.
2. Update the picker to branch on whatever config decides:
    ```ts
    export function pickRunner(cfg: ConfigService): ClassConstructor<TestRunner> {
        if (cfg.runner.runner === 'vitest') return VitestRunner
        if (cfg.runner.runner === 'jest') return JestRunner
        return AutoDetectRunner
    }
    ```
3. No other file changes.

## What you should NOT do

- **Don't add a "manager" or "service-registry" class that holds other
  services.** That's what tsyringe is for. Inject what you need. (This is _not_ a ban on value-object classes — see [conventions.md § Value objects](./conventions.md#value-objects).)
- **Don't bypass `Lifecycle.register` to push to `context.subscriptions`
  directly.** Lifecycle is the single point that owns the disposable list.
- **Don't read `vscode.workspace.getConfiguration` outside `loader.ts`.**
  Always go through `ConfigService`.
- **Don't call `console.log` "just for debugging".** Inject `Logger`, write
  at trace level. The log channel is filterable; `console` output is not.
- **Don't write code that says `if (telemetry)`.** Provide a noop variant.
- **Don't centralise types into a top-level `types/` folder.** Types live
  with the code they describe. The one exception is `types/classes.ts` for
  the `ClassConstructor` helper, which is genuinely cross-cutting.
