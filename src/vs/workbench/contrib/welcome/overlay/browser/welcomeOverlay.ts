/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./welcomeOverlay';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { /*Parts,*/ IWorkbenchLayoutService } from 'vs/workbench/services/layout/browser/layoutService';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { Disposable } from 'vs/base/common/lifecycle';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';

// Importing types only
import { localize } from 'vs/nls';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { textPreformatForeground, foreground } from 'vs/platform/theme/common/colorRegistry';
import { Color } from 'vs/base/common/color';
import { append, addStandardDisposableListener, addClass, removeClass, $ } from 'vs/base/browser/dom';

export function init(
	_textPreformatForeground: typeof textPreformatForeground,
	_foreground: typeof foreground,
	_Color: typeof Color,
	_registerThemingParticipant: typeof registerThemingParticipant,
	_localize: typeof localize
) {
	// theming

	_registerThemingParticipant((theme, collector) => {
		const key = theme.getColor(_foreground);
		if (key) {
			collector.addRule(`.monaco-workbench > .welcomeOverlay > .key { color: ${key}; }`);
		}
		const backgroundColor = _Color.fromHex(theme.type === 'light' ? '#FFFFFF85' : '#00000085');
		if (backgroundColor) {
			collector.addRule(`.monaco-workbench > .welcomeOverlay { background: ${backgroundColor}; }`);
		}
		const shortcut = theme.getColor(_textPreformatForeground);
		if (shortcut) {
			collector.addRule(`.monaco-workbench > .welcomeOverlay > .key > .shortcut { color: ${shortcut}; }`);
		}
	});
}

interface Key {
	id: string;
	arrow?: string;
	label: string;
	command?: string;
	arrowLast?: boolean;
	withEditor?: boolean;
}

const keys: Key[] = [
	{
		id: 'explorer',
		arrow: '&larr;',
		label: localize('welcomeOverlay.explorer', "File explorer"),
		command: 'workbench.view.explorer'
	},
	{
		id: 'search',
		arrow: '&larr;',
		label: localize('welcomeOverlay.search', "Search across files"),
		command: 'workbench.view.search'
	},
	{
		id: 'git',
		arrow: '&larr;',
		label: localize('welcomeOverlay.git', "Source code management"),
		command: 'workbench.view.scm'
	},
	{
		id: 'debug',
		arrow: '&larr;',
		label: localize('welcomeOverlay.debug', "Launch and debug"),
		command: 'workbench.view.debug'
	},
	{
		id: 'extensions',
		arrow: '&larr;',
		label: localize('welcomeOverlay.extensions', "Manage extensions"),
		command: 'workbench.view.extensions'
	},
	// {
	// 	id: 'watermark',
	// 	arrow: '&larrpl;',
	// 	label: localize('welcomeOverlay.watermark', "Command Hints"),
	// 	withEditor: false
	// },
	{
		id: 'problems',
		arrow: '&larrpl;',
		label: localize('welcomeOverlay.problems', "View errors and warnings"),
		command: 'workbench.actions.view.problems'
	},
	{
		id: 'terminal',
		label: localize('welcomeOverlay.terminal', "Toggle integrated terminal"),
		command: 'workbench.action.terminal.toggleTerminal'
	},
	// {
	// 	id: 'openfile',
	// 	arrow: '&cudarrl;',
	// 	label: localize('welcomeOverlay.openfile', "File Properties"),
	// 	arrowLast: true,
	// 	withEditor: true
	// },
	{
		id: 'commandPalette',
		arrow: '&nwarr;',
		label: localize('welcomeOverlay.commandPalette', "Find and run all commands"),
		command: 'workbench.action.showCommands'
	},
	{
		id: 'notifications',
		arrow: '&cudarrr;',
		arrowLast: true,
		label: localize('welcomeOverlay.notifications', "Show notifications"),
		command: 'notifications.showList'
	}
];

export class WelcomeOverlay extends Disposable {

	private _overlayVisible: IContextKey<boolean>;
	private _overlay: HTMLElement;

	constructor(
		OVERLAY_VISIBLE: IContextKey<boolean>,
		private readonly _append: typeof append,
		private readonly _addStandardDisposableListener: typeof addStandardDisposableListener,
		private readonly _addClass: typeof addClass,
		private readonly _removeClass: typeof removeClass,
		private readonly _$: typeof $,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
		@IEditorService private readonly editorService: IEditorService,
		@ICommandService private readonly commandService: ICommandService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IKeybindingService private readonly keybindingService: IKeybindingService
	) {
		super();
		this._overlayVisible = (<any>OVERLAY_VISIBLE).bindTo(this._contextKeyService);
		this.create();
	}

	private create(): void {
		const container = this.layoutService.getContainer('workbench.parts.editor' as any)!;

		const offset = this.layoutService.getTitleBarOffset();
		this._overlay = this._append(container.parentElement!, this._$('.welcomeOverlay'));
		this._overlay.style.top = `${offset}px`;
		this._overlay.style.height = `calc(100% - ${offset}px)`;
		this._overlay.style.display = 'none';
		this._overlay.tabIndex = -1;

		this._register(this._addStandardDisposableListener(this._overlay, 'click', () => this.hide()));
		this.commandService.onWillExecuteCommand(() => this.hide());

		this._append(this._overlay, this._$('.commandPalettePlaceholder'));

		const editorOpen = !!this.editorService.visibleEditors.length;
		keys.filter(key => !('withEditor' in key) || key.withEditor === editorOpen)
			.forEach(({ id, arrow, label, command, arrowLast }) => {
				const div = this._append(this._overlay, this._$(`.key.${id}`));
				if (arrow && !arrowLast) {
					this._append(div, this._$('span.arrow')).innerHTML = arrow;
				}
				this._append(div, this._$('span.label')).textContent = label;
				if (command) {
					const shortcut = this.keybindingService.lookupKeybinding(command);
					if (shortcut) {
						this._append(div, this._$('span.shortcut')).textContent = shortcut.getLabel();
					}
				}
				if (arrow && arrowLast) {
					this._append(div, this._$('span.arrow')).innerHTML = arrow;
				}
			});
	}

	public show() {
		if (this._overlay.style.display !== 'block') {
			this._overlay.style.display = 'block';
			const workbench = document.querySelector('.monaco-workbench') as HTMLElement;
			this._addClass(workbench, 'blur-background');
			this._overlayVisible.set(true);
			this.updateProblemsKey();
			this._overlay.focus();
		}
	}

	private updateProblemsKey() {
		const problems = document.querySelector('div[id="workbench.parts.statusbar"] .statusbar-item.left .octicon.octicon-warning');
		const key = this._overlay.querySelector('.key.problems') as HTMLElement;
		if (problems instanceof HTMLElement) {
			const target = problems.getBoundingClientRect();
			const bounds = this._overlay.getBoundingClientRect();
			const bottom = bounds.bottom - target.top + 3;
			const left = (target.left + target.right) / 2 - bounds.left;
			key.style.bottom = bottom + 'px';
			key.style.left = left + 'px';
		} else {
			key.style.bottom = null;
			key.style.left = null;
		}
	}

	public hide() {
		if (this._overlay.style.display !== 'none') {
			this._overlay.style.display = 'none';
			const workbench = document.querySelector('.monaco-workbench') as HTMLElement;
			this._removeClass(workbench, 'blur-background');
			this._overlayVisible.reset();
		}
	}
}
