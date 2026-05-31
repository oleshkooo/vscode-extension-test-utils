# Oleshko's Test Utils

Handy testing helpers for VS Code.

## What it does

- A **"Run" CodeLens** above every `describe` / `it` / `test` block in your test
  files. Click it to run that single block — no manual `--testNamePattern`
  typing.
- Works on `*.spec.js`, `*.spec.ts`, `*.test.js`, `*.test.ts`.
- Supports **Vitest** and **Jest**, auto-detected from the workspace.

Click a "Run" lens and the matching test runs in the integrated terminal,
scoped with the runner's `-t` name pattern.

## Requirements

- VS Code ^1.96
- Node 22+ (only needed to build the extension; not at runtime)

## Configuration

All settings are optional.

| Setting                              | Default | Description                                                               |
| ------------------------------------ | ------- | ------------------------------------------------------------------------- |
| `oleshkoTestUtils.logLevel`          | `info`  | Output channel log level.                                                 |
| `oleshkoTestUtils.runner.runner`     | `auto`  | Test runner: `auto`, `vitest`, or `jest`.                                 |
| `oleshkoTestUtils.runner.autoReveal` | `true`  | Reveal the integrated terminal when a test runs.                          |
| `oleshkoTestUtils.codeLens.enabled`  | `true`  | Show the "Run" CodeLens in test files.                                    |
| `oleshkoTestUtils.telemetry.enabled` | `true`  | Anonymous usage telemetry. Respects the global VS Code telemetry setting. |

## Development

```sh
npm install
npm run build           # bundle to dist/extension.js
npm run dev             # watch build + tsc --watch
npm run package         # produce a .vsix
```

Launch via `Run Extension` in the Debug view (VS Code opens a new
Extension Development Host).
