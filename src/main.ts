import { container, type InjectionToken } from 'tsyringe'
import { commands, languages, type DocumentFilter, type ExtensionContext } from 'vscode'
import { ConfigReloader } from './config/config-reloader'
import { ConfigService } from './config/config.service'
import { COMMAND_RUN_TEST, EXTENSION_DISPLAY_NAME, TEST_FILE_LANGUAGES, TEST_FILE_PATTERN } from './constants'
import { Lifecycle } from './lifecycle/lifecycle'
import { pickLogger } from './logger'
import { Logger } from './logger/base-logger'
import { pickTestParser } from './parser'
import { TestParser } from './parser/base-parser'
import { RunCodeLensProvider } from './providers/run-code-lens.provider'
import { pickRunner } from './runner'
import { TestRunner } from './runner/base-runner'
import type { TestRunRequest } from './runner/types'
import { pickTelemetryService } from './telemetry'
import { TelemetryService } from './telemetry/base-telemetry.service'
import { pickWorkspaceDependencies } from './workspace'
import { WorkspaceDependencies } from './workspace/base-workspace-deps'

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
    registerFeatures(lifecycle)

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
    container.register(WorkspaceDependencies as InjectionToken<WorkspaceDependencies>, {
        useToken: pickWorkspaceDependencies()
    })
    container.register(TestRunner as InjectionToken<TestRunner>, { useToken: pickRunner() })
}

function registerFeatures(lifecycle: Lifecycle): void {
    lifecycle.register(
        commands.registerCommand(COMMAND_RUN_TEST, (request: TestRunRequest) =>
            container.resolve(TestRunner as InjectionToken<TestRunner>).run(request)
        )
    )

    const selector: DocumentFilter[] = TEST_FILE_LANGUAGES.map(language => ({
        language,
        scheme: 'file',
        pattern: TEST_FILE_PATTERN
    }))
    lifecycle.register(languages.registerCodeLensProvider(selector, container.resolve(RunCodeLensProvider)))
}
