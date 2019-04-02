/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CursorContext, CursorState, PartialCursorState } from 'vs/editor/common/controller/cursorCommon';
import { OneCursor } from 'vs/editor/common/controller/oneCursor';
import { Position } from 'vs/editor/common/core/position';
import { ISelection, Selection } from 'vs/editor/common/core/selection';
import { trace } from 'vs/platform/log/common/log';

class Tracer {

	private static _equals(a: CursorState[], b: CursorState[]): boolean {
		if (a.length !== b.length) {
			return false;
		}
		for (let i = 0, len = a.length; i < len; i++) {
			const aa = a[i];
			const bb = b[i];
			if (!aa.equals(bb)) {
				return false;
			}
		}
		return true;
	}

	private readonly _context: CursorContext;
	private readonly _cursors: CursorState[];

	constructor(context: CursorContext, cursors: CursorState[]) {
		this._context = context;
		this._cursors = cursors;
	}

	public finish(cursors: CursorState[]) {
		if (Tracer._equals(this._cursors, cursors)) {
			return;
		}

		const stack = new Error().stack;
		let msg = '';
		msg = '----------------------------\n';
		msg += `textModel: ${this._context.model.uri.toString()}\n`;
		msg += `stack: ${stack}\n`;

		for (let i = 0, len = cursors.length; i < len; i++) {
			msg += this._renderCursor(`${i + 1}/${len}`, cursors[i]);
		}

		trace(msg);
	}

	private _renderCursor(cursorId: string, cursor: CursorState): string {
		let msg = ``;
		msg += `${cursorId}: view state: ${cursor.viewState.selection} --->>>${this._renderLine(this._context.viewModel.getLineContent(cursor.viewState.position.lineNumber), cursor.viewState.position.column)}\n`;
		msg += `${cursorId}: model state: ${cursor.modelState.selection} ---->>>${this._renderLine(this._context.model.getLineContent(cursor.modelState.position.lineNumber), cursor.modelState.position.column)}\n`;
		return msg;
	}

	private _renderLine(line: string, column: number): string {
		return line.substr(0, column - 1) + '|' + line.substr(column - 1);
	}
}

export class CursorCollection {

	private context: CursorContext;

	private primaryCursor: OneCursor;
	private secondaryCursors: OneCursor[];

	// An index which identifies the last cursor that was added / moved (think Ctrl+drag)
	private lastAddedCursorIndex: number;

	constructor(context: CursorContext) {
		this.context = context;
		this.primaryCursor = new OneCursor(context);
		this.secondaryCursors = [];
		this.lastAddedCursorIndex = 0;
	}

	public dispose(): void {
		this.primaryCursor.dispose(this.context);
		this.killSecondaryCursors();
	}

	public startTrackingSelections(): void {
		this.primaryCursor.startTrackingSelection(this.context);
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			this.secondaryCursors[i].startTrackingSelection(this.context);
		}
	}

	public stopTrackingSelections(): void {
		this.primaryCursor.stopTrackingSelection(this.context);
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			this.secondaryCursors[i].stopTrackingSelection(this.context);
		}
	}

	public updateContext(context: CursorContext): void {
		this.context = context;
	}

	public ensureValidState(): void {
		const trace = new Tracer(this.context, this.getAll());
		this.primaryCursor.ensureValidState(this.context);
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			this.secondaryCursors[i].ensureValidState(this.context);
		}
		trace.finish(this.getAll());
	}

	public readSelectionFromMarkers(): Selection[] {
		const trace = new Tracer(this.context, this.getAll());
		let result: Selection[] = [];
		result[0] = this.primaryCursor.readSelectionFromMarkers(this.context);
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].readSelectionFromMarkers(this.context);
		}
		trace.finish(this.getAll());
		return result;
	}

	public getAll(): CursorState[] {
		let result: CursorState[] = [];
		result[0] = this.primaryCursor.asCursorState();
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].asCursorState();
		}
		return result;
	}

	public getViewPositions(): Position[] {
		let result: Position[] = [];
		result[0] = this.primaryCursor.viewState.position;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].viewState.position;
		}
		return result;
	}

	public getSelections(): Selection[] {
		let result: Selection[] = [];
		result[0] = this.primaryCursor.modelState.selection;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].modelState.selection;
		}
		return result;
	}

	public getViewSelections(): Selection[] {
		let result: Selection[] = [];
		result[0] = this.primaryCursor.viewState.selection;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].viewState.selection;
		}
		return result;
	}

	public setSelections(selections: ISelection[]): void {
		this.setStates(CursorState.fromModelSelections(selections));
	}

	public getPrimaryCursor(): CursorState {
		return this.primaryCursor.asCursorState();
	}

	public setStates(states: PartialCursorState[] | null): void {
		if (states === null) {
			return;
		}
		const trace = new Tracer(this.context, this.getAll());
		this.primaryCursor.setState(this.context, states[0].modelState, states[0].viewState);
		this._setSecondaryStates(states.slice(1));
		trace.finish(this.getAll());
	}

	/**
	 * Creates or disposes secondary cursors as necessary to match the number of `secondarySelections`.
	 */
	private _setSecondaryStates(secondaryStates: PartialCursorState[]): void {
		const secondaryCursorsLength = this.secondaryCursors.length;
		const secondaryStatesLength = secondaryStates.length;

		if (secondaryCursorsLength < secondaryStatesLength) {
			let createCnt = secondaryStatesLength - secondaryCursorsLength;
			for (let i = 0; i < createCnt; i++) {
				this._addSecondaryCursor();
			}
		} else if (secondaryCursorsLength > secondaryStatesLength) {
			let removeCnt = secondaryCursorsLength - secondaryStatesLength;
			for (let i = 0; i < removeCnt; i++) {
				this._removeSecondaryCursor(this.secondaryCursors.length - 1);
			}
		}

		for (let i = 0; i < secondaryStatesLength; i++) {
			this.secondaryCursors[i].setState(this.context, secondaryStates[i].modelState, secondaryStates[i].viewState);
		}
	}

	public killSecondaryCursors(): void {
		const trace = new Tracer(this.context, this.getAll());
		this._setSecondaryStates([]);
		trace.finish(this.getAll());
	}

	private _addSecondaryCursor(): void {
		this.secondaryCursors.push(new OneCursor(this.context));
		this.lastAddedCursorIndex = this.secondaryCursors.length;
	}

	public getLastAddedCursorIndex(): number {
		if (this.secondaryCursors.length === 0 || this.lastAddedCursorIndex === 0) {
			return 0;
		}
		return this.lastAddedCursorIndex;
	}

	private _removeSecondaryCursor(removeIndex: number): void {
		if (this.lastAddedCursorIndex >= removeIndex + 1) {
			this.lastAddedCursorIndex--;
		}
		this.secondaryCursors[removeIndex].dispose(this.context);
		this.secondaryCursors.splice(removeIndex, 1);
	}

	private _getAll(): OneCursor[] {
		let result: OneCursor[] = [];
		result[0] = this.primaryCursor;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i];
		}
		return result;
	}

	public normalize(): void {
		if (this.secondaryCursors.length === 0) {
			return;
		}
		const trace = new Tracer(this.context, this.getAll());
		let cursors = this._getAll();

		interface SortedCursor {
			index: number;
			selection: Selection;
		}
		let sortedCursors: SortedCursor[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			sortedCursors.push({
				index: i,
				selection: cursors[i].modelState.selection,
			});
		}
		sortedCursors.sort((a, b) => {
			if (a.selection.startLineNumber === b.selection.startLineNumber) {
				return a.selection.startColumn - b.selection.startColumn;
			}
			return a.selection.startLineNumber - b.selection.startLineNumber;
		});

		for (let sortedCursorIndex = 0; sortedCursorIndex < sortedCursors.length - 1; sortedCursorIndex++) {
			const current = sortedCursors[sortedCursorIndex];
			const next = sortedCursors[sortedCursorIndex + 1];

			const currentSelection = current.selection;
			const nextSelection = next.selection;

			if (!this.context.config.multiCursorMergeOverlapping) {
				continue;
			}

			let shouldMergeCursors: boolean;
			if (nextSelection.isEmpty() || currentSelection.isEmpty()) {
				// Merge touching cursors if one of them is collapsed
				shouldMergeCursors = nextSelection.getStartPosition().isBeforeOrEqual(currentSelection.getEndPosition());
			} else {
				// Merge only overlapping cursors (i.e. allow touching ranges)
				shouldMergeCursors = nextSelection.getStartPosition().isBefore(currentSelection.getEndPosition());
			}

			if (shouldMergeCursors) {
				const winnerSortedCursorIndex = current.index < next.index ? sortedCursorIndex : sortedCursorIndex + 1;
				const looserSortedCursorIndex = current.index < next.index ? sortedCursorIndex + 1 : sortedCursorIndex;

				const looserIndex = sortedCursors[looserSortedCursorIndex].index;
				const winnerIndex = sortedCursors[winnerSortedCursorIndex].index;

				const looserSelection = sortedCursors[looserSortedCursorIndex].selection;
				const winnerSelection = sortedCursors[winnerSortedCursorIndex].selection;

				if (!looserSelection.equalsSelection(winnerSelection)) {
					const resultingRange = looserSelection.plusRange(winnerSelection);
					const looserSelectionIsLTR = (looserSelection.selectionStartLineNumber === looserSelection.startLineNumber && looserSelection.selectionStartColumn === looserSelection.startColumn);
					const winnerSelectionIsLTR = (winnerSelection.selectionStartLineNumber === winnerSelection.startLineNumber && winnerSelection.selectionStartColumn === winnerSelection.startColumn);

					// Give more importance to the last added cursor (think Ctrl-dragging + hitting another cursor)
					let resultingSelectionIsLTR: boolean;
					if (looserIndex === this.lastAddedCursorIndex) {
						resultingSelectionIsLTR = looserSelectionIsLTR;
						this.lastAddedCursorIndex = winnerIndex;
					} else {
						// Winner takes it all
						resultingSelectionIsLTR = winnerSelectionIsLTR;
					}

					let resultingSelection: Selection;
					if (resultingSelectionIsLTR) {
						resultingSelection = new Selection(resultingRange.startLineNumber, resultingRange.startColumn, resultingRange.endLineNumber, resultingRange.endColumn);
					} else {
						resultingSelection = new Selection(resultingRange.endLineNumber, resultingRange.endColumn, resultingRange.startLineNumber, resultingRange.startColumn);
					}

					sortedCursors[winnerSortedCursorIndex].selection = resultingSelection;
					const resultingState = CursorState.fromModelSelection(resultingSelection);
					cursors[winnerIndex].setState(this.context, resultingState.modelState, resultingState.viewState);
				}

				for (const sortedCursor of sortedCursors) {
					if (sortedCursor.index > looserIndex) {
						sortedCursor.index--;
					}
				}

				cursors.splice(looserIndex, 1);
				sortedCursors.splice(looserSortedCursorIndex, 1);
				this._removeSecondaryCursor(looserIndex - 1);

				sortedCursorIndex--;
			}
		}
		trace.finish(this.getAll());
	}
}
