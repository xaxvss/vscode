/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UnownedDisposable } from 'vs/base/common/lifecycle';
import { endsWith } from 'vs/base/common/strings';
import { URI } from 'vs/base/common/uri';
import { generateUuid } from 'vs/base/common/uuid';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IConstructorSignature0 } from 'vs/platform/instantiation/common/instantiation';
import { Registry } from 'vs/platform/registry/common/platform';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IWindowService } from 'vs/platform/windows/common/windows';
import { EditorDescriptor, Extensions as EditorExtensions, IEditorRegistry } from 'vs/workbench/browser/editor';
import { BaseEditor } from 'vs/workbench/browser/parts/editor/baseEditor';
import { EditorOptions } from 'vs/workbench/common/editor';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';
import { WebviewEditor } from 'vs/workbench/contrib/webview/browser/webviewEditor';
import { WebviewEditorInput } from 'vs/workbench/contrib/webview/browser/webviewEditorInput';
import { IWebviewEditorService } from 'vs/workbench/contrib/webview/browser/webviewEditorService';
import { contributionPoint, IWebviewService } from 'vs/workbench/contrib/webview/common/webview';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { CancellationToken } from 'vs/base/common/cancellation';

contributionPoint.setHandler(extensions => {
	for (const extension of extensions) {
		for (const webviewEditorContribution of extension.value) {
			const editorClass = createCustomWebviewEditorClass(webviewEditorContribution.viewType);
			Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
				new CustomEditorDescriptor(
					editorClass,
					editorClass.ID,
					webviewEditorContribution.displayName,
					webviewEditorContribution.extensions || [],
				), [
					new SyncDescriptor(FileEditorInput)
				]);
		}
	}
});

class CustomEditorDescriptor extends EditorDescriptor {
	constructor(
		ctor: IConstructorSignature0<BaseEditor>,
		id: string,
		name: string,
		private readonly extensions: readonly string[]
	) {
		super(ctor, id, name);
	}

	isPreferredEditorForResource(resource: URI | undefined) {
		if (!resource) {
			return false;
		}
		return this.extensions.some(extension => endsWith(resource.toString(), extension));
	}
}

function createCustomWebviewEditorClass(viewType: string) {
	class CustomWebviewEditor extends WebviewEditor {
		public static readonly ID = `webviewEditor.${viewType}`;

		constructor(
			@IWebviewService private readonly _webviewService: IWebviewService,
			@IWebviewEditorService private readonly _webviewEditorService: IWebviewEditorService,
			@ITelemetryService telemetryService: ITelemetryService,
			@IThemeService themeService: IThemeService,
			@IContextKeyService contextKeyService: IContextKeyService,
			@IEditorService editorService: IEditorService,
			@IWindowService windowService: IWindowService,
			@IStorageService storageService: IStorageService,
		) {
			super(telemetryService, themeService, contextKeyService, editorService, windowService, storageService);
		}

		async setInput(
			input: WebviewEditorInput,
			options: EditorOptions,
			token: CancellationToken
		): Promise<void> {
			const id = generateUuid();
			const webview = this._webviewService.createWebviewEditorOverlay(id, {}, {});
			const webviewInput = new WebviewEditorInput(id, viewType, input.getName(), undefined, new UnownedDisposable(webview));
			await this._webviewEditorService.resolveWebviewEditor(viewType, input.getResource(), webviewInput);
			return super.setInput(webviewInput, options, token);
		}
	}

	return CustomWebviewEditor;
}
