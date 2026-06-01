import { CodeLens, Range } from 'vscode'
import { COMMAND_RUN_TEST } from '../constants'
import type { TestRunRequest } from '../runner/types'

export class RunFileLens extends CodeLens {
    constructor(filePath: string) {
        super(new Range(0, 0, 0, 0), {
            title: '$(play) Run file',
            command: COMMAND_RUN_TEST,
            arguments: [{ filePath } satisfies TestRunRequest]
        })
    }
}
