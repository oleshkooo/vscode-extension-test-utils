import { describe, expect, it } from 'vitest'
import {
    ancestorDirectories,
    selectPackageManager,
    selectRunner,
    type LockfilePresence
} from '../../src/runner/helpers/detect'

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

describe('ancestorDirectories', () => {
    it('lists directories from the file dir up to the boundary, inclusive', () => {
        expect(ancestorDirectories('/repo/packages/app/src', '/repo')).toEqual([
            '/repo/packages/app/src',
            '/repo/packages/app',
            '/repo/packages',
            '/repo'
        ])
    })

    it('returns just the boundary when the file sits at the root', () => {
        expect(ancestorDirectories('/repo', '/repo')).toEqual(['/repo'])
    })

    it('returns nothing when the directory is outside the boundary', () => {
        expect(ancestorDirectories('/elsewhere/src', '/repo')).toEqual([])
    })
})
