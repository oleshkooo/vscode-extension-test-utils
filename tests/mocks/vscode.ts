export class Position {
    constructor(
        public readonly line: number,
        public readonly character: number
    ) {}
    isBefore(other: Position): boolean {
        if (this.line < other.line) return true
        if (this.line > other.line) return false
        return this.character < other.character
    }
    isBeforeOrEqual(other: Position): boolean {
        return this.isBefore(other) || (this.line === other.line && this.character === other.character)
    }
    isAfter(other: Position): boolean {
        return !this.isBeforeOrEqual(other)
    }
    isAfterOrEqual(other: Position): boolean {
        return !this.isBefore(other)
    }
}

export class Range {
    public readonly start: Position
    public readonly end: Position
    constructor(startLine: number | Position, startChar: number | Position, endLine?: number, endChar?: number) {
        if (startLine instanceof Position && startChar instanceof Position) {
            this.start = startLine
            this.end = startChar
        } else {
            this.start = new Position(startLine as number, startChar as number)
            this.end = new Position(endLine as number, endChar as number)
        }
    }
    contains(p: Position): boolean {
        return p.isAfterOrEqual(this.start) && p.isBeforeOrEqual(this.end)
    }
}

export class Uri {
    static parse(value: string): Uri {
        return new Uri(value)
    }
    static file(path: string): Uri {
        return new Uri(`file://${path}`)
    }
    private constructor(private readonly value: string) {}
    toString(): string {
        return this.value
    }
    get fsPath(): string {
        return this.value.replace(/^file:\/\//, '')
    }
}

export interface Disposable {
    dispose(): void
}

export const workspace = {
    asRelativePath(uri: Uri | string): string {
        return typeof uri === 'string' ? uri : uri.toString()
    },
    fs: {
        async readFile(_uri: Uri): Promise<Uint8Array> {
            throw new Error('workspace.fs.readFile not mocked')
        }
    }
}

export class EventEmitter<T> {
    private listeners: Array<(e: T) => void> = []
    readonly event = (listener: (e: T) => void): Disposable => {
        this.listeners.push(listener)
        return {
            dispose: () => {
                this.listeners = this.listeners.filter(l => l !== listener)
            }
        }
    }
    fire(data: T): void {
        for (const listener of this.listeners) listener(data)
    }
    dispose(): void {
        this.listeners = []
    }
}
