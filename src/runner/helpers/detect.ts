import type { TestRunnerSetting } from '../../constants'
import type { PackageManager, RunnerKind } from '../types'

export interface LockfilePresence {
    readonly npm: boolean
    readonly yarn: boolean
    readonly pnpm: boolean
    readonly bun: boolean
}

export function selectPackageManager(present: LockfilePresence): PackageManager {
    if (present.pnpm) return 'pnpm'
    if (present.yarn) return 'yarn'
    if (present.bun) return 'bun'
    return 'npm'
}

export function selectRunner(setting: TestRunnerSetting, dependencies: ReadonlySet<string> | undefined): RunnerKind {
    if (setting === 'vitest' || setting === 'jest') return setting
    if (dependencies?.has('vitest')) return 'vitest'
    if (dependencies?.has('jest')) return 'jest'
    return 'vitest'
}
