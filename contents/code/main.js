// Percent of screen to fill
var Sizes = [
  25,
  33.333,
  50,
  66.666,
  75,
];

function cycle(client, dir) {
  var rect = client.geometry;
  var clientWidth = rect.width;

  // E.g. if window is 650px and screen is 1080 we'd get 33
  var intWidthPercent = Math.round(clientWidth / workspace.workspaceWidth * 100);

  var sizeDiffs = Sizes.map(function (size) {
    return ;
  });

  var smallestDiff = 9999;
  var smallestI = 0;
  Sizes.forEach(function (size, i) {
    var diff = Math.abs(intWidthPercent - size);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      smallestI = i;
    }
  });
  var nearestSize = Sizes[smallestI];
  var nextI = smallestI === Sizes.length - 1 ? 0 : smallestI + 1;
  var nextSize = Sizes[nextI];

  var nextWidth = nextSize / 100 * workspace.workspaceWidth;
  rect.width = nextWidth;
  client.geometry = rect;

  if (dir === 1) {
    flushRight(client);
  }
}

var FlushStates = {
  NOOP: 0,
  DONE: 1,
  ERROR: 2,
};

function flushLeft(client) {
  var rect = client.geometry;
  var isFlushed = rect.x === 0;
  if (isFlushed) {
    return FlushStates.NOOP;
  }

  if (client.moveable) {
    var rect = client.geometry;
    rect.x = 0;
    client.geometry = rect;
    return FlushStates.DONE;
  }

  print('Could not flush window left');
  return FlushStates.ERROR;
}

function left() {
  var client = workspace.activeClient;
  if (flushLeft(client) === FlushStates.NOOP) {
    cycle(client, -1);
  }
}


function flushRight(client) {
  var rect = client.geometry;
  var clientWidth = rect.width;
  var flushedX = workspace.workspaceWidth - clientWidth;
  var isFlushed = rect.x === flushedX;
  if (isFlushed) {
    print(rect.x, flushedX);
    return FlushStates.NOOP;
  }

  if (client.moveable) {
    rect.x = flushedX;
    client.geometry = rect;
    return FlushStates.DONE;
  }

  print('Could not flush window right');
  return FlushStates.ERROR;
}

function right() {
  var client = workspace.activeClient;
  if (flushRight(client) === FlushStates.NOOP) {
    cycle(client, 1);
  }
}

function main() {
  registerShortcut(
    'left',
    'Yanjing: Flush or cyclic resize window to left edge of screen',
    'ctrl+shift+meta+a',
    left
  );

  registerShortcut(
    'right',
    'Yanjing: Flush or cyclic resize window to right edge of screen',
    'ctrl+shift+meta+d',
    right
  );
}
main();
