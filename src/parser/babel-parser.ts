import { parse as babelParse, type ParseResult, type ParserPlugin } from '@babel/parser'
import type {
    CallExpression,
    Expression,
    File,
    Function as BabelFunction,
    Node,
    PrivateName,
    V8IntrinsicIdentifier
} from '@babel/types'
import { singleton } from 'tsyringe'
import { TestParser } from './base-parser'
import { classifyCall } from './helpers/test-globals'
import type { TestBlock, TestFileLanguage } from './types'

interface ResolvedCallee {
    readonly root: string
    readonly members: string[]
}

interface ResolvedTitle {
    readonly title: string | undefined
    readonly dynamic: boolean
}

const SKIP_KEYS = new Set([
    'type',
    'loc',
    'start',
    'end',
    'range',
    'extra',
    'comments',
    'leadingComments',
    'trailingComments',
    'innerComments',
    'tokens',
    'errors'
])

@singleton()
export class BabelTestParser extends TestParser {
    parse(code: string, language: TestFileLanguage): TestBlock[] {
        const ast = this.tryParse(code, language)
        if (!ast) return []

        const blocks: TestBlock[] = []
        this.gather(ast.program.body, blocks)
        return blocks
    }

    private tryParse(code: string, language: TestFileLanguage): ParseResult<File> | undefined {
        const plugins: ParserPlugin[] = language === 'typescript' ? ['typescript'] : ['jsx']
        try {
            return babelParse(code, { sourceType: 'unambiguous', errorRecovery: true, plugins })
        } catch {
            return undefined
        }
    }

    private gather(value: unknown, out: TestBlock[]): void {
        if (Array.isArray(value)) {
            for (const item of value) this.gather(item, out)
            return
        }
        if (!isNode(value)) return

        if (value.type === 'CallExpression') {
            const block = this.toBlock(value)
            if (block) {
                out.push(block)
                return
            }
        }

        for (const key of Object.keys(value)) {
            if (SKIP_KEYS.has(key)) continue
            this.gather((value as unknown as Record<string, unknown>)[key], out)
        }
    }

    private toBlock(call: CallExpression): TestBlock | null {
        const callee = resolveCallee(call.callee)
        if (!callee) return null

        const classified = classifyCall(callee.root, callee.members)
        if (!classified) return null

        const { title, dynamic } = resolveTitle(call.arguments[0])

        const children: TestBlock[] = []
        const callback = findCallback(call)
        if (callback) this.gather(callback.body, children)

        return {
            kind: classified.kind,
            callee: callee.root,
            title,
            dynamic,
            modifiers: classified.modifiers,
            line: (call.loc?.start.line ?? 1) - 1,
            column: call.loc?.start.column ?? 0,
            children
        }
    }
}

function resolveCallee(node: Expression | V8IntrinsicIdentifier): ResolvedCallee | null {
    switch (node.type) {
        case 'Identifier':
            return { root: node.name, members: [] }
        case 'MemberExpression': {
            if (node.object.type === 'Super') return null
            const base = resolveCallee(node.object)
            if (!base) return null
            const prop = memberName(node.property, node.computed)
            return prop ? { root: base.root, members: [...base.members, prop] } : base
        }
        case 'CallExpression':
            return node.callee.type === 'V8IntrinsicIdentifier' ? null : resolveCallee(node.callee)
        case 'TaggedTemplateExpression':
            return resolveCallee(node.tag)
        default:
            return null
    }
}

function memberName(property: Expression | PrivateName, computed: boolean): string | null {
    if (property.type === 'Identifier') return computed ? null : property.name
    if (property.type === 'StringLiteral') return property.value
    return null
}

function resolveTitle(arg: Node | undefined): ResolvedTitle {
    if (!arg) return { title: undefined, dynamic: true }
    switch (arg.type) {
        case 'StringLiteral':
            return { title: arg.value, dynamic: false }
        case 'NumericLiteral':
            return { title: String(arg.value), dynamic: false }
        case 'TemplateLiteral':
            if (arg.expressions.length === 0 && arg.quasis.length === 1) {
                const quasi = arg.quasis[0]
                return { title: quasi?.value.cooked ?? quasi?.value.raw, dynamic: false }
            }
            return { title: undefined, dynamic: true }
        default:
            return { title: undefined, dynamic: true }
    }
}

function findCallback(call: CallExpression): BabelFunction | undefined {
    for (const arg of call.arguments) {
        if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') return arg
    }
    return undefined
}

function isNode(value: unknown): value is Node {
    return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'
}
