import type { TestBlockKind, TestModifier } from '../types'

export interface ClassifiedCall {
    readonly kind: TestBlockKind
    readonly modifiers: TestModifier[]
}

const DESCRIBE_NAMES = new Set(['describe', 'fdescribe', 'xdescribe', 'suite'])
const TEST_NAMES = new Set(['it', 'fit', 'xit', 'test', 'xtest', 'bench'])

const FOCUSED_NAMES = new Set(['fdescribe', 'fit'])
const SKIPPED_NAMES = new Set(['xdescribe', 'xit', 'xtest'])

const MODIFIER_NAMES = new Set<TestModifier>(['only', 'skip', 'todo', 'each', 'concurrent', 'failing', 'sequential'])

export function classifyCall(root: string, members: readonly string[]): ClassifiedCall | null {
    const isDescribe = DESCRIBE_NAMES.has(root)
    const isTest = TEST_NAMES.has(root)
    if (!isDescribe && !isTest) return null

    const modifiers: TestModifier[] = []
    if (FOCUSED_NAMES.has(root)) modifiers.push('only')
    if (SKIPPED_NAMES.has(root)) modifiers.push('skip')

    for (const member of members) {
        if (MODIFIER_NAMES.has(member as TestModifier) && !modifiers.includes(member as TestModifier)) {
            modifiers.push(member as TestModifier)
        }
    }

    return { kind: isDescribe ? 'describe' : 'test', modifiers }
}
