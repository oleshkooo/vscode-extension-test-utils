import { describe, expect, it } from 'vitest'
import { buildRunnerCommand, RUNNER_SPECS } from '../../src/runner/helpers/command'
import type { PackageManager } from '../../src/runner/types'

describe('buildRunnerCommand', () => {
    it('builds a vitest command with run subcommand and a name pattern', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.vitest,
            packageManager: 'npm',
            file: 'src/math.test.ts',
            testName: 'math adds'
        })
        expect(command).toBe("npx vitest run 'src/math.test.ts' -t 'math adds'")
    })

    it('builds a jest command without a run subcommand', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.jest,
            packageManager: 'npm',
            file: 'src/math.test.ts',
            testName: 'math adds'
        })
        expect(command).toBe("npx jest 'src/math.test.ts' -t 'math adds'")
    })

    it('builds a cypress command scoped to the file with --spec', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.cypress,
            packageManager: 'npm',
            file: 'cypress/e2e/login.cy.ts'
        })
        expect(command).toBe("npx cypress run --spec 'cypress/e2e/login.cy.ts'")
    })

    it('ignores the test name for cypress (file-level run only)', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.cypress,
            packageManager: 'npm',
            file: 'cypress/e2e/login.cy.ts',
            testName: 'logs in'
        })
        expect(command).toBe("npx cypress run --spec 'cypress/e2e/login.cy.ts'")
    })

    it('appends the cypress config file when given', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.cypress,
            packageManager: 'npm',
            file: 'cypress/e2e/login.cy.ts',
            configFile: 'cypress.staging.config.ts'
        })
        expect(command).toBe(
            "npx cypress run --spec 'cypress/e2e/login.cy.ts' --config-file 'cypress.staging.config.ts'"
        )
    })

    it('ignores a config file for runners without a config-file flag', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.vitest,
            packageManager: 'npm',
            file: 'a.test.ts',
            configFile: 'cypress.staging.config.ts'
        })
        expect(command).toBe("npx vitest run 'a.test.ts'")
    })

    it('omits the name flag when no test name is given', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.vitest,
            packageManager: 'npm',
            file: 'src/math.test.ts'
        })
        expect(command).toBe("npx vitest run 'src/math.test.ts'")
    })

    it('uses the package-manager exec prefix', () => {
        const cases: Record<PackageManager, string> = {
            npm: 'npx jest',
            yarn: 'yarn jest',
            pnpm: 'pnpm exec jest',
            bun: 'bunx jest'
        }
        for (const [pm, prefix] of Object.entries(cases)) {
            const command = buildRunnerCommand({
                spec: RUNNER_SPECS.jest,
                packageManager: pm as PackageManager,
                file: 'a.test.ts'
            })
            expect(command).toBe(`${prefix} 'a.test.ts'`)
        }
    })

    it('escapes regex metacharacters in the test name', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.vitest,
            packageManager: 'npm',
            file: 'a.test.ts',
            testName: 'adds 1 + 1 (fast)'
        })
        expect(command).toBe("npx vitest run 'a.test.ts' -t 'adds 1 \\+ 1 \\(fast\\)'")
    })

    it('normalizes windows path separators to posix', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.vitest,
            packageManager: 'npm',
            file: 'test\\parser\\babel-parser.test.ts'
        })
        expect(command).toBe("npx vitest run 'test/parser/babel-parser.test.ts'")
    })

    it('escapes single quotes for the shell', () => {
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS.vitest,
            packageManager: 'npm',
            file: "it's a test.test.ts"
        })
        expect(command).toBe("npx vitest run 'it'\\''s a test.test.ts'")
    })
})
