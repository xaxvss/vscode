/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Preview } from './preview';

export function activate(context: vscode.ExtensionContext) {
	const extensionRoot = vscode.Uri.file(context.extensionPath);
	context.subscriptions.push(vscode.window.registerWebviewEditorProvider(Preview.viewType, new PreviewProvider(extensionRoot)));
}

class PreviewProvider implements vscode.WebviewEditorProvider {
	constructor(
		private readonly extensionRoot: vscode.Uri
	) { }

	public async resolveWebviewEditor(resource: vscode.Uri, editor: vscode.WebviewEditor): Promise<void> {
		// tslint:disable-next-line: no-unused-expression
		new Preview(this.extensionRoot, resource, editor);
	}
}