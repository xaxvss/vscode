/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./welcomeOverlay';
import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkbenchActionRegistry, Extensions } from 'vs/workbench/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { IWelcomeOverlay } from 'vs/workbench/contrib/welcome/overlay/browser/welcomeOverlayApi';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { WelcomeOverlay } from 'vs/workbench/contrib/welcome/overlay/browser/welcomeOverlay';
import { Action } from 'vs/base/common/actions';
import { KeyCode } from 'vs/base/common/keyCodes';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { append, addStandardDisposableListener, addClass, removeClass, $ } from 'vs/base/browser/dom';

let WelcomeOverlayCtor: typeof WelcomeOverlay;
let welcomeOverlay: IWelcomeOverlay;

class WelcomeOverlayAction extends Action {

	public static readonly ID = 'workbench.action.showInterfaceOverview';
	public static readonly LABEL = localize('welcomeOverlay', "User Interface Overview");

	constructor(
		id: string,
		label: string,
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) {
		super(id, label);
	}

	public async run(): Promise<void> {
		if (!WelcomeOverlayCtor) {
			// tslint:disable-next-line
			WelcomeOverlayCtor = (await import('vs/workbench/contrib/welcome/overlay/browser/welcomeOverlay')).WelcomeOverlay;
		}
		if (!welcomeOverlay) {
			welcomeOverlay = this.instantiationService.createInstance(WelcomeOverlayCtor, OVERLAY_VISIBLE as any, append, addStandardDisposableListener, addClass, removeClass, $);
		}
		welcomeOverlay.show();
		return Promise.resolve();
	}
}

class HideWelcomeOverlayAction extends Action {

	public static readonly ID = 'workbench.action.hideInterfaceOverview';
	public static readonly LABEL = localize('hideWelcomeOverlay', "Hide Interface Overview");

	constructor(
		id: string,
		label: string
	) {
		super(id, label);
	}

	public run(): Promise<void> {
		if (welcomeOverlay) {
			welcomeOverlay.hide();
		}
		return Promise.resolve();
	}
}

const OVERLAY_VISIBLE = new RawContextKey<boolean>('interfaceOverviewVisible', false);

Registry.as<IWorkbenchActionRegistry>(Extensions.WorkbenchActions)
	.registerWorkbenchAction(new SyncActionDescriptor(WelcomeOverlayAction, WelcomeOverlayAction.ID, WelcomeOverlayAction.LABEL), 'Help: User Interface Overview', localize('help', "Help"));

Registry.as<IWorkbenchActionRegistry>(Extensions.WorkbenchActions)
	.registerWorkbenchAction(new SyncActionDescriptor(HideWelcomeOverlayAction, HideWelcomeOverlayAction.ID, HideWelcomeOverlayAction.LABEL, { primary: KeyCode.Escape }, OVERLAY_VISIBLE), 'Help: Hide Interface Overview', localize('help', "Help"));