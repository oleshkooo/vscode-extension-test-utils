import type { TestBlock, TestFileLanguage } from './types'

export abstract class TestParser {
    abstract parse(code: string, language: TestFileLanguage): TestBlock[]
}
