/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export class Preview {

	public static readonly viewType = 'imagePreview.previewEditor';

	constructor(
		private readonly extensionRoot: vscode.Uri,
		resource: vscode.Uri,
		private readonly webviewEditor: vscode.WebviewEditor
	) {
		const resourceRoot = resource.with({
			path: resource.path.replace(/\/[^\/]+?\.\w+$/, '/'),
		});
		webviewEditor.webview.options = {
			enableScripts: true,

			localResourceRoots: [
				resourceRoot,
				extensionRoot,
			]
		};

		webviewEditor.webview.html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="ie=edge">
	<title>Image Preview</title>
	<link rel="stylesheet" class="code-user-style" href="${escapeAttribute(this.extensionResource('/media/main.css'))}" type="text/css" media="screen">
</head>
<body>
	<div class="container image scale-to-fit">
		<img src="${escapeAttribute(webviewEditor.webview.toWebviewResource(resource))}">
	</div>
	<script src="${escapeAttribute(this.extensionResource('/media/main.js'))}"></script>
</body>
</html>`;
	}

	private extensionResource(path: string) {
		return this.webviewEditor.webview.toWebviewResource(this.extensionRoot.with({
			path: this.extensionRoot.path + path
		}));
	}
}

function escapeAttribute(value: string | vscode.Uri): string {
	return value.toString().replace(/"/g, '&quot;');
}
