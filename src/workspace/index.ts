import type { ClassConstructor } from '../types/classes'
import { WorkspaceDependencies } from './base-workspace-deps'
import { VsCodeWorkspaceDependencies } from './vscode-workspace-deps'

export function pickWorkspaceDependencies(): ClassConstructor<WorkspaceDependencies> {
    return VsCodeWorkspaceDependencies
}
