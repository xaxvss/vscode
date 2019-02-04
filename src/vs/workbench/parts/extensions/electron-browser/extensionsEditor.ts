/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/extensionsEditor';
import * as dom from 'vs/base/browser/dom';
import { ObjectTree } from 'vs/base/browser/ui/tree/objectTree';
import { IListVirtualDelegate, IListContextMenuEvent } from 'vs/base/browser/ui/list/list';
import { ITreeRenderer, ITreeNode } from 'vs/base/browser/ui/tree/tree';
import { CountBadge } from 'vs/base/browser/ui/countBadge/countBadge';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { ActionBar, Separator } from 'vs/base/browser/ui/actionbar/actionbar';
import { IPagedRenderer } from 'vs/base/browser/ui/list/listPaging';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IExtensionsWorkbenchService, IExtension, ExtensionContainers } from 'vs/workbench/parts/extensions/common/extensions';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IExtensionManagementServerService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { RecommendationWidget, RemoteBadgeWidget, InstallCountWidget, RatingsWidget, Label } from 'vs/workbench/parts/extensions/electron-browser/extensionsWidgets';
import { Action, IAction } from 'vs/base/common/actions';
import { ManageExtensionAction, ExtensionActionItem, StatusLabelAction, UpdateAction, ReloadAction, InstallAction, MaliciousStatusLabelAction } from 'vs/workbench/parts/extensions/electron-browser/extensionsActions';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { domEvent } from 'vs/base/browser/event';
import { Event } from 'vs/base/common/event';
import { BaseEditor } from 'vs/workbench/browser/parts/editor/baseEditor';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { SearchWidget } from 'vs/workbench/parts/preferences/browser/preferencesWidgets';
import { WorkbenchPagedList } from 'vs/platform/list/browser/listService';
import { localize } from 'vs/nls';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { isPromiseCanceledError } from 'vs/base/common/errors';
import { createErrorWithActions } from 'vs/base/common/errorsWithActions';
import { OpenGlobalSettingsAction } from 'vs/workbench/parts/preferences/browser/preferencesActions';
import { EditorOptions, EditorInput } from 'vs/workbench/common/editor';
import { CancellationToken } from 'vscode';
import { IPagedModel, DelayedPagedModel, PagedModel } from 'vs/base/common/paging';
import { Delayer } from 'vs/base/common/async';
import { ExtensionType } from 'vs/platform/extensions/common/extensions';
import { StandardKeyboardEvent } from 'vs/base/browser/keyboardEvent';
import { KeyCode } from 'vs/base/common/keyCodes';

export class ExtensionsEditorInput extends EditorInput {

	static readonly ID = 'workbench.extensions.input';

	getTypeId(): string {
		return ExtensionsEditorInput.ID;
	}

	getName(): string {
		return localize('extensions', "Extensions");
	}

	resolve(): Promise<any> {
		return Promise.resolve(null);
	}

}

export type TOCEntry =
	'INSTALLED' |
	'INSTALLED/RUNNING' |
	'INSTALLED/ACTIVE' |
	'INSTALLED/DISABLED' |
	'INSTALLED/OUTDATED' |

	'RECOMMENDATIONS' |
	'RECOMMENDATIONS/WORKSPACE' |
	'RECOMMENDATIONS/OTHER' |

	'MARKETPLACE' |
	'MARKETPLACE/AZURE' |
	'MARKETPLACE/DEBUGGERS' |
	'MARKETPLACE/EXTENSION_PACKS' |
	'MARKETPLACE/FORMATTERS' |
	'MARKETPLACE/KEYMAPS' |
	'MARKETPLACE/LANGUAGE_PACKS' |
	'MARKETPLACE/LINTERS' |
	'MARKETPLACE/PROGRAMMING_LANGUAGES' |
	'MARKETPLACE/SCM_PROVIDERS' |
	'MARKETPLACE/SNIPPETS' |
	'MARKETPLACE/THEMES'
	;

export class TOCTreeVirtualDelegate implements IListVirtualDelegate<TOCEntry> {

	constructor() { }

	getHeight(): number {
		return 30;
	}

	getTemplateId(element: TOCEntry): string {
		return 'tocEntry';
	}
}

export interface TOCEntryTemplateData {
	tocLabel: HTMLElement;
	badge: CountBadge;
}

export class TOCEntryRenderer implements ITreeRenderer<TOCEntry, void, TOCEntryTemplateData> {

	templateId = 'tocEntry';

	renderTemplate(container: HTMLElement): TOCEntryTemplateData {
		const root = dom.append(container, dom.$('div.table-of-contents-entry'));
		const tocLabel = dom.append(root, dom.$('div.label'));
		const badge = new CountBadge(dom.append(root, dom.$('div.count')));
		return { tocLabel, badge };
	}

	renderElement({ element }: ITreeNode<TOCEntry, void>, index: number, templateData: TOCEntryTemplateData): void {
		dom.addClass(templateData.badge.element, 'hide');
		switch (element) {
			case 'INSTALLED':
				templateData.tocLabel.textContent = 'Local';
				return;
			case 'INSTALLED/RUNNING':
				templateData.tocLabel.textContent = 'Enabled';
				return;
			case 'INSTALLED/ACTIVE':
				templateData.tocLabel.textContent = 'Running';
				return;
			case 'INSTALLED/DISABLED':
				templateData.tocLabel.textContent = 'Disabled';
				return;
			case 'INSTALLED/OUTDATED':
				templateData.tocLabel.textContent = 'Outdated';
				return;

			case 'RECOMMENDATIONS':
				templateData.tocLabel.textContent = 'Recommendations';
				return;
			case 'RECOMMENDATIONS/WORKSPACE':
				templateData.tocLabel.textContent = 'Workspace';
				return;
			case 'RECOMMENDATIONS/OTHER':
				templateData.tocLabel.textContent = 'Others';
				return;

			case 'MARKETPLACE':
				templateData.tocLabel.textContent = 'Marketplace';
				return;
			case 'MARKETPLACE/AZURE':
				templateData.tocLabel.textContent = 'Azure';
				return;
			case 'MARKETPLACE/DEBUGGERS':
				templateData.tocLabel.textContent = 'Debuggers';
				return;
			case 'MARKETPLACE/EXTENSION_PACKS':
				templateData.tocLabel.textContent = 'Extension Packs';
				return;
			case 'MARKETPLACE/FORMATTERS':
				templateData.tocLabel.textContent = 'Formatters';
				return;
			case 'MARKETPLACE/KEYMAPS':
				templateData.tocLabel.textContent = 'Keymaps';
				return;
			case 'MARKETPLACE/LANGUAGE_PACKS':
				templateData.tocLabel.textContent = 'Language Packs';
				return;
			case 'MARKETPLACE/LINTERS':
				templateData.tocLabel.textContent = 'Linters';
				return;
			case 'MARKETPLACE/PROGRAMMING_LANGUAGES':
				templateData.tocLabel.textContent = 'Programming Languages';
				return;
			case 'MARKETPLACE/SCM_PROVIDERS':
				templateData.tocLabel.textContent = 'SCM Providers';
				return;
			case 'MARKETPLACE/SNIPPETS':
				templateData.tocLabel.textContent = 'Snippets';
				return;
			case 'MARKETPLACE/THEMES':
				templateData.tocLabel.textContent = 'Themes';
				return;
		}
	}

	disposeTemplate(templateData: TOCEntryTemplateData): void {
	}

}

export type NavigationEntry =
	'USER' |

	'SYSTEM' |
	'SYSTEM/PROGRAMMING_LANGUAGES' |
	'SYSTEM/FEATURES' |
	'SYSTEM/THEMES' |

	'WORKSPACE' |
	'OTHERS'
	;

export class NavigationTreeVirtualDelegate implements IListVirtualDelegate<NavigationEntry> {

	constructor() { }

	getHeight(): number {
		return 22;
	}

	getTemplateId(element: NavigationEntry): string {
		return 'navigationEntry';
	}
}

export interface NavigationEntryTemplateData {
	label: HTMLElement;
	badge: CountBadge;
}

export class NavigationEntryRenderer implements ITreeRenderer<NavigationEntry, void, NavigationEntryTemplateData> {

	templateId = 'navigationEntry';

	renderTemplate(container: HTMLElement): NavigationEntryTemplateData {
		const root = dom.append(container, dom.$('div.navigation-entry'));
		const label = dom.append(root, dom.$('div.label'));
		const badge = new CountBadge(dom.append(root, dom.$('div.count')));
		return { label, badge };
	}

	renderElement({ element }: ITreeNode<NavigationEntry, void>, index: number, templateData: NavigationEntryTemplateData): void {
		dom.addClass(templateData.badge.element, 'hide');
		switch (element) {
			case 'USER':
				templateData.label.textContent = 'User';
				return;

			case 'SYSTEM':
				templateData.label.textContent = 'Built-in';
				return;
			case 'SYSTEM/PROGRAMMING_LANGUAGES':
				templateData.label.textContent = 'Programming Languages';
				return;
			case 'SYSTEM/FEATURES':
				templateData.label.textContent = 'Features';
				return;
			case 'SYSTEM/THEMES':
				templateData.label.textContent = 'Themes';
				return;

			case 'WORKSPACE':
				templateData.label.textContent = 'Workspace';
				return;
			case 'OTHERS':
				templateData.label.textContent = 'Others';
				return;
		}
	}

	disposeTemplate(templateData: NavigationEntryTemplateData): void {
	}

}

export interface IExtensionTemplateData {
	root: HTMLElement;
	element: HTMLElement;
	icon: HTMLImageElement;
	name: HTMLElement;
	identifier: HTMLElement;
	preview: HTMLElement;
	publisher: HTMLElement;
	builtIn: HTMLElement;
	installCount: HTMLElement;
	ratings: HTMLElement;
	description: HTMLElement;
	extension: IExtension;
	disposables: IDisposable[];
	extensionDisposables: IDisposable[];
}

export class Delegate implements IListVirtualDelegate<IExtension> {
	getHeight() { return 120; }
	getTemplateId() { return 'extension'; }
}

const actionOptions = { icon: true, label: true, tabOnlyOnFocus: true };

export class ExtensionRenderer implements IPagedRenderer<IExtension, IExtensionTemplateData> {

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@INotificationService private readonly notificationService: INotificationService,
		@IExtensionsWorkbenchService private readonly extensionsWorkbenchService: IExtensionsWorkbenchService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService
	) { }

	get templateId() { return 'extension'; }

	renderTemplate(root: HTMLElement): IExtensionTemplateData {
		const recommendationWidget = this.instantiationService.createInstance(RecommendationWidget, root);
		const element = dom.append(root, dom.$('.extension'));
		const iconContainer = dom.append(element, dom.$('.icon-container'));
		const icon = dom.append(iconContainer, dom.$<HTMLImageElement>('img.icon'));
		const badgeWidget = this.instantiationService.createInstance(RemoteBadgeWidget, iconContainer);

		const details = dom.append(element, dom.$('.details'));
		const title = dom.append(details, dom.$('.title'));
		const name = dom.append(title, dom.$('span.name', { title: localize('name', "Extension name") }));
		const identifier = dom.append(title, dom.$('span.identifier', { title: localize('extension id', "Extension identifier") }));
		const preview = dom.append(title, dom.$('span.preview'));
		const version = dom.append(title, dom.$('span.version'));
		const subtitle = dom.append(details, dom.$('.subtitle'));
		const publisher = dom.append(subtitle, dom.$('span.publisher', { title: localize('publisher', "Publisher name") }));
		const builtIn = dom.append(subtitle, dom.$('span.builtin'));
		builtIn.textContent = localize('builtin', "Built-in");
		const installCount = dom.append(subtitle, dom.$('span.install', { title: localize('install count', "Install count") }));
		const ratings = dom.append(subtitle, dom.$('span.rating', { title: localize('rating', "Rating") }));
		const description = dom.append(details, dom.$('.description'));

		const actionsContainer = dom.append(details, dom.$('.actions-container'));
		const actionbar = new ActionBar(dom.append(actionsContainer, dom.$('.actions')), {
			animated: false,
			actionItemProvider: (action: Action) => {
				if (action.id === ManageExtensionAction.ID) {
					return (<ManageExtensionAction>action).createActionItem();
				}
				return new ExtensionActionItem(null, action, actionOptions);
			}
		});
		const reloadText = dom.append(actionsContainer, dom.$('.reload-text'));

		const widgets = [
			recommendationWidget,
			badgeWidget,
			this.instantiationService.createInstance(Label, version, e => e.version),
			this.instantiationService.createInstance(InstallCountWidget, installCount, false),
			this.instantiationService.createInstance(RatingsWidget, ratings, false)
		];
		const reloadAction = this.instantiationService.createInstance(ReloadAction);
		const primaryActions = [
			this.instantiationService.createInstance(InstallAction),
			this.instantiationService.createInstance(ManageExtensionAction),
			this.instantiationService.createInstance(UpdateAction),
			reloadAction,
			this.instantiationService.createInstance(StatusLabelAction),
			this.instantiationService.createInstance(MaliciousStatusLabelAction, true),
		];
		actionbar.push(primaryActions, actionOptions);

		const extensionContainers: ExtensionContainers = this.instantiationService.createInstance(ExtensionContainers, [...primaryActions, ...widgets]);
		const disposables = [...primaryActions, ...widgets, actionbar, extensionContainers];
		actionbar.onDidRun(({ error }) => error && this.notificationService.error(error), this, disposables);

		reloadAction.onDidChange(e => {
			if (e.tooltip) {
				reloadText.textContent = reloadAction.tooltip;
				dom.show(reloadText);
			}
			if (e.enabled === true) {
				dom.show(reloadText);
			}
			if (e.enabled === false) {
				dom.hide(reloadText);
			}
		}, this, disposables);

		return {
			root, element, icon, name, identifier, preview, publisher, builtIn, installCount, ratings, description, disposables,
			extensionDisposables: [],
			set extension(extension: IExtension) {
				extensionContainers.extension = extension;
			}
		};
	}

	renderPlaceholder(index: number, data: IExtensionTemplateData): void {
		dom.addClass(data.element, 'loading');

		data.root.removeAttribute('aria-label');
		data.extensionDisposables = dispose(data.extensionDisposables);
		data.icon.src = '';
		data.name.textContent = '';
		data.identifier.textContent = '';
		data.preview.style.display = 'none';
		data.preview.textContent = '';
		data.publisher.textContent = '';
		data.builtIn.style.display = 'none';
		data.installCount.style.display = 'none';
		data.ratings.style.display = 'none';
		data.description.textContent = '';
		data.extension = null;
	}

	renderElement(extension: IExtension, index: number, data: IExtensionTemplateData): void {
		dom.removeClass(data.element, 'loading');

		data.extensionDisposables = dispose(data.extensionDisposables);

		const updateEnablement = async () => {
			const runningExtensions = await this.extensionService.getExtensions();
			const installed = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, extension.identifier))[0];
			if (installed && installed.local) {
				const installedExtensionServer = this.extensionManagementServerService.getExtensionManagementServer(installed.local.location);
				const isSameExtensionRunning = runningExtensions.some(e => {
					if (!areSameExtensions({ id: e.identifier.value }, extension.identifier)) {
						return false;
					}
					const runningExtensionServer = this.extensionManagementServerService.getExtensionManagementServer(e.extensionLocation);
					if (!installedExtensionServer || !runningExtensionServer) {
						return false;
					}
					return installedExtensionServer.authority === runningExtensionServer.authority;
				});
				dom.toggleClass(data.root, 'disabled', !isSameExtensionRunning);
			} else {
				dom.removeClass(data.root, 'disabled');
			}
		};
		updateEnablement();
		this.extensionService.onDidChangeExtensions(() => updateEnablement(), this, data.extensionDisposables);

		const onError = Event.once(domEvent(data.icon, 'error'));
		onError(() => data.icon.src = extension.iconUrlFallback, null, data.extensionDisposables);
		data.icon.src = extension.iconUrl;

		if (!data.icon.complete) {
			data.icon.style.visibility = 'hidden';
			data.icon.onload = () => data.icon.style.visibility = 'inherit';
		} else {
			data.icon.style.visibility = 'inherit';
		}

		data.name.textContent = extension.displayName;
		data.identifier.textContent = extension.identifier.id;
		data.preview.style.display = extension.preview ? '' : 'none';
		data.preview.textContent = extension.preview ? localize('preview', "Preview") : '';
		data.publisher.textContent = extension.publisherDisplayName;
		data.description.textContent = extension.description;
		data.installCount.style.display = '';
		data.builtIn.style.display = extension.type === ExtensionType.System ? '' : 'none';
		data.ratings.style.display = '';
		data.extension = extension;

		if (extension.gallery && extension.gallery.properties && extension.gallery.properties.localizedLanguages && extension.gallery.properties.localizedLanguages.length) {
			data.description.textContent = extension.gallery.properties.localizedLanguages.map(name => name[0].toLocaleUpperCase() + name.slice(1)).join(', ');
		}
	}

	disposeTemplate(data: IExtensionTemplateData): void {
		data.disposables = dispose(data.disposables);
	}
}

export class ExtensionsEditor extends BaseEditor {

	static readonly ID: string = 'workbench.editor.extensions';
	static SEARCH_WIDGET_HEIGHT = 50;

	private tocContainer: HTMLElement;
	private tocTree: ObjectTree<TOCEntry>;
	private searchWidget: SearchWidget;
	private extensionsListContainer: HTMLElement;
	private extensionsList: WorkbenchPagedList<IExtension>;
	private navigationTreeContainer: HTMLElement;
	private navigationTree: ObjectTree<NavigationEntry>;
	private delayedFiltering: Delayer<void>;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IExtensionsWorkbenchService private readonly extensionsWorkbenchService: IExtensionsWorkbenchService,
		@IThemeService protected themeService: IThemeService,
		@INotificationService private readonly notificationService: INotificationService,
		@IStorageService storageService: IStorageService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IEditorService private readonly editorService: IEditorService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService
	) {
		super(ExtensionsEditor.ID, telemetryService, themeService, storageService);
		this.delayedFiltering = new Delayer<void>(300);
	}

	createEditor(parent: HTMLElement): void {
		const extensionsEditor = dom.append(parent, dom.$('div.extensions-editor'));

		const leftContainer = dom.append(extensionsEditor, dom.$('div.left-container'));
		leftContainer.style.marginTop = ExtensionsEditor.SEARCH_WIDGET_HEIGHT + 'px';
		this.createTableOfContents(leftContainer);

		const extensionsContainer = dom.append(extensionsEditor, dom.$('div.extensions-container'));
		this.createSearchWidget(extensionsContainer);
		this.createExtensionsList(extensionsContainer);

		const rightContainer = dom.append(extensionsEditor, dom.$('div.right-container'));
		rightContainer.style.marginTop = ExtensionsEditor.SEARCH_WIDGET_HEIGHT + 'px';
		this.createNavigationTree(rightContainer);
	}

	async setInput(input: ExtensionsEditorInput, options: EditorOptions, token: CancellationToken): Promise<void> {
		this.tocTree.setSelection(['INSTALLED/RUNNING']);
	}

	layout(dimension: dom.Dimension): void {
		const treeHeight = dimension.height - ExtensionsEditor.SEARCH_WIDGET_HEIGHT;
		this.tocContainer.style.height = treeHeight + 'px';
		this.tocTree.layout(treeHeight);
		this.extensionsListContainer.style.height = treeHeight + 'px';
		this.extensionsList.layout(treeHeight);
		this.navigationTreeContainer.style.height = treeHeight + 'px';
		this.navigationTree.layout(treeHeight);
	}

	private createTableOfContents(parent: HTMLElement): void {
		this.tocContainer = dom.append(parent, dom.$('div.table-of-contents-container'));
		this.tocTree = new ObjectTree<TOCEntry>(
			this.tocContainer,
			new TOCTreeVirtualDelegate(),
			[new TOCEntryRenderer()],
			{
				multipleSelectionSupport: false,
			}
		);
		this.tocTree.setChildren(null, [
			{
				element: 'RECOMMENDATIONS',
			},
			{
				element: 'MARKETPLACE',
				children: [
					{ element: 'MARKETPLACE/AZURE' },
					{ element: 'MARKETPLACE/DEBUGGERS' },
					{ element: 'MARKETPLACE/EXTENSION_PACKS' },
					{ element: 'MARKETPLACE/FORMATTERS' },
					{ element: 'MARKETPLACE/KEYMAPS' },
					{ element: 'MARKETPLACE/LANGUAGE_PACKS' },
					{ element: 'MARKETPLACE/LINTERS' },
					{ element: 'MARKETPLACE/PROGRAMMING_LANGUAGES' },
					{ element: 'MARKETPLACE/SCM_PROVIDERS' },
					{ element: 'MARKETPLACE/SNIPPETS' },
					{ element: 'MARKETPLACE/THEMES' }
				]
			},
			{
				element: 'INSTALLED',
				children: [
					{ element: 'INSTALLED/RUNNING' },
					{ element: 'INSTALLED/ACTIVE' },
					{ element: 'INSTALLED/DISABLED' },
					{ element: 'INSTALLED/OUTDATED' }
				]
			}

		]);
		this._register(this.tocTree.onDidChangeSelection(e => {
			if (e.elements.length) {
				this.onDidChangeTOCEntrySelection(e.elements[0]);
			}
		}));
	}

	private createSearchWidget(parent: HTMLElement): void {
		const searchContainer = dom.append(parent, dom.$('.search-container'));
		searchContainer.style.height = ExtensionsEditor.SEARCH_WIDGET_HEIGHT + 'px';
		this.searchWidget = this._register(this.instantiationService.createInstance(SearchWidget, searchContainer, {
			ariaLabel: 'Type to search extensions',
			placeholder: 'Type to search extensions'
		}));
		this._register(dom.addDisposableListener(this.searchWidget.inputBox.element, dom.EventType.INPUT, () => {
			this.delayedFiltering.trigger(() => this.showResults());
		}));
		this._register(dom.addDisposableListener(this.searchWidget.inputBox.element, dom.EventType.KEY_DOWN, (event) => {
			const e = new StandardKeyboardEvent(event);
			if (e.equals(KeyCode.Escape)) {
				this.onDidChangeTOCEntrySelection(this.tocTree.getSelection()[0]);
				e.preventDefault();
			}
		}));
	}

	private createExtensionsList(parent: HTMLElement): void {
		const delegate = new Delegate();
		this.extensionsListContainer = dom.append(parent, dom.$('div.extensions-list'));
		this.extensionsList = this._register(this.instantiationService.createInstance(WorkbenchPagedList, this.extensionsListContainer, delegate, [this.instantiationService.createInstance(ExtensionRenderer)], {
			ariaLabel: localize('extensions', "Extensions"),
			multipleSelectionSupport: false,
			setRowLineHeight: false,
			horizontalScrolling: false
		})) as WorkbenchPagedList<IExtension>;
		this._register(this.extensionsList.onContextMenu(e => this.onContextMenu(e)));

		this._register(Event.chain(this.extensionsList.onOpen)
			.map(e => e.elements[0])
			.filter(e => !!e)
			.on(e => this.openExtension(e)));

		this._register(Event.chain(this.extensionsList.onPin)
			.map(e => e.elements[0])
			.filter(e => !!e)
			.on(this.pin));
	}

	private createNavigationTree(parent: HTMLElement): void {
		this.navigationTreeContainer = dom.append(parent, dom.$('div.navigation-tree-container'));
		this.navigationTree = new ObjectTree<NavigationEntry>(
			this.navigationTreeContainer,
			new NavigationTreeVirtualDelegate(),
			[new NavigationEntryRenderer()],
			{
				multipleSelectionSupport: false,
			}
		);
		this.navigationTree.setChildren(null, [
			{
				element: 'USER',
			},
			{
				element: 'SYSTEM',
				children: [
					{ element: 'SYSTEM/PROGRAMMING_LANGUAGES' },
					{ element: 'SYSTEM/THEMES' },
					{ element: 'SYSTEM/FEATURES' }
				]
			}
		]);
		this._register(this.navigationTree.onDidChangeSelection(e => {
			if (e.elements.length) {
				this.onDidChangeNavigationEntrySelection(e.elements[0]);
			}
		}));
	}

	private async onDidChangeTOCEntrySelection(entry: TOCEntry): Promise<void> {
		switch (entry) {
			case 'INSTALLED':
				this.searchWidget.setValue('@local ');
				break;
			case 'INSTALLED/RUNNING':
				this.searchWidget.setValue('@enabled ');
				break;
			case 'INSTALLED/ACTIVE':
				this.searchWidget.setValue('@running ');
				break;
			case 'INSTALLED/DISABLED':
				this.searchWidget.setValue('@disabled ');
				break;
			case 'INSTALLED/OUTDATED':
				this.searchWidget.setValue('@outdated ');
				break;

			case 'MARKETPLACE/AZURE':
				this.searchWidget.setValue('category:Azure ');
				break;
			case 'MARKETPLACE/DEBUGGERS':
				this.searchWidget.setValue('category:Debuggers ');
				break;
			case 'MARKETPLACE/EXTENSION_PACKS':
				this.searchWidget.setValue('category:"Extension Packs" ');
				break;
			case 'MARKETPLACE/FORMATTERS':
				this.searchWidget.setValue('category:Formatters ');
				break;
			case 'MARKETPLACE/KEYMAPS':
				this.searchWidget.setValue('category:Keymaps ');
				break;
			case 'MARKETPLACE/LANGUAGE_PACKS':
				this.searchWidget.setValue('category:"Language Packs" ');
				break;
			case 'MARKETPLACE/LINTERS':
				this.searchWidget.setValue('category:Linters ');
				break;
			case 'MARKETPLACE/PROGRAMMING_LANGUAGES':
				this.searchWidget.setValue('category:"Programming Languages" ');
				break;
			case 'MARKETPLACE/SCM_PROVIDERS':
				this.searchWidget.setValue('category:"SCM Providers" ');
				break;
			case 'MARKETPLACE/SNIPPETS':
				this.searchWidget.setValue('category:Snippets ');
				break;
			case 'MARKETPLACE/THEMES':
				this.searchWidget.setValue('category:Themes ');
				break;

			default:
				this.searchWidget.setValue('');
				break;
		}
		this.updateNavigation();
		this.showResults();
		this.searchWidget.inputBox.focus();
	}

	private updateNavigation(): void {
		const entry = this.tocTree.getSelection()[0];
		switch (entry) {
			case 'INSTALLED':
			case 'INSTALLED/RUNNING':
			case 'INSTALLED/ACTIVE':
			case 'INSTALLED/DISABLED':
				dom.removeClass(this.navigationTreeContainer, 'hide');
				this.navigationTree.setSelection(['USER']);
				this.navigationTree.setChildren(null, [
					{
						element: 'USER',
					},
					{
						element: 'SYSTEM',
						children: [
							{ element: 'SYSTEM/PROGRAMMING_LANGUAGES' },
							{ element: 'SYSTEM/THEMES' },
							{ element: 'SYSTEM/FEATURES' }
						]
					}
				]);
				break;

			case 'RECOMMENDATIONS':
				dom.removeClass(this.navigationTreeContainer, 'hide');
				this.navigationTree.setSelection(['WORKSPACE']);
				this.navigationTree.setChildren(null, [
					{
						element: 'WORKSPACE',
					},
					{
						element: 'OTHERS',
					}
				]);
				break;

			default:
				dom.addClass(this.navigationTreeContainer, 'hide');
				break;
		}
	}

	private onDidChangeNavigationEntrySelection(element: NavigationEntry): void {
		const model: InstalledExtensionsModel = <InstalledExtensionsModel>this.extensionsList.model;
		if (model) {
			let index = 0;
			switch (element) {
				case 'SYSTEM':
				case 'SYSTEM/PROGRAMMING_LANGUAGES':
					index = model.getProgrammingLanguageExtensionsStartingIndex();
					break;
				case 'SYSTEM/FEATURES':
					index = model.getFeaturesExtensionsStartingIndex();
					break;
				case 'SYSTEM/THEMES':
					index = model.getThemesExtensionsStartingIndex();
					break;
			}
			this.extensionsList.reveal(index, 0);
		}
	}

	private async showResults(): Promise<void> {
		let value = this.searchWidget.getValue().trim();
		if (/@local/i.test(value)) {
			return this.showInstalled(value.replace(/@local/g, '').trim().toLowerCase());
		}
		if (/@enabled/i.test(value)) {
			return this.showRunning(value.replace(/@enabled/g, '').trim().toLowerCase());
		}
		if (/@running/i.test(value)) {
			return this.showActive(value.replace(/@running/g, '').trim().toLowerCase());
		}
		if (/@disabled/i.test(value)) {
			return this.showDisabled(value.replace(/@disabled/g, '').trim().toLowerCase());
		}
		if (/@outdated/i.test(value)) {
			return this.showOutdated(value.replace(/@outdated/g, '').trim().toLowerCase());
		}
		return this.showGallery(value);
	}

	private async showInstalled(filter?: string): Promise<void> {
		let result = await this.extensionsWorkbenchService.queryLocal();
		if (filter) {
			result = result.filter(e => e.name.toLowerCase().indexOf(filter) > -1 || e.displayName.toLowerCase().indexOf(filter) > -1);
		}
		this.extensionsList.model = new InstalledExtensionsModel(result);
		this.extensionsList.scrollTop = 0;
	}

	private async showRunning(filter?: string): Promise<void> {
		const local = await this.extensionsWorkbenchService.queryLocal();
		const runningExtensions = await this.extensionService.getExtensions();

		const result = local.filter(e =>
			runningExtensions.some(r => areSameExtensions({ id: r.identifier.value }, e.identifier)) &&
			(!filter || e.name.toLowerCase().indexOf(filter) > -1 || e.displayName.toLowerCase().indexOf(filter) > -1)
		);
		this.extensionsList.model = new InstalledExtensionsModel(result);
		this.extensionsList.scrollTop = 0;
	}

	private async showActive(filter?: string): Promise<void> {
		const local = await this.extensionsWorkbenchService.queryLocal();
		const runningExtensions = await this.extensionService.getExtensions();

		const result = local.filter(e =>
			runningExtensions.some(r => areSameExtensions({ id: r.identifier.value }, e.identifier)) &&
			(!filter || e.name.toLowerCase().indexOf(filter) > -1 || e.displayName.toLowerCase().indexOf(filter) > -1)
		);
		this.extensionsList.model = new InstalledExtensionsModel(result);
		this.extensionsList.scrollTop = 0;
	}

	private async showDisabled(filter?: string): Promise<void> {
		const local = await this.extensionsWorkbenchService.queryLocal();
		const runningExtensions = await this.extensionService.getExtensions();

		const result = local.filter(e =>
			runningExtensions.every(r => !areSameExtensions({ id: r.identifier.value }, e.identifier)) &&
			(!filter || e.name.toLowerCase().indexOf(filter) > -1 || e.displayName.toLowerCase().indexOf(filter) > -1)
		);
		this.extensionsList.model = new InstalledExtensionsModel(result);
		this.extensionsList.scrollTop = 0;
	}

	private async showOutdated(filter?: string): Promise<void> {
		const local = await this.extensionsWorkbenchService.queryLocal();

		const result = local.filter(e =>
			e.outdated &&
			(!filter || e.name.toLowerCase().indexOf(filter) > -1 || e.displayName.toLowerCase().indexOf(filter) > -1)
		);
		this.extensionsList.model = new InstalledExtensionsModel(result);
		this.extensionsList.scrollTop = 0;
	}

	private async showGallery(text: string): Promise<void> {
		const pager = await this.extensionsWorkbenchService.queryGallery({ text });
		this.extensionsList.model = new DelayedPagedModel(new PagedModel({
			total: pager.total,
			pageSize: pager.pageSize,
			firstPage: pager.firstPage,
			getPage: (pageIndex: number, cancellationToken: CancellationToken) => pager.getPage(pageIndex, cancellationToken)
		}));
		this.extensionsList.scrollTop = 0;
	}

	private pin(): void {
		const activeControl = this.editorService.activeControl;
		if (activeControl) {
			activeControl.group.pinEditor(activeControl.input);
			activeControl.focus();
		}
	}

	private onContextMenu(e: IListContextMenuEvent<IExtension>): void {
		if (e.element) {
			this.extensionService.getExtensions()
				.then(runningExtensions => {
					const manageExtensionAction = this.instantiationService.createInstance(ManageExtensionAction);
					manageExtensionAction.extension = e.element;
					const groups = manageExtensionAction.getActionGroups(runningExtensions);
					let actions: IAction[] = [];
					for (const menuActions of groups) {
						actions = [...actions, ...menuActions, new Separator()];
					}
					if (manageExtensionAction.enabled) {
						this.contextMenuService.showContextMenu({
							getAnchor: () => e.anchor,
							getActions: () => actions.slice(0, actions.length - 1)
						});
					}
				});
		}
	}

	private openExtension(extension: IExtension): void {
		this.extensionsWorkbenchService.open(extension, true).then(undefined, err => this.onError(err));
	}

	private onError(err: any): void {
		if (isPromiseCanceledError(err)) {
			return;
		}

		const message = err && err.message || '';

		if (/ECONNREFUSED/.test(message)) {
			const error = createErrorWithActions(localize('suggestProxyError', "Marketplace returned 'ECONNREFUSED'. Please check the 'http.proxy' setting."), {
				actions: [
					this.instantiationService.createInstance(OpenGlobalSettingsAction, OpenGlobalSettingsAction.ID, OpenGlobalSettingsAction.LABEL)
				]
			});

			this.notificationService.error(error);
			return;
		}

		this.notificationService.error(err);
	}
}

export class InstalledExtensionsModel implements IPagedModel<IExtension> {

	get length(): number { return this.extensions.length; }

	private readonly userExtensions: IExtension[] = [];
	private readonly programmingLanguagesExtensions: IExtension[] = [];
	private readonly featuresExtensions: IExtension[] = [];
	private readonly themesExtensions: IExtension[] = [];
	private readonly extensions: IExtension[];

	constructor(extensions: IExtension[]) {
		for (const extension of extensions) {
			if (extension.type === ExtensionType.User) {
				this.userExtensions.push(extension);
				continue;
			}
			if (this.isProgrammingLanguage(extension)) {
				this.programmingLanguagesExtensions.push(extension);
				continue;
			}
			if (this.isFeatureExtension(extension)) {
				this.featuresExtensions.push(extension);
				continue;
			}
			if (this.isThemeExtension(extension)) {
				this.themesExtensions.push(extension);
				continue;
			}
		}
		this.userExtensions.sort((e1, e2) => this.compare(e1, e2));
		this.programmingLanguagesExtensions.sort((e1, e2) => this.compare(e1, e2));
		this.featuresExtensions.sort((e1, e2) => this.compare(e1, e2));
		this.themesExtensions.sort((e1, e2) => this.compare(e1, e2));
		this.extensions = [...this.userExtensions, ...this.programmingLanguagesExtensions, ...this.featuresExtensions, ...this.themesExtensions];
	}

	private isProgrammingLanguage(e: IExtension): boolean {
		return e.local.manifest
			&& e.local.manifest.contributes
			&& Array.isArray(e.local.manifest.contributes.grammars)
			&& e.local.manifest.contributes.grammars.length
			&& e.local.identifier.id !== 'vscode.git';
	}

	private isFeatureExtension(e: IExtension): boolean {
		return e.local.manifest
			&& e.local.manifest.contributes
			&& (!Array.isArray(e.local.manifest.contributes.grammars) || e.local.identifier.id === 'vscode.git')
			&& !Array.isArray(e.local.manifest.contributes.themes);
	}

	private isThemeExtension(e: IExtension): boolean {
		return e.local.manifest
			&& e.local.manifest.contributes
			&& Array.isArray(e.local.manifest.contributes.themes)
			&& e.local.manifest.contributes.themes.length > 0;
	}

	isResolved(index: number): boolean {
		return true;
	}

	get(index: number): IExtension {
		return this.extensions[index];
	}

	resolve(index: number, cancellationToken: CancellationToken): Promise<IExtension> {
		return Promise.resolve(this.get(index));
	}

	getProgrammingLanguageExtensionsStartingIndex(): number {
		return this.userExtensions.length;
	}

	getFeaturesExtensionsStartingIndex(): number {
		return this.getProgrammingLanguageExtensionsStartingIndex() + this.programmingLanguagesExtensions.length;
	}

	getThemesExtensionsStartingIndex(): number {
		return this.getFeaturesExtensionsStartingIndex() + this.featuresExtensions.length;
	}

	private compare(e1: IExtension, e2: IExtension): number {
		return e1.displayName.localeCompare(e2.displayName);
	}
}