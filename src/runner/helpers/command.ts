import type { PackageManager, RunnerKind, RunnerSpec } from '../types'

export interface BuildCommandInput {
    readonly spec: RunnerSpec
    readonly packageManager: PackageManager
    readonly file: string
    readonly testName?: string
}

const EXEC_PREFIX: Record<PackageManager, readonly string[]> = {
    npm: ['npx'],
    yarn: ['yarn'],
    pnpm: ['pnpm', 'exec'],
    bun: ['bunx']
}

export const RUNNER_SPECS: Record<RunnerKind, RunnerSpec> = {
    vitest: { kind: 'vitest', binary: 'vitest', baseArgs: ['run'], nameFlag: '-t' },
    jest: { kind: 'jest', binary: 'jest', baseArgs: [], nameFlag: '-t' }
}

export function buildRunnerCommand({ spec, packageManager, file, testName }: BuildCommandInput): string {
    const parts = [...EXEC_PREFIX[packageManager], spec.binary, ...spec.baseArgs, shellQuote(file)]
    if (testName !== undefined && testName.length > 0) {
        parts.push(spec.nameFlag, shellQuote(escapeRegExp(testName)))
    }
    return parts.join(' ')
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function shellQuote(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`
}
