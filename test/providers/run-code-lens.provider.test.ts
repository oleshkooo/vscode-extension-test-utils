import { EventEmitter, type TextDocument, type Uri } from 'vscode'
import { describe, expect, it } from 'vitest'
import type { ConfigService } from '../../src/config/config.service'
import { COMMAND_RUN_TEST } from '../../src/constants'
import type { Lifecycle } from '../../src/lifecycle/lifecycle'
import { BabelTestParser } from '../../src/parser/babel-parser'
import { RunCodeLensProvider } from '../../src/providers/run-code-lens.provider'
import type { TestRunRequest } from '../../src/runner/types'
import type { WorkspaceContext, WorkspaceDependencies } from '../../src/workspace/base-workspace-deps'

const FILE = '/repo/src/math.test.ts'
const DEFAULT_DEPS = new Set(['vitest'])

const lifecycle = { register: <T>(disposable: T): T => disposable } as unknown as Lifecycle

function makeProvider(
    opts: { enabled?: boolean; runner?: string; dependencies?: ReadonlySet<string> } = {}
): RunCodeLensProvider {
    const { enabled = true, runner = 'auto', dependencies = DEFAULT_DEPS } = opts
    const cfg = { codeLens: { enabled }, runner: { runner } } as unknown as ConfigService
    const workspaceDeps = {
        onDidChange: new EventEmitter<void>().event,
        forFile: async (_uri: Uri): Promise<WorkspaceContext> => ({ root: undefined, dependencies })
    } as unknown as WorkspaceDependencies
    return new RunCodeLensProvider(new BabelTestParser(), cfg, workspaceDeps, lifecycle)
}

function makeDocument(code: string, languageId = 'typescript', fsPath = FILE): TextDocument {
    return { getText: () => code, languageId, uri: { fsPath } } as unknown as TextDocument
}

async function requestOf(provider: RunCodeLensProvider, document: TextDocument): Promise<TestRunRequest[]> {
    const lenses = await provider.provideCodeLenses(document)
    return lenses.map(lens => lens.command?.arguments?.[0] as TestRunRequest)
}

describe('RunCodeLensProvider', () => {
    it('returns no lenses when codeLens is disabled', async () => {
        const lenses = await makeProvider({ enabled: false }).provideCodeLenses(makeDocument(`it('a', () => {})`))
        expect(lenses).toEqual([])
    })

    it('emits one lens per block, wired to the run command', async () => {
        const lenses = await makeProvider().provideCodeLenses(makeDocument(`it('adds', () => {})`))
        expect(lenses).toHaveLength(1)
        expect(lenses[0]?.command?.command).toBe(COMMAND_RUN_TEST)
        expect(lenses[0]?.command?.title).toBe('$(play) Run')
    })

    it('places the lens on the block line', async () => {
        const code = `describe('s', () => {\n  it('t', () => {})\n})`
        const lenses = await makeProvider().provideCodeLenses(makeDocument(code))
        expect(lenses.map(l => l.range.start.line)).toEqual([0, 1])
    })

    it('builds the full test-name path from ancestor describes', async () => {
        const code = `
            describe('math', () => {
                describe('addition', () => {
                    it('adds', () => {})
                })
            })
        `
        expect(await requestOf(makeProvider(), makeDocument(code))).toEqual([
            { filePath: FILE, testName: 'math' },
            { filePath: FILE, testName: 'math addition' },
            { filePath: FILE, testName: 'math addition adds' }
        ])
    })

    it('omits the test name for a dynamic title (runs the whole file)', async () => {
        const requests = await requestOf(makeProvider(), makeDocument('it(name, () => {})'))
        expect(requests).toEqual([{ filePath: FILE, testName: undefined }])
    })

    it('omits the test name for .each blocks', async () => {
        const requests = await requestOf(makeProvider(), makeDocument(`it.each([1, 2])('value %s', () => {})`))
        expect(requests).toEqual([{ filePath: FILE, testName: undefined }])
    })

    it('breaks the path when an ancestor title is dynamic', async () => {
        const code = `
            describe(dynamicName, () => {
                it('still listed', () => {})
            })
        `
        expect(await requestOf(makeProvider(), makeDocument(code))).toEqual([
            { filePath: FILE, testName: undefined },
            { filePath: FILE, testName: undefined }
        ])
    })

    it('renders a single file-level lens for cypress (.cy) files', async () => {
        const code = `
            describe('login', () => {
                it('logs in', () => {})
                it('shows errors', () => {})
            })
        `
        const cyFile = '/repo/cypress/e2e/login.cy.ts'
        const provider = makeProvider({ dependencies: new Set(['cypress']) })
        const lenses = await provider.provideCodeLenses(makeDocument(code, 'typescript', cyFile))
        expect(lenses).toHaveLength(1)
        expect(lenses[0]?.range.start.line).toBe(0)
        expect(lenses[0]?.command?.title).toBe('$(play) Run file')
        expect(lenses[0]?.command?.arguments?.[0]).toEqual({ filePath: cyFile })
    })

    it('hides the lens for a .cy file when cypress is not in dependencies', async () => {
        const cyFile = '/repo/cypress/e2e/login.cy.ts'
        const provider = makeProvider({ dependencies: new Set(['vitest']) })
        const lenses = await provider.provideCodeLenses(makeDocument(`it('a', () => {})`, 'typescript', cyFile))
        expect(lenses).toEqual([])
    })

    it('hides the lens when no known runner is in dependencies', async () => {
        const provider = makeProvider({ dependencies: new Set(['lodash']) })
        const lenses = await provider.provideCodeLenses(makeDocument(`it('a', () => {})`))
        expect(lenses).toEqual([])
    })

    it('still shows lenses when an explicit runner setting bypasses dependency detection', async () => {
        const provider = makeProvider({ runner: 'vitest', dependencies: new Set() })
        const lenses = await provider.provideCodeLenses(makeDocument(`it('a', () => {})`))
        expect(lenses).toHaveLength(1)
    })

    it('treats javascript documents with the javascript parser', async () => {
        const lenses = await makeProvider().provideCodeLenses(
            makeDocument(`it('renders', () => render(<App />))`, 'javascript')
        )
        expect(lenses).toHaveLength(1)
    })
})
