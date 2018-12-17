/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AbstractTree, IAbstractTreeOptions } from 'vs/base/browser/ui/tree/abstractTree';
import { ISpliceable } from 'vs/base/common/sequence';
import { ITreeNode, ITreeModel, ITreeElement, ITreeRenderer, ITreeSorter, IDataSource } from 'vs/base/browser/ui/tree/tree';
import { ObjectTreeModel } from 'vs/base/browser/ui/tree/objectTreeModel';
import { IListVirtualDelegate, IIdentityProvider } from 'vs/base/browser/ui/list/list';
import { Iterator } from 'vs/base/common/iterator';

export interface IDataTreeOptions<T, TFilterData = void> extends IAbstractTreeOptions<T, TFilterData> {
	sorter?: ITreeSorter<T>;
}

export interface IDataTreeViewState {
	readonly focus: string[];
	readonly selection: string[];
	readonly collapsed: string[];
}

export class DataTree<TInput, T, TFilterData = void> extends AbstractTree<T | null, TFilterData, TInput | T> {

	protected model: ObjectTreeModel<T | null, TFilterData>;
	private input: TInput | undefined;

	private identityProvider: IIdentityProvider<T> | undefined;

	constructor(
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ITreeRenderer<any /* TODO@joao */, TFilterData, any>[],
		private dataSource: IDataSource<TInput, T>,
		options: IDataTreeOptions<T, TFilterData> = {}
	) {
		super(container, delegate, renderers, options);
		this.identityProvider = options.identityProvider;
	}

	getInput(): TInput | undefined {
		return this.input;
	}

	setInput(input: TInput, viewState?: IDataTreeViewState): void {
		if (viewState && !this.identityProvider) {
			throw new Error('Can\'t restore tree view state without an identity provider');
		}

		this.input = input;
		this._refresh(input, viewState);
	}

	refresh(element: TInput | T = this.input): void {
		if (typeof this.input === 'undefined') {
			throw new Error('Tree input not set');
		}

		this._refresh(element);
	}

	private _refresh(element: TInput | T, viewState?: IDataTreeViewState): void {
		this.model.setChildren((element === this.input ? null : element) as T, this.createIterator(element, viewState));
	}

	private createIterator(element: TInput | T, viewState?: IDataTreeViewState): Iterator<ITreeElement<T>> {
		const children = Iterator.fromArray(this.dataSource.getChildren(element));

		return Iterator.map<any, ITreeElement<T>>(children, element => ({
			element,
			children: this.createIterator(element),
			collapsed: !viewState ? undefined : (this.identityProvider!.getId(element).toString() in viewState.collapsed)
		}));
	}

	protected createModel(view: ISpliceable<ITreeNode<T, TFilterData>>, options: IDataTreeOptions<T, TFilterData>): ITreeModel<T | null, TFilterData, T | null> {
		return new ObjectTreeModel(view, options);
	}

	// view state

	getViewState(): IDataTreeViewState {
		if (!this.identityProvider) {
			throw new Error('Can\'t get tree view state without an identity provider');
		}

		const getId = (node: ITreeNode<T, TFilterData>) => this.identityProvider!.getId(node.element).toString();
		const focus = this.view.getFocusedElements().map(getId);
		const selection = this.view.getSelectedElements().map(getId);

		const collapsed: string[] = [];
		const root = this.model.getNode();
		const queue = [root];

		while (queue.length > 0) {
			const node = queue.shift();

			if (node !== root && node.collapsed) {
				collapsed.push(getId(node));
			}

			queue.push(...node.children);
		}

		return { focus, selection, collapsed };
	}
}