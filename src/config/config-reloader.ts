import { singleton } from 'tsyringe'
import { workspace, type ConfigurationChangeEvent } from 'vscode'
import { CONFIG_NAMESPACE } from '../constants'
import { Lifecycle } from '../lifecycle/lifecycle'
import { Logger } from '../logger/base-logger'
import { ConfigService } from './config.service'

@singleton()
export class ConfigReloader {
    constructor(
        private readonly cfg: ConfigService,
        private readonly logger: Logger,
        private readonly lifecycle: Lifecycle
    ) {}

    start(): void {
        this.lifecycle.register(workspace.onDidChangeConfiguration(e => this.onConfig(e)))
    }

    private onConfig(event: ConfigurationChangeEvent): void {
        if (!event.affectsConfiguration(CONFIG_NAMESPACE)) return

        const prevLogLevel = this.cfg.logLevel
        this.cfg.reload()
        this.logger.debug('Config reloaded')

        if (this.cfg.logLevel !== prevLogLevel) this.logger.setLevel(this.cfg.logLevel)
    }
}
