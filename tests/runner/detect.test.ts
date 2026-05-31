import { describe, expect, it } from 'vitest'
import { selectPackageManager, selectRunner, type LockfilePresence } from '../../src/runner/helpers/detect'

const NONE: LockfilePresence = { npm: false, yarn: false, pnpm: false, bun: false }

describe('selectPackageManager', () => {
    it('defaults to npm when no lockfile is present', () => {
        expect(selectPackageManager(NONE)).toBe('npm')
    })

    it('prefers pnpm over yarn and bun', () => {
        expect(selectPackageManager({ npm: true, yarn: true, pnpm: true, bun: true })).toBe('pnpm')
    })

    it('detects yarn and bun', () => {
        expect(selectPackageManager({ ...NONE, yarn: true })).toBe('yarn')
        expect(selectPackageManager({ ...NONE, bun: true })).toBe('bun')
    })
})

describe('selectRunner', () => {
    it('honours an explicit setting regardless of dependencies', () => {
        expect(selectRunner('jest', new Set(['vitest']))).toBe('jest')
        expect(selectRunner('vitest', new Set(['jest']))).toBe('vitest')
    })

    it('detects the runner from dependencies when set to auto', () => {
        expect(selectRunner('auto', new Set(['vitest']))).toBe('vitest')
        expect(selectRunner('auto', new Set(['jest']))).toBe('jest')
    })

    it('prefers vitest when both are present', () => {
        expect(selectRunner('auto', new Set(['vitest', 'jest']))).toBe('vitest')
    })

    it('falls back to vitest when nothing is detected', () => {
        expect(selectRunner('auto', undefined)).toBe('vitest')
        expect(selectRunner('auto', new Set())).toBe('vitest')
    })
})
