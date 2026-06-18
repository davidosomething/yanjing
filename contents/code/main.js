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
  let State;
  ((State2) => {
    State2["NOOP"] = "NOOP";
    State2["DONE"] = "DONE";
    State2["ERROR"] = "ERROR";
  })(State = Yanjing2.State || (Yanjing2.State = {}));
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
  function unmax(win) {
    if (typeof win.setMaximize === "function") {
      win.setMaximize(false, false);
    }
  }
  Yanjing2.unmax = unmax;
  function moveLeft(win) {
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y
    };
    const workAreaLeftEdge = getWorkAreaRect().x;
    const isFlushed = geo.x === workAreaLeftEdge;
    if (isFlushed) {
      return "NOOP" /* NOOP */;
    }
    unmax(win);
    win.frameGeometry = {
      x: workAreaLeftEdge,
      y: geo.y,
      width: geo.width,
      height: geo.height
    };
    return "DONE" /* DONE */;
  }
  function moveRight(win) {
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y
    };
    const winRightEdge = getRightEdge(geo);
    const workAreaRect = getWorkAreaRect();
    const workAreaRightEdge = getRightEdge(workAreaRect);
    const isFlushed = winRightEdge === workAreaRightEdge;
    if (isFlushed) {
      return "NOOP" /* NOOP */;
    }
    unmax(win);
    win.frameGeometry = {
      x: workAreaRightEdge - geo.width,
      y: geo.y,
      width: geo.width,
      height: geo.height
    };
    return "DONE" /* DONE */;
  }
  function moveCenter(win) {
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y
    };
    const workAreaRect = getWorkAreaRect();
    const workspaceCenterX = workAreaRect.width / 2 + workAreaRect.x;
    const winCenterX = geo.x + geo.width / 2;
    const isCentered = winCenterX - Yanjing2.CENTER_MOE <= workspaceCenterX && winCenterX + Yanjing2.CENTER_MOE >= workspaceCenterX;
    if (isCentered) {
      return "NOOP" /* NOOP */;
    }
    const distance = workspaceCenterX - winCenterX;
    unmax(win);
    win.frameGeometry = {
      x: geo.x + distance,
      y: geo.y,
      width: geo.width,
      height: geo.height
    };
    return "DONE" /* DONE */;
  }
  const Move = {
    ["Left" /* Left */]: moveLeft,
    ["Center" /* Center */]: moveCenter,
    ["Right" /* Right */]: moveRight
  };
  const AfterCycle = {
    ["Left" /* Left */]: function(_win) {
      return "DONE" /* DONE */;
    },
    ["Center" /* Center */]: function(win) {
      return moveCenter(win);
    },
    ["Right" /* Right */]: function(win) {
      return moveRight(win);
    }
  };
  function cycle(win, dir) {
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y
    };
    const nextWidth = Yanjing2.getNextWidth(geo.width);
    unmax(win);
    win.frameGeometry = {
      x: geo.x,
      y: geo.y,
      width: nextWidth,
      height: geo.height
    };
    const after = AfterCycle[dir];
    if (after) {
      return after(win);
    }
    return "DONE" /* DONE */;
  }
  Yanjing2.cycle = cycle;
  function squish(win, key) {
    const dir = key;
    const moveFn = Move[key];
    if (!moveFn || !dir) {
      print("[yanjing] Unrecognized command:", key);
      return "ERROR" /* ERROR */;
    }
    const result = moveFn(win);
    if (result === "NOOP" /* NOOP */) {
      return Yanjing2.cycle(win, dir);
    }
    if (result === "ERROR" /* ERROR */) {
      print("[yanjing] Failed to move", dir);
    }
    return result;
  }
  Yanjing2.squish = squish;
  function yMax(win) {
    if (!win) {
      return "ERROR" /* ERROR */;
    }
    const geo = {
      width: win.frameGeometry.width,
      height: win.frameGeometry.height,
      x: win.frameGeometry.x,
      y: win.frameGeometry.y
    };
    const workAreaRect = getWorkAreaRect();
    const maxHeight = Yanjing2.MaxHeightPercent / 100 * workAreaRect.height;
    unmax(win);
    win.frameGeometry = {
      x: geo.x,
      y: workAreaRect.y,
      width: geo.width,
      height: maxHeight
    };
    return "DONE" /* DONE */;
  }
  Yanjing2.yMax = yMax;
  function fauxFullscreen(win) {
    if (!win) {
      return "ERROR" /* ERROR */;
    }
    const workAreaRect = getWorkAreaRect();
    unmax(win);
    win.frameGeometry = {
      x: workAreaRect.x,
      y: workAreaRect.y,
      width: workAreaRect.width,
      height: workAreaRect.height
    };
    return "DONE" /* DONE */;
  }
  Yanjing2.fauxFullscreen = fauxFullscreen;
  function main() {
    registerShortcut(
      "left",
      "Yanjing: Flush or cyclic resize window to left edge of screen",
      "",
      function() {
        const win = workspace.activeWindow;
        if (!win) return;
        if (win.desktopWindow) return;
        squish(win, "Left" /* Left */);
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
        squish(win, "Center" /* Center */);
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
        squish(win, "Right" /* Right */);
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
        yMax(win);
        squish(win, "Left" /* Left */);
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
        yMax(win);
        squish(win, "Center" /* Center */);
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
        yMax(win);
        squish(win, "Right" /* Right */);
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
        fauxFullscreen(win);
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
