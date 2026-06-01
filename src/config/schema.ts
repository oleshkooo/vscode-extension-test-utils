import { z } from 'zod'
import { LOG_LEVELS, TEST_RUNNERS } from '../constants'

const RUNNER_DEFAULTS = {
    runner: 'auto' as (typeof TEST_RUNNERS)[number],
    autoReveal: true
}

const CODE_LENS_DEFAULTS = {
    enabled: true
}

const TELEMETRY_DEFAULTS = {
    enabled: true
}

const cypressConfigEntrySchema = z.object({
    name: z.string(),
    configFile: z.string()
})

export type Config = z.infer<typeof configSchema>
export const configSchema = z.object({
    logLevel: z.enum(LOG_LEVELS).default('info'),
    runner: z
        .object({
            runner: z.enum(TEST_RUNNERS).default(RUNNER_DEFAULTS.runner),
            autoReveal: z.boolean().default(RUNNER_DEFAULTS.autoReveal)
        })
        .default(() => ({ ...RUNNER_DEFAULTS })),
    codeLens: z
        .object({
            enabled: z.boolean().default(CODE_LENS_DEFAULTS.enabled)
        })
        .default(() => ({ ...CODE_LENS_DEFAULTS })),
    telemetry: z
        .object({
            enabled: z.boolean().default(TELEMETRY_DEFAULTS.enabled)
        })
        .default(() => ({ ...TELEMETRY_DEFAULTS })),
    cypress: z
        .object({
            configs: z.array(cypressConfigEntrySchema).default(() => [])
        })
        .default(() => ({ configs: [] }))
})
