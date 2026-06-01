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
        expect(selectRunner('cypress', new Set(['vitest']))).toBe('cypress')
    })

    it('detects the runner from dependencies when set to auto', () => {
        expect(selectRunner('auto', new Set(['vitest']))).toBe('vitest')
        expect(selectRunner('auto', new Set(['jest']))).toBe('jest')
    })

    it('prefers vitest when both are present', () => {
        expect(selectRunner('auto', new Set(['vitest', 'jest']))).toBe('vitest')
    })

    it('uses cypress for a .cy file when cypress is a dependency', () => {
        expect(selectRunner('auto', new Set(['cypress', 'vitest']), 'login.cy.ts')).toBe('cypress')
        expect(selectRunner('auto', new Set(['cypress']), 'cypress/e2e/login.cy.js')).toBe('cypress')
    })

    it('returns null for a .cy file when cypress is absent (no silent fallback)', () => {
        expect(selectRunner('auto', new Set(['vitest']), 'login.cy.ts')).toBeNull()
        expect(selectRunner('auto', new Set(), 'login.cy.ts')).toBeNull()
    })

    it('does not use cypress for non-.cy files even when cypress is present', () => {
        expect(selectRunner('auto', new Set(['cypress', 'vitest']), 'math.test.ts')).toBe('vitest')
    })

    it('returns null when no known runner is in dependencies', () => {
        expect(selectRunner('auto', undefined)).toBeNull()
        expect(selectRunner('auto', new Set())).toBeNull()
        expect(selectRunner('auto', new Set(['some-other-dep']), 'math.test.ts')).toBeNull()
    })
})

describe('selectRunner — cypress file detection', () => {
    it('treats *.cy.ts as a cypress candidate', () => {
        expect(selectRunner('auto', new Set(['cypress']), 'login.cy.ts')).toBe('cypress')
    })

    it('treats *.cy.js as a cypress candidate', () => {
        expect(selectRunner('auto', new Set(['cypress']), 'cypress/e2e/login.cy.js')).toBe('cypress')
    })

    it('does not match *.cy.tsx', () => {
        expect(selectRunner('auto', new Set(['cypress', 'vitest']), 'login.cy.tsx')).toBe('vitest')
    })
})
