import type { Event, Uri } from 'vscode'

export interface WorkspaceContext {
    readonly root: Uri | undefined
    readonly dependencies: ReadonlySet<string> | undefined
}

export abstract class WorkspaceDependencies {
    abstract readonly onDidChange: Event<void>
    abstract forFile(fileUri: Uri): Promise<WorkspaceContext>
}
