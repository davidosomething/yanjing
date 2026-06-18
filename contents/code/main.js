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
  const GRID_MOE = 2;
  let Dir;
  ((Dir2) => {
    Dir2["Left"] = "Left";
    Dir2["Center"] = "Center";
    Dir2["Right"] = "Right";
  })(Dir = Yanjing2.Dir || (Yanjing2.Dir = {}));
  const DEFAULT_SIZES = "75,66.6666,50,33.3333,25";
  const DEFAULT_HEIGHT_SIZES = "66.6666,50,33.3333";
  const DEFAULT_MAX_HEIGHT_PERCENT = 100;
  function sanitizeSizes(sizesStringList) {
    return sizesStringList.split(",").map(function ensureFloat(v) {
      return parseFloat(v);
    }).filter(Boolean);
  }
  Yanjing2.sanitizeSizes = sanitizeSizes;
  Yanjing2.Sizes = sanitizeSizes(DEFAULT_SIZES);
  Yanjing2.HeightSizes = sanitizeSizes(DEFAULT_HEIGHT_SIZES);
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
  function getNextI(i, len) {
    return i >= len - 1 ? 0 : i + 1;
  }
  Yanjing2.getNextI = getNextI;
  function getNextWidth(windowWidth) {
    const sizeI = widthToSizeIndex(windowWidth);
    const nextI = getNextI(sizeI, Yanjing2.Sizes.length);
    const nextSize = Yanjing2.Sizes[nextI];
    const nextWidth = sizeToWidth(nextSize);
    return parseInt(String(nextWidth), 10);
  }
  Yanjing2.getNextWidth = getNextWidth;
  function sizeToHeight(size) {
    return size / 100 * getWorkAreaRect().height;
  }
  Yanjing2.sizeToHeight = sizeToHeight;
  function heightToSizeIndex(windowHeight) {
    const intHeightPercent = Math.round(
      windowHeight / getWorkAreaRect().height * 100
    );
    let smallestDiff = 9999;
    let smallestI = 0;
    Yanjing2.HeightSizes.forEach(function(size, i) {
      const diff = Math.abs(intHeightPercent - size);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        smallestI = i;
      }
    });
    return smallestI;
  }
  Yanjing2.heightToSizeIndex = heightToSizeIndex;
  function getNextHeight(windowHeight) {
    const sizeI = heightToSizeIndex(windowHeight);
    const nextI = getNextI(sizeI, Yanjing2.HeightSizes.length);
    const nextSize = Yanjing2.HeightSizes[nextI];
    const nextHeight = sizeToHeight(nextSize);
    return parseInt(String(nextHeight), 10);
  }
  Yanjing2.getNextHeight = getNextHeight;
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
  function getGridTransform(_geo, workArea, row, col, rowSpan, colSpan, rows, cols) {
    const cellWidth = workArea.width / cols;
    const cellHeight = workArea.height / rows;
    return {
      x: workArea.x + col * cellWidth,
      y: workArea.y + row * cellHeight,
      width: cellWidth * colSpan,
      height: cellHeight * rowSpan
    };
  }
  Yanjing2.getGridTransform = getGridTransform;
  function getGridSquishTransform(geo, workArea, row, col, rows, cols) {
    const target = getGridTransform(geo, workArea, row, col, 1, 1, rows, cols);
    const colMatches = Math.abs(geo.x - target.x) <= GRID_MOE && Math.abs(geo.width - target.width) <= GRID_MOE;
    if (!colMatches) return target;
    const vertMatches = row === 0 ? Math.abs(geo.y - target.y) <= GRID_MOE : row === rows - 1 ? Math.abs(geo.y + geo.height - (target.y + target.height)) <= GRID_MOE : Math.abs(geo.y + geo.height / 2 - (target.y + target.height / 2)) <= GRID_MOE;
    if (!vertMatches) return target;
    return getVerticalCycleTransform(geo, workArea);
  }
  Yanjing2.getGridSquishTransform = getGridSquishTransform;
  function getVerticalAnchor(geo, workArea) {
    const threshold = workArea.height * 0.1;
    const topDist = Math.abs(geo.y - workArea.y);
    const bottomDist = Math.abs(geo.y + geo.height - (workArea.y + workArea.height));
    if (topDist <= threshold) return "top";
    if (bottomDist <= threshold) return "bottom";
    return "middle";
  }
  Yanjing2.getVerticalAnchor = getVerticalAnchor;
  function getVerticalCycleTransform(geo, workArea) {
    const nextHeight = getNextHeight(geo.height);
    const anchor = getVerticalAnchor(geo, workArea);
    if (anchor === "top") {
      return { height: nextHeight };
    }
    if (anchor === "bottom") {
      const bottomEdge = geo.y + geo.height;
      return { y: bottomEdge - nextHeight, height: nextHeight };
    }
    const centerY = geo.y + geo.height / 2;
    return { y: centerY - nextHeight / 2, height: nextHeight };
  }
  Yanjing2.getVerticalCycleTransform = getVerticalCycleTransform;
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
    function gridShortcut(id, label, defaultKey, row, col, rows, cols) {
      registerShortcut(id, label, defaultKey, function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getGridSquishTransform(geo, workArea, row, col, rows, cols);
        unmax(win);
        win.frameGeometry = applyTransforms(geo, [transform]);
      });
    }
    gridShortcut("top-half-left", "Yanjing: Top half \u2014 left", "", 0, 0, 2, 2);
    gridShortcut("top-half-right", "Yanjing: Top half \u2014 right", "", 0, 1, 2, 2);
    gridShortcut("bottom-half-left", "Yanjing: Bottom half \u2014 left", "", 1, 0, 2, 2);
    gridShortcut("bottom-half-right", "Yanjing: Bottom half \u2014 right", "", 1, 1, 2, 2);
    gridShortcut("top-third-left", "Yanjing: Top third \u2014 left", "", 0, 0, 3, 3);
    gridShortcut("top-third-center", "Yanjing: Top third \u2014 center", "", 0, 1, 3, 3);
    gridShortcut("top-third-right", "Yanjing: Top third \u2014 right", "", 0, 2, 3, 3);
    gridShortcut("center-third-left", "Yanjing: Center third \u2014 left", "", 1, 0, 3, 3);
    gridShortcut("center-third-center", "Yanjing: Center third \u2014 center", "", 1, 1, 3, 3);
    gridShortcut("center-third-right", "Yanjing: Center third \u2014 right", "", 1, 2, 3, 3);
    gridShortcut("bottom-third-left", "Yanjing: Bottom third \u2014 left", "", 2, 0, 3, 3);
    gridShortcut("bottom-third-center", "Yanjing: Bottom third \u2014 center", "", 2, 1, 3, 3);
    gridShortcut("bottom-third-right", "Yanjing: Bottom third \u2014 right", "", 2, 2, 3, 3);
    registerShortcut(
      "cycle-height",
      "Yanjing: Vertically cyclic resize height",
      "",
      function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        const geo = copyGeometry(win);
        const workArea = getWorkAreaRect();
        const transform = getVerticalCycleTransform(geo, workArea);
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
