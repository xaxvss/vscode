/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IFrameWebview as WebviewElement } from 'vs/workbench/contrib/webview/browser/webviewElement';
import { IWebviewService, Webview, WebviewContentOptions, WebviewOptions } from 'vs/workbench/contrib/webview/common/webview';

export class WebviewService implements IWebviewService {
	_serviceBrand: any;

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IEnvironmentService private readonly _environmentService: IEnvironmentService,
	) { }

	createWebview(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions
	): Webview {
		if (typeof this._environmentService.webviewEndpoint !== 'string') {
			throw new Error('To use iframe based webviews, you must configure `environmentService.webviewEndpoint`');
		}

		return this._instantiationService.createInstance(WebviewElement,
			id,
			options,
			contentOptions);
	}
}