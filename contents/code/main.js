/**
 * yanjing — KWin window size and movement script for KDE Plasma 6.
 *
 * Flushes windows to screen edges (left/center/right) and cycles their
 * width through configurable percentage sizes on repeated presses.
 *
 * @author David O'Trakoun <me@davidosomething.com>
 * @license MIT
 */
let Yanjing;
((Yanjing2) => {
  Yanjing2.CENTER_MOE = 2;
  let Dir;
  ((Dir2) => {
    Dir2["Left"] = "Left";
    Dir2["Center"] = "Center";
    Dir2["Right"] = "Right";
  })(Dir = Yanjing2.Dir || (Yanjing2.Dir = {}));
  const DEFAULT_SIZES = "75,66.6666,50,33.3333,25";
  const DEFAULT_MAX_HEIGHT_PERCENT = 100;
  function sanitizeSizes(sizesStringList) {
    return sizesStringList.split(",").map(function ensureFloat(v) {
      return parseFloat(v);
    }).filter(Boolean);
  }
  Yanjing2.sanitizeSizes = sanitizeSizes;
  Yanjing2.Sizes = sanitizeSizes(DEFAULT_SIZES);
  Yanjing2.MaxHeightPercent = DEFAULT_MAX_HEIGHT_PERCENT;
  function getWorkAreaRect() {
    return workspace.clientArea(
      KWin.PlacementArea,
      workspace.activeWindow
    );
  }
  Yanjing2.getWorkAreaRect = getWorkAreaRect;
  function getRightEdge(rect) {
    return rect.x + rect.width;
  }
  Yanjing2.getRightEdge = getRightEdge;
  function sizeToWidth(size) {
    return size / 100 * getWorkAreaRect().width;
  }
  Yanjing2.sizeToWidth = sizeToWidth;
  function widthToSizeIndex(windowWidth) {
    const intWidthPercent = Math.round(
      windowWidth / getWorkAreaRect().width * 100
    );
    let smallestDiff = 9999;
    let smallestI = 0;
    Yanjing2.Sizes.forEach(function(size, i) {
      const diff = Math.abs(intWidthPercent - size);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        smallestI = i;
      }
    });
    return smallestI;
  }
  Yanjing2.widthToSizeIndex = widthToSizeIndex;
  function getNextI(i) {
    return i >= Yanjing2.Sizes.length - 1 ? 0 : i + 1;
  }
  Yanjing2.getNextI = getNextI;
  function getNextWidth(windowWidth) {
    const sizeI = widthToSizeIndex(windowWidth);
    const nextI = getNextI(sizeI);
    const nextSize = Yanjing2.Sizes[nextI];
    const nextWidth = sizeToWidth(nextSize);
    return parseInt(String(nextWidth), 10);
  }
  Yanjing2.getNextWidth = getNextWidth;
  function copyGeometry(win) {
    return {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y
    };
  }
  function unmax(win) {
    if (typeof win.setMaximize === "function") {
      win.setMaximize(false, false);
    }
  }
  Yanjing2.unmax = unmax;
  function applyTransforms(base, transforms) {
    let result = { x: base.x, y: base.y, width: base.width, height: base.height };
    for (let i = 0; i < transforms.length; i++) {
      const t = transforms[i];
      if (!t) continue;
      if (typeof t.x === "number") result.x = t.x;
      if (typeof t.y === "number") result.y = t.y;
      if (typeof t.width === "number") result.width = t.width;
      if (typeof t.height === "number") result.height = t.height;
    }
    return result;
  }
  Yanjing2.applyTransforms = applyTransforms;
  function getMoveLeftTransform(geo, workArea) {
    if (geo.x === workArea.x) return null;
    return { x: workArea.x };
  }
  Yanjing2.getMoveLeftTransform = getMoveLeftTransform;
  function getMoveRightTransform(geo, workArea) {
    const geoRight = getRightEdge(geo);
    const waRight = getRightEdge(workArea);
    if (geoRight === waRight) return null;
    return { x: waRight - geo.width };
  }
  Yanjing2.getMoveRightTransform = getMoveRightTransform;
  function getMoveCenterTransform(geo, workArea) {
    const workspaceCenterX = workArea.width / 2 + workArea.x;
    const winCenterX = geo.x + geo.width / 2;
    const isCentered = winCenterX - Yanjing2.CENTER_MOE <= workspaceCenterX && winCenterX + Yanjing2.CENTER_MOE >= workspaceCenterX;
    if (isCentered) return null;
    return { x: geo.x + (workspaceCenterX - winCenterX) };
  }
  Yanjing2.getMoveCenterTransform = getMoveCenterTransform;
  const MoveTransform = {
    ["Left" /* Left */]: getMoveLeftTransform,
    ["Center" /* Center */]: getMoveCenterTransform,
    ["Right" /* Right */]: getMoveRightTransform
  };
  function getCycleTransform(geo) {
    const nextWidth = getNextWidth(geo.width);
    return { width: nextWidth };
  }
  Yanjing2.getCycleTransform = getCycleTransform;
  function getAfterCycleTransform(geo, workArea, dir) {
    if (dir === "Center" /* Center */) return getMoveCenterTransform(geo, workArea);
    if (dir === "Right" /* Right */) return getMoveRightTransform(geo, workArea);
    return null;
  }
  function getYMaxTransform(_geo, workArea) {
    const maxHeight = Yanjing2.MaxHeightPercent / 100 * workArea.height;
    return { y: workArea.y, height: maxHeight };
  }
  Yanjing2.getYMaxTransform = getYMaxTransform;
  function getFauxFullscreenTransform(workArea) {
    return {
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height
    };
  }
  Yanjing2.getFauxFullscreenTransform = getFauxFullscreenTransform;
  function getSquishTransform(geo, workArea, key) {
    const moveFn = MoveTransform[key];
    if (!moveFn) {
      print("[yanjing] Unrecognized command:", key);
      return null;
    }
    const moveTransform = moveFn(geo, workArea);
    if (moveTransform) {
      return moveTransform;
    }
    const cycleTransform = getCycleTransform(geo);
    const afterGeo = applyTransforms(geo, [cycleTransform]);
    const afterTransform = getAfterCycleTransform(afterGeo, workArea, key);
    return mergeTransforms([cycleTransform, afterTransform]);
  }
  Yanjing2.getSquishTransform = getSquishTransform;
  function mergeTransforms(transforms) {
    let result = {};
    let hasAny = false;
    for (let i = 0; i < transforms.length; i++) {
      const t = transforms[i];
      if (!t) continue;
      hasAny = true;
      if (typeof t.x === "number") result.x = t.x;
      if (typeof t.y === "number") result.y = t.y;
      if (typeof t.width === "number") result.width = t.width;
      if (typeof t.height === "number") result.height = t.height;
    }
    return hasAny ? result : null;
  }
  function main() {
    registerShortcut(
      "left",
      "Yanjing: Flush or cyclic resize window to left edge of screen",
      "",
      function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getSquishTransform(geo, workArea, "Left" /* Left */);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      }
    );
    registerShortcut(
      "center",
      "Yanjing: Center or cyclic resize window",
      "",
      function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getSquishTransform(geo, workArea, "Center" /* Center */);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      }
    );
    registerShortcut(
      "right",
      "Yanjing: Flush or cyclic resize window to right edge of screen",
      "",
      function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getSquishTransform(geo, workArea, "Right" /* Right */);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      }
    );
    registerShortcut(
      "left-ymax",
      "Yanjing: Vertically maximize and flush or cyclic resize window to left edge of screen",
      "ctrl+shift+meta+a",
      function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = mergeTransforms([
          getYMaxTransform(geo, workArea),
          getSquishTransform(geo, workArea, "Left" /* Left */)
        ]);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      }
    );
    registerShortcut(
      "center-ymax",
      "Yanjing: Vertically maximize and center or cyclic resize window",
      "ctrl+shift+meta+x",
      function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = mergeTransforms([
          getYMaxTransform(geo, workArea),
          getSquishTransform(geo, workArea, "Center" /* Center */)
        ]);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      }
    );
    registerShortcut(
      "right-ymax",
      "Yanjing: Vertically maximize and flush or cyclic resize window to right edge of screen",
      "ctrl+shift+meta+d",
      function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = mergeTransforms([
          getYMaxTransform(geo, workArea),
          getSquishTransform(geo, workArea, "Right" /* Right */)
        ]);
        if (!transform) return;
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      }
    );
    registerShortcut(
      "faux-fullscreen",
      "Yanjing: Resize window to fill the entire work area",
      "ctrl+shift+meta+f",
      function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getFauxFullscreenTransform(workArea);
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      }
    );
  }
  Yanjing2.main = main;
})(Yanjing || (Yanjing = {}));
Yanjing.main();
try {
  global.Yanjing = Yanjing;
} catch (_error) {
}
