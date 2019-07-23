/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export class SizeStatusBarEntry {
	private readonly _entry: vscode.StatusBarItem;

	constructor() {
		this._entry = vscode.window.createStatusBarItem({
			id: 'imagePreview.size',
			name: 'Image Size',
			alignment: vscode.StatusBarAlignment.Right,
			priority: 101 /* to the left of editor status (100) */,
		});
	}

	public dispose() {
		this._entry.dispose();
	}

	public show() {
		this._entry.show();
	}

	public hide() {
		this._entry.hide();
	}

	public update(text: string) {
		this._entry.text = text;
	}
}