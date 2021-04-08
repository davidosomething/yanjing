var Yanjing = {};

/**
 * Margin of Error in PX for centering a client. If client's center is within
 * this PX of workspace center, consider the client centered.
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
  return (sizesStringList
    .split(',')
    .map(function ensureFloat(v) {
      return parseFloat(v); // also serves to trim()
    })
    .filter(Boolean) // remove 0 and NaN
  );
}

var DEFAULT_SIZES = '75,66.6666,50,33.3333,25';

var configSizes = [];
var configSizesString = '';
try {
  var configSizesString = readConfig('sizes', '').toString();
  configSizes = Yanjing.sanitizeSizes(configSizesString);
} catch (err) {
  print(err);
}

if (configSizes.length > 0) {
  Yanjing.Sizes = configSizes;
  print('Using custom sizes', configSizesString);
} else {
  Yanjing.Sizes = Yanjing.sanitizeSizes(DEFAULT_SIZES);
  print('Using DEFAULT_SIZES', DEFAULT_SIZES);
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
    workspace.currentDesktop
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
  return size / 100 * Yanjing.getWorkAreaRect().width;
};

/**
 * @param {number} clientWidth of client e.g. 359.9
 * @return {number} index in Sizes array. The size is the nearest size to the
 * client width in relation to the workspace width.
 */
Yanjing.widthToSizeIndex = function (clientWidth) {
  // E.g. if window is 650px and screen is 1080 we'd get 33
  var intWidthPercent = Math.round(clientWidth / Yanjing.getWorkAreaRect().width * 100);

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
 * @param {number} clientWidth like 500 (px)
 * @return {number} width like 333 (px)
 */
Yanjing.getNextWidth = function (clientWidth) {
  // e.g. 2 is 50, meaning the client is roughly 50% of the workspace width
  var sizeI = Yanjing.widthToSizeIndex(clientWidth);
  var nextI = Yanjing.getNextI(sizeI); // would go left 1 or center/right to 3
  var nextSize = Yanjing.Sizes[nextI]; // 33.3333 or 66.6666
  var nextWidth = Yanjing.sizeToWidth(nextSize); // whatever px value, e.g. 359.9
  return nextWidth;
};

Yanjing.AfterCycle = {};
Yanjing.AfterCycle[Yanjing.Dirs.Left] = function afterCycleLeft(client) {
  return Yanjing.States.DONE;
};
Yanjing.AfterCycle[Yanjing.Dirs.Center] = function afterCycleCenter(client) {
  return Yanjing.Move[Yanjing.Dirs.Center](client);
};
Yanjing.AfterCycle[Yanjing.Dirs.Right] = function afterCycleRight(client) {
  return Yanjing.Move[Yanjing.Dirs.Right](client);
};

/**
 * @param {KWin::AbstractClient} client
 * @param {string} dir 'Left'
 * @return {string} Yanjing.States value
 */
Yanjing.cycle = function (client, dir) {
  if (!client.resizeable) {
    return Yanjing.States.ERROR;
  }

  var rect = client.geometry; // { width, height, x, y }
  var clientWidth = rect.width; // 500
  var nextWidth = Yanjing.getNextWidth(clientWidth);
  rect.width = nextWidth;
  client.geometry = rect;

  // Move again after cycle to fix reposition due to resize
  var after = Yanjing.AfterCycle[dir];
  return after && after(client);
};

/**
 * Unmaximize a window without changing size.
 *
 * @param {KWin::AbstractClient} client
 * @return {KWin::AbstractClient} client
 */
Yanjing.unmax = function (client) {
  // When you unmax a window it reverts geometry to pre max width and height
  if (typeof client.setMaximize === 'function') {
    var VERTICAL = false;
    var HORIZONTAL = false;
    var maxedRect = client.geometry;
    client.setMaximize(VERTICAL, HORIZONTAL);

    // Restore previous maximized size, but now unmaxed so has drop shadows
    // and window borders.
    client.geometry = maxedRect;
  }
  return client;
};

/**
 * @param {KWin::AbstractClient} client
 * @param {function} moveCb called with client
 * @return {string} Yanjing.States value
 */
Yanjing.beforeMove = function (client) {
  if (!client.moveable) {
    return Yanjing.States.ERROR;
  }

  // Horizonatally unmax a client before moving, since you shouldn't be able
  // move a maximized window.
  // setMaximize is documented at https://develop.kde.org/docs/plasma/kwin/api/
  Yanjing.unmax(client);
  return Yanjing.States.DONE;
};

Yanjing.Move = {};

/**
 * @param {KWin::AbstractClient} client
 * @return {string} Yanjing.States value
 */
Yanjing.Move[Yanjing.Dirs.Left] = function (client) {
  if (Yanjing.beforeMove(client) === Yanjing.States.ERROR) {
    return Yanjing.States.ERROR;
  }

  var rect = client.geometry;
  var workAreaLeftEdge = Yanjing.getWorkAreaRect().x;
  var isFlushed = rect.x === workAreaLeftEdge;
  if (isFlushed) {
    return Yanjing.States.NOOP;
  }

  var rect = client.geometry;
  rect.x = workAreaLeftEdge;
  client.geometry = rect;
  return Yanjing.States.DONE;
};

/**
 * @param {KWin::AbstractClient} client
 * @return {string} Yanjing.States value
 */
Yanjing.Move[Yanjing.Dirs.Right] = function (client) {
  if (Yanjing.beforeMove(client) === Yanjing.States.ERROR) {
    return Yanjing.States.ERROR;
  }

  var rect = client.geometry;
  var clientRightEdge = Yanjing.getRightEdge(rect);

  var workAreaRect = Yanjing.getWorkAreaRect();
  var workAreaRightEdge = Yanjing.getRightEdge(workAreaRect);

  var isFlushed = clientRightEdge === workAreaRightEdge;
  if (isFlushed) {
    return Yanjing.States.NOOP;
  }

  rect.x = workAreaRightEdge - rect.width;
  client.geometry = rect;
  return Yanjing.States.DONE;
};

/**
 * @param {KWin::AbstractClient} client
 * @return {string} Yanjing.States value
 */
Yanjing.Move[Yanjing.Dirs.Center] = function (client) {
  if (Yanjing.beforeMove(client) === Yanjing.States.ERROR) {
    return Yanjing.States.ERROR;
  }

  var rect = client.geometry;
  var clientWidth = rect.width;
  var workAreaRect = Yanjing.getWorkAreaRect();
  var workspaceCenterX = (workAreaRect.width / 2) + workAreaRect.x;
  var clientCenterX = rect.x + (clientWidth / 2);
  var isCentered = (
    clientCenterX - Yanjing.CENTER_MOE <= workspaceCenterX &&
    clientCenterX + Yanjing.CENTER_MOE >= workspaceCenterX
  );
  if (isCentered) {
    return Yanjing.States.NOOP;
  }

  var distance = workspaceCenterX - clientCenterX;
  rect.x = rect.x + distance;
  client.geometry = rect;
  return Yanjing.States.DONE;
};

/**
 * @param {KWin::AbstractClient} client
 * @param {string} key
 * @return {string} Yanjing.States value
 */
Yanjing.squish = function (client, key) {
  var dir = Yanjing.Dirs[key];
  var move = Yanjing.Move[key];
  if (!move || !dir) {
    print('Unrecognized command');
    return Yanjing.States.ERROR;
  }

  if (move(client) === Yanjing.States.NOOP) {
    return Yanjing.cycle(client, dir);
  }

  print('Failed to move ' + dir);
  return Yanjing.States.ERROR;
};

/**
 * @param {KWin::AbstractClient} client
 * @return {string} Yanjing.States value
 */
Yanjing.yMax = function (client) {
  if (!client || !client.resizeable) {
    return Yanjing.States.ERROR;
  }

  // Work area for the active cliint, considers things like docks!
  var workAreaRect = Yanjing.getWorkAreaRect();
  var rect = client.geometry;
  rect.y = workAreaRect.y
  rect.height = workAreaRect.height;
  client.geometry = rect;
  return Yanjing.States.DONE;
};

Yanjing.main = function () {
  registerShortcut(
    'left',
    'Yanjing: Flush or cyclic resize window to left edge of screen',
    '',
    function () {
      var client = workspace.activeClient;
      Yanjing.squish(client, Yanjing.Dirs.Left);
    }
  );

  registerShortcut(
    'center',
    'Yanjing: Center or cyclic resize window',
    '',
    function () {
      var client = workspace.activeClient;
      Yanjing.squish(client, Yanjing.Dirs.Center);
    }
  );

  registerShortcut(
    'right',
    'Yanjing: Flush or cyclic resize window to right edge of screen',
    '',
    function () {
      var client = workspace.activeClient;
      Yanjing.squish(client, Yanjing.Dirs.Right);
    }
  );

  registerShortcut(
    'left-ymax',
    'Yanjing: Vertically maximize and flush or cyclic resize window to left edge of screen',
    'ctrl+shift+meta+a',
    function () {
      var client = workspace.activeClient;
      Yanjing.yMax(client);
      Yanjing.squish(client, Yanjing.Dirs.Left);
    }
  );

  registerShortcut(
    'center-ymax',
    'Yanjing: Vertically maximize and center or cyclic resize window',
    'ctrl+shift+meta+x',
    function () {
      var client = workspace.activeClient;
      Yanjing.yMax(client);
      Yanjing.squish(client, Yanjing.Dirs.Center);
    }
  );

  registerShortcut(
    'right-ymax',
    'Yanjing: Vertically maximize and flush or cyclic resize window to right edge of screen',
    'ctrl+shift+meta+d',
    function () {
      var client = workspace.activeClient;
      Yanjing.yMax(client);
      Yanjing.squish(client, Yanjing.Dirs.Right);
    }
  );
};

Yanjing.main();

// Expose for testing
try {
  global.Yanjing = Yanjing;
} catch (error) {
  /* noop */
}
