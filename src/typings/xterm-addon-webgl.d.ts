/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

 // HACK: gulp-tsb doesn't play nice with importing from typings
// import { Terminal, IDisposable, ITerminalAddon } from 'xterm';

declare module 'xterm-addon-webgl' {
  /**
   * An xterm.js addon that provides search functionality.
   */
  export class WebglAddon {
    constructor(preserveDrawingBuffer?: boolean);

    /**
     * Activates the addon
     * @param terminal The terminal the addon is being loaded in.
     */
    public activate(terminal: any): void;

    /**
     * Disposes the addon.
     */
    public dispose(): void;
  }
}
