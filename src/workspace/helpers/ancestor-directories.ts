import { dirname } from 'node:path'

export function ancestorDirectories(fileDir: string, boundary: string): string[] {
    const dirs: string[] = []
    let dir = fileDir
    while (dir.startsWith(boundary)) {
        dirs.push(dir)
        if (dir === boundary) break
        const parent = dirname(dir)
        if (parent === dir) break
        dir = parent
    }
    return dirs
}
