import type { TextDocument } from 'vscode'
import { describe, expect, it } from 'vitest'
import type { ConfigService } from '../../src/config/config.service'
import { COMMAND_RUN_TEST } from '../../src/constants'
import type { Lifecycle } from '../../src/lifecycle/lifecycle'
import { BabelTestParser } from '../../src/parser/babel-parser'
import { RunCodeLensProvider } from '../../src/providers/run-code-lens.provider'
import type { TestRunRequest } from '../../src/runner/types'

const FILE = '/repo/src/math.test.ts'

const lifecycle = { register: <T>(disposable: T): T => disposable } as unknown as Lifecycle

function makeProvider(enabled = true): RunCodeLensProvider {
    const cfg = { codeLens: { enabled } } as unknown as ConfigService
    return new RunCodeLensProvider(new BabelTestParser(), cfg, lifecycle)
}

function makeDocument(code: string, languageId = 'typescript'): TextDocument {
    return { getText: () => code, languageId, uri: { fsPath: FILE } } as unknown as TextDocument
}

function requestOf(provider: RunCodeLensProvider, document: TextDocument): TestRunRequest[] {
    return provider.provideCodeLenses(document).map(lens => lens.command?.arguments?.[0] as TestRunRequest)
}

describe('RunCodeLensProvider', () => {
    it('returns no lenses when codeLens is disabled', () => {
        const lenses = makeProvider(false).provideCodeLenses(makeDocument(`it('a', () => {})`))
        expect(lenses).toEqual([])
    })

    it('emits one lens per block, wired to the run command', () => {
        const lenses = makeProvider().provideCodeLenses(makeDocument(`it('adds', () => {})`))
        expect(lenses).toHaveLength(1)
        expect(lenses[0]?.command?.command).toBe(COMMAND_RUN_TEST)
        expect(lenses[0]?.command?.title).toBe('$(play) Run')
    })

    it('places the lens on the block line', () => {
        const code = `describe('s', () => {\n  it('t', () => {})\n})`
        const lenses = makeProvider().provideCodeLenses(makeDocument(code))
        expect(lenses.map(l => l.range.start.line)).toEqual([0, 1])
    })

    it('builds the full test-name path from ancestor describes', () => {
        const code = `
            describe('math', () => {
                describe('addition', () => {
                    it('adds', () => {})
                })
            })
        `
        expect(requestOf(makeProvider(), makeDocument(code))).toEqual([
            { filePath: FILE, testName: 'math' },
            { filePath: FILE, testName: 'math addition' },
            { filePath: FILE, testName: 'math addition adds' }
        ])
    })

    it('omits the test name for a dynamic title (runs the whole file)', () => {
        const requests = requestOf(makeProvider(), makeDocument('it(name, () => {})'))
        expect(requests).toEqual([{ filePath: FILE, testName: undefined }])
    })

    it('omits the test name for .each blocks', () => {
        const requests = requestOf(makeProvider(), makeDocument(`it.each([1, 2])('value %s', () => {})`))
        expect(requests).toEqual([{ filePath: FILE, testName: undefined }])
    })

    it('breaks the path when an ancestor title is dynamic', () => {
        const code = `
            describe(dynamicName, () => {
                it('still listed', () => {})
            })
        `
        expect(requestOf(makeProvider(), makeDocument(code))).toEqual([
            { filePath: FILE, testName: undefined },
            { filePath: FILE, testName: undefined }
        ])
    })

    it('treats javascript documents with the javascript parser', () => {
        const lenses = makeProvider().provideCodeLenses(
            makeDocument(`it('renders', () => render(<App />))`, 'javascript')
        )
        expect(lenses).toHaveLength(1)
    })
})
