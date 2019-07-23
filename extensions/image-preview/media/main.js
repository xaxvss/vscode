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

	// const initialState: ImageState = InlineImageView.imageStateCache.get(cacheKey) || { scale: 'fit', offsetX: 0, offsetY: 0 };

	let ctrlPressed = false;
	let altPressed = false;

	let scale = initialState.scale;

	const container = document.querySelector('.container');
	const image = document.querySelector('img');

	function updateScale(newScale) {
		if (!image || !image.parentElement) {
			return;
		}

		if (newScale === 'fit') {
			scale = 'fit';
			DOM.addClass(image, 'scale-to-fit');
			DOM.removeClass(image, 'pixelated');
			image.style.minWidth = 'auto';
			image.style.width = 'auto';
			InlineImageView.imageStateCache.delete(cacheKey);
		} else {
			const oldWidth = image.width;
			const oldHeight = image.height;

			scale = clamp(newScale, InlineImageView.MIN_SCALE, InlineImageView.MAX_SCALE);
			if (scale >= InlineImageView.PIXELATION_THRESHOLD) {
				DOM.addClass(image, 'pixelated');
			} else {
				DOM.removeClass(image, 'pixelated');
			}

			const { scrollTop, scrollLeft } = image.parentElement;
			const dx = (scrollLeft + image.parentElement.clientWidth / 2) / image.parentElement.scrollWidth;
			const dy = (scrollTop + image.parentElement.clientHeight / 2) / image.parentElement.scrollHeight;

			DOM.removeClass(image, 'scale-to-fit');
			image.style.minWidth = `${(image.naturalWidth * scale)}px`;
			image.style.width = `${(image.naturalWidth * scale)}px`;

			const newWidth = image.width;
			const scaleFactor = (newWidth - oldWidth) / oldWidth;

			const newScrollLeft = ((oldWidth * scaleFactor * dx) + scrollLeft);
			const newScrollTop = ((oldHeight * scaleFactor * dy) + scrollTop);
			scrollbar.setScrollPosition({
				scrollLeft: newScrollLeft,
				scrollTop: newScrollTop,
			});

			InlineImageView.imageStateCache.set(cacheKey, { scale: scale, offsetX: newScrollLeft, offsetY: newScrollTop });
		}

		zoomStatusbarItem.updateStatusbar(scale);
		scrollbar.scanDomNode();
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

		if (platform.isMacintosh ? altPressed : ctrlPressed) {
			DOM.removeClass(container, 'zoom-in');
			DOM.addClass(container, 'zoom-out');
		}
	});

	window.addEventListener('keyup', (/** @type {KeyboardEvent} */ e) => {
		if (!image) {
			return;
		}

		ctrlPressed = e.ctrlKey;
		altPressed = e.altKey;

		if (!(platform.isMacintosh ? altPressed : ctrlPressed)) {
			DOM.removeClass(container, 'zoom-out');
			DOM.addClass(container, 'zoom-in');
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

		if (!(platform.isMacintosh ? altPressed : ctrlPressed)) { // zoom in
			let i = 0;
			for (; i < InlineImageView.zoomLevels.length; ++i) {
				if (InlineImageView.zoomLevels[i] > scale) {
					break;
				}
			}
			updateScale(InlineImageView.zoomLevels[i] || InlineImageView.MAX_SCALE);
		} else {
			let i = InlineImageView.zoomLevels.length - 1;
			for (; i >= 0; --i) {
				if (InlineImageView.zoomLevels[i] < scale) {
					break;
				}
			}
			updateScale(InlineImageView.zoomLevels[i] || InlineImageView.MIN_SCALE);
		}
	});

	container.addEventListener('wheel', (/** @type {WheelEvent} */ e) => {
		if (!image) {
			return;
		}

		const isScrollWheelKeyPressed = platform.isMacintosh ? altPressed : ctrlPressed;
		if (!isScrollWheelKeyPressed && !e.ctrlKey) { // pinching is reported as scroll wheel + ctrl
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		if (scale === 'fit') {
			firstZoom();
		}

		// let delta = e.deltaY > 0 ? 1 : -1;
		// updateScale(scale as number * (1 - delta * InlineImageView.SCALE_PINCH_FACTOR));
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

	DOM.clearNode(container);
	DOM.addClasses(container, 'image', 'zoom-in');



	image.classList.add('scale-to-fit');
	image.style.visibility = 'hidden';

	image.addEventListener('load', e => {
		if (!image) {
			return;
		}
		if (typeof descriptor.size === 'number') {
			delegate.metadataClb(nls.localize('imgMeta', '{0}x{1} {2}', image.naturalWidth, image.naturalHeight, BinarySize.formatSize(descriptor.size)));
		} else {
			delegate.metadataClb(nls.localize('imgMetaNoSize', '{0}x{1}', image.naturalWidth, image.naturalHeight));
		}

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