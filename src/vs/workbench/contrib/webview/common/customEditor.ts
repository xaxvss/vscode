/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';


export const ICustomEditorService = createDecorator<ICustomEditorService>('customEditorService');

/**
 * Handles the creation of webview elements.
 */
export interface ICustomEditorService {
	_serviceBrand: any;

	getCustomEditorsForResource(resource: URI): Promise<readonly CustomEditorInfo[]>;

	setCustomEditorForResource(input: FileEditorInput, customEditor: CustomEditorInfo): void;
}

export interface CustomEditorInfo {
	readonly id: string;
	readonly displayName: string;
}