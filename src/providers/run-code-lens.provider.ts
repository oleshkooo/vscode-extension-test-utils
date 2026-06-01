import { singleton } from 'tsyringe'
import { EventEmitter, workspace, type CodeLens, type CodeLensProvider, type Event, type TextDocument } from 'vscode'
import { ConfigService } from '../config/config.service'
import { CONFIG_NAMESPACE } from '../constants'
import { Lifecycle } from '../lifecycle/lifecycle'
import { TestParser } from '../parser/base-parser'
import type { TestBlock, TestFileLanguage } from '../parser/types'
import { selectRunner } from '../runner/helpers/detect'
import { RUNNER_SPECS } from '../runner/helpers/command'
import { WorkspaceDependencies } from '../workspace/base-workspace-deps'
import { RunBlockLens } from './run-block-lens'
import { RunFileLens } from './run-file-lens'

const REFRESH_KEYS = [`${CONFIG_NAMESPACE}.codeLens`, `${CONFIG_NAMESPACE}.runner.runner`]

@singleton()
export class RunCodeLensProvider implements CodeLensProvider {
    private readonly changed = new EventEmitter<void>()
    readonly onDidChangeCodeLenses: Event<void> = this.changed.event

    constructor(
        private readonly parser: TestParser,
        private readonly cfg: ConfigService,
        private readonly workspaceDeps: WorkspaceDependencies,
        lifecycle: Lifecycle
    ) {
        lifecycle.register(this.changed)
        lifecycle.register(
            workspace.onDidChangeConfiguration(event => {
                if (REFRESH_KEYS.some(key => event.affectsConfiguration(key))) this.changed.fire()
            })
        )
        lifecycle.register(workspaceDeps.onDidChange(() => this.changed.fire()))
    }

    async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
        if (!this.cfg.codeLens.enabled) return []

        const filePath = document.uri.fsPath
        const { dependencies } = await this.workspaceDeps.forFile(document.uri)
        const runner = selectRunner(this.cfg.runner.runner, dependencies, filePath)
        if (runner === null) return []

        if (RUNNER_SPECS[runner].granularity === 'file') return [new RunFileLens(filePath)]

        const blocks = this.parser.parse(document.getText(), toLanguage(document.languageId))
        const lenses: CodeLens[] = []
        this.collect(blocks, filePath, [], false, lenses)
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

            out.push(new RunBlockLens(block, filePath, testName))

            const childAncestors = ownResolved ? [...ancestors, block.title as string] : ancestors
            this.collect(block.children, filePath, childAncestors, ancestorsBroken || !ownResolved, out)
        }
    }
}

function toLanguage(languageId: string): TestFileLanguage {
    return languageId === 'typescript' ? 'typescript' : 'javascript'
}
