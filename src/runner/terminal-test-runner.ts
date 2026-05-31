import { dirname, relative } from 'node:path'
import { singleton } from 'tsyringe'
import { Uri, workspace } from 'vscode'
import { ConfigService } from '../config/config.service'
import { Logger } from '../logger/base-logger'
import { TestRunner } from './base-runner'
import { buildRunnerCommand, RUNNER_SPECS } from './helpers/command'
import { ancestorDirectories, selectPackageManager, selectRunner } from './helpers/detect'
import { TestTerminal } from './test-terminal'
import type { PackageManager, RunnerKind, TestRunRequest } from './types'

const LOCKFILES = {
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    pnpm: 'pnpm-lock.yaml',
    bun: 'bun.lockb'
} as const

@singleton()
export class TerminalTestRunner extends TestRunner {
    constructor(
        private readonly logger: Logger,
        private readonly terminal: TestTerminal,
        private readonly cfg: ConfigService
    ) {
        super()
    }

    async run(request: TestRunRequest): Promise<void> {
        const root = await this.findProjectRoot(Uri.file(request.filePath))
        const packageManager = await this.detectPackageManager(root)
        const runner = await this.detectRunner(root)
        const file = root ? relative(root.fsPath, request.filePath) : request.filePath

        const command = buildRunnerCommand({
            spec: RUNNER_SPECS[runner],
            packageManager,
            file,
            testName: request.testName
        })

        this.logger.info({ command, runner, packageManager }, 'test.run')
        this.terminal.run(command, root, this.cfg.runner.autoReveal)
    }

    private async findProjectRoot(fileUri: Uri): Promise<Uri | undefined> {
        const workspaceFolder = workspace.getWorkspaceFolder(fileUri)?.uri
        if (!workspaceFolder) return undefined

        for (const dir of ancestorDirectories(dirname(fileUri.fsPath), workspaceFolder.fsPath)) {
            if (await this.exists(Uri.file(dir), 'package.json')) return Uri.file(dir)
        }
        return workspaceFolder
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

    private async detectRunner(folder: Uri | undefined): Promise<RunnerKind> {
        const setting = this.cfg.runner.runner
        if (setting !== 'auto') return setting
        const dependencies = folder ? await this.readDependencyNames(folder) : undefined
        return selectRunner(setting, dependencies)
    }

    private async exists(folder: Uri, name: string): Promise<boolean> {
        try {
            await workspace.fs.stat(Uri.joinPath(folder, name))
            return true
        } catch {
            return false
        }
    }

    private async readDependencyNames(folder: Uri): Promise<ReadonlySet<string> | undefined> {
        try {
            const bytes = await workspace.fs.readFile(Uri.joinPath(folder, 'package.json'))
            const json = JSON.parse(Buffer.from(bytes).toString('utf8')) as {
                dependencies?: Record<string, string>
                devDependencies?: Record<string, string>
            }
            return new Set([...Object.keys(json.dependencies ?? {}), ...Object.keys(json.devDependencies ?? {})])
        } catch {
            return undefined
        }
    }
}
