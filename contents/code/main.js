function flushLeft() {
  var client = workspace.activeClient;
  if (!client.moveable) {
    return;
  }

  var rect = client.geometry;
  rect.x = 0;
  client.geometry = rect;
}


function flushRight() {
  var client = workspace.activeClient;
  if (!client.moveable) {
    return;
  }

  var rect = client.geometry;
  var clientWidth = rect.width;
  var nextX = workspace.workspaceWidth - clientWidth;

  rect.x = nextX;
  client.geometry = rect;
}

function main() {
  registerShortcut(
    'flush_left',
    'Yanjing: Flush window to left edge of screen',
    'ctrl+shift+meta+a',
    flushLeft
  );

  registerShortcut(
    'flush_right',
    'Yanjing: Flush window to right edge of screen',
    'ctrl+shift+meta+d',
    flushRight
  );
}
main();
