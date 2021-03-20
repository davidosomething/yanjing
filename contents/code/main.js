var Yanjing = {};

/**
 * Margin of Error in PX for centering a client. If client's center is within
 * this PX of workspace center, consider the client centered.
 */
Yanjing.CENTER_MOE = 2;

Yanjing.States = {
  NOOP: 0,
  DONE: 1,
  ERROR: 2,
};

// Percent of screen to fill
Yanjing.Sizes = [
  75,
  100 / 3 * 2,
  50,
  100 / 3,
  25,
];

Yanjing.Dirs = {
  Left: 'Left',
  Center: 'Center',
  Right: 'Right',
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
 * @param {number} size e.g. 33.3333
 * @return {number} width e.g. 359.9
 */
Yanjing.sizeToWidth = function (size) {
  return size / 100 * workspace.workspaceWidth;
};

/**
 * @param {number} clientWidth of client e.g. 359.9
 * @return {number} index in Sizes array. The size is the nearest size to the
 * client width in relation to the workspace width.
 */
Yanjing.widthToSizeIndex = function (clientWidth) {
  // E.g. if window is 650px and screen is 1080 we'd get 33
  var intWidthPercent = Math.round(clientWidth / workspace.workspaceWidth * 100);

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

/**
 * @param {object} client
 * @param {string} dir 'Left'
 */
Yanjing.cycle = function (client, dir) {
  if (!client.resizeable) {
    return;
  }

  var rect = client.geometry; // { width, height, x, y }
  var clientWidth = rect.width; // 500
  var nextWidth = Yanjing.getNextWidth(clientWidth);
  rect.width = nextWidth;
  client.geometry = rect;

  var after = Yanjing.AfterCycle[dir];
  return after && after(client);
};

Yanjing.Move = {};
Yanjing.Move[Yanjing.Dirs.Left] = function (client) {
  var rect = client.geometry;
  var isFlushed = rect.x === 0;
  if (isFlushed) {
    return Yanjing.States.NOOP;
  }

  if (client.moveable) {
    var rect = client.geometry;
    rect.x = 0;
    client.geometry = rect;
    return Yanjing.States.DONE;
  }

  print('Could not move window left');
  return Yanjing.States.ERROR;
};

Yanjing.Move[Yanjing.Dirs.Right] = function (client) {
  var rect = client.geometry;
  var clientWidth = rect.width;
  var flushedX = workspace.workspaceWidth - clientWidth;
  var isFlushed = rect.x === flushedX;
  if (isFlushed) {
    print(rect.x, flushedX);
    return Yanjing.States.NOOP;
  }

  if (client.moveable) {
    rect.x = flushedX;
    client.geometry = rect;
    return Yanjing.States.DONE;
  }

  print('Could not move window right');
  return Yanjing.States.ERROR;
};

Yanjing.Move[Yanjing.Dirs.Center] = function (client) {
  var rect = client.geometry;
  var clientWidth = rect.width;
  var workspaceCenterX = workspace.workspaceWidth / 2;
  var clientCenterX = rect.x + (clientWidth / 2);
  var isCentered = (
    clientCenterX - Yanjing.CENTER_MOE <= workspaceCenterX &&
    clientCenterX + Yanjing.CENTER_MOE >= workspaceCenterX
  );
  if (isCentered) {
    print(workspaceCenterX, clientCenterX);
    return Yanjing.States.NOOP;
  }

  if (client.moveable) {
    var distance = workspaceCenterX - clientCenterX;
    rect.x = rect.x + distance;
    client.geometry = rect;
    return Yanjing.States.DONE;
  }

  print('Could not center window');
  return Yanjing.States.ERROR;
};

/**
 * @param {string} key
 */
Yanjing.squish = function (key) {
  var client = workspace.activeClient;
  var dir = Yanjing.Dirs[key];
  var move = Yanjing.Move[key];
  if (!move || !dir) {
    print('Unrecognized command');
    return;
  }

  if (move(client) === Yanjing.States.NOOP) {
    print('Client already positioned');
    Yanjing.cycle(client, dir);
  }
};

Yanjing.main = function () {
  registerShortcut(
    'left',
    'Yanjing: Flush or cyclic resize window to left edge of screen',
    'ctrl+shift+meta+a',
    function () { Yanjing.squish(Yanjing.Dirs.Left); }
  );

  registerShortcut(
    'center',
    'Yanjing: Center or cyclic resize window',
    'ctrl+shift+meta+x',
    function () { Yanjing.squish(Yanjing.Dirs.Center); }
  );

  registerShortcut(
    'right',
    'Yanjing: Flush or cyclic resize window to right edge of screen',
    'ctrl+shift+meta+d',
    function () { Yanjing.squish(Yanjing.Dirs.Right); }
  );
};

// Expose for testing
if (global && __DEV__) {
  global.Yanjing = Yanjing;
} else {
  Yanjing.main();
}
