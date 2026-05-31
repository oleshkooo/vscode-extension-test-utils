export type RunnerKind = 'vitest' | 'jest'

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

export interface TestRunRequest {
    readonly filePath: string
    readonly testName?: string
}

export interface RunnerSpec {
    readonly kind: RunnerKind
    readonly binary: string
    readonly baseArgs: readonly string[]
    readonly nameFlag: string
}
