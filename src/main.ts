/// <reference path="types/kwin.d.ts" />

/**
 * yanjing — KWin window size and movement script for KDE Plasma 6.
 *
 * Flushes windows to screen edges (left/center/right) and cycles their
 * width through configurable percentage sizes on repeated presses.
 *
 * @author David O'Trakoun <me@davidosomething.com>
 * @license MIT
 */

namespace Yanjing {
  /** Margin of error in px for centering a window. */
  export const CENTER_MOE = 2;

  // =========================================================================
  // State enum
  // =========================================================================

  export const enum State {
    NOOP = 'NOOP',
    DONE = 'DONE',
    ERROR = 'ERROR',
  }

  // =========================================================================
  // Direction enum
  // =========================================================================

  export const enum Dir {
    Left = 'Left',
    Center = 'Center',
    Right = 'Right',
  }

  // =========================================================================
  // Configuration
  // =========================================================================

  const DEFAULT_SIZES = '75,66.6666,50,33.3333,25';
  const DEFAULT_MAX_HEIGHT_PERCENT = 100;

  /**
   * Parse a comma-separated size string into an array of numbers.
   * Filters out zeros and NaN values.
   */
  export function sanitizeSizes(sizesStringList: string): number[] {
    return sizesStringList
      .split(',')
      .map(function ensureFloat(v: string): number {
        return parseFloat(v);
      })
      .filter(Boolean);
  }

  /** The hardcoded size percentages. */
  export const Sizes: number[] = sanitizeSizes(DEFAULT_SIZES);

  /** The hardcoded max height percent. */
  export const MaxHeightPercent: number = DEFAULT_MAX_HEIGHT_PERCENT;

  // =========================================================================
  // Geometry utilities
  // =========================================================================

  /**
   * Get the work area rectangle for the active window's screen.
   *
   * Uses the 2-argument `clientArea` signature (same as kwin-rectangle):
   *   clientArea(option, window)
   *
   * The returned rectangle is in **global** coordinates.
   */
  export function getWorkAreaRect(): QRect {
    return workspace.clientArea(
      KWin.PlacementArea,
      workspace.activeWindow!,
    );
  }

  /** Get the right edge x-coordinate of a rectangle. */
  export function getRightEdge(rect: QRect): number {
    return rect.x + rect.width;
  }

  /**
   * Convert a size percentage (e.g. 33.3333) to a pixel width
   * relative to the current work area.
   */
  export function sizeToWidth(size: number): number {
    return (size / 100) * getWorkAreaRect().width;
  }

  /**
   * Find the index in Sizes whose percentage is closest to the
   * given window width, measured as a percentage of work area width.
   */
  export function widthToSizeIndex(windowWidth: number): number {
    const intWidthPercent = Math.round(
      (windowWidth / getWorkAreaRect().width) * 100,
    );

    let smallestDiff = 9999;
    let smallestI = 0;
    Sizes.forEach(function (size: number, i: number) {
      const diff = Math.abs(intWidthPercent - size);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        smallestI = i;
      }
    });
    return smallestI;
  }

  /** Cycle to the next index in Sizes, wrapping around at the end. */
  export function getNextI(i: number): number {
    return i >= Sizes.length - 1 ? 0 : i + 1;
  }

  /**
   * Get the next cycled width for a window, given its current width.
   * Finds the nearest configured size and advances to the next one.
   */
  export function getNextWidth(windowWidth: number): number {
    const sizeI = widthToSizeIndex(windowWidth);
    const nextI = getNextI(sizeI);
    const nextSize = Sizes[nextI];
    const nextWidth = sizeToWidth(nextSize);
    return parseInt(String(nextWidth), 10);
  }

  // =========================================================================
  // Window state helpers
  // =========================================================================

  /**
   * Unmaximize a window without restoring its pre-max geometry.
   *
   * Simply calls setMaximize(false, false). The caller is responsible
   * for setting the desired frameGeometry afterwards. We deliberately
   * do NOT save and restore geometry here — that races with KWin's
   * async unmax animation and can result in wrong window positions.
   */
  export function unmax(win: Window): void {
    if (typeof win.setMaximize === 'function') {
      win.setMaximize(false, false);
    }
  }

  // =========================================================================
  // Move operations
  // =========================================================================

  type MoveFn = (win: Window) => State;

  /** Flush window to the left edge of the work area. */
  function moveLeft(win: Window): State {

    // The object from frameGeometry is weird, it does not update properly
    // so we create an independent object.
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y,
    };

    const workAreaLeftEdge = getWorkAreaRect().x;
    const isFlushed = geo.x === workAreaLeftEdge;
    if (isFlushed) {
      return State.NOOP;
    }

    unmax(win);
    win.frameGeometry = {
      x: workAreaLeftEdge,
      y: geo.y,
      width: geo.width,
      height: geo.height,
    };
    return State.DONE;
  }

  /** Flush window to the right edge of the work area. */
  function moveRight(win: Window): State {

    // The object from frameGeometry is weird, it does not update properly
    // so we create an independent object.
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y,
    };

    const winRightEdge = getRightEdge(geo);
    const workAreaRect = getWorkAreaRect();
    const workAreaRightEdge = getRightEdge(workAreaRect);

    const isFlushed = winRightEdge === workAreaRightEdge;
    if (isFlushed) {
      return State.NOOP;
    }

    unmax(win);
    win.frameGeometry = {
      x: workAreaRightEdge - geo.width,
      y: geo.y,
      width: geo.width,
      height: geo.height,
    };
    return State.DONE;
  }

  /** Center the window horizontally in the work area. */
  function moveCenter(win: Window): State {

    // The object from frameGeometry is weird, it does not update properly
    // so we create an independent object.
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y,
    };

    const workAreaRect = getWorkAreaRect();
    const workspaceCenterX = workAreaRect.width / 2 + workAreaRect.x;
    const winCenterX = geo.x + geo.width / 2;
    const isCentered =
      winCenterX - CENTER_MOE <= workspaceCenterX &&
      winCenterX + CENTER_MOE >= workspaceCenterX;
    if (isCentered) {
      return State.NOOP;
    }

    const distance = workspaceCenterX - winCenterX;
    unmax(win);
    win.frameGeometry = {
      x: geo.x + distance,
      y: geo.y,
      width: geo.width,
      height: geo.height,
    };
    return State.DONE;
  }

  /** Map of direction to move function. */
  const Move: Record<string, MoveFn> = {
    [Dir.Left]: moveLeft,
    [Dir.Center]: moveCenter,
    [Dir.Right]: moveRight,
  };

  // =========================================================================
  // Cycle (resize) operations
  // =========================================================================

  /**
   * After-cycle reposition callbacks.
   * After resizing, windows may need to be re-flushed or re-centered.
   */
  const AfterCycle: Record<string, (win: Window) => State> = {
    [Dir.Left]: function (_win: Window): State {
      return State.DONE;
    },
    [Dir.Center]: function (win: Window): State {
      return moveCenter(win);
    },
    [Dir.Right]: function (win: Window): State {
      return moveRight(win);
    },
  };

  /**
   * Cycle the window width to the next configured size.
   *
   * Sets the new width and re-applies positioning. Does NOT call
   * setMaximize — assigning a non-maximized frameGeometry implicitly
   * unmaximizes (same approach as Better Quick Tiles).
   */
  export function cycle(win: Window, dir: string): State {
    // The object from frameGeometry is weird, it does not update properly
    // so we create an independent object.
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y,
    };

    const nextWidth = Yanjing.getNextWidth(geo.width);
    unmax(win);
    win.frameGeometry = {
      x: geo.x,
      y: geo.y,
      width: nextWidth,
      height: geo.height,
    };

    const after = AfterCycle[dir];
    if (after) {
      return after(win);
    }
    return State.DONE;
  }

  // =========================================================================
  // Squish: move + cycle
  // =========================================================================

  /**
   * Move a window to a direction edge. If the window is already flush
   * to that edge (move returns NOOP), cycle its width instead.
   *
   * This gives the "press once to flush, press again to resize" behavior.
   */
  export function squish(win: Window, key: string): State {
    const dir = key;
    const moveFn = Move[key];
    if (!moveFn || !dir) {
      print('[yanjing] Unrecognized command:', key);
      return State.ERROR;
    }

    const result = moveFn(win);
    if (result === State.NOOP) {
      return Yanjing.cycle(win, dir);
    }

    if (result === State.ERROR) {
      print('[yanjing] Failed to move', dir);
    }
    return result;
  }

  // =========================================================================
  // Vertical maximize
  // =========================================================================

  /**
   * Vertically maximize a window to the configured max height percent
   * of the work area, positioned at the top of the work area.
   */
  export function yMax(win: Window): State {
    if (!win) {
      return State.ERROR;
    }

    // The object from frameGeometry is weird, it does not update properly
    // so we create an independent object.
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y,
    };

    const workAreaRect = getWorkAreaRect();
    const maxHeight = (MaxHeightPercent / 100) * workAreaRect.height;
    unmax(win);
    win.frameGeometry = {
      x: geo.x,
      y: workAreaRect.y,
      width: geo.width,
      height: maxHeight,
    };
    return State.DONE;
  }

  // =========================================================================
  // Faux fullscreen
  // =========================================================================

  /**
   * Resize window to fill the entire work area (faux fullscreen).
   * Unlike KWin's native fullscreen, this respects docks and panels.
   */
  export function fauxFullscreen(win: Window): State {
    if (!win) {
      return State.ERROR;
    }

    const workAreaRect = getWorkAreaRect();
    unmax(win);
    win.frameGeometry = {
      x: workAreaRect.x,
      y: workAreaRect.y,
      width: workAreaRect.width,
      height: workAreaRect.height,
    };
    return State.DONE;
  }

  // =========================================================================
  // Shortcut registration
  // =========================================================================

  /**
   * Register all keyboard shortcuts and start the script.
   */
  export function main(): void {
    registerShortcut(
      'left',
      'Yanjing: Flush or cyclic resize window to left edge of screen',
      '',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        squish(win, Dir.Left);
      },
    );

    registerShortcut(
      'center',
      'Yanjing: Center or cyclic resize window',
      '',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        squish(win, Dir.Center);
      },
    );

    registerShortcut(
      'right',
      'Yanjing: Flush or cyclic resize window to right edge of screen',
      '',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        squish(win, Dir.Right);
      },
    );

    registerShortcut(
      'left-ymax',
      'Yanjing: Vertically maximize and flush or cyclic resize window to left edge of screen',
      'ctrl+shift+meta+a',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        yMax(win);
        squish(win, Dir.Left);
      },
    );

    registerShortcut(
      'center-ymax',
      'Yanjing: Vertically maximize and center or cyclic resize window',
      'ctrl+shift+meta+x',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        yMax(win);
        squish(win, Dir.Center);
      },
    );

    registerShortcut(
      'right-ymax',
      'Yanjing: Vertically maximize and flush or cyclic resize window to right edge of screen',
      'ctrl+shift+meta+d',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        yMax(win);
        squish(win, Dir.Right);
      },
    );

    registerShortcut(
      'faux-fullscreen',
      'Yanjing: Resize window to fill the entire work area',
      'ctrl+shift+meta+f',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        fauxFullscreen(win);
      },
    );
  }
}

// ===========================================================================
// Entry point
// ===========================================================================

Yanjing.main();

// Expose for testing (Node.js / Jest)
interface GlobalForTest {
  Yanjing?: typeof Yanjing;
}
declare const global: GlobalForTest;
try {
  global.Yanjing = Yanjing;
} catch (_error) {
  /* noop — KWin's QJSEngine doesn't have 'global' */
}
