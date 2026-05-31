export type TestFileLanguage = 'javascript' | 'typescript'

export type TestBlockKind = 'describe' | 'test'

export type TestModifier = 'only' | 'skip' | 'todo' | 'each' | 'concurrent' | 'failing' | 'sequential'

export interface TestBlock {
    readonly kind: TestBlockKind
    readonly callee: string
    readonly title: string | undefined
    readonly dynamic: boolean
    readonly modifiers: readonly TestModifier[]
    readonly line: number
    readonly column: number
    readonly children: readonly TestBlock[]
}
