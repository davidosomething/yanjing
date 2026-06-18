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
  // Geometry types
  // =========================================================================

  /** A rectangle with optional partial fields for transforms. */
  interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  type Transform = Partial<Rect>;

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
  export function getWorkAreaRect(): Rect {
    return workspace.clientArea(
      KWin.PlacementArea,
      workspace.activeWindow!,
    );
  }

  /** Get the right edge x-coordinate of a rectangle. */
  export function getRightEdge(rect: Rect): number {
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

  /**
   * Copy geometry from a KWin frameGeometry object into a plain object.
   * The object from frameGeometry is weird, it does not update properly
   * so we create an independent object.
   */
  function copyGeometry(win: Window): Rect {
    return {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y,
    };
  }

  // =========================================================================
  // Unmaximize
  // =========================================================================

  export function unmax(win: Window): void {
    if (typeof win.setMaximize === 'function') {
      win.setMaximize(false, false);
    }
  }

  // =========================================================================
  // Apply transforms
  // =========================================================================

  /**
   * Merge one or more transforms into a base geometry, returning the
   * resulting geometry. Later transforms override earlier ones.
   * Null transforms are ignored.
   */
  export function applyTransforms(base: Rect, transforms: (Transform | null)[]): Rect {
    let result = { x: base.x, y: base.y, width: base.width, height: base.height };
    for (let i = 0; i < transforms.length; i++) {
      const t = transforms[i];
      if (!t) continue;
      if (typeof t.x === 'number') result.x = t.x;
      if (typeof t.y === 'number') result.y = t.y;
      if (typeof t.width === 'number') result.width = t.width;
      if (typeof t.height === 'number') result.height = t.height;
    }
    return result;
  }

  // =========================================================================
  // Transform generators (pure — no side effects)
  // =========================================================================

  /**
   * Return a transform to flush the window to the left edge.
   * Returns null if already flush.
   */
  export function getMoveLeftTransform(geo: Rect, workArea: Rect): Transform | null {
    if (geo.x === workArea.x) return null;
    return { x: workArea.x };
  }

  /**
   * Return a transform to flush the window to the right edge.
   * Returns null if already flush.
   */
  export function getMoveRightTransform(geo: Rect, workArea: Rect): Transform | null {
    const geoRight = getRightEdge(geo);
    const waRight = getRightEdge(workArea);
    if (geoRight === waRight) return null;
    return { x: waRight - geo.width };
  }

  /**
   * Return a transform to center the window horizontally.
   * Returns null if already centered.
   */
  export function getMoveCenterTransform(geo: Rect, workArea: Rect): Transform | null {
    const workspaceCenterX = workArea.width / 2 + workArea.x;
    const winCenterX = geo.x + geo.width / 2;
    const isCentered =
      winCenterX - CENTER_MOE <= workspaceCenterX &&
      winCenterX + CENTER_MOE >= workspaceCenterX;
    if (isCentered) return null;
    return { x: geo.x + (workspaceCenterX - winCenterX) };
  }

  /** Map of direction to move transform generator. */
  const MoveTransform: Record<string, (geo: Rect, wa: Rect) => Transform | null> = {
    [Dir.Left]: getMoveLeftTransform,
    [Dir.Center]: getMoveCenterTransform,
    [Dir.Right]: getMoveRightTransform,
  };

  /**
   * Return a transform to cycle the window width to the next configured size.
   */
  export function getCycleTransform(geo: Rect): Transform {
    const nextWidth = getNextWidth(geo.width);
    return { width: nextWidth };
  }

  /**
   * After-cycle reposition transforms.
   * Left: stay put. Center: re-center. Right: re-flush right.
   */
  function getAfterCycleTransform(geo: Rect, workArea: Rect, dir: string): Transform | null {
    if (dir === Dir.Center) return getMoveCenterTransform(geo, workArea);
    if (dir === Dir.Right) return getMoveRightTransform(geo, workArea);
    return null; // Left: no reposition needed
  }

  /**
   * Return a transform to vertically maximize the window.
   */
  export function getYMaxTransform(_geo: Rect, workArea: Rect): Transform {
    const maxHeight = (MaxHeightPercent / 100) * workArea.height;
    return { y: workArea.y, height: maxHeight };
  }

  /**
   * Return a transform to fill the entire work area (faux fullscreen).
   */
  export function getFauxFullscreenTransform(workArea: Rect): Transform {
    return {
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height,
    };
  }

  // =========================================================================
  // Squish: move-or-cycle decision (pure)
  // =========================================================================

  /**
   * If the window is not flush to the target edge, return the move transform.
   * If it is already flush, return the cycle transform instead.
   *
   * This gives the "press once to flush, press again to resize" behavior.
   */
  export function getSquishTransform(geo: Rect, workArea: Rect, key: string): Transform | null {
    const moveFn = MoveTransform[key];
    if (!moveFn) {
      print('[yanjing] Unrecognized command:', key);
      return null;
    }

    const moveTransform = moveFn(geo, workArea);
    if (moveTransform) {
      return moveTransform; // Not flush yet — just move
    }

    // Already flush — cycle width, then reposition
    const cycleTransform = getCycleTransform(geo);
    // After resizing, the window may need to be re-flushed or re-centered.
    // Apply the cycle transform to geo to compute the intermediate geometry,
    // then check if repositioning is needed.
    const afterGeo = applyTransforms(geo, [cycleTransform]);
    const afterTransform = getAfterCycleTransform(afterGeo, workArea, key);

    return mergeTransforms([cycleTransform, afterTransform]);
  }

  /**
   * Merge multiple non-null transforms into one.
   * Later transforms override earlier ones for the same property.
   */
  function mergeTransforms(transforms: (Transform | null)[]): Transform | null {
    let result: Transform = {};
    let hasAny = false;
    for (let i = 0; i < transforms.length; i++) {
      const t = transforms[i];
      if (!t) continue;
      hasAny = true;
      if (typeof t.x === 'number') result.x = t.x;
      if (typeof t.y === 'number') result.y = t.y;
      if (typeof t.width === 'number') result.width = t.width;
      if (typeof t.height === 'number') result.height = t.height;
    }
    return hasAny ? result : null;
  }

  // =========================================================================
  // Shortcut registration
  // =========================================================================

  /**
   * Register all keyboard shortcuts and start the script.
   */
  export function main(): void {
    // Left
    registerShortcut(
      'left',
      'Yanjing: Flush or cyclic resize window to left edge of screen',
      '',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getSquishTransform(geo, workArea, Dir.Left);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      },
    );

    // Center
    registerShortcut(
      'center',
      'Yanjing: Center or cyclic resize window',
      '',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getSquishTransform(geo, workArea, Dir.Center);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      },
    );

    // Right
    registerShortcut(
      'right',
      'Yanjing: Flush or cyclic resize window to right edge of screen',
      '',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getSquishTransform(geo, workArea, Dir.Right);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      },
    );

    // Left + yMax
    registerShortcut(
      'left-ymax',
      'Yanjing: Vertically maximize and flush or cyclic resize window to left edge of screen',
      'ctrl+shift+meta+a',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = mergeTransforms([
          getYMaxTransform(geo, workArea),
          getSquishTransform(geo, workArea, Dir.Left),
        ]);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      },
    );

    // Center + yMax
    registerShortcut(
      'center-ymax',
      'Yanjing: Vertically maximize and center or cyclic resize window',
      'ctrl+shift+meta+x',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = mergeTransforms([
          getYMaxTransform(geo, workArea),
          getSquishTransform(geo, workArea, Dir.Center),
        ]);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      },
    );

    // Right + yMax
    registerShortcut(
      'right-ymax',
      'Yanjing: Vertically maximize and flush or cyclic resize window to right edge of screen',
      'ctrl+shift+meta+d',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = mergeTransforms([
          getYMaxTransform(geo, workArea),
          getSquishTransform(geo, workArea, Dir.Right),
        ]);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      },
    );

    // Faux fullscreen
    registerShortcut(
      'faux-fullscreen',
      'Yanjing: Resize window to fill the entire work area',
      'ctrl+shift+meta+f',
      function () {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getFauxFullscreenTransform(workArea);
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
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
