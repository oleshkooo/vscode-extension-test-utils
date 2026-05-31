import { container, type InjectionToken } from 'tsyringe'
import type { ExtensionContext } from 'vscode'
import { ConfigReloader } from './config/config-reloader'
import { ConfigService } from './config/config.service'
import { EXTENSION_DISPLAY_NAME } from './constants'
import { Lifecycle } from './lifecycle/lifecycle'
import { pickLogger } from './logger'
import { Logger } from './logger/base-logger'
import { pickTestParser } from './parser'
import { TestParser } from './parser/base-parser'
import { pickTelemetryService } from './telemetry'
import { TelemetryService } from './telemetry/base-telemetry.service'

export async function bootstrap(context: ExtensionContext): Promise<void> {
    const config = container.resolve(ConfigService)
    registerInfrastructure(config)

    const lifecycle = container.resolve(Lifecycle)
    lifecycle.attach(context)
    lifecycle.registerErrorHandlers()

    const logger = container.resolve(Logger as InjectionToken<Logger>)
    logger.setLevel(config.logLevel)
    logger.info({ version: '0.1.0' }, `${EXTENSION_DISPLAY_NAME} activating`)

    container.resolve(ConfigReloader).start()

    logger.info(`${EXTENSION_DISPLAY_NAME} ready`)
}

export async function shutdown(): Promise<void> {
    const lifecycle = container.isRegistered(Lifecycle) ? container.resolve(Lifecycle) : undefined
    await lifecycle?.shutdown()
    container.clearInstances()
}

function registerInfrastructure(config: ConfigService): void {
    container.register(Logger as InjectionToken<Logger>, { useToken: pickLogger() })
    container.register(TelemetryService as InjectionToken<TelemetryService>, { useToken: pickTelemetryService(config) })
    container.register(TestParser as InjectionToken<TestParser>, { useToken: pickTestParser() })
}
