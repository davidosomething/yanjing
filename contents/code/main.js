function flushRight() {
  var client = workspace.activeClient;
  if (!client.moveable) {
    return;
  }

  var rect = client.frameGeometry;
  var clientWidth = rect.width;
  var nextX = workspace.workspaceWidth - clientWidth;

  client.geometry = Object.assign(rect, {
    x: nextX
  });
}

function main() {
  registerShortcut(
    'flush_right',
    'Yanjing: Flush window to right edge of screen',
    'ctrl+shift+meta+d',
    flushRight
  );
}
main();
