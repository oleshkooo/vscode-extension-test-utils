import type { ClassConstructor } from '../types/classes'
import { WorkspaceState } from './base-workspace-state'
import { VsCodeWorkspaceState } from './vscode-workspace-state'

export function pickWorkspaceState(): ClassConstructor<WorkspaceState> {
    return VsCodeWorkspaceState
}
