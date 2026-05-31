import { describe, expect, it } from 'vitest'
import { BabelTestParser } from '../../src/parser/babel-parser'
import type { TestBlock, TestFileLanguage } from '../../src/parser/types'

const parser = new BabelTestParser()

function parse(code: string, language: TestFileLanguage = 'typescript'): TestBlock[] {
    return parser.parse(code, language)
}

function flatten(blocks: readonly TestBlock[]): TestBlock[] {
    return blocks.flatMap(block => [block, ...flatten(block.children)])
}

describe('BabelTestParser', () => {
    it('returns an empty list for a file without tests', () => {
        expect(parse('export const sum = (a: number, b: number) => a + b')).toEqual([])
    })

    it('parses a single top-level test', () => {
        const [block, ...rest] = parse(`it('adds numbers', () => { expect(1).toBe(1) })`)
        expect(rest).toHaveLength(0)
        expect(block).toMatchObject({
            kind: 'test',
            callee: 'it',
            title: 'adds numbers',
            dynamic: false,
            modifiers: [],
            line: 0,
            children: []
        })
    })

    it('treats test() and it() the same way', () => {
        const blocks = parse(`test('works', () => {})`)
        expect(blocks[0]).toMatchObject({ kind: 'test', callee: 'test', title: 'works' })
    })

    it('nests tests inside a describe block', () => {
        const code = `
            describe('math', () => {
                it('adds', () => {})
                it('subtracts', () => {})
            })
        `
        const [suite] = parse(code)
        expect(suite).toMatchObject({ kind: 'describe', title: 'math' })
        expect(suite?.children.map(c => c.title)).toEqual(['adds', 'subtracts'])
        expect(suite?.children.every(c => c.kind === 'test')).toBe(true)
    })

    it('handles deeply nested describes', () => {
        const code = `
            describe('a', () => {
                describe('b', () => {
                    it('c', () => {})
                })
            })
        `
        const titles = flatten(parse(code)).map(b => b.title)
        expect(titles).toEqual(['a', 'b', 'c'])
    })

    it('captures .only / .skip / .todo modifiers', () => {
        const code = `
            describe.only('suite', () => {
                it.skip('skipped', () => {})
                it.todo('todo')
            })
        `
        const [suite] = parse(code)
        expect(suite?.modifiers).toEqual(['only'])
        expect(suite?.children[0]?.modifiers).toEqual(['skip'])
        expect(suite?.children[1]?.modifiers).toEqual(['todo'])
    })

    it('maps fit / xit / fdescribe / xdescribe to modifiers', () => {
        const blocks = flatten(
            parse(`
                fdescribe('focused suite', () => {
                    fit('focused', () => {})
                    xit('skipped', () => {})
                })
            `)
        )
        expect(blocks.map(b => [b.callee, b.modifiers])).toEqual([
            ['fdescribe', ['only']],
            ['fit', ['only']],
            ['xit', ['skip']]
        ])
    })

    it('resolves static template-literal titles', () => {
        const [block] = parse('it(`static title`, () => {})')
        expect(block).toMatchObject({ title: 'static title', dynamic: false })
    })

    it('marks interpolated template-literal titles as dynamic', () => {
        const [block] = parse('it(`title ${value}`, () => {})')
        expect(block).toMatchObject({ title: undefined, dynamic: true })
    })

    it('marks non-literal titles as dynamic', () => {
        const [block] = parse('it(name, () => {})')
        expect(block).toMatchObject({ title: undefined, dynamic: true })
    })

    it('handles it.each with an array table', () => {
        const code = `it.each([1, 2, 3])('value %s', (n) => {})`
        const [block] = parse(code)
        expect(block).toMatchObject({ callee: 'it', title: 'value %s', modifiers: ['each'] })
    })

    it('handles tagged-template it.each', () => {
        const code = 'it.each`\n  a | b\n  ${1} | ${2}\n`("adds $a and $b", () => {})'
        const [block] = parse(code)
        expect(block).toMatchObject({ callee: 'it', title: 'adds $a and $b', modifiers: ['each'] })
    })

    it('records the line of each block (0-based)', () => {
        const code = `describe('s', () => {\n  it('t', () => {})\n})`
        const [suite] = parse(code)
        expect(suite?.line).toBe(0)
        expect(suite?.children[0]?.line).toBe(1)
    })

    it('finds tests wrapped in conditionals', () => {
        const code = `
            describe('conditional', () => {
                if (process.env.CI) {
                    it('runs in ci', () => {})
                }
            })
        `
        const [suite] = parse(code)
        expect(suite?.children.map(c => c.title)).toEqual(['runs in ci'])
    })

    it('ignores unrelated function calls', () => {
        expect(parse(`setup(); beforeEach(() => {}); console.log('it')`)).toEqual([])
    })

    it('never throws on an unparseable file, returning an empty list', () => {
        const code = `
            it('valid', () => {})
            const broken = (
        `
        expect(() => parse(code)).not.toThrow()
        expect(parse(code)).toEqual([])
    })

    it('parses javascript with jsx', () => {
        const code = `it('renders', () => { render(<App />) })`
        const [block] = parse(code, 'javascript')
        expect(block).toMatchObject({ title: 'renders', callee: 'it' })
    })
})
