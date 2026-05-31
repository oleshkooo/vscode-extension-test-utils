import { workspace, type WorkspaceConfiguration } from 'vscode'
import { CONFIG_NAMESPACE } from '../../constants'
import { configSchema, type Config } from '../schema'

export function loadConfig(): Config {
    const raw = readWorkspaceConfig(workspace.getConfiguration(CONFIG_NAMESPACE))
    return configSchema.parse(raw)
}

function readWorkspaceConfig(cfg: WorkspaceConfiguration): unknown {
    return {
        logLevel: cfg.get('logLevel'),
        runner: {
            runner: cfg.get('runner.runner'),
            autoReveal: cfg.get('runner.autoReveal')
        },
        codeLens: {
            enabled: cfg.get('codeLens.enabled')
        },
        telemetry: {
            enabled: cfg.get('telemetry.enabled')
        }
    }
}
