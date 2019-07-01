/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { webFrame } from 'electron';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IWebviewService, Webview, WebviewContentOptions, WebviewOptions } from 'vs/workbench/contrib/webview/common/webview';
import { IframeBasedElectronWebview } from 'vs/workbench/contrib/webview/electron-browser/iframeBasedElectronWebview';

export class WebviewService implements IWebviewService {
	_serviceBrand: any;

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) { }

	createWebview(
		options: WebviewOptions,
		contentOptions: WebviewContentOptions
	): Webview {
		webFrame.registerURLSchemeAsPrivileged('vscode-webview', {
			secure: true,
			corsEnabled: true,
			allowServiceWorkers: true
		});

		return this._instantiationService.createInstance(IframeBasedElectronWebview,
			options,
			contentOptions);
	}
}