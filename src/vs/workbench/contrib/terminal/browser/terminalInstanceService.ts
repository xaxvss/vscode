/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITerminalInstanceService } from 'vs/workbench/contrib/terminal/browser/terminal';
import { IWindowsShellHelper, ITerminalChildProcess, IDefaultShellAndArgsRequest } from 'vs/workbench/contrib/terminal/common/terminal';
import { Terminal as XTermTerminal } from 'xterm';
import { WebLinksAddon as XTermWebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon as XTermSearchAddon } from 'xterm-addon-search';
import { WebglAddon as XTermWebglAddon } from 'xterm-addon-webgl';
import { IProcessEnvironment } from 'vs/base/common/platform';
import { Emitter, Event } from 'vs/base/common/event';

let Terminal: typeof XTermTerminal;
let WebLinksAddon: typeof XTermWebLinksAddon;
let SearchAddon: typeof XTermSearchAddon;
let WebglAddon: typeof XTermWebglAddon;

export class TerminalInstanceService implements ITerminalInstanceService {
	public _serviceBrand: any;

	private readonly _onRequestDefaultShellAndArgs = new Emitter<IDefaultShellAndArgsRequest>();
	public get onRequestDefaultShellAndArgs(): Event<IDefaultShellAndArgsRequest> { return this._onRequestDefaultShellAndArgs.event; }

	constructor() { }

	public async getXtermConstructor(): Promise<typeof XTermTerminal> {
		if (!Terminal) {
			Terminal = (await import('xterm')).Terminal;
		}
		return Terminal;
	}

	public async getXtermWebLinksConstructor(): Promise<typeof XTermWebLinksAddon> {
		if (!WebLinksAddon) {
			WebLinksAddon = (await import('xterm-addon-web-links')).WebLinksAddon;
		}
		return WebLinksAddon;
	}

	public async getXtermSearchConstructor(): Promise<typeof XTermSearchAddon> {
		if (!SearchAddon) {
			SearchAddon = (await import('xterm-addon-search')).SearchAddon;
		}
		return SearchAddon;
	}

	public async getXtermWebglConstructor(): Promise<typeof XTermWebglAddon> {
		if (!WebglAddon) {
			WebglAddon = (await import('xterm-addon-webgl')).WebglAddon;
		}
		return WebglAddon;
	}


	public createWindowsShellHelper(): IWindowsShellHelper {
		throw new Error('Not implemented');
	}

	public createTerminalProcess(): ITerminalChildProcess {
		throw new Error('Not implemented');
	}

	public getDefaultShellAndArgs(): Promise<{ shell: string, args: string[] | string | undefined }> {
		return new Promise(r => this._onRequestDefaultShellAndArgs.fire((shell, args) => r({ shell, args })));
	}

	public async getMainProcessParentEnv(): Promise<IProcessEnvironment> {
		return {};
	}
}