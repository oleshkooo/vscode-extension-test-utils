export type RunnerKind = 'vitest' | 'jest' | 'cypress'

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

export interface TestRunRequest {
    readonly filePath: string
    readonly testName?: string
}

export type RunnerGranularity = 'block' | 'file'

export interface RunnerSpec {
    readonly kind: RunnerKind
    readonly binary: string
    readonly baseArgs: readonly string[]
    readonly granularity: RunnerGranularity
    readonly nameFlag: string | null
    readonly configFileFlag?: string
}
