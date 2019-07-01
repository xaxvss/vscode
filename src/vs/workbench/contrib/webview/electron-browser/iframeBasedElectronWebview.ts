/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IFileService } from 'vs/platform/files/common/files';
import { ITunnelService } from 'vs/platform/remote/common/tunnel';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IFrameWebview } from 'vs/workbench/contrib/webview/browser/webviewElement';
import { WebviewContentOptions, WebviewOptions } from 'vs/workbench/contrib/webview/common/webview';

export class IframeBasedElectronWebview extends IFrameWebview {
	constructor(
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		@IThemeService themeService: IThemeService,
		@ITunnelService tunnelService: ITunnelService,
		@IFileService fileService: IFileService,
		@IConfigurationService configurationService: IConfigurationService,
	) {
		super(`vscode-webview://${Date.now()}.webview`, options, contentOptions, themeService, tunnelService, fileService, configurationService);
	}
}