import { singleton } from 'tsyringe'
import { ThemeIcon, window, type Terminal, type Uri } from 'vscode'
import { EXTENSION_DISPLAY_NAME } from '../constants'
import { Lifecycle } from '../lifecycle/lifecycle'

const TERMINAL_ICON = new ThemeIcon('beaker')

@singleton()
export class TestTerminal {
    private terminal: Terminal | undefined

    constructor(private readonly lifecycle: Lifecycle) {
        this.lifecycle.register(
            window.onDidCloseTerminal(closed => {
                if (closed === this.terminal) this.terminal = undefined
            })
        )
    }

    run(command: string, cwd: Uri | undefined, reveal: boolean): void {
        const terminal = this.ensure(cwd)
        if (reveal) terminal.show(true)
        terminal.sendText(command, true)
    }

    private ensure(cwd: Uri | undefined): Terminal {
        if (!this.terminal) {
            this.terminal = window.createTerminal({ name: EXTENSION_DISPLAY_NAME, cwd, iconPath: TERMINAL_ICON })
        }
        return this.terminal
    }
}
