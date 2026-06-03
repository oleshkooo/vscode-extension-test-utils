import { inject, singleton } from 'tsyringe'
import type { ExtensionContext } from 'vscode'
import { EXTENSION_CONTEXT_TOKEN, WorkspaceState } from './base-workspace-state'

@singleton()
export class VsCodeWorkspaceState extends WorkspaceState {
    constructor(@inject(EXTENSION_CONTEXT_TOKEN) private readonly context: ExtensionContext) {
        super()
    }

    get<T>(key: string): T | undefined {
        return this.context.workspaceState.get<T>(key)
    }

    async set<T>(key: string, value: T | undefined): Promise<void> {
        await this.context.workspaceState.update(key, value)
    }
}
