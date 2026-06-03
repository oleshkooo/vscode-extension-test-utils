import { relative } from 'node:path'
import { singleton } from 'tsyringe'
import { Uri, window, workspace, type QuickPickItem } from 'vscode'
import { ConfigService } from '../config/config.service'
import { Logger } from '../logger/base-logger'
import { WorkspaceState } from '../state/base-workspace-state'
import { WorkspaceDependencies } from '../workspace/base-workspace-deps'
import { TestRunner } from './base-runner'
import { buildRunnerCommand, RUNNER_SPECS } from './helpers/command'
import { selectPackageManager, selectRunner } from './helpers/detect'
import { TestTerminal } from './test-terminal'
import type { PackageManager, TestRunRequest } from './types'

interface CypressConfigEntry {
    readonly name: string
    readonly configFile: string
    readonly env?: Record<string, string>
}

interface CypressConfigPickItem extends QuickPickItem {
    readonly entry: CypressConfigEntry
}

interface CypressConfigResolution {
    readonly ok: boolean
    readonly entry?: CypressConfigEntry
}

const LOCKFILES = {
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    pnpm: 'pnpm-lock.yaml',
    bun: 'bun.lockb'
} as const
const CYPRESS_LAST_CONFIG_KEY = 'cypress.lastConfigName'

@singleton()
export class TerminalTestRunner extends TestRunner {
    private lastPickedCypressConfig: string | undefined

    constructor(
        private readonly logger: Logger,
        private readonly terminal: TestTerminal,
        private readonly cfg: ConfigService,
        private readonly workspaceDeps: WorkspaceDependencies,
        private readonly state: WorkspaceState
    ) {
        super()
        this.lastPickedCypressConfig = state.get<string>(CYPRESS_LAST_CONFIG_KEY)
    }

    async run(request: TestRunRequest): Promise<void> {
        const fileUri = Uri.file(request.filePath)
        const { root, dependencies } = await this.workspaceDeps.forFile(fileUri)
        const packageManagerPromise = this.detectPackageManager(root)
        const runner = selectRunner(this.cfg.runner.runner, dependencies, request.filePath)
        if (runner === null) {
            this.logger.warn({ filePath: request.filePath }, 'test.run.noRunner')
            window.showWarningMessage(
                'No test runner detected. Install vitest, jest, or cypress, or set "oleshkoTestUtils.runner.runner" explicitly.'
            )
            return
        }

        const file = root ? relative(root.fsPath, request.filePath) : request.filePath

        let configFile: string | undefined
        let env: Record<string, string> | undefined
        if (runner === 'cypress') {
            const resolved = await this.resolveCypressConfig()
            if (!resolved.ok) return
            configFile = resolved.entry?.configFile
            env = resolved.entry?.env
        }

        const packageManager = await packageManagerPromise
        const command = buildRunnerCommand({
            spec: RUNNER_SPECS[runner],
            packageManager,
            file,
            testName: request.testName,
            configFile,
            env
        })

        this.logger.info({ command, runner, packageManager }, 'test.run')
        this.terminal.run(command, root, this.cfg.runner.autoReveal)
    }

    private async detectPackageManager(folder: Uri | undefined): Promise<PackageManager> {
        if (!folder) return 'npm'
        const [npm, yarn, pnpm, bun] = await Promise.all([
            this.exists(folder, LOCKFILES.npm),
            this.exists(folder, LOCKFILES.yarn),
            this.exists(folder, LOCKFILES.pnpm),
            this.exists(folder, LOCKFILES.bun)
        ])
        return selectPackageManager({ npm, yarn, pnpm, bun })
    }

    private async exists(folder: Uri, name: string): Promise<boolean> {
        try {
            await workspace.fs.stat(Uri.joinPath(folder, name))
            return true
        } catch {
            return false
        }
    }

    private async resolveCypressConfig(): Promise<CypressConfigResolution> {
        const { configs } = this.cfg.cypress
        const [first, ...rest] = configs
        if (first === undefined) return { ok: true }
        if (rest.length === 0) return { ok: true, entry: first }

        const picked = await this.pickCypressEnvironment(configs)
        if (picked === undefined) return { ok: false }
        this.lastPickedCypressConfig = picked.name
        void this.state.set(CYPRESS_LAST_CONFIG_KEY, picked.name)
        return { ok: true, entry: picked }
    }

    private pickCypressEnvironment(configs: readonly CypressConfigEntry[]): Promise<CypressConfigEntry | undefined> {
        return new Promise(resolve => {
            const qp = window.createQuickPick<CypressConfigPickItem>()
            qp.items = configs.map(c => ({ label: c.name, description: c.configFile, entry: c }))
            qp.placeholder = 'Select a Cypress environment'
            const last = qp.items.find(item => item.entry.name === this.lastPickedCypressConfig)
            if (last) qp.activeItems = [last]
            qp.onDidAccept(() => {
                const item = qp.selectedItems[0]
                qp.hide()
                resolve(item?.entry)
            })
            qp.onDidHide(() => {
                qp.dispose()
                resolve(undefined)
            })
            qp.show()
        })
    }
}
