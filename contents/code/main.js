var Yanjing = {};

/**
 * Margin of Error in PX for centering a window. If window's center is within
 * this PX of workspace center, consider the window centered.
 */
Yanjing.CENTER_MOE = 2;

Yanjing.States = {
  NOOP: 'NOOP',
  DONE: 'DONE',
  ERROR: 'ERROR',
};

/**
 * @param {string} sizesStringList comma separated
 * @return {number[]} No zero/falsies
 */
Yanjing.sanitizeSizes = function (sizesStringList) {
  return sizesStringList
    .split(',')
    .map(function ensureFloat(v) {
      return parseFloat(v); // also serves to trim()
    })
    .filter(Boolean); // remove 0 and NaN
};

var DEFAULT_SIZES = '75,66.6666,50,33.3333,25';

var configSizes = [];
var configSizesString = '';
try {
  var configSizesString = readConfig('sizes', DEFAULT_SIZES).toString();
  configSizes = Yanjing.sanitizeSizes(configSizesString);
} catch (err) {
  print('[yanjing] ' + err);
}

if (configSizes.length > 0) {
  Yanjing.Sizes = configSizes;
  print('[yanjing] Using sizes', configSizesString);
}

Yanjing.Dirs = {
  Left: 'Left',
  Center: 'Center',
  Right: 'Right',
};

/**
 * @return {QRect}
 */
Yanjing.getWorkAreaRect = function () {
  return workspace.clientArea(
    KWin.WorkArea,
    workspace.activeScreen,
    workspace.currentDesktop,
  );
};

/**
 * @param {QRect} rect
 * @return {number}
 */
Yanjing.getRightEdge = function (rect) {
  return rect.x + rect.width;
};

/**
 * @param {number} size e.g. 33.3333
 * @return {number} width e.g. 359.9
 */
Yanjing.sizeToWidth = function (size) {
  return (size / 100) * Yanjing.getWorkAreaRect().width;
};

/**
 * @param {number} windowWidth of window e.g. 359.9
 * @return {number} index in Sizes array. The size is the nearest size to the
 * window width in relation to the workspace width.
 */
Yanjing.widthToSizeIndex = function (windowWidth) {
  // E.g. if window is 650px and screen is 1080 we'd get 33
  var intWidthPercent = Math.round(
    (windowWidth / Yanjing.getWorkAreaRect().width) * 100,
  );

  var smallestDiff = 9999;
  var smallestI = 0;
  Yanjing.Sizes.forEach(function (size, i) {
    var diff = Math.abs(intWidthPercent - size);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      smallestI = i;
    }
  });
  return smallestI;
};

/**
 * @param {number} i index in Sizes
 * @return {number} valid index in Sizes
 */
Yanjing.getNextI = function (i) {
  return i >= Yanjing.Sizes.length - 1 ? 0 : i + 1;
};

/**
 * @param {number} windowWidth like 500 (px)
 * @return {number} width like 333 (px)
 */
Yanjing.getNextWidth = function (windowWidth) {
  // e.g. 2 is 50, meaning the window is roughly 50% of the workspace width
  var sizeI = Yanjing.widthToSizeIndex(windowWidth);
  var nextI = Yanjing.getNextI(sizeI); // would go left 1 or center/right to 3
  var nextSize = Yanjing.Sizes[nextI]; // 33.3333 or 66.6666
  var nextWidth = Yanjing.sizeToWidth(nextSize); // whatever px value, e.g. 359.9
  return parseInt(nextWidth, 10);
};

Yanjing.AfterCycle = {};
Yanjing.AfterCycle[Yanjing.Dirs.Left] = function afterCycleLeft(_win) {
  return Yanjing.States.DONE;
};
Yanjing.AfterCycle[Yanjing.Dirs.Center] = function afterCycleCenter(win) {
  return Yanjing.Move[Yanjing.Dirs.Center](win);
};
Yanjing.AfterCycle[Yanjing.Dirs.Right] = function afterCycleRight(win) {
  return Yanjing.Move[Yanjing.Dirs.Right](win);
};

/**
 * @param {KWin::AbstractClient} win
 * @param {string} dir 'Left'
 * @return {string} Yanjing.States value
 */
Yanjing.cycle = function (win, dir) {
  if (!win.resizeable) {
    return Yanjing.States.ERROR;
  }

  var rect = win.frameGeometry; // { width, height, x, y }
  var winWidth = rect.width; // 500
  var nextWidth = Yanjing.getNextWidth(winWidth);
  rect.width = nextWidth;
  win.frameGeometry = rect;

  // Move again after cycle to fix reposition due to resize
  var after = Yanjing.AfterCycle[dir];
  return after && after(win);
};

/**
 * Unmaximize a window without changing size.
 *
 * @param {KWin::AbstractClient} win
 * @return {KWin::AbstractClient} win
 */
Yanjing.unmax = function (win) {
  // When you unmax a window it reverts frameGeometry to pre max width and height
  if (typeof win.setMaximize === 'function') {
    var VERTICAL = false;
    var HORIZONTAL = false;
    var maxedRect = win.frameGeometry;
    win.setMaximize(VERTICAL, HORIZONTAL);

    // Restore previous maximized size, but now unmaxed so has drop shadows
    // and window borders.
    win.frameGeometry = maxedRect;
  }
  return win;
};

/**
 * @param {KWin::AbstractClient} win
 * @param {function} moveCb called with win
 * @return {string} Yanjing.States value
 */
Yanjing.beforeMove = function (win) {
  if (!win.moveable) {
    return Yanjing.States.ERROR;
  }

  // Horizonatally unmax a win before moving, since you shouldn't be able
  // move a maximized window.
  // setMaximize is documented at https://develop.kde.org/docs/plasma/kwin/api/
  Yanjing.unmax(win);
  return Yanjing.States.DONE;
};

Yanjing.Move = {};

/**
 * @param {KWin::AbstractClient} win
 * @return {string} Yanjing.States value
 */
Yanjing.Move[Yanjing.Dirs.Left] = function (win) {
  if (Yanjing.beforeMove(win) === Yanjing.States.ERROR) {
    return Yanjing.States.ERROR;
  }

  var rect = win.frameGeometry;
  var workAreaLeftEdge = Yanjing.getWorkAreaRect().x;
  var isFlushed = rect.x === workAreaLeftEdge;
  if (isFlushed) {
    return Yanjing.States.NOOP;
  }

  var rect = win.frameGeometry;
  rect.x = workAreaLeftEdge;
  win.frameGeometry = rect;
  return Yanjing.States.DONE;
};

/**
 * @param {KWin::AbstractClient} win
 * @return {string} Yanjing.States value
 */
Yanjing.Move[Yanjing.Dirs.Right] = function (win) {
  if (Yanjing.beforeMove(win) === Yanjing.States.ERROR) {
    return Yanjing.States.ERROR;
  }

  var rect = win.frameGeometry;
  var winRightEdge = Yanjing.getRightEdge(rect);

  var workAreaRect = Yanjing.getWorkAreaRect();
  var workAreaRightEdge = Yanjing.getRightEdge(workAreaRect);

  var isFlushed = winRightEdge === workAreaRightEdge;
  if (isFlushed) {
    return Yanjing.States.NOOP;
  }

  rect.x = workAreaRightEdge - rect.width;
  win.frameGeometry = rect;
  return Yanjing.States.DONE;
};

/**
 * @param {KWin::AbstractClient} win
 * @return {string} Yanjing.States value
 */
Yanjing.Move[Yanjing.Dirs.Center] = function (win) {
  if (Yanjing.beforeMove(win) === Yanjing.States.ERROR) {
    return Yanjing.States.ERROR;
  }

  var rect = win.frameGeometry;
  var winWidth = rect.width;
  var workAreaRect = Yanjing.getWorkAreaRect();
  var workspaceCenterX = workAreaRect.width / 2 + workAreaRect.x;
  var winCenterX = rect.x + winWidth / 2;
  var isCentered =
    winCenterX - Yanjing.CENTER_MOE <= workspaceCenterX &&
    winCenterX + Yanjing.CENTER_MOE >= workspaceCenterX;
  if (isCentered) {
    return Yanjing.States.NOOP;
  }

  var distance = workspaceCenterX - winCenterX;
  rect.x = rect.x + distance;
  win.frameGeometry = rect;
  return Yanjing.States.DONE;
};

/**
 * @param {KWin::AbstractClient} win
 * @param {string} key
 * @return {string} Yanjing.States value
 */
Yanjing.squish = function (win, key) {
  var dir = Yanjing.Dirs[key];
  var move = Yanjing.Move[key];
  if (!move || !dir) {
    print('[yanjing] Unrecognized command');
    return Yanjing.States.ERROR;
  }

  var result = move(win);
  if (result === Yanjing.States.NOOP) {
    return Yanjing.cycle(win, dir);
  }

  if (result === Yanjing.States.ERROR) {
    print('[yanjing] Failed to move ' + dir);
  }
  return result;
};

/**
 * @param {KWin::AbstractClient} win
 * @return {string} Yanjing.States value
 */
Yanjing.yMax = function (win) {
  if (!win || !win.resizeable) {
    return Yanjing.States.ERROR;
  }

  // Work area for the active win, considers things like docks!
  var workAreaRect = Yanjing.getWorkAreaRect();
  var rect = win.frameGeometry;
  rect.y = workAreaRect.y;
  rect.height = workAreaRect.height;
  win.frameGeometry = rect;
  return Yanjing.States.DONE;
};

Yanjing.main = function () {
  registerShortcut(
    'left',
    'Yanjing: Flush or cyclic resize window to left edge of screen',
    '',
    function () {
      var win = workspace.activeWindow;
      Yanjing.squish(win, Yanjing.Dirs.Left);
    },
  );

  registerShortcut(
    'center',
    'Yanjing: Center or cyclic resize window',
    '',
    function () {
      var win = workspace.activeWindow;
      Yanjing.squish(win, Yanjing.Dirs.Center);
    },
  );

  registerShortcut(
    'right',
    'Yanjing: Flush or cyclic resize window to right edge of screen',
    '',
    function () {
      var win = workspace.activeWindow;
      Yanjing.squish(win, Yanjing.Dirs.Right);
    },
  );

  registerShortcut(
    'left-ymax',
    'Yanjing: Vertically maximize and flush or cyclic resize window to left edge of screen',
    'ctrl+shift+meta+a',
    function () {
      var win = workspace.activeWindow;
      Yanjing.yMax(win);
      Yanjing.squish(win, Yanjing.Dirs.Left);
    },
  );

  registerShortcut(
    'center-ymax',
    'Yanjing: Vertically maximize and center or cyclic resize window',
    'ctrl+shift+meta+x',
    function () {
      var win = workspace.activeWindow;
      Yanjing.yMax(win);
      Yanjing.squish(win, Yanjing.Dirs.Center);
    },
  );

  registerShortcut(
    'right-ymax',
    'Yanjing: Vertically maximize and flush or cyclic resize window to right edge of screen',
    'ctrl+shift+meta+d',
    function () {
      var win = workspace.activeWindow;
      Yanjing.yMax(win);
      Yanjing.squish(win, Yanjing.Dirs.Right);
    },
  );
};

Yanjing.main();

// Expose for testing
try {
  global.Yanjing = Yanjing;
} catch (error) {
  /* noop */
}
