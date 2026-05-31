import type { ClassConstructor } from '../types/classes'
import { BabelTestParser } from './babel-parser'
import { TestParser } from './base-parser'

export function pickTestParser(): ClassConstructor<TestParser> {
    return BabelTestParser
}
