export const EXTENSION_ID = 'oleshko-test-utils'
export const EXTENSION_DISPLAY_NAME = "Oleshko's Test Utils"
export const OUTPUT_CHANNEL_NAME = "Oleshko's Test Utils"
export const CONFIG_NAMESPACE = 'oleshkoTestUtils'

export const COMMAND_RUN_TEST = 'oleshkoTestUtils.runTest'

export const TEST_FILE_LANGUAGES: readonly string[] = ['javascript', 'typescript']
export const TEST_FILE_PATTERN = '**/*.{spec,test}.{js,ts}'

export type LogLevel = (typeof LOG_LEVELS)[number]
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'silent'] as const

export type TestRunnerSetting = (typeof TEST_RUNNERS)[number]
export const TEST_RUNNERS = ['auto', 'vitest', 'jest'] as const
