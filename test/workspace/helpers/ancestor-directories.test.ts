import { describe, expect, it } from 'vitest'
import { ancestorDirectories } from '../../../src/workspace/helpers/ancestor-directories'

describe('ancestorDirectories', () => {
    it('lists directories from the file dir up to the boundary, inclusive', () => {
        expect(ancestorDirectories('/repo/packages/app/src', '/repo')).toEqual([
            '/repo/packages/app/src',
            '/repo/packages/app',
            '/repo/packages',
            '/repo'
        ])
    })

    it('returns just the boundary when the file sits at the root', () => {
        expect(ancestorDirectories('/repo', '/repo')).toEqual(['/repo'])
    })

    it('returns nothing when the directory is outside the boundary', () => {
        expect(ancestorDirectories('/elsewhere/src', '/repo')).toEqual([])
    })
})
