export const EXTENSION_CONTEXT_TOKEN = 'ExtensionContext'

export abstract class WorkspaceState {
    abstract get<T>(key: string): T | undefined
    abstract set<T>(key: string, value: T | undefined): Promise<void>
}
