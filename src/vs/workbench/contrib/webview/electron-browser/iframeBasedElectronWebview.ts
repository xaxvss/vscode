/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { memoize } from 'vs/base/common/decorators';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IFileService } from 'vs/platform/files/common/files';
import { ITunnelService } from 'vs/platform/remote/common/tunnel';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IFrameWebview } from 'vs/workbench/contrib/webview/browser/webviewElement';
import { WebviewContentOptions, WebviewOptions } from 'vs/workbench/contrib/webview/common/webview';

export class IframeBasedElectronWebview extends IFrameWebview {
	_endpoint: string;

	constructor(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		@IThemeService themeService: IThemeService,
		@ITunnelService tunnelService: ITunnelService,
		@IFileService fileService: IFileService,
		@IConfigurationService configurationService: IConfigurationService,
		@IEnvironmentService environmentService: IEnvironmentService,
	) {
		super(id, options, contentOptions, themeService, tunnelService, fileService, configurationService, environmentService);
	}


	@memoize
	protected get endpoint() { return `vscode-webview://${Date.now()}.webview`; }
}