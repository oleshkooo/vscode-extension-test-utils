import type { TestRunRequest } from './types'

export abstract class TestRunner {
    abstract run(request: TestRunRequest): Promise<void>
}
