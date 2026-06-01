import { CodeLens, Range } from 'vscode'
import { COMMAND_RUN_TEST } from '../constants'
import type { TestBlock } from '../parser/types'
import type { TestRunRequest } from '../runner/types'

export class RunBlockLens extends CodeLens {
    constructor(block: TestBlock, filePath: string, testName: string | undefined) {
        super(new Range(block.line, block.column, block.line, block.column), {
            title: '$(play) Run',
            command: COMMAND_RUN_TEST,
            arguments: [{ filePath, testName } satisfies TestRunRequest]
        })
    }
}
