import type { PackageManager, RunnerKind, RunnerSpec } from '../types'

export interface BuildCommandInput {
    readonly spec: RunnerSpec
    readonly packageManager: PackageManager
    readonly file: string
    readonly testName?: string
    readonly configFile?: string
}

const EXEC_PREFIX: Record<PackageManager, readonly string[]> = {
    npm: ['npx'],
    yarn: ['yarn'],
    pnpm: ['pnpm', 'exec'],
    bun: ['bunx']
}

export const RUNNER_SPECS: Record<RunnerKind, RunnerSpec> = {
    vitest: { kind: 'vitest', binary: 'vitest', baseArgs: ['run'], granularity: 'block', nameFlag: '-t' },
    jest: { kind: 'jest', binary: 'jest', baseArgs: [], granularity: 'block', nameFlag: '-t' },
    cypress: {
        kind: 'cypress',
        binary: 'cypress',
        baseArgs: ['run', '--spec'],
        granularity: 'file',
        nameFlag: null,
        configFileFlag: '--config-file'
    }
}

export function buildRunnerCommand({ spec, packageManager, file, testName, configFile }: BuildCommandInput): string {
    return [
        ...EXEC_PREFIX[packageManager],
        spec.binary,
        ...spec.baseArgs,
        shellQuote(toPosixPath(file)),
        ...flagArg(spec.nameFlag, testName, escapeRegExp),
        ...flagArg(spec.configFileFlag, configFile, toPosixPath)
    ].join(' ')
}

function flagArg(
    flag: string | null | undefined,
    value: string | undefined,
    transform: (v: string) => string
): readonly string[] {
    if (!flag || !value) return []
    return [flag, shellQuote(transform(value))]
}

function toPosixPath(value: string): string {
    return value.replace(/\\/g, '/')
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function shellQuote(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`
}
