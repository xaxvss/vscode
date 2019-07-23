/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// @ts-check
"use strict";

(function () {
	/**
	 * @param {number} value
	 * @param {number} min
	 * @param {number} max
	 * @return {number}
	 */
	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	/**
	 * @param {HTMLElement} node
	 * @param {string} className
	 */
	function addClass(node, className) {
		node.classList.add(className);
	}
	/**
	 * @param {HTMLElement} node
	 * @param {string} className
	 */
	function removeClass(node, className) {
		node.classList.remove(className);
	}

	const isMacintosh = true;

	/**
	 * Enable image-rendering: pixelated for images scaled by more than this.
	 */
	const PIXELATION_THRESHOLD = 3;

	const SCALE_PINCH_FACTOR = 0.075;
	const MAX_SCALE = 20;
	const MIN_SCALE = 0.1;

	const zoomLevels = [
		0.1,
		0.2,
		0.3,
		0.4,
		0.5,
		0.6,
		0.7,
		0.8,
		0.9,
		1,
		1.5,
		2,
		3,
		5,
		7,
		10,
		15,
		20
	];


	const vscode = acquireVsCodeApi();

	const initialState = vscode.getState() || { scale: 'fit', offsetX: 0, offsetY: 0 };

	// State
	let scale = initialState.scale;
	let ctrlPressed = false;
	let altPressed = false;

	// Elements
	const container =  /** @type {HTMLElement} */(document.querySelector('.container'));
	const image = document.querySelector('img');

	function updateScale(newScale) {
		if (!image || !image.parentElement) {
			return;
		}

		if (newScale === 'fit') {
			scale = 'fit';
			addClass(image, 'scale-to-fit');
			removeClass(image, 'pixelated');
			image.style.minWidth = 'auto';
			image.style.width = 'auto';
			vscode.setState(undefined);
			// InlineImageView.imageStateCache.delete(cacheKey);
		} else {
			const oldWidth = image.width;
			const oldHeight = image.height;

			scale = clamp(newScale, MIN_SCALE, MAX_SCALE);
			if (scale >= PIXELATION_THRESHOLD) {
				addClass(image, 'pixelated');
			} else {
				removeClass(image, 'pixelated');
			}

			const { scrollTop, scrollLeft } = image.parentElement;
			const dx = (scrollLeft + image.parentElement.clientWidth / 2) / image.parentElement.scrollWidth;
			const dy = (scrollTop + image.parentElement.clientHeight / 2) / image.parentElement.scrollHeight;

			removeClass(image, 'scale-to-fit');
			image.style.minWidth = `${(image.naturalWidth * scale)}px`;
			image.style.width = `${(image.naturalWidth * scale)}px`;

			const newWidth = image.width;
			const scaleFactor = (newWidth - oldWidth) / oldWidth;

			const newScrollLeft = ((oldWidth * scaleFactor * dx) + scrollLeft);
			const newScrollTop = ((oldHeight * scaleFactor * dy) + scrollTop);
			// scrollbar.setScrollPosition({
			// 	scrollLeft: newScrollLeft,
			// 	scrollTop: newScrollTop,
			// });

			vscode.setState({ scale: scale, offsetX: newScrollLeft, offsetY: newScrollTop });
			// InlineImageView.imageStateCache.set(cacheKey, { scale: scale, offsetX: newScrollLeft, offsetY: newScrollTop });
		}

		// zoomStatusbarItem.updateStatusbar(scale);
		// scrollbar.scanDomNode();
	}

	function firstZoom() {
		if (!image) {
			return;
		}

		scale = image.clientWidth / image.naturalWidth;
		updateScale(scale);
	}

	window.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => {
		if (!image) {
			return;
		}
		ctrlPressed = e.ctrlKey;
		altPressed = e.altKey;

		if (isMacintosh ? altPressed : ctrlPressed) {
			removeClass(container, 'zoom-in');
			addClass(container, 'zoom-out');
		}
	});

	window.addEventListener('keyup', (/** @type {KeyboardEvent} */ e) => {
		if (!image) {
			return;
		}

		ctrlPressed = e.ctrlKey;
		altPressed = e.altKey;

		if (!(isMacintosh ? altPressed : ctrlPressed)) {
			removeClass(container, 'zoom-out');
			addClass(container, 'zoom-in');
		}
	});

	container.addEventListener('click', (/** @type {MouseEvent} */ e) => {
		if (!image) {
			return;
		}

		if (e.button !== 0) {
			return;
		}

		// left click
		if (scale === 'fit') {
			firstZoom();
		}

		if (!(isMacintosh ? altPressed : ctrlPressed)) { // zoom in
			let i = 0;
			for (; i < zoomLevels.length; ++i) {
				if (zoomLevels[i] > scale) {
					break;
				}
			}
			updateScale(zoomLevels[i] || MAX_SCALE);
		} else {
			let i = zoomLevels.length - 1;
			for (; i >= 0; --i) {
				if (zoomLevels[i] < scale) {
					break;
				}
			}
			updateScale(zoomLevels[i] || MIN_SCALE);
		}
	});

	container.addEventListener('wheel', (/** @type {WheelEvent} */ e) => {
		if (!image) {
			return;
		}

		const isScrollWheelKeyPressed = isMacintosh ? altPressed : ctrlPressed;
		if (!isScrollWheelKeyPressed && !e.ctrlKey) { // pinching is reported as scroll wheel + ctrl
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		if (scale === 'fit') {
			firstZoom();
		}

		let delta = e.deltaY > 0 ? 1 : -1;
		updateScale(scale * (1 - delta * SCALE_PINCH_FACTOR));
	});

	container.addEventListener('scroll', () => {
		if (!image || !image.parentElement || scale === 'fit') {
			return;
		}

		const entry = InlineImageView.imageStateCache.get(cacheKey);
		if (entry) {
			const { scrollTop, scrollLeft } = image.parentElement;
			InlineImageView.imageStateCache.set(cacheKey, { scale: entry.scale, offsetX: scrollLeft, offsetY: scrollTop });
		}
	});

	addClass(container, 'image');
	addClass(container, 'zoom-in');



	image.classList.add('scale-to-fit');
	image.style.visibility = 'hidden';

	image.addEventListener('load', e => {
		if (!image) {
			return;
		}
		// if (typeof descriptor.size === 'number') {
		// 	// delegate.metadataClb(nls.localize('imgMeta', '{0}x{1} {2}', image.naturalWidth, image.naturalHeight, BinarySize.formatSize(descriptor.size)));
		// } else {
		// 	// delegate.metadataClb(nls.localize('imgMetaNoSize', '{0}x{1}', image.naturalWidth, image.naturalHeight));
		// }

		image.style.visibility = 'visible';
		updateScale(scale);

		// if (initialState.scale !== 'fit') {
		// 	scrollbar.setScrollPosition({
		// 		scrollLeft: initialState.offsetX,
		// 		scrollTop: initialState.offsetY,
		// 	});
		// }
	});
}());