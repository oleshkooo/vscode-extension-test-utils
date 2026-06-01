import type { TestRunnerSetting } from '../../constants'
import type { PackageManager, RunnerKind } from '../types'

export interface LockfilePresence {
    readonly npm: boolean
    readonly yarn: boolean
    readonly pnpm: boolean
    readonly bun: boolean
}

const CYPRESS_FILE = /\.cy\.[jt]s$/

function isCypressFile(fileName: string): boolean {
    return CYPRESS_FILE.test(fileName)
}

export function selectPackageManager(present: LockfilePresence): PackageManager {
    if (present.pnpm) return 'pnpm'
    if (present.yarn) return 'yarn'
    if (present.bun) return 'bun'
    return 'npm'
}

export function selectRunner(
    setting: TestRunnerSetting,
    dependencies: ReadonlySet<string> | undefined,
    fileName?: string
): RunnerKind | null {
    if (setting !== 'auto') return setting
    if (fileName !== undefined && isCypressFile(fileName)) {
        return dependencies?.has('cypress') ? 'cypress' : null
    }
    if (dependencies?.has('vitest')) return 'vitest'
    if (dependencies?.has('jest')) return 'jest'
    return null
}
