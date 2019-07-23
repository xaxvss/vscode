/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();

export class ZoomStatusBarEntry {
	private readonly _entry: vscode.StatusBarItem;

	constructor() {
		this._entry = vscode.window.createStatusBarItem({
			id: 'imagePreview.zoom',
			name: 'Image Zoom',
			alignment: vscode.StatusBarAlignment.Right,
			priority: 102 /* to the left of editor size entry (101) */,
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


	public update(scale: number | 'fit') {
		this._entry.text = scale === 'fit'
			? localize('zoom.action.fit.label', 'Whole Image')
			: `${Math.round(scale * 100)}%`;
	}
}