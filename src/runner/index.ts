import type { ClassConstructor } from '../types/classes'
import { TestRunner } from './base-runner'
import { TerminalTestRunner } from './terminal-test-runner'

export function pickRunner(): ClassConstructor<TestRunner> {
    return TerminalTestRunner
}
