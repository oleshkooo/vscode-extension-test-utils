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

Use case: support a new runner (e.g. Mocha, Node test runner) alongside Vitest
and Jest.

A runner is **data, not a subclass**. The differences between Vitest and Jest
(binary, base args, name-pattern flag) live in `RUNNER_SPECS` in
[`src/runner/helpers/command.ts`](../src/runner/helpers/command.ts). The single
`TerminalTestRunner` builds the command from a spec and runs it.

1. Add a `RunnerKind` to [`src/runner/types.ts`](../src/runner/types.ts).
2. Add its `RunnerSpec` entry to `RUNNER_SPECS`.
3. Teach `selectRunner` in
   [`src/runner/helpers/detect.ts`](../src/runner/helpers/detect.ts) how to
   detect it (which `package.json` dependency implies it).
4. Add the value to the `oleshkoTestUtils.runner.runner` enum in both
   `package.json` and `TEST_RUNNERS` in
   [`src/constants.ts`](../src/constants.ts).
5. No consumer changes: the CodeLens command resolves `TestRunner` and calls it.

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
  services.** That's what tsyringe is for. Inject what you need.
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
