import { dirname } from 'node:path'
import { singleton } from 'tsyringe'
import { EventEmitter, Uri, workspace, type Event } from 'vscode'
import { Lifecycle } from '../lifecycle/lifecycle'
import { Logger } from '../logger/base-logger'
import { WorkspaceDependencies, type WorkspaceContext } from './base-workspace-deps'
import { ancestorDirectories } from './helpers/ancestor-directories'

interface RawPackageJson {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
}

const MISS: ReadonlySet<string> = new Set()

@singleton()
export class VsCodeWorkspaceDependencies extends WorkspaceDependencies {
    private readonly cache = new Map<string, ReadonlySet<string>>()
    private readonly changed = new EventEmitter<void>()
    readonly onDidChange: Event<void> = this.changed.event

    constructor(
        private readonly logger: Logger,
        lifecycle: Lifecycle
    ) {
        super()
        const watcher = workspace.createFileSystemWatcher('**/package.json')
        const onChange = (uri: Uri): void => {
            if (uri.fsPath.includes('/node_modules/')) return
            this.invalidate()
        }
        watcher.onDidChange(onChange)
        watcher.onDidCreate(onChange)
        watcher.onDidDelete(onChange)
        lifecycle.register(watcher)
        lifecycle.register(this.changed)
    }

    async forFile(fileUri: Uri): Promise<WorkspaceContext> {
        const root = await this.findRoot(fileUri)
        const dependencies = root ? await this.getDeps(root) : undefined
        return { root, dependencies }
    }

    private async findRoot(fileUri: Uri): Promise<Uri | undefined> {
        const workspaceFolder = workspace.getWorkspaceFolder(fileUri)?.uri
        if (!workspaceFolder) return undefined

        const dirs = ancestorDirectories(dirname(fileUri.fsPath), workspaceFolder.fsPath)
        const presence = await Promise.all(dirs.map(dir => exists(Uri.file(dir), 'package.json')))
        const hit = dirs.find((_, i) => presence[i])
        return hit ? Uri.file(hit) : workspaceFolder
    }

    private async getDeps(root: Uri): Promise<ReadonlySet<string> | undefined> {
        const cached = this.cache.get(root.fsPath)
        if (cached !== undefined) return cached === MISS ? undefined : cached
        const fresh = await this.readPackageJson(root)
        this.cache.set(root.fsPath, fresh ?? MISS)
        return fresh
    }

    private async readPackageJson(root: Uri): Promise<ReadonlySet<string> | undefined> {
        try {
            const bytes = await workspace.fs.readFile(Uri.joinPath(root, 'package.json'))
            const json = JSON.parse(Buffer.from(bytes).toString('utf8')) as RawPackageJson
            return new Set([...Object.keys(json.dependencies ?? {}), ...Object.keys(json.devDependencies ?? {})])
        } catch (err) {
            this.logger.warn({ root: root.fsPath, err }, 'workspace.deps.readFailed')
            return undefined
        }
    }

    private invalidate(): void {
        this.cache.clear()
        this.changed.fire()
    }
}

async function exists(folder: Uri, name: string): Promise<boolean> {
    try {
        await workspace.fs.stat(Uri.joinPath(folder, name))
        return true
    } catch {
        return false
    }
}
