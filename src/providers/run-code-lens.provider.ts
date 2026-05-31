import { singleton } from 'tsyringe'
import { CodeLens, EventEmitter, Range, workspace, type CodeLensProvider, type Event, type TextDocument } from 'vscode'
import { ConfigService } from '../config/config.service'
import { COMMAND_RUN_TEST, CONFIG_NAMESPACE } from '../constants'
import { Lifecycle } from '../lifecycle/lifecycle'
import { TestParser } from '../parser/base-parser'
import type { TestBlock, TestFileLanguage } from '../parser/types'
import type { TestRunRequest } from '../runner/types'

@singleton()
export class RunCodeLensProvider implements CodeLensProvider {
    private readonly changed = new EventEmitter<void>()
    readonly onDidChangeCodeLenses: Event<void> = this.changed.event

    constructor(
        private readonly parser: TestParser,
        private readonly cfg: ConfigService,
        lifecycle: Lifecycle
    ) {
        lifecycle.register(this.changed)
        lifecycle.register(
            workspace.onDidChangeConfiguration(event => {
                if (event.affectsConfiguration(`${CONFIG_NAMESPACE}.codeLens`)) this.changed.fire()
            })
        )
    }

    provideCodeLenses(document: TextDocument): CodeLens[] {
        if (!this.cfg.codeLens.enabled) return []

        const blocks = this.parser.parse(document.getText(), toLanguage(document.languageId))
        const lenses: CodeLens[] = []
        this.collect(blocks, document.uri.fsPath, [], false, lenses)
        return lenses
    }

    private collect(
        blocks: readonly TestBlock[],
        filePath: string,
        ancestors: string[],
        ancestorsBroken: boolean,
        out: CodeLens[]
    ): void {
        for (const block of blocks) {
            const ownResolved = !block.dynamic && block.title !== undefined && !block.modifiers.includes('each')
            const targetable = !ancestorsBroken && ownResolved
            const testName = targetable ? [...ancestors, block.title].join(' ') : undefined

            out.push(this.lens(block, filePath, testName))

            const childAncestors = ownResolved ? [...ancestors, block.title as string] : ancestors
            this.collect(block.children, filePath, childAncestors, ancestorsBroken || !ownResolved, out)
        }
    }

    private lens(block: TestBlock, filePath: string, testName: string | undefined): CodeLens {
        const range = new Range(block.line, block.column, block.line, block.column)
        const request: TestRunRequest = { filePath, testName }
        return new CodeLens(range, {
            title: '$(play) Run',
            command: COMMAND_RUN_TEST,
            arguments: [request]
        })
    }
}

function toLanguage(languageId: string): TestFileLanguage {
    return languageId === 'typescript' ? 'typescript' : 'javascript'
}
